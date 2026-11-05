import TimeSlot from "../../models/time_slot.model.js";
import Booking from "../../models/booking.model.js";
import Pitch from "../../models/pitch.model.js";
import mongoose from "mongoose";
import { activeBookingFilter, pitchOccupancyFilter } from "../../utils/pitch_conflict.js";
import { findBlockingMaintenance, maintenanceBlocksSlot } from "../../utils/maintenance.js";

/**
 * Parse date parameter (YYYY-MM-DD or DD/MM/YYYY) into UTC { startDate, endDate, dateStr }
 */
function parseDay(rawDate) {
    let dateStr = "";
    if (typeof rawDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        dateStr = rawDate;
    } else if (typeof rawDate === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) {
        const [dd, mm, yyyy] = rawDate.split("/");
        dateStr = `${yyyy}-${mm}-${dd}`;
    } else {
        const d = new Date();
        dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }

    const startDate = new Date(`${dateStr}T00:00:00.000Z`);
    if (Number.isNaN(startDate.getTime())) return null;

    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + 1);

    return { startDate, endDate, dateStr };
}

// ---------------------------------------------------------------------------
// GET /api/admin/time-slots/availability
// ---------------------------------------------------------------------------
/**
 * Get all time slots with their booked status and details for a given date.
 * Query params:
 *   date  – YYYY-MM-DD or DD/MM/YYYY (default: today)
 *   pitch – ObjectId of a pitch (optional). When given, only bookings on that
 *           pitch (and legacy pitch-less bookings) mark a slot as booked.
 *           When omitted, any booking on the date marks the slot as booked.
 */
export const getTimeSlotsAvailability = async (req, res) => {
    try {
        const { date, pitch } = req.query;

        if (pitch && !mongoose.Types.ObjectId.isValid(pitch)) {
            return res.status(400).json({ message: "Invalid pitch ID format." });
        }

        const day = parseDay(date);
        if (!day) {
            return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD." });
        }
        const { startDate, endDate, dateStr } = day;

        // 1. Fetch all system time slots sorted by start_time
        const allSlots = await TimeSlot.find().sort({ start_time: 1 }).lean();

        // 2. Build booking query for that day, scoped to the pitch if given
        const bookingQuery = {
            date: { $gte: startDate, $lt: endDate },
            ...activeBookingFilter(),
            ...(pitch ? pitchOccupancyFilter(pitch) : {}),
        };

        // 3. Find all active bookings on that date
        const bookings = await Booking.find(bookingQuery)
            .populate("user", "name phone email")
            .populate("service", "name")
            .populate("pitch", "name")
            .lean();

        // 4. Map booked slot IDs to booking details
        const bookedMap = new Map();
        for (const b of bookings) {
            const ref = `BK-${b._id.toString().slice(-4).toUpperCase()}`;
            const slotList = Array.isArray(b.time_slots) ? b.time_slots : [];
            for (const s of slotList) {
                const sId = (s._id || s).toString();
                bookedMap.set(sId, {
                    booking_id: b._id,
                    booking_ref: ref,
                    customer_name: b.user?.name || "Customer",
                    customer_phone: b.user?.phone || "",
                    status: b.status,
                    total_payable: b.total_payable,
                    amount_paid: b.amount_paid,
                    service_id: b.service?._id || b.service,
                    service_name: b.service?.name,
                    pitch_id: b.pitch?._id || b.pitch || null,
                    pitch_name: b.pitch?.name,
                });
            }
        }

        // 4b. Maintenance on this pitch (only meaningful when scoped to a pitch)
        const maintenance = pitch ? await findBlockingMaintenance(pitch, startDate, startDate) : [];

        // 5. Build enriched slot objects
        const enrichedSlots = allSlots.map((slot) => {
            const slotId = slot._id.toString();
            const bookedInfo = bookedMap.get(slotId);
            const m = bookedInfo ? null : maintenance.find((r) => maintenanceBlocksSlot(r, startDate, slot));
            return {
                _id: slot._id,
                id: slot._id.toString(),
                start_time: slot.start_time,
                end_time: slot.end_time,
                category: slot.category,
                price: slot.price,
                // Maintenance-blocked slots count as unavailable for booking
                is_booked: !!bookedInfo || !!m,
                booking: bookedInfo ?? null,
                maintenance: m ? { _id: m._id, title: m.title, status: m.status } : null,
            };
        });

        const openCount = enrichedSlots.filter((s) => !s.is_booked).length;
        const bookedCount = enrichedSlots.filter((s) => s.booking).length;
        const blockedCount = enrichedSlots.filter((s) => s.maintenance).length;
        const revenue = enrichedSlots
            .filter((s) => s.booking)
            .reduce((sum, s) => sum + (s.price || 0), 0);

        return res.status(200).json({
            date: dateStr,
            pitch: pitch || null,
            total_slots: enrichedSlots.length,
            open_count: openCount,
            booked_count: bookedCount,
            maintenance_count: blockedCount,
            revenue,
            slots: enrichedSlots,
        });
    } catch (error) {
        console.error("Admin getTimeSlotsAvailability error:", error);
        return res.status(500).json({ message: "Failed to fetch time slot availability." });
    }
};

