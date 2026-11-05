import mongoose from "mongoose";
import User from "../../models/user.model.js";
import Booking from "../../models/booking.model.js";
import Payment from "../../models/payment.model.js";
import CustomerNote from "../../models/customer_note.model.js";
import RecurringSchedule from "../../models/recurring_schedule.model.js";
import {
    CATEGORY_LABELS,
    bookingStatsByUser,
    buildCustomer,
    getCrmSettings,
} from "../../services/customers.service.js";
import { paymentStatusOf } from "../../services/payments.service.js";
import { HttpError, escapeRegex, sendError } from "../../utils/http.js";

const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS);
const bookingRef = (id) => `BK-${String(id).slice(-4).toUpperCase()}`;

/** All customers with computed stats (venue-scale: hundreds to low thousands of rows). */
async function loadAllCustomers() {
    const [users, statsMap, settings] = await Promise.all([
        User.find({ role: "user" }).select("name phone email").lean(),
        bookingStatsByUser(),
        getCrmSettings(),
    ]);
    return { customers: users.map((u) => buildCustomer(u, statsMap.get(String(u._id)), settings)), settings };
}

const SORTERS = {
    recent: (a, b) => new Date(b.lastBookingDate || b.nextBookingDate || 0) - new Date(a.lastBookingDate || a.nextBookingDate || 0),
    spent: (a, b) => b.totalSpent - a.totalSpent,
    bookings: (a, b) => b.totalBookings - a.totalBookings,
    outstanding: (a, b) => b.outstanding - a.outstanding,
    name: (a, b) => (a.name || a.phone).localeCompare(b.name || b.phone),
    joined: (a, b) => new Date(b.joinedAt) - new Date(a.joinedAt),
};

// ---------------------------------------------------------------------------
// GET /api/admin/customers?search=&category=&sort=&page=&limit=
// ---------------------------------------------------------------------------
export const listCustomers = async (req, res) => {
    try {
        const { search = "", category = "", sort = "recent" } = req.query;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
        if (category && !CATEGORY_KEYS.includes(category) && category !== "outstanding") {
            return res.status(400).json({ message: `category must be one of: ${CATEGORY_KEYS.join(", ")}, outstanding.` });
        }

        const { customers, settings } = await loadAllCustomers();

        let rows = customers;
        if (search.trim()) {
            const re = new RegExp(escapeRegex(search.trim()), "i");
            rows = rows.filter((c) => re.test(c.name) || re.test(c.phone) || re.test(c.email));
        }

        const counts = { all: rows.length, outstanding: rows.filter((c) => c.outstanding > 0).length };
        for (const k of CATEGORY_KEYS) counts[k] = rows.filter((c) => c.categories.includes(k)).length;

        if (category === "outstanding") rows = rows.filter((c) => c.outstanding > 0);
        else if (category) rows = rows.filter((c) => c.categories.includes(category));

        rows = [...rows].sort(SORTERS[sort] || SORTERS.recent);
        const total = rows.length;

        return res.status(200).json({
            customers: rows.slice((page - 1) * limit, page * limit),
            total,
            page,
            pages: Math.max(1, Math.ceil(total / limit)),
            counts,
            categories: CATEGORY_LABELS,
            settings,
        });
    } catch (error) {
        return sendError(res, error, "Failed to fetch customers.", "listCustomers");
    }
};

