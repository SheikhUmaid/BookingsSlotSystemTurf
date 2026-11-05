import mongoose from "mongoose";
import Booking from "../../models/booking.model.js";
import Pitch from "../../models/pitch.model.js";
import Service from "../../models/service.model.js";
import TimeSlot from "../../models/time_slot.model.js";
import User from "../../models/user.model.js";
import RecurringSchedule from "../../models/recurring_schedule.model.js";
import { activeBookingFilter, pitchOccupancyFilter } from "../../utils/pitch_conflict.js";
import { findBlockingMaintenance, maintenanceBlocksSlot } from "../../utils/maintenance.js";
import { runInTransaction, withSession } from "../../utils/db.js";
import { HttpError, sendError } from "../../utils/http.js";
import { DAY_MS, addDays, nowMinutesIST, parseDateOnly, round2, timeToMinutes, toDateStr, todayStr } from "../../utils/dates.js";
import { paymentStatusOf } from "../../services/payments.service.js";
import { cancelBooking } from "../../services/bookings.service.js";

const MAX_OCCURRENCES = 156;
const MAX_SPAN_DAYS = 366;
const bookingRef = (id) => `BK-${String(id).slice(-4).toUpperCase()}`;

/** Every date of the schedule between start and end (inclusive). */
export function generateDates({ frequency, weekdays = [], interval = 1, day_of_month, start_date, end_date }) {
    const dates = [];
    const start = new Date(start_date);
    const end = new Date(end_date);
    if (frequency === "weekly") {
        // Weeks are counted from the Sunday of the start week, so "every 2 weeks" stays aligned.
        const anchor = addDays(start, -start.getUTCDay());
        for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
            const week = Math.floor((d - anchor) / (7 * DAY_MS));
            if (week % interval === 0 && weekdays.includes(d.getUTCDay())) dates.push(new Date(d));
        }
    } else {
        // Monthly on day N; months that are shorter use their last day (e.g. 31st → 30 Nov).
        let y = start.getUTCFullYear();
        let m = start.getUTCMonth();
        while (true) {
            const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
            const d = new Date(Date.UTC(y, m, Math.min(day_of_month, last)));
            if (d > end) break;
            if (d >= start) dates.push(d);
            m += 1;
            if (m > 11) { m = 0; y += 1; }
        }
    }
    return dates;
}

