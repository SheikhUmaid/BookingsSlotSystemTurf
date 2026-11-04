import Pitch from "../../models/pitch.model.js";
import Booking from "../../models/booking.model.js";
import mongoose from "mongoose";

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findByNameInsensitive = (name, excludeId) =>
    Pitch.findOne({
        ...(excludeId ? { _id: { $ne: excludeId } } : {}),
        name: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") },
    });

// ---------------------------------------------------------------------------
// GET /api/admin/pitches
// ---------------------------------------------------------------------------
export const getAllPitches = async (req, res) => {
    try {
        const pitches = await Pitch.find().sort({ createdAt: 1 }).lean();
        return res.status(200).json({ pitches, total: pitches.length });
    } catch (error) {
        console.error("Admin getAllPitches error:", error);
        return res.status(500).json({ message: "Failed to fetch pitches." });
    }
};

// ---------------------------------------------------------------------------
// GET /api/admin/pitches/:pitchId
// ---------------------------------------------------------------------------
export const getPitchById = async (req, res) => {
    try {
        const { pitchId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(pitchId)) {
            return res.status(400).json({ message: "Invalid pitch ID format." });
        }

        const pitch = await Pitch.findById(pitchId).lean();
        if (!pitch) {
            return res.status(404).json({ message: "Pitch not found." });
        }

        return res.status(200).json({ pitch });
    } catch (error) {
        console.error("Admin getPitchById error:", error);
        return res.status(500).json({ message: "Failed to fetch pitch." });
    }
};

// ---------------------------------------------------------------------------
// POST /api/admin/pitches
// Body: { name, size, description }
// ---------------------------------------------------------------------------
export const createPitch = async (req, res) => {
    try {
        const { name, size, description } = req.body;

        if (!name || typeof name !== "string" || name.trim().length < 1) {
            return res.status(400).json({ message: "Pitch name is required." });
        }
        if (!size || typeof size !== "string" || size.trim().length < 1) {
            return res.status(400).json({ message: "Pitch size is required." });
        }
        if (description !== undefined && typeof description !== "string") {
            return res.status(400).json({ message: "Description must be text." });
        }

        if (await findByNameInsensitive(name.trim())) {
            return res.status(409).json({ message: `A pitch named "${name.trim()}" already exists.` });
        }

        const pitch = await Pitch.create({
            name: name.trim(),
            size: size.trim(),
            description: (description ?? "").trim(),
        });

        return res.status(201).json({ message: "Pitch created successfully.", pitch });
    } catch (error) {
        console.error("Admin createPitch error:", error);
        return res.status(500).json({ message: "Failed to create pitch." });
    }
};

// ---------------------------------------------------------------------------
// PUT / PATCH /api/admin/pitches/:pitchId
// Body: { name?, size?, description? }
// ---------------------------------------------------------------------------
export const updatePitch = async (req, res) => {
    try {
        const { pitchId } = req.params;
        const { name, size, description } = req.body;

        if (!mongoose.Types.ObjectId.isValid(pitchId)) {
            return res.status(400).json({ message: "Invalid pitch ID format." });
        }

        const pitch = await Pitch.findById(pitchId);
        if (!pitch) {
            return res.status(404).json({ message: "Pitch not found." });
        }

        if (name !== undefined) {
            if (typeof name !== "string" || name.trim().length < 1) {
                return res.status(400).json({ message: "Pitch name is required." });
            }
            if (await findByNameInsensitive(name.trim(), pitchId)) {
                return res.status(409).json({ message: `A pitch named "${name.trim()}" already exists.` });
            }
            pitch.name = name.trim();
        }

        if (size !== undefined) {
            if (typeof size !== "string" || size.trim().length < 1) {
                return res.status(400).json({ message: "Pitch size is required." });
            }
            pitch.size = size.trim();
        }

        if (description !== undefined) {
            if (typeof description !== "string") {
                return res.status(400).json({ message: "Description must be text." });
            }
            pitch.description = description.trim();
        }

        await pitch.save();

        return res.status(200).json({ message: "Pitch updated successfully.", pitch });
    } catch (error) {
        console.error("Admin updatePitch error:", error);
        return res.status(500).json({ message: "Failed to update pitch." });
    }
};

// ---------------------------------------------------------------------------
// DELETE /api/admin/pitches/:pitchId
// Rejects if active bookings reference this pitch.
// ---------------------------------------------------------------------------
export const deletePitch = async (req, res) => {
    try {
        const { pitchId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(pitchId)) {
            return res.status(400).json({ message: "Invalid pitch ID format." });
        }

        const pitch = await Pitch.findById(pitchId);
        if (!pitch) {
            return res.status(404).json({ message: "Pitch not found." });
        }

        const activeBookingsCount = await Booking.countDocuments({
            pitch: pitchId,
            status: { $ne: "cancelled" },
        });

        if (activeBookingsCount > 0) {
            return res.status(400).json({
                message: `Cannot delete "${pitch.name}" because it is linked to ${activeBookingsCount} active booking(s). Please cancel those bookings first.`,
            });
        }

        await Pitch.findByIdAndDelete(pitchId);

        return res.status(200).json({ message: `Pitch "${pitch.name}" deleted successfully.` });
    } catch (error) {
        console.error("Admin deletePitch error:", error);
        return res.status(500).json({ message: "Failed to delete pitch." });
    }
};
