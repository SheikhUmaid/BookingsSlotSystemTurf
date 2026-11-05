import mongoose from "mongoose";
import Maintenance from "../models/maintenance.model.js";
import { timeToMinutes, toDateStr } from "./dates.js";

/** Only these statuses block bookings. */
export const BLOCKING_MAINTENANCE_STATUSES = ["pending", "in_progress"];

/**
 * Blocking maintenance records that touch [from, to] (UTC-midnight dates, inclusive).
 * `pitchId` null = all pitches.
 */
export function findBlockingMaintenance(pitchId, from, to, { excludeId } = {}) {
    return Maintenance.find({
        status: { $in: BLOCKING_MAINTENANCE_STATUSES },
        start_date: { $lte: to },
        end_date: { $gte: from },
        ...(pitchId ? { pitch: new mongoose.Types.ObjectId(String(pitchId)) } : {}),
        ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    }).lean();
}

/** Does maintenance record `m` block `slot` on calendar day `date` (on its pitch)? */
export function maintenanceBlocksSlot(m, date, slot) {
    const day = toDateStr(date);
    if (day < toDateStr(m.start_date) || day > toDateStr(m.end_date)) return false;
    const mStart = timeToMinutes(m.start_time) ?? 0;
    const mEnd = timeToMinutes(m.end_time, true) ?? 24 * 60;
    const sStart = timeToMinutes(slot.start_time);
    const sEnd = timeToMinutes(slot.end_time, true);
    if (sStart === null || sEnd === null) return false;
    return sStart < mEnd && sEnd > mStart;
}

/**
 * First blocking maintenance record for `pitchId` on `date` overlapping any of `slots`
 * (slot docs with start_time/end_time), or null.
 */
export async function findMaintenanceConflict(pitchId, date, slots) {
    const records = await findBlockingMaintenance(pitchId, date, date);
    for (const m of records) {
        if (slots.some((s) => maintenanceBlocksSlot(m, date, s))) return m;
    }
    return null;
}

/** Map of slotId → maintenance record, for one pitch and day. */
export async function maintenanceBlockedSlots(pitchId, date, slots) {
    const blocked = new Map();
    const records = await findBlockingMaintenance(pitchId, date, date);
    for (const slot of slots) {
        const m = records.find((r) => maintenanceBlocksSlot(r, date, slot));
        if (m) blocked.set(String(slot._id), m);
    }
    return blocked;
}

export const maintenanceMessage = (m) =>
    `This pitch is closed for maintenance${m?.title ? ` (${m.title})` : ""} during the selected time.`;