/** Validates the request body and loads referenced docs. */
async function parseScheduleInput(body) {
    const { customer_id, customer_name, customer_phone, service, pitch, time_slots, frequency, weekdays, interval, day_of_month, start_date, end_date, price_per_occurrence, title, notes } = body;

    if (!["weekly", "monthly"].includes(frequency)) throw new HttpError(400, "Frequency must be weekly or monthly.");
    const start = parseDateOnly(start_date);
    const end = parseDateOnly(end_date);
    if (!start || !end) throw new HttpError(400, "Start and end dates are required (YYYY-MM-DD).");
    if (end < start) throw new HttpError(400, "End date must be on or after the start date.");
    if ((end - start) / DAY_MS > MAX_SPAN_DAYS) throw new HttpError(400, "A schedule can run for at most one year. Create a new one to continue after that.");
    if (toDateStr(end) < todayStr()) throw new HttpError(400, "The schedule ends in the past.");

    let wd = [];
    let iv = 1;
    let dom = null;
    if (frequency === "weekly") {
        wd = [...new Set((Array.isArray(weekdays) ? weekdays : []).map(Number))].filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
        if (!wd.length) throw new HttpError(400, "Pick at least one day of the week.");
        iv = Number(interval ?? 1);
        if (!Number.isInteger(iv) || iv < 1 || iv > 4) throw new HttpError(400, "Repeat interval must be every 1–4 weeks.");
    } else {
        dom = Number(day_of_month ?? start.getUTCDate());
        if (!Number.isInteger(dom) || dom < 1 || dom > 31) throw new HttpError(400, "Day of month must be 1–31.");
    }

    if (!mongoose.Types.ObjectId.isValid(pitch)) throw new HttpError(400, "Please select a pitch.");
    const slotIds = (Array.isArray(time_slots) ? time_slots : [time_slots]).filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (!slotIds.length) throw new HttpError(400, "Select at least one time slot.");
    if (new Set(slotIds.map(String)).size !== slotIds.length) throw new HttpError(400, "Duplicate time slots.");

    const [pitchDoc, slots, serviceDoc] = await Promise.all([
        Pitch.findById(pitch).select("name").lean(),
        TimeSlot.find({ _id: { $in: slotIds } }).lean(),
        service && mongoose.Types.ObjectId.isValid(service) ? Service.findById(service).select("name").lean() : Service.findOne().select("name").lean(),
    ]);
    if (!pitchDoc) throw new HttpError(404, "Pitch not found.");
    if (slots.length !== slotIds.length) throw new HttpError(400, "One or more time slots don't exist.");
    if (!serviceDoc) throw new HttpError(400, "No sport/service configured.");

    let customer = null;
    if (customer_id) {
        if (!mongoose.Types.ObjectId.isValid(customer_id)) throw new HttpError(400, "Invalid customer ID.");
        customer = await User.findOne({ _id: customer_id, role: "user" }).select("name phone").lean();
        if (!customer) throw new HttpError(404, "Customer not found.");
    } else {
        const cleanPhone = String(customer_phone || "").replace(/\D/g, "").slice(-10);
        if (!/^[6-9]\d{9}$/.test(cleanPhone)) throw new HttpError(400, "Choose a customer or enter a valid 10-digit mobile number.");
        if (!customer_name || String(customer_name).trim().length < 2) throw new HttpError(400, "Customer name is required.");
        customer = { _id: null, name: String(customer_name).trim(), phone: cleanPhone };
    }

    const listPrice = slots.reduce((s, sl) => s + (sl.price || 0), 0);
    let price = listPrice;
    if (price_per_occurrence !== undefined && price_per_occurrence !== null && price_per_occurrence !== "") {
        price = round2(Number(price_per_occurrence));
        if (!Number.isFinite(price) || price < 0) throw new HttpError(400, "Price per session must be zero or more.");
    }

    const dates = generateDates({ frequency, weekdays: wd, interval: iv, day_of_month: dom, start_date: start, end_date: end });
    if (!dates.length) throw new HttpError(400, "These settings don't produce any dates in the chosen range.");
    if (dates.length > MAX_OCCURRENCES) throw new HttpError(400, `That's ${dates.length} sessions — the maximum is ${MAX_OCCURRENCES}. Shorten the date range.`);

    return {
        customer,
        pitchDoc,
        serviceDoc,
        slots,
        dates,
        listPrice,
        price,
        schedule: { frequency, weekdays: wd, interval: iv, day_of_month: dom, start_date: start, end_date: end, title: (title || "").trim(), notes: (notes || "").trim() },
    };
}

/** Availability of each date: past / booked / maintenance / available. */
async function checkDates(pitchId, slots, dates) {
    const slotIds = slots.map((s) => s._id);
    const first = dates[0];
    const last = dates[dates.length - 1];
    const [clashes, maintenance] = await Promise.all([
        Booking.find({
            date: { $in: dates },
            time_slots: { $in: slotIds },
            ...activeBookingFilter(),
            ...pitchOccupancyFilter(pitchId),
        })
            .select("date user")
            .populate("user", "name")
            .lean(),
        findBlockingMaintenance(pitchId, first, last),
    ]);

    const today = todayStr();
    const nowMin = nowMinutesIST();
    const earliestStart = Math.min(...slots.map((s) => timeToMinutes(s.start_time)));

    return dates.map((d) => {
        const day = toDateStr(d);
        if (day < today || (day === today && earliestStart <= nowMin)) {
            return { date: day, available: false, reason: "past", detail: "Already in the past" };
        }
        const clash = clashes.find((b) => toDateStr(b.date) === day);
        if (clash) return { date: day, available: false, reason: "booked", detail: `Already booked${clash.user?.name ? ` by ${clash.user.name}` : ""}` };
        const m = maintenance.find((r) => slots.some((s) => maintenanceBlocksSlot(r, d, s)));
        if (m) return { date: day, available: false, reason: "maintenance", detail: `Maintenance: ${m.title}` };
        return { date: day, available: true };
    });
}

// ---------------------------------------------------------------------------
// POST /api/admin/recurring/preview — what would be created, with conflicts
// ---------------------------------------------------------------------------
export const previewSchedule = async (req, res) => {
    try {
        const input = await parseScheduleInput(req.body);
        const occurrences = await checkDates(input.pitchDoc._id, input.slots, input.dates);
        const available = occurrences.filter((o) => o.available).length;
        return res.status(200).json({
            occurrences,
            summary: {
                total: occurrences.length,
                available,
                conflicts: occurrences.length - available,
                price_per_occurrence: input.price,
                list_price: input.listPrice,
                total_value: round2(available * input.price),
            },
        });
    } catch (error) {
        return sendError(res, error, "Failed to preview schedule.", "previewSchedule");
    }
};

