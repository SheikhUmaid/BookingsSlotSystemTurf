import mongoose from "mongoose";

/**
 * Booking filter that matches bookings occupying the given pitch.
 *
 * Slots are unique per (pitch, date, time slot) regardless of service/sport.
 * Legacy bookings created before pitches existed have no `pitch` field; they
 * are treated as occupying the slot on EVERY pitch so nothing double-books.
 * (`{ pitch: null }` matches both a missing field and an explicit null.)
 */
export const pitchOccupancyFilter = (pitchId) => ({
    $or: [
        { pitch: new mongoose.Types.ObjectId(String(pitchId)) },
        { pitch: null },
    ],
});

/**
 * Statuses that no longer hold a slot. "expired" = an online booking whose
 * 5-minute payment window lapsed; it must free the slot just like a cancellation.
 */
export const INACTIVE_BOOKING_STATUSES = ["cancelled", "expired"];
export const activeBookingFilter = () => ({ status: { $nin: INACTIVE_BOOKING_STATUSES } });