// ---------------------------------------------------------------------------
// GET /api/admin/time-slots/month-availability
// ---------------------------------------------------------------------------
/**
 * Returns daily availability status ("open" | "limited" | "full") for an entire month.
 * Query params:
 *   month – YYYY-MM (e.g. "2026-10", default: current month)
 *   pitch – ObjectId of a pitch (optional; scopes counts to that pitch)
 */
export const getMonthAvailability = async (req, res) => {
    try {
        const { month, pitch } = req.query;

        if (pitch && !mongoose.Types.ObjectId.isValid(pitch)) {
            return res.status(400).json({ message: "Invalid pitch ID format." });
        }

        let year, monthNum;
        if (month && /^\d{4}-\d{2}$/.test(month)) {
            const [y, m] = month.split("-").map(Number);
            year = y;
            monthNum = m;
        } else {
            const now = new Date();
            year = now.getFullYear();
            monthNum = now.getMonth() + 1;
        }

        const startOfMonth = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0));
        const daysInMonth = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
        const endOfMonth = new Date(Date.UTC(year, monthNum - 1, daysInMonth, 23, 59, 59, 999));

        // Capacity per day: one pitch's slots when scoped, otherwise every pitch's slots
        const slotCount = await TimeSlot.countDocuments();
        const pitchCount = pitch ? 1 : Math.max(1, await Pitch.countDocuments());
        const totalSlotsCount = slotCount * pitchCount;

        // Booking query for the month, scoped to the pitch if given
        const bookingQuery = {
            date: { $gte: startOfMonth, $lte: endOfMonth },
            ...activeBookingFilter(),
            ...(pitch ? pitchOccupancyFilter(pitch) : {}),
        };

        const bookings = await Booking.find(bookingQuery).select("date time_slots").lean();

        // Count booked slots per day (formatted YYYY-MM-DD)
        const bookedPerDay = {};
        for (const b of bookings) {
            if (!b.date) continue;
            const dayStr = new Date(b.date).toISOString().slice(0, 10);
            const count = Array.isArray(b.time_slots) ? b.time_slots.length : 1;
            bookedPerDay[dayStr] = (bookedPerDay[dayStr] || 0) + count;
        }

        // Maintenance-blocked slots (per pitch when scoped, across pitches otherwise)
        const allSlots = await TimeSlot.find().select("start_time end_time").lean();
        const maintenance = await findBlockingMaintenance(pitch || null, startOfMonth, endOfMonth);
        const blockedPerDay = {};
        for (const m of maintenance) {
            for (let d = 1; d <= daysInMonth; d++) {
                const date = new Date(Date.UTC(year, monthNum - 1, d));
                const n = allSlots.filter((s) => maintenanceBlocksSlot(m, date, s)).length;
                if (n) {
                    const key = date.toISOString().slice(0, 10);
                    blockedPerDay[key] = (blockedPerDay[key] || 0) + n;
                }
            }
        }

        const days = {};
        for (let d = 1; d <= daysInMonth; d++) {
            const dayKey = `${year}-${String(monthNum).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const blocked = blockedPerDay[dayKey] || 0;
            const booked = Math.min(totalSlotsCount, (bookedPerDay[dayKey] || 0) + blocked);
            const ratio = totalSlotsCount > 0 ? booked / totalSlotsCount : 0;
            const state = ratio >= 1 ? "full" : ratio >= 0.6 ? "limited" : "open";
            days[dayKey] = {
                booked,
                maintenance: blocked,
                total: totalSlotsCount,
                state,
            };
        }

        return res.status(200).json({
            month: `${year}-${String(monthNum).padStart(2, "0")}`,
            pitch: pitch || null,
            total_slots: totalSlotsCount,
            days,
        });
    } catch (error) {
        console.error("Admin getMonthAvailability error:", error);
        return res.status(500).json({ message: "Failed to fetch month availability." });
    }
};

// ---------------------------------------------------------------------------
// GET /api/admin/time-slots
// ---------------------------------------------------------------------------
/**
 * Get all available time slots defined in the system.
 */
export const getAllAdminTimeSlots = async (req, res) => {
    try {
        const timeSlots = await TimeSlot.find().sort({ start_time: 1 }).lean();
        return res.status(200).json({
            timeSlots,
            total: timeSlots.length,
        });
    } catch (error) {
        console.error("Admin getAllAdminTimeSlots error:", error);
        return res.status(500).json({ message: "Failed to fetch time slots." });
    }
};

// ---------------------------------------------------------------------------
// GET /api/admin/time-slots/:slotId
// ---------------------------------------------------------------------------
export const getTimeSlotById = async (req, res) => {
    try {
        const { slotId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(slotId)) {
            return res.status(400).json({ message: "Invalid time slot ID format." });
        }

        const slot = await TimeSlot.findById(slotId).lean();
        if (!slot) {
            return res.status(404).json({ message: "Time slot not found." });
        }

        return res.status(200).json({ timeSlot: slot });
    } catch (error) {
        console.error("Admin getTimeSlotById error:", error);
        return res.status(500).json({ message: "Failed to fetch time slot." });
    }
};

// ---------------------------------------------------------------------------
// POST /api/admin/time-slots
// ---------------------------------------------------------------------------
/**
 * Create a new time slot with category and price.
 * Body: { start_time, end_time, category, price }
 */
export const createTimeSlot = async (req, res) => {
    try {
        const { start_time, end_time, category, price } = req.body;

        if (!start_time || !/^\d{2}:\d{2}$/.test(String(start_time).trim())) {
            return res.status(400).json({ message: "Start time must be in HH:MM format (e.g. 06:00)." });
        }
        if (!end_time || !/^\d{2}:\d{2}$/.test(String(end_time).trim())) {
            return res.status(400).json({ message: "End time must be in HH:MM format (e.g. 07:00)." });
        }

        const validCategories = ["Morning Sessions", "Afternoon Sessions", "Floodlit Evening", "Late Night"];
        if (!category || !validCategories.includes(category)) {
            return res.status(400).json({ message: `Category must be one of: ${validCategories.join(", ")}` });
        }

        const numPrice = Number(price);
        if (Number.isNaN(numPrice) || numPrice < 0) {
            return res.status(400).json({ message: "Price must be a non-negative number." });
        }

        const sTime = String(start_time).trim();
        const eTime = String(end_time).trim();

        const existing = await TimeSlot.findOne({ start_time: sTime, end_time: eTime });
        if (existing) {
            return res.status(409).json({ message: `Time slot ${sTime} – ${eTime} already exists.` });
        }

        const newSlot = new TimeSlot({
            start_time: sTime,
            end_time: eTime,
            category,
            price: numPrice,
        });

        await newSlot.save();

        return res.status(201).json({
            message: "Time slot created successfully.",
            timeSlot: newSlot,
        });
    } catch (error) {
        console.error("Admin createTimeSlot error:", error);
        return res.status(500).json({ message: "Failed to create time slot." });
    }
};

// ---------------------------------------------------------------------------
// PUT / PATCH /api/admin/time-slots/:slotId
// ---------------------------------------------------------------------------
/**
 * Update time slot price, category, and/or hours.
 */
export const updateTimeSlot = async (req, res) => {
    try {
        const { slotId } = req.params;
        const { start_time, end_time, category, price } = req.body;

        if (!mongoose.Types.ObjectId.isValid(slotId)) {
            return res.status(400).json({ message: "Invalid time slot ID format." });
        }

        const slot = await TimeSlot.findById(slotId);
        if (!slot) {
            return res.status(404).json({ message: "Time slot not found." });
        }

        if (start_time !== undefined) {
            if (!/^\d{2}:\d{2}$/.test(String(start_time).trim())) {
                return res.status(400).json({ message: "Start time must be in HH:MM format." });
            }
            slot.start_time = String(start_time).trim();
        }

        if (end_time !== undefined) {
            if (!/^\d{2}:\d{2}$/.test(String(end_time).trim())) {
                return res.status(400).json({ message: "End time must be in HH:MM format." });
            }
            slot.end_time = String(end_time).trim();
        }

        if (category !== undefined) {
            const validCategories = ["Morning Sessions", "Afternoon Sessions", "Floodlit Evening", "Late Night"];
            if (!validCategories.includes(category)) {
                return res.status(400).json({ message: `Category must be one of: ${validCategories.join(", ")}` });
            }
            slot.category = category;
        }

        if (price !== undefined) {
            const numPrice = Number(price);
            if (Number.isNaN(numPrice) || numPrice < 0) {
                return res.status(400).json({ message: "Price must be a non-negative number." });
            }
            slot.price = numPrice;
        }

        // Verify uniqueness if times changed
        if (start_time !== undefined || end_time !== undefined) {
            const duplicate = await TimeSlot.findOne({
                _id: { $ne: slotId },
                start_time: slot.start_time,
                end_time: slot.end_time,
            });
            if (duplicate) {
                return res.status(409).json({ message: `Time slot ${slot.start_time} – ${slot.end_time} already exists.` });
            }
        }

        await slot.save();

        return res.status(200).json({
            message: "Time slot updated successfully.",
            timeSlot: slot,
        });
    } catch (error) {
        console.error("Admin updateTimeSlot error:", error);
        return res.status(500).json({ message: "Failed to update time slot." });
    }
};

// ---------------------------------------------------------------------------
// DELETE /api/admin/time-slots/:slotId
// ---------------------------------------------------------------------------
/**
 * Delete a time slot if not referenced by active bookings.
 */
export const deleteTimeSlot = async (req, res) => {
    try {
        const { slotId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(slotId)) {
            return res.status(400).json({ message: "Invalid time slot ID format." });
        }

        const slot = await TimeSlot.findById(slotId);
        if (!slot) {
            return res.status(404).json({ message: "Time slot not found." });
        }

        const activeBookingsCount = await Booking.countDocuments({
            time_slots: slotId,
            status: { $ne: "cancelled" },
        });

        if (activeBookingsCount > 0) {
            return res.status(400).json({
                message: `Cannot delete slot ${slot.start_time} – ${slot.end_time} because it is referenced in ${activeBookingsCount} active booking(s).`,
            });
        }

        await TimeSlot.findByIdAndDelete(slotId);

        return res.status(200).json({
            message: `Time slot ${slot.start_time} – ${slot.end_time} deleted successfully.`,
        });
    } catch (error) {
        console.error("Admin deleteTimeSlot error:", error);
        return res.status(500).json({ message: "Failed to delete time slot." });
    }
};

