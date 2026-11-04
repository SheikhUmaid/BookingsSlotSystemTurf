import express from "express";
import {
    getAllPitches,
    getPitchById,
    createPitch,
    updatePitch,
    deletePitch,
} from "../../controllers/admin/pitches.controller.js";
import { requireLimit } from "../../middlewares/licence.middleware.js";
import Pitch from "../../models/pitch.model.js";

const router = express.Router();

// GET /api/admin/pitches
router.get("/", getAllPitches);

// POST /api/admin/pitches  — blocked once the plan's maxPitches is reached
router.post("/", requireLimit("maxPitches", () => Pitch.countDocuments()), createPitch);

// GET /api/admin/pitches/:pitchId
router.get("/:pitchId", getPitchById);

// PUT / PATCH /api/admin/pitches/:pitchId
router.put("/:pitchId", updatePitch);
router.patch("/:pitchId", updatePitch);

// DELETE /api/admin/pitches/:pitchId
router.delete("/:pitchId", deletePitch);

export default router;
