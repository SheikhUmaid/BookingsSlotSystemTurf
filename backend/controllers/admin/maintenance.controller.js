import mongoose from "mongoose";
import Maintenance from "../../models/maintenance.model.js";
import Booking from "../../models/booking.model.js";
import Pitch from "../../models/pitch.model.js";
import { BLOCKING_MAINTENANCE_STATUSES, maintenanceBlocksSlot } from "../../utils/maintenance.js";
import { activeBookingFilter, pitchOccupancyFilter } from "../../utils/pitch_conflict.js";
import { HttpError, sendError } from "../../utils/http.js";
import { addDays, parseDateOnly, timeToMinutes, toDateStr } from "../../utils/dates.js";

const STATUSES = ["pending", "in_progress", "completed", "cancelled"];
const bookingRef = (id) => `BK-${String(id).slice(-4).toUpperCase()}`;

function parseBody(body, current = null) {
    const out = {};
    const has = (k) => body[k] !== undefined;
    if (!current || has("pitch")) {
        if (!mongoose.Types.ObjectId.isValid(body.pitch)) throw new HttpError(400, "Select the affected pitch.");
        out.pitch = body.pitch;
    }
    if (!current || has("title")) {
        if (typeof body.title !== "string" || !body.title.trim()) throw new HttpError(400, "Title is required.");
        out.title = body.title.trim().slice(0, 120);
    }
    if (has("description")) out.description = String(body.description || "").trim().slice(0, 2000);
    if (!current || has("start_date")) {
        out.start_date = parseDateOnly(body.start_date);
        if (!out.start_date) throw new HttpError(400, "Start date is required (YYYY-MM-DD).");
    }
    if (!current || has("end_date")) {
        out.end_date = parseDateOnly(body.end_date || body.start_date);
        if (!out.end_date) throw new HttpError(400, "End date must be YYYY-MM-DD.");
    }
    const allDay = body.all_day === true;
    if (allDay) {
        out.start_time = "00:00";
        out.end_time = "24:00";
    } else {
        if (has("start_time")) out.start_time = body.start_time || "00:00";
        if (has("end_time")) out.end_time = body.end_time || "24:00";
    }
    if (has("status")) {
        if (!STATUSES.includes(body.status)) throw new HttpError(400, `Status must be one of: ${STATUSES.join(", ")}.`);
        out.status = body.status;
    }

    const merged = { ...(current || {}), ...out };
    if (merged.end_date < merged.start_date) throw new HttpError(400, "End date must be on or after the start date.");
    if ((merged.end_date - merged.start_date) / 864e5 > 120) throw new HttpError(400, "A maintenance block can cover at most 120 days.");
    const s = timeToMinutes(merged.start_time || "00:00");
    const e = timeToMinutes(merged.end_time || "24:00", true);
    if (s === null || e === null) throw new HttpError(400, "Times must be HH:MM.");
    if (s >= e) throw new HttpError(400, "End time must be after start time.");
    return { out, merged };
}

/** Active bookings that would sit inside this maintenance window. */
async function conflictingBookings(m) {
    const bookings = await Booking.find({
        date: { $gte: m.start_date, $lt: addDays(m.end_date, 1) },
        ...activeBookingFilter(),
        ...pitchOccupancyFilter(m.pitch),
    })
        .populate("time_slots", "start_time end_time")
        .populate("user", "name phone")
        .lean();
    return bookings
        .filter((b) => (b.time_slots || []).some((s) => maintenanceBlocksSlot(m, b.date, s)))
        .map((b) => ({
            _id: b._id,
            booking_ref: bookingRef(b._id),
            date: toDateStr(b.date),
            customer: b.user?.name || "",
            phone: b.user?.phone || "",
            slots: (b.time_slots || []).map((s) => `${s.start_time}–${s.end_time}`).join(", "),
        }));
}

