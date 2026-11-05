import mongoose from "mongoose";
import Booking from "../models/booking.model.js";
import Setting from "../models/setting.model.js";
import { INACTIVE_BOOKING_STATUSES } from "../utils/pitch_conflict.js";
import { DAY_MS, round2, todayStr } from "../utils/dates.js";

/**
 * Customer statistics and categories, computed from bookings
 * (nothing is duplicated onto the User document, so numbers are always current).
 *
 * Categories (thresholds editable in Settings):
 *   new        – fewer than `regular` bookings and active recently (or joined recently)
 *   regular    – ≥ crm_regular_min_bookings bookings in the last 90 days
 *   inactive   – no booking in the last crm_inactive_days days
 *   high_value – total spent ≥ crm_high_value_threshold (can combine with the others)
 */

export const CATEGORY_LABELS = {
    new: "New",
    regular: "Regular",
    inactive: "Inactive",
    high_value: "High-Value",
};

export async function getCrmSettings() {
    const s = (await Setting.findOne().select("crm_high_value_threshold crm_inactive_days crm_regular_min_bookings").lean()) || {};
    return {
        highValueThreshold: s.crm_high_value_threshold ?? 10000,
        inactiveDays: s.crm_inactive_days ?? 45,
        regularMinBookings: s.crm_regular_min_bookings ?? 4,
    };
}

/** Map<userId, stats> for the given users (or everyone with bookings when userIds is omitted). */
export async function bookingStatsByUser(userIds) {
    const today = new Date(`${todayStr()}T00:00:00.000Z`);
    const since90 = new Date(today.getTime() - 89 * DAY_MS);
    const match = userIds ? { user: { $in: userIds.map((id) => new mongoose.Types.ObjectId(String(id))) } } : {};
    const isActive = { $not: [{ $in: ["$status", INACTIVE_BOOKING_STATUSES] }] };

    const rows = await Booking.aggregate([
        { $match: match },
        {
            $group: {
                _id: "$user",
                totalBookings: { $sum: { $cond: [isActive, 1, 0] } },
                cancelledBookings: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
                bookingsLast90: { $sum: { $cond: [{ $and: [isActive, { $gte: ["$date", since90] }, { $lte: ["$date", today] }] }, 1, 0] } },
                spentOnBookings: { $sum: "$amount_paid" },
                outstanding: {
                    $sum: { $cond: [isActive, { $max: [0, { $subtract: ["$total_payable", "$amount_paid"] }] }, 0] },
                },
                firstBookingDate: { $min: { $cond: [isActive, "$date", null] } },
                lastBookingDate: { $max: { $cond: [{ $and: [isActive, { $lte: ["$date", today] }] }, "$date", null] } },
                nextBookingDate: { $min: { $cond: [{ $and: [isActive, { $gt: ["$date", today] }] }, "$date", null] } },
            },
        },
    ]);

    const map = new Map(rows.map((r) => [String(r._id), r]));
    return map;
}

/** Combine a user with their raw stats into the CRM shape. */
export function buildCustomer(user, raw = {}, settings) {
    const today = new Date(`${todayStr()}T00:00:00.000Z`);
    const joinedAt = user._id.getTimestamp ? user._id.getTimestamp() : new Date();
    const totalBookings = raw.totalBookings || 0;
    const totalSpent = round2(raw.spentOnBookings || 0);
    const lastActivity = raw.nextBookingDate || raw.lastBookingDate || null;
    const daysSinceLast = raw.lastBookingDate ? Math.round((today - new Date(raw.lastBookingDate)) / DAY_MS) : null;

    let lifecycle;
    const cutoff = today.getTime() - settings.inactiveDays * DAY_MS;
    if (!totalBookings) lifecycle = joinedAt.getTime() >= cutoff ? "new" : "inactive";
    else if (!lastActivity || new Date(lastActivity).getTime() < cutoff) lifecycle = "inactive";
    else if ((raw.bookingsLast90 || 0) >= settings.regularMinBookings) lifecycle = "regular";
    else lifecycle = "new";

    const categories = [lifecycle];
    if (totalSpent >= settings.highValueThreshold && totalSpent > 0) categories.push("high_value");

    // Booking frequency
    let avgDaysBetween = null;
    if (totalBookings > 1 && raw.firstBookingDate && (raw.lastBookingDate || raw.nextBookingDate)) {
        const span = (new Date(raw.lastBookingDate || raw.nextBookingDate) - new Date(raw.firstBookingDate)) / DAY_MS;
        avgDaysBetween = Math.round((span / (totalBookings - 1)) * 10) / 10;
    }

    return {
        _id: user._id,
        name: user.name || "",
        phone: user.phone,
        email: user.email || "",
        joinedAt,
        totalBookings,
        cancelledBookings: raw.cancelledBookings || 0,
        bookingsLast90: raw.bookingsLast90 || 0,
        bookingsPerMonth: round2((raw.bookingsLast90 || 0) / 3),
        avgDaysBetween,
        totalSpent,
        outstanding: round2(raw.outstanding || 0),
        firstBookingDate: raw.firstBookingDate || null,
        lastBookingDate: raw.lastBookingDate || null,
        nextBookingDate: raw.nextBookingDate || null,
        daysSinceLastBooking: daysSinceLast,
        lifecycle,
        categories,
    };
}
