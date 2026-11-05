import mongoose from "mongoose";
import Booking from "../models/booking.model.js";
import Payment, { PAYMENT_METHODS } from "../models/payment.model.js";
import { runInTransaction, withSession } from "../utils/db.js";
import { HttpError } from "../utils/http.js";
import { round2 } from "../utils/dates.js";
import { INACTIVE_BOOKING_STATUSES } from "../utils/pitch_conflict.js";

/**
 * Payment ledger. Every money movement for a booking goes through here so the
 * Payment rows and Booking.amount_paid can never disagree:
 *   amount_paid      = Σ payments − Σ refunds   (net collected)
 *   amount_refunded  = Σ refunds
 * Updates are single-document atomic ($expr guards) so concurrent requests can't
 * over-collect or over-refund, with or without MongoDB transactions.
 */

export { PAYMENT_METHODS };

// Booking.status derived from money (only for bookings that are still active).
const moneyStatusExpr = {
    $cond: [
        { $in: ["$status", INACTIVE_BOOKING_STATUSES] },
        "$status",
        {
            $cond: [
                { $and: [{ $gt: ["$total_payable", 0] }, { $gte: ["$amount_paid", "$total_payable"] }] },
                "paid",
                { $cond: [{ $gt: ["$amount_paid", 0] }, "partial", { $cond: [{ $eq: ["$total_payable", 0] }, "$status", "pending"] }] },
            ],
        },
    ],
};

/** "paid" | "partial" | "pending" | "refunded" | "cancelled" */
export function paymentStatusOf(b) {
    if ((b.amount_refunded || 0) > 0) return "refunded";
    if ((b.total_payable || 0) > 0 && (b.amount_paid || 0) >= b.total_payable) return "paid";
    if ((b.amount_paid || 0) > 0) return "partial";
    if (INACTIVE_BOOKING_STATUSES.includes(b.status)) return "cancelled";
    return "pending";
}

/** Mongo filter for a payment-status filter value. */
export function paymentStatusFilter(status) {
    switch (status) {
        case "refunded":
            return { amount_refunded: { $gt: 0 } };
        case "paid":
            return {
                amount_refunded: { $not: { $gt: 0 } },
                total_payable: { $gt: 0 },
                $expr: { $gte: ["$amount_paid", "$total_payable"] },
            };
        case "partial":
            return {
                amount_refunded: { $not: { $gt: 0 } },
                amount_paid: { $gt: 0 },
                $expr: { $lt: ["$amount_paid", "$total_payable"] },
            };
        case "pending":
            return {
                amount_paid: { $not: { $gt: 0 } },
                total_payable: { $gt: 0 },
                status: { $nin: INACTIVE_BOOKING_STATUSES },
            };
        default:
            return {};
    }
}

function validateAmount(amount) {
    const n = round2(Number(amount));
    if (!Number.isFinite(n) || n <= 0) throw new HttpError(400, "Amount must be greater than zero.");
    if (n > 10_000_000) throw new HttpError(400, "Amount is too large.");
    return n;
}

function validateMethod(method) {
    if (!PAYMENT_METHODS.includes(method)) {
        throw new HttpError(400, `Payment method must be one of: ${PAYMENT_METHODS.join(", ")}.`);
    }
    return method;
}

/**
 * Record money received against a booking (cash at the counter, UPI to the owner, etc.).
 * Rejects amounts above the remaining balance and payments on cancelled/expired bookings.
 */
export async function recordBookingPayment({ bookingId, amount, method, reference, note, recordedBy, paidAt }) {
    if (!mongoose.Types.ObjectId.isValid(bookingId)) throw new HttpError(400, "Invalid booking ID.");
    const amt = validateAmount(amount);
    validateMethod(method);
    if (method === "online") throw new HttpError(400, "Online payments are recorded automatically by Razorpay.");
    const when = paidAt ? new Date(paidAt) : new Date();
    if (Number.isNaN(when.getTime()) || when > new Date(Date.now() + 60_000)) {
        throw new HttpError(400, "Payment date can't be in the future.");
    }

    return runInTransaction(async (session) => {
        const booking = await Booking.findOneAndUpdate(
            {
                _id: bookingId,
                status: { $nin: INACTIVE_BOOKING_STATUSES },
                $expr: { $lte: [{ $add: ["$amount_paid", amt] }, { $add: ["$total_payable", 0.001] }] },
            },
            [{ $set: { amount_paid: { $round: [{ $add: ["$amount_paid", amt] }, 2] } } }, { $set: { status: moneyStatusExpr } }],
            withSession(session, { new: true, updatePipeline: true })
        );

        if (!booking) {
            const current = await Booking.findById(bookingId).select("status total_payable amount_paid").lean();
            if (!current) throw new HttpError(404, "Booking not found.");
            if (INACTIVE_BOOKING_STATUSES.includes(current.status)) {
                throw new HttpError(400, `Can't take a payment on a ${current.status} booking.`);
            }
            const balance = round2(current.total_payable - current.amount_paid);
            throw new HttpError(
                409,
                balance <= 0 ? "This booking is already fully paid." : `Amount is more than the remaining balance of ₹${balance}.`,
                { balance }
            );
        }

        try {
            const [payment] = await Payment.create(
                [{
                    booking: booking._id,
                    user: booking.user,
                    kind: "payment",
                    amount: amt,
                    method,
                    source: "admin",
                    reference: reference?.trim() || null,
                    note: note?.trim() || "",
                    recordedBy,
                    paidAt: when,
                }],
                withSession(session)
            );
            return { booking, payment };
        } catch (err) {
            if (!session) {
                // No transaction: undo the balance change so ledger and booking stay equal.
                await Booking.updateOne(
                    { _id: booking._id },
                    [{ $set: { amount_paid: { $round: [{ $subtract: ["$amount_paid", amt] }, 2] } } }, { $set: { status: moneyStatusExpr } }],
                    { updatePipeline: true }
                );
            }
            throw err;
        }
    });
}