// GET /api/admin/maintenance?status=&pitch=&from=&to=
export const listMaintenance = async (req, res) => {
    try {
        const { status = "", pitch = "" } = req.query;
        const filter = {};
        if (status === "open") filter.status = { $in: BLOCKING_MAINTENANCE_STATUSES };
        else if (status) {
            if (!STATUSES.includes(status)) throw new HttpError(400, "Invalid status.");
            filter.status = status;
        }
        if (pitch) {
            if (!mongoose.Types.ObjectId.isValid(pitch)) throw new HttpError(400, "Invalid pitch.");
            filter.pitch = pitch;
        }
        const from = req.query.from ? parseDateOnly(req.query.from) : null;
        const to = req.query.to ? parseDateOnly(req.query.to) : null;
        if (from) filter.end_date = { $gte: from };
        if (to) filter.start_date = { $lte: to };

        const records = await Maintenance.find(filter)
            .sort({ start_date: -1 })
            .limit(300)
            .populate("pitch", "name")
            .populate("createdBy", "name")
            .lean();
        return res.status(200).json({ maintenance: records });
    } catch (error) {
        return sendError(res, error, "Failed to fetch maintenance records.", "listMaintenance");
    }
};

// POST /api/admin/maintenance  { pitch, title, description?, start_date, end_date?, start_time?, end_time?, all_day?, status?, acknowledge_conflicts? }
export const createMaintenance = async (req, res) => {
    try {
        const { out } = parseBody(req.body);
        if (!(await Pitch.exists({ _id: out.pitch }))) throw new HttpError(404, "Pitch not found.");
        const record = { start_time: "00:00", end_time: "24:00", status: "pending", ...out };

        if (BLOCKING_MAINTENANCE_STATUSES.includes(record.status)) {
            const conflicts = await conflictingBookings(record);
            if (conflicts.length && !req.body.acknowledge_conflicts) {
                throw new HttpError(409, `${conflicts.length} existing booking(s) fall in this window. They will NOT be cancelled automatically — contact those customers, then confirm to save.`, { conflicts });
            }
        }
        const m = await Maintenance.create({ ...record, createdBy: req.user._id });
        return res.status(201).json({ message: "Maintenance scheduled. Those slots can no longer be booked.", maintenance: m });
    } catch (error) {
        return sendError(res, error, "Failed to create maintenance record.", "createMaintenance");
    }
};

// PATCH /api/admin/maintenance/:id
export const updateMaintenance = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw new HttpError(400, "Invalid ID.");
        const current = await Maintenance.findById(req.params.id).lean();
        if (!current) throw new HttpError(404, "Maintenance record not found.");
        const { out, merged } = parseBody(req.body, current);

        const timingChanged = ["pitch", "start_date", "end_date", "start_time", "end_time"].some((k) => k in out) ||
            (out.status && BLOCKING_MAINTENANCE_STATUSES.includes(out.status) && !BLOCKING_MAINTENANCE_STATUSES.includes(current.status));
        if (timingChanged && BLOCKING_MAINTENANCE_STATUSES.includes(merged.status)) {
            const conflicts = await conflictingBookings(merged);
            if (conflicts.length && !req.body.acknowledge_conflicts) {
                throw new HttpError(409, `${conflicts.length} existing booking(s) fall in this window. Confirm to save anyway.`, { conflicts });
            }
        }
        if (out.status === "completed" && current.status !== "completed") out.completedAt = new Date();
        const m = await Maintenance.findByIdAndUpdate(req.params.id, { $set: out }, { new: true }).populate("pitch", "name");
        return res.status(200).json({ message: "Maintenance updated.", maintenance: m });
    } catch (error) {
        return sendError(res, error, "Failed to update maintenance record.", "updateMaintenance");
    }
};

// DELETE /api/admin/maintenance/:id
export const deleteMaintenance = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw new HttpError(400, "Invalid ID.");
        const m = await Maintenance.findByIdAndDelete(req.params.id);
        if (!m) throw new HttpError(404, "Maintenance record not found.");
        return res.status(200).json({ message: "Maintenance record deleted. Its slots are bookable again." });
    } catch (error) {
        return sendError(res, error, "Failed to delete maintenance record.", "deleteMaintenance");
    }
};
