import mongoose from "mongoose";

/**
 * A repeating reservation (e.g. "every Mon & Wed 7 PM on Pitch A").
 * Each occurrence is a normal Booking with `recurring` pointing here, so
 * availability, payments and reports treat it like any other booking.
 */
const recurringScheduleSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        title: { type: String, trim: true, default: "" }, // e.g. team name
        service: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true },
        pitch: { type: mongoose.Schema.Types.ObjectId, ref: "Pitch", required: true },
        time_slots: [{ type: mongoose.Schema.Types.ObjectId, ref: "TimeSlot", required: true }],
        frequency: { type: String, enum: ["weekly", "monthly"], required: true },
        weekdays: [{ type: Number, min: 0, max: 6 }], // weekly: 0 = Sunday
        interval: { type: Number, default: 1, min: 1, max: 4 }, // weekly: every N weeks
        day_of_month: { type: Number, min: 1, max: 31, default: null }, // monthly
        start_date: { type: Date, required: true },
        end_date: { type: Date, required: true },
        price_per_occurrence: { type: Number, required: true, min: 0 },
        status: { type: String, enum: ["active", "cancelled"], default: "active" },
        notes: { type: String, trim: true, default: "" },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        cancelledAt: { type: Date, default: null },
    },
    { timestamps: true }
);

recurringScheduleSchema.index({ status: 1, end_date: 1 });
recurringScheduleSchema.index({ user: 1 });

const RecurringSchedule = mongoose.model("RecurringSchedule", recurringScheduleSchema);
export default RecurringSchedule;
