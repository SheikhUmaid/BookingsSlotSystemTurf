import mongoose from "mongoose";
import Booking from "../../models/booking.model.js";
import Payment, { PAYMENT_METHODS } from "../../models/payment.model.js";
import User from "../../models/user.model.js";
import {
    paymentStatusFilter,
    paymentStatusOf,
    recordBookingPayment,
    refundBookingPayment,
} from "../../services/payments.service.js";
import { HttpError, escapeRegex, sendError } from "../../utils/http.js";
import { INACTIVE_BOOKING_STATUSES } from "../../utils/pitch_conflict.js";
import { addDays, istDayBounds, parseDateOnly, round2, toDateStr } from "../../utils/dates.js";

const PAYMENT_STATUSES = ["paid", "partial", "pending", "refunded"];
const bookingRef = (id) => `BK-${String(id).slice(-4).toUpperCase()}`;
// Cancelled / expired bookings owe nothing.
const balanceOf = (b) =>
    INACTIVE_BOOKING_STATUSES.includes(b.status) ? 0 : round2(Math.max(0, (b.total_payable || 0) - (b.amount_paid || 0)));

function parseRange(query) {
    const from = query.from ? parseDateOnly(query.from) : null;
    const to = query.to ? parseDateOnly(query.to) : null;
    if ((query.from && !from) || (query.to && !to)) throw new HttpError(400, "Dates must be YYYY-MM-DD.");
    if (from && to && from > to) throw new HttpError(400, "'from' must be on or before 'to'.");
    return { from, to };
}

async function customerIdsMatching(search) {
    const re = new RegExp(escapeRegex(search.trim()), "i");
    const users = await User.find({ $or: [{ name: re }, { phone: re }] }).select("_id").lean();
    return users.map((u) => u._id);
}

const shapeBooking = (b, methods = []) => ({
    _id: b._id,
    booking_ref: bookingRef(b._id),
    customer: b.user ? { _id: b.user._id, name: b.user.name || "", phone: b.user.phone || "" } : null,
    pitch: b.pitch?.name || "",
    service: b.service?.name || "",
    date: b.date,
    time_slots: b.time_slots || [],
    status: b.status,
    total_payable: b.total_payable,
    amount_paid: b.amount_paid,
    amount_refunded: b.amount_refunded || 0,
    balance: balanceOf(b),
    payment_status: paymentStatusOf(b),
    methods,
});

