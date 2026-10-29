import mongoose from "mongoose";

const settingSchema = new mongoose.Schema(
    {
        business_name: {
            type: String,
            default: "Green Arena Turf",
            trim: true,
        },
        contact_phone: {
            type: String,
            default: "+91 98765 43210",
            trim: true,
        },
        email: {
            type: String,
            default: "hello@greenarena.in",
            trim: true,
        },
        city: {
            type: String,
            default: "Bengaluru",
            trim: true,
        },
        address: {
            type: String,
            default: "Plot 21, Sports Complex Road",
            trim: true,
        },
        allow_partial_payments: {
            type: Boolean,
            default: true,
        },
        sms_confirmation: {
            type: Boolean,
            default: true,
        },
        daily_summary_email: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

const Setting = mongoose.model("Setting", settingSchema);
export default Setting;

