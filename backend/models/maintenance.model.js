import mongoose from "mongoose";

/**
 * Maintenance on a pitch. While pending or in progress it blocks every slot that
 * overlaps [start_time, end_time) on each day from start_date to end_date
 * (inclusive). Completed or cancelled records no longer block anything.
 */
const maintenanceSchema = new mongoose.Schema(
    {
        pitch: { type: mongoose.Schema.Types.ObjectId, ref: "Pitch", required: true },
        title: { type: String, required: true, trim: true, maxlength: 120 },
        description: { type: String, trim: true, default: "" },
        start_date: { type: Date, required: true },
        end_date: { type: Date, required: true },
        start_time: { type: String, default: "00:00" },
        end_time: { type: String, default: "24:00" },
        status: { type: String, enum: ["pending", "in_progress", "completed", "cancelled"], default: "pending" },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        completedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

maintenanceSchema.index({ pitch: 1, status: 1, start_date: 1, end_date: 1 });

const Maintenance = mongoose.model("Maintenance", maintenanceSchema);
export default Maintenance;
