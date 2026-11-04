import mongoose from "mongoose";

const pitchSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        // Free text, e.g. "5-a-side", "40 x 20 m"
        size: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            default: "",
            trim: true,
        },
    },
    { timestamps: true }
);

const Pitch = mongoose.model("Pitch", pitchSchema);
export default Pitch;
