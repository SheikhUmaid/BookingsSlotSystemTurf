import mongoose from "mongoose";





const couponSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true
        },
        discount_percentage: {
            type: Number,
            required: true,
            min: 0,
            max: 100
        },
        active: {
            type: Boolean,
            default: true
        },
        valid_from: {
            type: Date,
            required: true,
            default: Date.now
        },
        valid_until: {
            type: Date,
            required: true
        },
        usage_limit: {
            type: Number,
            default: null // null means unlimited usage
        },
        // How many times ONE customer account may use this coupon
        // (1 = once per customer). null = no per-customer limit.
        per_user_limit: {
            type: Number,
            default: null,
            min: 1
        },
        used_count: {
            type: Number,
            default: 0
        }
    },
    { timestamps: true }
);


const Coupon = mongoose.model("Coupon", couponSchema);

export default Coupon;