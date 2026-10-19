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
        enum: ["pending", "partial", "paid", "cancelled"],
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
    payment_id: {
        type: String
    },
    payment_signature: {
        type: String
    }
}, { timestamps: true })

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
