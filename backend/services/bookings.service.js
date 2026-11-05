import Booking from "../models/booking.model.js";
import { HttpError } from "../utils/http.js";

/**
 * Cancel a booking and free its slots.
 * Money already collected stays on the booking until it's refunded explicitly
 * (POST /api/admin/bookings/:id/refunds) so the payment trail is never lost.
 */
export async function cancelBooking(bookingId) {
    const booking = await Booking.findOneAndUpdate(
        { _id: bookingId, status: { $ne: "cancelled" } },
        { $set: { status: "cancelled" } },
        { new: true }
    );
    if (!booking) {
        const exists = await Booking.exists({ _id: bookingId });
        if (!exists) throw new HttpError(404, "Booking not found.");
        return { booking: await Booking.findById(bookingId), alreadyCancelled: true };
    }
    return { booking, alreadyCancelled: false };
}
