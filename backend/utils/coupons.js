import Booking from "../models/booking.model.js";
import { INACTIVE_BOOKING_STATUSES } from "./pitch_conflict.js";

/**
 * How many times a customer has used a coupon. Only bookings that still stand
 * count — if a booking expires (payment not completed) or is cancelled, the
 * customer can use the coupon again.
 */
export function customerCouponUses(couponId, userId) {
    return Booking.countDocuments({
        coupon: couponId,
        user: userId,
        status: { $nin: INACTIVE_BOOKING_STATUSES },
    });
}

export function perUserLimitMessage(limit) {
    return limit === 1
        ? "You've already used this coupon. It can be used only once per account."
        : `You've already used this coupon ${limit} times — the maximum allowed per account.`;
}