// ---------------------------------------------------------------------------
// POST /api/admin/recurring  — create schedule + one pending booking per available date
// Body: same as preview + skip_conflicts (bool). Customers are NOT charged; each
// occurrence is a normal unpaid booking you collect for as usual.
// ---------------------------------------------------------------------------
export const createSchedule = async (req, res) => {
    try {
        const input = await parseScheduleInput(req.body);
        const occurrences = await checkDates(input.pitchDoc._id, input.slots, input.dates);
        const available = occurrences.filter((o) => o.available);
        const conflicts = occurrences.filter((o) => !o.available);

        if (!available.length) throw new HttpError(409, "None of the dates are available.", { conflicts });
        if (conflicts.length && !req.body.skip_conflicts) {
            throw new HttpError(409, `${conflicts.length} of ${occurrences.length} dates aren't available. Review them and confirm to book only the free dates.`, { conflicts });
        }

        // Find or create the customer
        let customerId = input.customer._id;
        if (!customerId) {
            const existing = await User.findOne({ phone: input.customer.phone }).lean();
            if (existing && existing.role !== "user") throw new HttpError(409, "This phone number belongs to a team account.");
            customerId = existing?._id || (await User.create({ name: input.customer.name, phone: input.customer.phone, role: "user" }))._id;
        }

        const result = await runInTransaction(async (session) => {
            const [schedule] = await RecurringSchedule.create(
                [{
                    ...input.schedule,
                    user: customerId,
                    service: input.serviceDoc._id,
                    pitch: input.pitchDoc._id,
                    time_slots: input.slots.map((s) => s._id),
                    price_per_occurrence: input.price,
                    createdBy: req.user._id,
                }],
                withSession(session)
            );

            // Re-check right before inserting to narrow the race window with other bookings.
            const recheck = await checkDates(input.pitchDoc._id, input.slots, available.map((o) => parseDateOnly(o.date)));
            const finalDates = recheck.filter((o) => o.available).map((o) => parseDateOnly(o.date));
            if (!finalDates.length) throw new HttpError(409, "The dates were just taken. Please preview again.");

            const docs = finalDates.map((date) => ({
                user: customerId,
                service: input.serviceDoc._id,
                pitch: input.pitchDoc._id,
                time_slots: input.slots.map((s) => s._id),
                date,
                status: input.price > 0 ? "pending" : "paid",
                total_payable: input.price,
                amount_paid: 0,
                payment_type: "full",
                source: "recurring",
                recurring: schedule._id,
                // Long hold: recurring sessions are collected at the venue, never auto-expired.
                expires_at: addDays(date, 400),
            }));
            try {
                await Booking.insertMany(docs, withSession(session));
            } catch (err) {
                if (!session) await RecurringSchedule.deleteOne({ _id: schedule._id });
                throw err;
            }
            return { schedule, created: docs.length, skipped: occurrences.length - docs.length };
        });

        return res.status(201).json({
            message: `Recurring schedule created: ${result.created} session(s) booked${result.skipped ? `, ${result.skipped} skipped` : ""}.`,
            schedule: result.schedule,
            created: result.created,
            skipped: result.skipped,
            conflicts,
        });
    } catch (error) {
        return sendError(res, error, "Failed to create recurring schedule.", "createSchedule");
    }
};

