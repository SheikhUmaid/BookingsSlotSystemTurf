import express from "express";
import Setting from "../models/setting.model.js";
import { toPublicVenue } from "../utils/venue.js";

const router = express.Router();

/**
 * GET /api/venue
 * Public turf details for the booking app: name, address, hours and directions.
 * Exposes only customer-facing fields from Settings.
 */
router.get("/", async (req, res) => {
    try {
        let settings = await Setting.findOne().lean();
        if (!settings) settings = (await Setting.create({})).toObject();

        res.set("Cache-Control", "no-store");
        return res.status(200).json({ success: true, venue: toPublicVenue(settings) });
    } catch (error) {
        console.error("getVenue error:", error);
        return res.status(500).json({ success: false, message: "Unable to load venue details." });
    }
});

export default router;