// ---------------------------------------------------------------------------
// GET /api/admin/customers/retention
// ---------------------------------------------------------------------------
export const getRetention = async (req, res) => {
    try {
        const { customers, settings } = await loadAllCustomers();
        const booked = customers.filter((c) => c.totalBookings > 0);
        const top = (arr, sorter, n = 15) => [...arr].sort(sorter).slice(0, n);

        const recentlyActive = top(
            booked.filter((c) => c.daysSinceLastBooking !== null && c.daysSinceLastBooking <= 14),
            (a, b) => a.daysSinceLastBooking - b.daysSinceLastBooking
        );
        // Lapsed: used to book, nothing upcoming, gone quiet. Most recently lapsed first (easiest to win back).
        const lapsed = top(
            booked.filter((c) => !c.nextBookingDate && c.daysSinceLastBooking !== null && c.daysSinceLastBooking > Math.min(21, settings.inactiveDays)),
            (a, b) => a.daysSinceLastBooking - b.daysSinceLastBooking,
            25
        );
        const mostFrequent = top(booked.filter((c) => c.bookingsLast90 > 0), (a, b) => b.bookingsLast90 - a.bookingsLast90 || b.totalBookings - a.totalBookings);
        const highestSpending = top(booked.filter((c) => c.totalSpent > 0), (a, b) => b.totalSpent - a.totalSpent);

        const freq = { weekly: 0, fortnightly: 0, monthly: 0, occasional: 0 };
        for (const c of booked) {
            const perMonth = c.bookingsPerMonth;
            if (perMonth >= 4) freq.weekly += 1;
            else if (perMonth >= 2) freq.fortnightly += 1;
            else if (perMonth >= 1) freq.monthly += 1;
            else freq.occasional += 1;
        }

        return res.status(200).json({
            settings,
            totals: {
                customers: customers.length,
                withBookings: booked.length,
                active30: booked.filter((c) => c.daysSinceLastBooking !== null && c.daysSinceLastBooking <= 30).length,
            },
            recentlyActive,
            lapsed,
            mostFrequent,
            highestSpending,
            frequency: [
                { key: "weekly", label: "Weekly or more (4+/month)", count: freq.weekly },
                { key: "fortnightly", label: "2–3 times a month", count: freq.fortnightly },
                { key: "monthly", label: "About once a month", count: freq.monthly },
                { key: "occasional", label: "Less than monthly", count: freq.occasional },
            ],
        });
    } catch (error) {
        return sendError(res, error, "Failed to build retention data.", "getRetention");
    }
};

// ---------------------------------------------------------------------------
// POST /api/admin/customers   { name, phone, email? }
// ---------------------------------------------------------------------------
export const createCustomer = async (req, res) => {
    try {
        const { name, phone, email } = req.body;
        if (!name || typeof name !== "string" || name.trim().length < 2) {
            throw new HttpError(400, "Customer name must be at least 2 characters.");
        }
        const cleanPhone = String(phone || "").replace(/\D/g, "").slice(-10);
        if (!/^[6-9]\d{9}$/.test(cleanPhone)) throw new HttpError(400, "A valid 10-digit mobile number is required.");
        if (email && !/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, "Email is invalid.");

        const existing = await User.findOne({ phone: cleanPhone }).lean();
        if (existing) {
            throw new HttpError(409, existing.role === "user"
                ? "A customer with this phone number already exists."
                : "This phone number belongs to a team account.", { customerId: existing.role === "user" ? existing._id : undefined });
        }
        const user = await User.create({ name: name.trim(), phone: cleanPhone, email: email?.trim().toLowerCase() || undefined, role: "user" });
        return res.status(201).json({ message: "Customer added.", customer: { _id: user._id, name: user.name, phone: user.phone, email: user.email || "" } });
    } catch (error) {
        return sendError(res, error, "Failed to create customer.", "createCustomer");
    }
};

async function findCustomer(customerId) {
    if (!mongoose.Types.ObjectId.isValid(customerId)) throw new HttpError(400, "Invalid customer ID.");
    const user = await User.findOne({ _id: customerId, role: "user" }).select("name phone email").lean();
    if (!user) throw new HttpError(404, "Customer not found.");
    return user;
}

