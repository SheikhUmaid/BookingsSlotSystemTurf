import express from "express";
import { getAllPitches } from "../controllers/pitch.controller.js";

const router = express.Router();

// GET /api/pitches
router.get("/", getAllPitches);

export default router;