// ---------------------------------------------------------------------------
// GET /api/admin/payments
//   ?status=paid|partial|pending|refunded &method=cash|... &from=&to= (booking date)
//   &search= &page= &limit=
// Payment records per booking, with a summary for the same filters.
// ---------------------------------------------------------------------------
export const listPaymentRecords = async (req, res) => {
    try {
        const { status = "", method = "", search = "" } = req.query;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
        if (status && !PAYMENT_STATUSES.includes(status)) {
            throw new HttpError(400, `status must be one of: ${PAYMENT_STATUSES.join(", ")}.`);
        }
        if (method && !PAYMENT_METHODS.includes(method)) {
            throw new HttpError(400, `method must be one of: ${PAYMENT_METHODS.join(", ")}.`);
        }
        const { from, to } = parseRange(req.query);

        const base = {};
        if (from || to) base.date = { ...(from && { $gte: from }), ...(to && { $lt: addDays(to, 1) }) };
        if (search.trim()) base.user = { $in: await customerIdsMatching(search) };
        if (method) {
            base._id = { $in: await Payment.distinct("booking", { method, kind: "payment", booking: { $ne: null } }) };
        }
        const filter = { ...base, ...paymentStatusFilter(status) };

        const [total, bookings, summaryRows] = await Promise.all([
            Booking.countDocuments(filter),
            Booking.find(filter)
                .sort({ date: -1, createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate("user", "name phone")
                .populate("pitch", "name")
                .populate("service", "name")
                .populate("time_slots", "start_time end_time")
                .lean(),
            // Summary across the date/search/method filters (status chips show counts)
            Booking.aggregate([
                { $match: base },
                {
                    $group: {
                        _id: null,
                        bookingValue: { $sum: { $cond: [{ $in: ["$status", ["cancelled", "expired"]] }, 0, "$total_payable"] } },
                        collected: { $sum: "$amount_paid" },
                        refunded: { $sum: { $ifNull: ["$amount_refunded", 0] } },
                        outstanding: {
                            $sum: {
                                $cond: [
                                    { $in: ["$status", ["cancelled", "expired"]] },
                                    0,
                                    { $max: [0, { $subtract: ["$total_payable", "$amount_paid"] }] },
                                ],
                            },
                        },
                    },
                },
            ]),
        ]);

        const counts = {};
        await Promise.all(
            PAYMENT_STATUSES.map(async (s) => {
                counts[s] = await Booking.countDocuments({ ...base, ...paymentStatusFilter(s) });
            })
        );

        const methodsByBooking = new Map();
        const ledger = await Payment.find({ booking: { $in: bookings.map((b) => b._id) }, kind: "payment" }).select("booking method").lean();
        for (const p of ledger) {
            const key = String(p.booking);
            methodsByBooking.set(key, [...new Set([...(methodsByBooking.get(key) || []), p.method])]);
        }

        const s = summaryRows[0] || { bookingValue: 0, collected: 0, refunded: 0, outstanding: 0 };
        return res.status(200).json({
            records: bookings.map((b) => shapeBooking(b, methodsByBooking.get(String(b._id)) || [])),
            total,
            page,
            pages: Math.max(1, Math.ceil(total / limit)),
            counts,
            summary: {
                bookingValue: round2(s.bookingValue),
                collected: round2(s.collected),
                refunded: round2(s.refunded),
                outstanding: round2(s.outstanding),
            },
            methods: PAYMENT_METHODS,
        });
    } catch (error) {
        return sendError(res, error, "Failed to fetch payment records.", "listPaymentRecords");
    }
};

// ---------------------------------------------------------------------------
// GET /api/admin/payments/transactions?from=&to= (venue-local day of payment)&method=&kind=&page=
// ---------------------------------------------------------------------------
export const listTransactions = async (req, res) => {
    try {
        const { method = "", kind = "" } = req.query;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
        if (method && !PAYMENT_METHODS.includes(method)) throw new HttpError(400, "Invalid method.");
        if (kind && !["payment", "refund"].includes(kind)) throw new HttpError(400, "kind must be payment or refund.");
        const { from, to } = parseRange(req.query);

        const filter = {};
        if (method) filter.method = method;
        if (kind) filter.kind = kind;
        if (from || to) {
            filter.paidAt = {
                ...(from && { $gte: istDayBounds(toDateStr(from)).start }),
                ...(to && { $lt: istDayBounds(toDateStr(to)).end }),
            };
        }

        const [total, rows, totals] = await Promise.all([
            Payment.countDocuments(filter),
            Payment.find(filter)
                .sort({ paidAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate("user", "name phone")
                .populate("recordedBy", "name")
                .populate("booking", "date")
                .lean(),
            Payment.aggregate([{ $match: filter }, { $group: { _id: "$kind", amount: { $sum: "$amount" } } }]),
        ]);

        const sum = (k) => round2(totals.find((t) => t._id === k)?.amount || 0);
        return res.status(200).json({
            transactions: rows.map((p) => ({
                ...p,
                booking_ref: p.booking ? bookingRef(p.booking._id) : null,
                booking_date: p.booking?.date || null,
            })),
            total,
            page,
            pages: Math.max(1, Math.ceil(total / limit)),
            totals: { received: sum("payment"), refunded: sum("refund"), net: round2(sum("payment") - sum("refund")) },
        });
    } catch (error) {
        return sendError(res, error, "Failed to fetch transactions.", "listTransactions");
    }
};

// ---------------------------------------------------------------------------
// GET /api/admin/bookings/:bookingId/payments   — booking's ledger
// ---------------------------------------------------------------------------
export const getBookingPayments = async (req, res) => {
    try {
        const { bookingId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(bookingId)) throw new HttpError(400, "Invalid booking ID.");
        const booking = await Booking.findById(bookingId).lean();
        if (!booking) throw new HttpError(404, "Booking not found.");
        const transactions = await Payment.find({ booking: booking._id }).sort({ paidAt: 1 }).populate("recordedBy", "name").lean();
        return res.status(200).json({
            booking_ref: bookingRef(booking._id),
            total_payable: booking.total_payable,
            amount_paid: booking.amount_paid,
            amount_refunded: booking.amount_refunded || 0,
            balance: balanceOf(booking),
            payment_status: paymentStatusOf(booking),
            transactions,
            methods: PAYMENT_METHODS.filter((m) => m !== "online"),
        });
    } catch (error) {
        return sendError(res, error, "Failed to fetch booking payments.", "getBookingPayments");
    }
};

// POST /api/admin/bookings/:bookingId/payments   { amount, method, reference?, note?, paid_at? }
export const addBookingPayment = async (req, res) => {
    try {
        const { amount, method, reference, note, paid_at } = req.body;
        const { booking, payment } = await recordBookingPayment({
            bookingId: req.params.bookingId,
            amount,
            method,
            reference,
            note,
            paidAt: paid_at,
            recordedBy: req.user._id,
        });
        return res.status(201).json({
            message: `₹${payment.amount} recorded (${payment.method}).`,
            payment,
            booking: shapeBooking(booking),
        });
    } catch (error) {
        return sendError(res, error, "Failed to record payment.", "addBookingPayment");
    }
};

// POST /api/admin/bookings/:bookingId/refunds   { amount, method, reason }   (admins only)
export const addBookingRefund = async (req, res) => {
    try {
        const { amount, method, reason } = req.body;
        const { booking, payment } = await refundBookingPayment({
            bookingId: req.params.bookingId,
            amount,
            method,
            reason,
            recordedBy: req.user._id,
        });
        return res.status(201).json({ message: `Refund of ₹${payment.amount} recorded.`, payment, booking: shapeBooking(booking) });
    } catch (error) {
        return sendError(res, error, "Failed to record refund.", "addBookingRefund");
    }
};