// ---------------------------------------------------------------------------
// GET /api/admin/recurring?status=active|cancelled
// ---------------------------------------------------------------------------
export const listSchedules = async (req, res) => {
    try {
        const filter = {};
        if (["active", "cancelled"].includes(req.query.status)) filter.status = req.query.status;
        const schedules = await RecurringSchedule.find(filter)
            .sort({ status: 1, createdAt: -1 })
            .populate("user", "name phone")
            .populate("pitch", "name")
            .populate("service", "name")
            .populate("time_slots", "start_time end_time")
            .lean();

        const today = new Date(`${todayStr()}T00:00:00.000Z`);
        const stats = await Booking.aggregate([
            { $match: { recurring: { $in: schedules.map((s) => s._id) } } },
            {
                $group: {
                    _id: "$recurring",
                    total: { $sum: 1 },
                    cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
                    upcoming: { $sum: { $cond: [{ $and: [{ $ne: ["$status", "cancelled"] }, { $gte: ["$date", today] }] }, 1, 0] } },
                    nextDate: { $min: { $cond: [{ $and: [{ $ne: ["$status", "cancelled"] }, { $gte: ["$date", today] }] }, "$date", null] } },
                    outstanding: { $sum: { $cond: [{ $ne: ["$status", "cancelled"] }, { $max: [0, { $subtract: ["$total_payable", "$amount_paid"] }] }, 0] } },
                    collected: { $sum: "$amount_paid" },
                },
            },
        ]);
        const byId = new Map(stats.map((s) => [String(s._id), s]));

        return res.status(200).json({
            schedules: schedules.map((s) => ({ ...s, stats: byId.get(String(s._id)) || { total: 0, cancelled: 0, upcoming: 0, nextDate: null, outstanding: 0, collected: 0 } })),
        });
    } catch (error) {
        return sendError(res, error, "Failed to fetch recurring schedules.", "listSchedules");
    }
};

async function loadSchedule(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new HttpError(400, "Invalid schedule ID.");
    const schedule = await RecurringSchedule.findById(id)
        .populate("user", "name phone")
        .populate("pitch", "name")
        .populate("service", "name")
        .populate("time_slots", "start_time end_time")
        .lean();
    if (!schedule) throw new HttpError(404, "Recurring schedule not found.");
    return schedule;
}

// GET /api/admin/recurring/:scheduleId
export const getSchedule = async (req, res) => {
    try {
        const schedule = await loadSchedule(req.params.scheduleId);
        const occurrences = await Booking.find({ recurring: schedule._id }).sort({ date: 1 }).lean();
        return res.status(200).json({
            schedule,
            occurrences: occurrences.map((b) => ({
                _id: b._id,
                booking_ref: bookingRef(b._id),
                date: b.date,
                status: b.status,
                total_payable: b.total_payable,
                amount_paid: b.amount_paid,
                balance: b.status === "cancelled" ? 0 : Math.max(0, b.total_payable - b.amount_paid),
                payment_status: paymentStatusOf(b),
            })),
        });
    } catch (error) {
        return sendError(res, error, "Failed to fetch schedule.", "getSchedule");
    }
};

// POST /api/admin/recurring/:scheduleId/occurrences/:bookingId/cancel
export const cancelOccurrence = async (req, res) => {
    try {
        const { scheduleId, bookingId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(bookingId)) throw new HttpError(400, "Invalid booking ID.");
        const booking = await Booking.findOne({ _id: bookingId, recurring: scheduleId }).lean();
        if (!booking) throw new HttpError(404, "This session doesn't belong to the schedule.");
        const { alreadyCancelled, booking: updated } = await cancelBooking(bookingId);
        return res.status(200).json({
            message: alreadyCancelled ? "Session was already cancelled." : `Session on ${toDateStr(booking.date)} cancelled.`,
            paid_amount: updated.amount_paid,
            refund_needed: updated.amount_paid > 0,
        });
    } catch (error) {
        return sendError(res, error, "Failed to cancel session.", "cancelOccurrence");
    }
};

// POST /api/admin/recurring/:scheduleId/cancel  — stop the schedule and cancel every future session
export const cancelSchedule = async (req, res) => {
    try {
        const schedule = await loadSchedule(req.params.scheduleId);
        const today = new Date(`${todayStr()}T00:00:00.000Z`);
        const future = await Booking.find({ recurring: schedule._id, date: { $gte: today }, status: { $ne: "cancelled" } }).select("_id amount_paid").lean();

        let cancelled = 0;
        let withPayments = 0;
        for (const b of future) {
            const r = await cancelBooking(b._id);
            if (!r.alreadyCancelled) cancelled += 1;
            if (b.amount_paid > 0) withPayments += 1;
        }
        await RecurringSchedule.updateOne({ _id: schedule._id }, { $set: { status: "cancelled", cancelledAt: new Date() } });

        return res.status(200).json({
            message: `Schedule cancelled. ${cancelled} upcoming session(s) cancelled; past sessions are kept.`,
            cancelled,
            sessions_with_payments: withPayments,
        });
    } catch (error) {
        return sendError(res, error, "Failed to cancel schedule.", "cancelSchedule");
    }
};