// ---------------------------------------------------------------------------
// GET /api/admin/customers/:customerId  — full profile
// ---------------------------------------------------------------------------
export const getCustomer = async (req, res) => {
    try {
        const user = await findCustomer(req.params.customerId);
        const [statsMap, settings, bookings, payments, notes, schedules] = await Promise.all([
            bookingStatsByUser([user._id]),
            getCrmSettings(),
            Booking.find({ user: user._id })
                .sort({ date: -1 })
                .populate("service", "name")
                .populate("pitch", "name")
                .populate("time_slots", "start_time end_time")
                .lean(),
            Payment.find({ user: user._id }).sort({ paidAt: -1 }).limit(200).lean(),
            CustomerNote.find({ user: user._id }).sort({ createdAt: -1 }).populate("author", "name").lean(),
            RecurringSchedule.find({ user: user._id }).sort({ createdAt: -1 }).populate("pitch", "name").populate("time_slots", "start_time end_time").lean(),
        ]);

        const refById = new Map(bookings.map((b) => [String(b._id), bookingRef(b._id)]));

        return res.status(200).json({
            customer: buildCustomer(user, statsMap.get(String(user._id)), settings),
            categories: CATEGORY_LABELS,
            bookings: bookings.map((b) => ({
                _id: b._id,
                booking_ref: bookingRef(b._id),
                date: b.date,
                service: b.service?.name || "",
                pitch: b.pitch?.name || "",
                time_slots: b.time_slots || [],
                status: b.status,
                total_payable: b.total_payable,
                amount_paid: b.amount_paid,
                amount_refunded: b.amount_refunded || 0,
                balance: ["cancelled", "expired"].includes(b.status) ? 0 : Math.max(0, (b.total_payable || 0) - (b.amount_paid || 0)),
                payment_status: paymentStatusOf(b),
                recurring: b.recurring || null,
            })),
            payments: payments.map((p) => ({
                ...p,
                booking_ref: p.booking ? refById.get(String(p.booking)) || bookingRef(p.booking) : null,
            })),
            notes,
            recurring: schedules,
        });
    } catch (error) {
        return sendError(res, error, "Failed to fetch customer.", "getCustomer");
    }
};

// ---------------------------------------------------------------------------
// PATCH /api/admin/customers/:customerId   { name?, email? }
// Phone is the customer's login identity, so it is not editable here.
// ---------------------------------------------------------------------------
export const updateCustomer = async (req, res) => {
    try {
        const user = await findCustomer(req.params.customerId);
        const $set = {};
        const $unset = {};
        const { name, email } = req.body;
        if (name !== undefined) {
            if (typeof name !== "string" || name.trim().length < 2) throw new HttpError(400, "Name must be at least 2 characters.");
            $set.name = name.trim();
        }
        if (email !== undefined) {
            if (email && (typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email))) throw new HttpError(400, "Email is invalid.");
            if (email) $set.email = email.trim().toLowerCase();
            else $unset.email = "";
        }
        const updated = await User.findByIdAndUpdate(user._id, { $set, $unset }, { new: true })
            .select("name phone email")
            .lean();
        return res.status(200).json({ message: "Customer updated.", customer: updated });
    } catch (error) {
        return sendError(res, error, "Failed to update customer.", "updateCustomer");
    }
};

// ---------------------------------------------------------------------------
// POST /api/admin/customers/:customerId/notes   { body }
// DELETE /api/admin/customers/:customerId/notes/:noteId
// ---------------------------------------------------------------------------
export const addNote = async (req, res) => {
    try {
        const user = await findCustomer(req.params.customerId);
        const body = typeof req.body.body === "string" ? req.body.body.trim() : "";
        if (!body) throw new HttpError(400, "Note can't be empty.");
        if (body.length > 2000) throw new HttpError(400, "Note is too long (max 2000 characters).");
        const note = await CustomerNote.create({ user: user._id, body, author: req.user._id });
        await note.populate("author", "name");
        return res.status(201).json({ message: "Note added.", note });
    } catch (error) {
        return sendError(res, error, "Failed to add note.", "addNote");
    }
};

export const deleteNote = async (req, res) => {
    try {
        const { customerId, noteId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(noteId)) throw new HttpError(400, "Invalid note ID.");
        const note = await CustomerNote.findOne({ _id: noteId, user: customerId });
        if (!note) throw new HttpError(404, "Note not found.");
        // Staff may only delete their own notes; admins any.
        if (req.user.role !== "admin" && String(note.author) !== String(req.user._id)) {
            throw new HttpError(403, "You can only delete notes you wrote.");
        }
        await note.deleteOne();
        return res.status(200).json({ message: "Note deleted." });
    } catch (error) {
        return sendError(res, error, "Failed to delete note.", "deleteNote");
    }
};
