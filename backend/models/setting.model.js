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
        // --- Turf location & public details (shown in the booking app) ---
        tagline: {
            type: String,
            default: "",
            trim: true,
            maxlength: 80,
        },
        landmark: {
            type: String,
            default: "",
            trim: true,
        },
        pincode: {
            type: String,
            default: "",
            trim: true,
        },
        opening_hours: {
            type: String,
            default: "06:00 – Midnight",
            trim: true,
        },
        // Google Maps share link, used for directions when no coordinates are set.
        maps_url: {
            type: String,
            default: "",
            trim: true,
        },
        latitude: {
            type: Number,
            default: null,
            min: -90,
            max: 90,
        },
        longitude: {
            type: Number,
            default: null,
            min: -180,
            max: 180,
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
        deploymentStatus: {
            type: String,
            enum: ["active", "inactive", "suspended"],
            default: "active",
            required: true,
        },
        deploymentId: {
            type: String,
            default: "DEP-0001",
        },
        bookingEnabled: {
            type: Boolean,
            default: true,
        },
        subscriptionExpiresAt: {
            type: Date,
            default: () => new Date("2026-11-29T00:00:00.000Z"),
        },
        // Plan object exactly as sent by the Subscription Registry
        // ({ code, name, limits, features }), or null when there is no subscription.
        // Never interpreted here — see services/licence.service.js.
        plan: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
        // Last time the registry answered successfully (null = never synced).
        licenceSyncedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

const Setting = mongoose.model("Setting", settingSchema);
export default Setting;

