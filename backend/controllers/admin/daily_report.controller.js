import Booking from "../../models/booking.model.js";
import Payment from "../../models/payment.model.js";
import Expense from "../../models/expense.model.js";
import { HttpError, sendError } from "../../utils/http.js";
import { addDays, istDayBounds, nowMinutesIST, parseDateOnly, round2, timeToMinutes, toDateStr, todayStr } from "../../utils/dates.js";
import { INACTIVE_BOOKING_STATUSES } from "../../utils/pitch_conflict.js";

/**
 * GET /api/admin/daily-report?date=YYYY-MM-DD
 *
 * Two separate views of money, never added together:
 *  - Booking value: what bookings PLAYED on this date are worth (total_payable).
 *  - Collections: money actually RECEIVED on this date (payment ledger by payment time),
 *    whatever booking it was for. Each rupee appears exactly once, on the day it arrived.
 * Operating result = collections − refunds − expenses (cash basis).
 */
export const getDailyReport = async (req, res) => {
    try {
        const dateStr = req.query.date || todayStr();
        const day = parseDateOnly(dateStr);
        if (!day) throw new HttpError(400, "Date must be YYYY-MM-DD.");
        const { start, end } = istDayBounds(dateStr);

        const [bookings, payments, expenses] = await Promise.all([
            Booking.find({ date: { $gte: day, $lt: addDays(day, 1) } }).populate("time_slots", "start_time end_time").lean(),
            Payment.find({ paidAt: { $gte: start, $lt: end } }).populate("booking", "date").lean(),
            Expense.find({ date: day }).lean(),
        ]);

        // ── Bookings played on the date ─────────────────────────────────
        const today = todayStr();
        const nowMin = nowMinutesIST();
        const active = bookings.filter((b) => !INACTIVE_BOOKING_STATUSES.includes(b.status));
        const isCompleted = (b) => {
            if (dateStr < today) return true;
            if (dateStr > today) return false;
            const lastEnd = Math.max(...(b.time_slots || []).map((s) => timeToMinutes(s.end_time, true) ?? 0));
            return lastEnd <= nowMin;
        };

        const bookingsSection = {
            total: active.length,
            completed: active.filter(isCompleted).length,
            upcoming: active.filter((b) => !isCompleted(b)).length,
            cancelled: bookings.filter((b) => b.status === "cancelled").length,
            expired: bookings.filter((b) => b.status === "expired").length,
            hoursBooked: round2(active.reduce((s, b) => s + (b.time_slots || []).reduce((h, sl) => {
                const a = timeToMinutes(sl.start_time);
                const z = timeToMinutes(sl.end_time, true);
                return h + (a !== null && z !== null && z > a ? (z - a) / 60 : 0);
            }, 0), 0)),
        };

        const bookingValue = round2(active.reduce((s, b) => s + (b.total_payable || 0), 0));
        const collectedForTheseBookings = round2(active.reduce((s, b) => s + (b.amount_paid || 0), 0));
        const pendingForTheseBookings = round2(active.reduce((s, b) => s + Math.max(0, (b.total_payable || 0) - (b.amount_paid || 0)), 0));

        // ── Money received on the date ──────────────────────────────────
        const received = payments.filter((p) => p.kind === "payment");
        const refunds = payments.filter((p) => p.kind === "refund");
        const sum = (rows) => round2(rows.reduce((s, p) => s + p.amount, 0));
        const byMethod = {};
        for (const p of received) byMethod[p.method] = round2((byMethod[p.method] || 0) + p.amount);

        const forToday = received.filter((p) => p.booking && toDateStr(p.booking.date) === dateStr);
        const forOtherDays = received.filter((p) => p.booking && toDateStr(p.booking.date) !== dateStr);

        const totalReceived = sum(received);
        const totalRefunded = sum(refunds);
        const netCollections = round2(totalReceived - totalRefunded);
        const expenseTotal = round2(expenses.reduce((s, e) => s + e.amount, 0));
        const expenseByCategory = {};
        for (const e of expenses) expenseByCategory[e.category] = round2((expenseByCategory[e.category] || 0) + e.amount);

        return res.status(200).json({
            date: dateStr,
            isToday: dateStr === today,
            bookings: bookingsSection,
            bookingValue: {
                total: bookingValue,
                collectedSoFar: collectedForTheseBookings,
                pending: pendingForTheseBookings,
            },
            collections: {
                received: totalReceived,
                online: byMethod.online || 0,
                cash: byMethod.cash || 0,
                otherManual: round2(totalReceived - (byMethod.online || 0) - (byMethod.cash || 0)),
                byMethod,
                refunds: totalRefunded,
                net: netCollections,
                forTodaysBookings: sum(forToday),
                forOtherDaysBookings: sum(forOtherDays),
                transactions: payments.length,
            },
            expenses: {
                total: expenseTotal,
                byCategory: expenseByCategory,
                items: expenses.map((e) => ({ _id: e._id, title: e.title, category: e.category, amount: e.amount })),
            },
            operatingResult: round2(netCollections - expenseTotal),
        });
    } catch (error) {
        return sendError(res, error, "Failed to build daily report.", "getDailyReport");
    }
};
