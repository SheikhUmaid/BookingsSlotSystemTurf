import Pitch from "../models/pitch.model.js";

// GET /api/pitches — public list used by the customer booking page
export const getAllPitches = async (req, res) => {
    try {
        const pitches = await Pitch.find()
            .sort({ createdAt: 1 })
            .select("name size description")
            .lean();
        return res.status(200).json(pitches);
    } catch (error) {
        console.error("Get pitches error:", error);
        return res.status(500).json({ message: "Failed to fetch pitches." });
    }
};