/** Refund money from a booking (never more than what was collected). */
export async function refundBookingPayment({ bookingId, amount, method, reason, recordedBy }) {
    if (!mongoose.Types.ObjectId.isValid(bookingId)) throw new HttpError(400, "Invalid booking ID.");
    const amt = validateAmount(amount);
    validateMethod(method);
    if (!reason || !String(reason).trim()) throw new HttpError(400, "Please give a reason for the refund.");

    return runInTransaction(async (session) => {
        const booking = await Booking.findOneAndUpdate(
            { _id: bookingId, amount_paid: { $gte: amt - 0.001 } },
            [
                {
                    $set: {
                        amount_paid: { $round: [{ $subtract: ["$amount_paid", amt] }, 2] },
                        amount_refunded: { $round: [{ $add: [{ $ifNull: ["$amount_refunded", 0] }, amt] }, 2] },
                    },
                },
                { $set: { status: moneyStatusExpr } },
            ],
            withSession(session, { new: true, updatePipeline: true })
        );

        if (!booking) {
            const current = await Booking.findById(bookingId).select("amount_paid").lean();
            if (!current) throw new HttpError(404, "Booking not found.");
            throw new HttpError(409, `You can refund at most ₹${round2(current.amount_paid)} (the amount collected).`);
        }

        try {
            const [payment] = await Payment.create(
                [{
                    booking: booking._id,
                    user: booking.user,
                    kind: "refund",
                    amount: amt,
                    method,
                    source: "admin",
                    note: String(reason).trim(),
                    recordedBy,
                    paidAt: new Date(),
                }],
                withSession(session)
            );
            return { booking, payment };
        } catch (err) {
            if (!session) {
                await Booking.updateOne(
                    { _id: booking._id },
                    [
                        {
                            $set: {
                                amount_paid: { $round: [{ $add: ["$amount_paid", amt] }, 2] },
                                amount_refunded: { $round: [{ $subtract: ["$amount_refunded", amt] }, 2] },
                            },
                        },
                        { $set: { status: moneyStatusExpr } },
                    ],
                    { updatePipeline: true }
                );
            }
            throw err;
        }
    });
}

/** Ledger row for a captured Razorpay payment. Idempotent (unique on reference). */
export async function recordGatewayPayment({ booking, amount, reference, paidAt }) {
    try {
        await Payment.create({
            booking: booking._id,
            user: booking.user,
            kind: "payment",
            amount,
            method: "online",
            source: "razorpay",
            reference,
            paidAt: paidAt || new Date(),
        });
    } catch (err) {
        if (err?.code !== 11000) throw err; // duplicate = already recorded
    }
}

/**
 * Create ledger rows for bookings that had money recorded before the ledger
 * existed. Idempotent: only bookings with amount_paid > 0 and no rows at all.
 */
export async function backfillLegacyPayments() {
    const missing = await Booking.aggregate([
        { $match: { amount_paid: { $gt: 0 } } },
        { $lookup: { from: "payments", localField: "_id", foreignField: "booking", as: "p", pipeline: [{ $limit: 1 }, { $project: { _id: 1 } }] } },
        { $match: { p: { $size: 0 } } },
        { $project: { user: 1, amount_paid: 1, payment_id: 1, createdAt: 1, updatedAt: 1 } },
    ]);
    if (!missing.length) return 0;
    const rows = missing.map((b) => ({
        booking: b._id,
        user: b.user,
        kind: "payment",
        amount: b.amount_paid,
        method: b.payment_id ? "online" : "other",
        source: "legacy",
        reference: b.payment_id || null,
        note: b.payment_id ? "" : "Recorded before payment tracking — method unknown",
        paidAt: (b.payment_id ? b.updatedAt : b.createdAt) || new Date(),
    }));
    try {
        await Payment.insertMany(rows, { ordered: false });
    } catch (err) {
        if (err?.code !== 11000 && !err?.writeErrors) throw err;
    }
    return rows.length;
}
