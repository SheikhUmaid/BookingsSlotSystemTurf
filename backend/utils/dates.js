/**
 * Date conventions used across TurfOS:
 *  - Calendar dates (booking.date, expense.date, maintenance days) are stored as
 *    UTC midnight of the venue-local (Asia/Kolkata) calendar day: "2026-11-05" → 2026-11-05T00:00:00Z.
 *  - Real moments (payment.paidAt, createdAt) are true timestamps; to group them by
 *    venue-local day use istDayBounds().
 *  - Slot times are "HH:MM" strings in venue-local time.
 */
export const VENUE_TZ = "Asia/Kolkata";
const IST_OFFSET_MS = 330 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** "YYYY-MM-DD" → Date at UTC midnight, or null if invalid. */
export function parseDateOnly(value) {
    if (typeof value !== "string" || !DATE_RE.test(value)) return null;
    const d = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) return null;
    return d;
}

export const toDateStr = (d) => new Date(d).toISOString().slice(0, 10);

export const addDays = (d, n) => new Date(new Date(d).getTime() + n * DAY_MS);

/** Venue-local "today" as "YYYY-MM-DD". */
export function todayStr(now = new Date()) {
    return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Minutes since venue-local midnight for `now`. */
export function nowMinutesIST(now = new Date()) {
    const local = new Date(now.getTime() + IST_OFFSET_MS);
    return local.getUTCHours() * 60 + local.getUTCMinutes();
}

/** Real-time [start, end) instants of a venue-local calendar day. */
export function istDayBounds(dateStr) {
    const start = new Date(new Date(`${dateStr}T00:00:00.000Z`).getTime() - IST_OFFSET_MS);
    return { start, end: new Date(start.getTime() + DAY_MS) };
}

/** "HH:MM" → minutes. `isEnd` maps "00:00" to 24:00 (a slot ending at midnight). */
export function timeToMinutes(hhmm, isEnd = false) {
    if (typeof hhmm !== "string" || !/^\d{2}:\d{2}$/.test(hhmm)) return null;
    const [h, m] = hhmm.split(":").map(Number);
    const mins = h * 60 + m;
    return isEnd && mins === 0 ? 24 * 60 : mins;
}

/** Duration of a slot in hours (handles slots ending at midnight). */
export function slotHours(slot) {
    const s = timeToMinutes(slot.start_time);
    const e = timeToMinutes(slot.end_time, true);
    if (s === null || e === null || e <= s) return 0;
    return (e - s) / 60;
}

export const round2 = (n) => Math.round(n * 100) / 100;
