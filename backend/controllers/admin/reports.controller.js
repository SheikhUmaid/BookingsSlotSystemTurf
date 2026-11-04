import Booking from "../../models/booking.model.js";

/**
 * Reports for the admin panel. Each endpoint is gated by its own plan feature
 * in routes/admin/reports.router.js.
 *
 * Common query params: from=YYYY-MM-DD, to=YYYY-MM-DD (inclusive).
 * Defaults to the last 30 days.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ACTIVE = (b) => b.status !== "cancelled" && b.status !== "expired";

const toDateStr = (d) => new Date(d).toISOString().slice(0, 10);

function parseRange(query) {
    const to = DATE_RE.test(query.to || "") ? new Date(`${query.to}T00:00:00.000Z`) : new Date(`${toDateStr(new Date())}T00:00:00.000Z`);
    let from;
    if (DATE_RE.test(query.from || "")) {
        from = new Date(`${query.from}T00:00:00.000Z`);
    } else {
        from = new Date(to);
        from.setUTCDate(from.getUTCDate() - 29);
    }
    if (from > to) return null;
    const end = new Date(to);
    end.setUTCDate(end.getUTCDate() + 1);
    return { from, to, end };
}

async function loadBookings(range, populate = []) {
    let q = Booking.find({ date: { $gte: range.from, $lt: range.end } });
    for (const p of populate) q = q.populate(...p);
    return q.lean();
}

const rangeOut = (r) => ({ from: toDateStr(r.from), to: toDateStr(r.to) });

// ---------------------------------------------------------------------------
// GET /api/admin/reports/pitches          (pitchWiseReports)
// ---------------------------------------------------------------------------
export const getPitchReport = async (req, res) => {
    try {
        const range = parseRange(req.query);
        if (!range) return res.status(400).json({ message: "'from' must be before 'to'." });

        const bookings = await loadBookings(range, [["pitch", "name size"]]);
        const rows = new Map();
        for (const b of bookings) {
            const key = b.pitch?._id?.toString() || "unassigned";
            if (!rows.has(key)) {
                rows.set(key, {
                    pitchId: b.pitch?._id ?? null,
                    name: b.pitch?.name || "Unassigned (legacy)",
                    size: b.pitch?.size || "",
                    bookings: 0,
                    slotsBooked: 0,
                    cancelled: 0,
                    revenue: 0,
                    outstanding: 0,
                });
            }
            const r = rows.get(key);
            r.revenue += b.amount_paid || 0;
            if (ACTIVE(b)) {
                r.bookings += 1;
                r.slotsBooked += b.time_slots?.length || 0;
                r.outstanding += Math.max(0, (b.total_payable || 0) - (b.amount_paid || 0));
            } else if (b.status === "cancelled") {
                r.cancelled += 1;
            }
        }

        const pitches = [...rows.values()].sort((a, b) => b.revenue - a.revenue);
        const totalRevenue = pitches.reduce((s, p) => s + p.revenue, 0);
        for (const p of pitches) p.revenueShare = totalRevenue ? p.revenue / totalRevenue : 0;

        return res.status(200).json({ range: rangeOut(range), totalRevenue, pitches });
    } catch (error) {
        console.error("Admin getPitchReport error:", error);
        return res.status(500).json({ message: "Failed to build pitch report." });
    }
};

// ---------------------------------------------------------------------------
// GET /api/admin/reports/leaderboard?limit=10   (leaderboards)
// ---------------------------------------------------------------------------
export const getLeaderboard = async (req, res) => {
    try {
        const range = parseRange(req.query);
        if (!range) return res.status(400).json({ message: "'from' must be before 'to'." });
        const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));

        const bookings = await loadBookings(range, [["user", "name phone"]]);
        const players = new Map();
        for (const b of bookings) {
            if (!ACTIVE(b) || !b.user) continue;
            const key = b.user._id.toString();
            if (!players.has(key)) {
                players.set(key, {
                    userId: b.user._id,
                    name: b.user.name || "Customer",
                    phone: b.user.phone || "",
                    bookings: 0,
                    hours: 0,
                    spent: 0,
                    lastBooking: null,
                });
            }
            const p = players.get(key);
            p.bookings += 1;
            p.hours += b.time_slots?.length || 0;
            p.spent += b.amount_paid || 0;
            if (!p.lastBooking || b.date > p.lastBooking) p.lastBooking = b.date;
        }

        const all = [...players.values()];
        const byBookings = [...all].sort((a, b) => b.bookings - a.bookings || b.spent - a.spent).slice(0, limit);
        const bySpend = [...all].sort((a, b) => b.spent - a.spent || b.bookings - a.bookings).slice(0, limit);

        return res.status(200).json({ range: rangeOut(range), byBookings, bySpend });
    } catch (error) {
        console.error("Admin getLeaderboard error:", error);
        return res.status(500).json({ message: "Failed to build leaderboard." });
    }
};

// ---------------------------------------------------------------------------
// GET /api/admin/reports/analytics        (advancedAnalytics)
// ---------------------------------------------------------------------------
export const getAdvancedAnalytics = async (req, res) => {
    try {
        const range = parseRange(req.query);
        if (!range) return res.status(400).json({ message: "'from' must be before 'to'." });

        const bookings = await loadBookings(range, [
            ["service", "name"],
            ["time_slots", "start_time"],
        ]);
        const active = bookings.filter(ACTIVE);

        const byWeekday = WEEKDAYS.map((day) => ({ day, bookings: 0, revenue: 0 }));
        const byHourMap = new Map();
        const byServiceMap = new Map();
        const perUser = new Map();

        for (const b of active) {
            const wd = byWeekday[new Date(b.date).getUTCDay()];
            wd.bookings += 1;
            wd.revenue += b.amount_paid || 0;

            for (const s of b.time_slots || []) {
                const hour = (s.start_time || "").slice(0, 2);
                if (!hour) continue;
                byHourMap.set(hour, (byHourMap.get(hour) || 0) + 1);
            }

            const svc = b.service?.name || "Other";
            const sv = byServiceMap.get(svc) || { service: svc, bookings: 0, revenue: 0 };
            sv.bookings += 1;
            sv.revenue += b.amount_paid || 0;
            byServiceMap.set(svc, sv);

            const uid = b.user?.toString();
            if (uid) perUser.set(uid, (perUser.get(uid) || 0) + 1);
        }

        const revenue = active.reduce((s, b) => s + (b.amount_paid || 0), 0);
        const billed = active.reduce((s, b) => s + (b.total_payable || 0), 0);
        const customers = perUser.size;
        const repeatCustomers = [...perUser.values()].filter((n) => n > 1).length;
        const cancelled = bookings.filter((b) => b.status === "cancelled").length;

        return res.status(200).json({
            range: rangeOut(range),
            kpis: {
                bookings: active.length,
                revenue,
                avgBookingValue: active.length ? Math.round(billed / active.length) : 0,
                collectionRate: billed ? revenue / billed : 0,
                customers,
                repeatCustomerRate: customers ? repeatCustomers / customers : 0,
                cancellationRate: bookings.length ? cancelled / bookings.length : 0,
            },
            byWeekday,
            byHour: [...byHourMap.entries()]
                .map(([hour, slots]) => ({ hour: `${hour}:00`, slots }))
                .sort((a, b) => a.hour.localeCompare(b.hour)),
            byService: [...byServiceMap.values()].sort((a, b) => b.revenue - a.revenue),
        });
    } catch (error) {
        console.error("Admin getAdvancedAnalytics error:", error);
        return res.status(500).json({ message: "Failed to build analytics." });
    }
};

// ---------------------------------------------------------------------------
// GET /api/admin/reports/export/bookings   (financialExports)
// Returns CSV (UTF-8 with BOM so Excel opens it correctly).
// ---------------------------------------------------------------------------
const csvCell = (v) => {
    let s = v === null || v === undefined ? "" : String(v);
    // Neutralise spreadsheet formula injection
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const exportBookingsCsv = async (req, res) => {
    try {
        const range = parseRange(req.query);
        if (!range) return res.status(400).json({ message: "'from' must be before 'to'." });

        const bookings = await Booking.find({ date: { $gte: range.from, $lt: range.end } })
            .sort({ date: 1, createdAt: 1 })
            .populate("user", "name phone")
            .populate("service", "name")
            .populate("pitch", "name")
            .populate("time_slots", "start_time end_time")
            .lean();

        const header = [
            "Booking ID", "Date", "Slots", "Customer", "Phone", "Service", "Pitch",
            "Status", "Payment type", "Total payable", "Amount paid", "Outstanding",
            "Razorpay order", "Razorpay payment", "Created at",
        ];
        const lines = [header.map(csvCell).join(",")];
        for (const b of bookings) {
            const slots = (b.time_slots || []).map((s) => `${s.start_time}-${s.end_time}`).join(" | ");
            lines.push([
                `BK-${b._id.toString().slice(-4).toUpperCase()}`,
                toDateStr(b.date),
                slots,
                b.user?.name || "",
                b.user?.phone || "",
                b.service?.name || "",
                b.pitch?.name || "",
                b.status,
                b.payment_type,
                b.total_payable || 0,
                b.amount_paid || 0,
                Math.max(0, (b.total_payable || 0) - (b.amount_paid || 0)),
                b.payment_order_id || "",
                b.payment_id || "",
                b.createdAt ? new Date(b.createdAt).toISOString() : "",
            ].map(csvCell).join(","));
        }

        const { from, to } = rangeOut(range);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="bookings_${from}_to_${to}.csv"`);
        return res.status(200).send("﻿" + lines.join("\r\n"));
    } catch (error) {
        console.error("Admin exportBookingsCsv error:", error);
        return res.status(500).json({ message: "Failed to export bookings." });
    }
};
