import express from "express";
import {
    getPitchReport,
    getLeaderboard,
    getAdvancedAnalytics,
    exportBookingsCsv,
} from "../../controllers/admin/reports.controller.js";
import { requireFeature } from "../../middlewares/licence.middleware.js";

const router = express.Router();

// GET /api/admin/reports/pitches?from=&to=
router.get("/pitches", requireFeature("pitchWiseReports"), getPitchReport);

// GET /api/admin/reports/leaderboard?from=&to=&limit=
router.get("/leaderboard", requireFeature("leaderboards"), getLeaderboard);

// GET /api/admin/reports/analytics?from=&to=
router.get("/analytics", requireFeature("advancedAnalytics"), getAdvancedAnalytics);

// GET /api/admin/reports/export/bookings?from=&to=   → CSV
router.get("/export/bookings", requireFeature("financialExports"), exportBookingsCsv);

export default router;
