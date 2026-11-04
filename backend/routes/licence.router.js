import express from "express";
import { getLicence, blockedReason } from "../services/licence.service.js";

const router = express.Router();

/**
 * GET /api/licence
 * Public, read-only view of the licence for the customer booking app.
 * Exposes feature flags (so the PWA can hide e.g. coupons) — never limits or keys.
 */
router.get("/", async (req, res) => {
    try {
        const licence = await getLicence();
        const blocked = blockedReason(licence);
        res.set("Cache-Control", "no-store");
        return res.status(200).json({
            success: true,
            bookingEnabled: licence.bookingEnabled && !blocked,
            blocked: Boolean(blocked),
            plan: licence.plan ? { code: licence.plan.code, name: licence.plan.name } : null,
            features: licence.plan?.features ?? {},
        });
    } catch (error) {
        console.error("getPublicLicence error:", error);
        return res.status(500).json({ success: false, message: "Unable to load venue status." });
    }
});

export default router;
