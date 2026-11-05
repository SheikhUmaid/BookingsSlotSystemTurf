import mongoose from "mongoose";

const bookingSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    service: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
        required: true
    },
    // Not required at schema level so legacy bookings (pre-pitch) stay valid.
    // Controllers require it for every new booking.
    pitch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Pitch",
        default: null
    },
    time_slots: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "TimeSlot",
        required: true
    }],
    date: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        // "expired" is set by the expiry cron for unpaid online bookings.
        enum: ["pending", "partial", "paid", "cancelled", "expired"],
        default: "pending"
    },
    total_payable: {
        type: Number,
        default: 0
    },
    amount_paid: {
        type: Number,
        default: 0
    },
    payment_type: {
        type: String,
        enum: ["full", "partial"],
        default: "full"
    },

    expires_at: {
        type: Date,
        required: true
    },
    payment_order_id: {
        type: String
    },

    payment_order_amount: {
        type: Number,
        default:null
    },
    payment_id: {
        type: String
    },
    payment_signature: {
        type: String
    },
    // Net money collected = sum(payments) − sum(refunds); amount_paid above is kept
    // equal to that net figure. Gross refunds are tracked here.
    amount_refunded: {
        type: Number,
        default: 0
    },
    // Where the booking came from (null for bookings created before this field existed)
    source: {
        type: String,
        enum: ["online", "admin", "recurring", null],
        default: null
    },
    // Coupon applied to this booking (used for per-customer coupon limits)
    coupon: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Coupon",
        default: null
    },
    coupon_code: {
        type: String,
        default: null
    },
    // Occurrence of a recurring schedule
    recurring: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "RecurringSchedule",
        default: null
    }
}, { timestamps: true })

bookingSchema.index({ date: 1, pitch: 1, status: 1 });
bookingSchema.index({ user: 1, date: -1 });
bookingSchema.index({ status: 1, expires_at: 1 });
bookingSchema.index({ recurring: 1, date: 1 });
bookingSchema.index({ coupon: 1, user: 1 }, { sparse: true });
bookingSchema.index({ payment_order_id: 1 }, { sparse: true });
bookingSchema.index({ createdAt: -1 });

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
