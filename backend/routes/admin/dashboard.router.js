import express from "express";
import { requireFeature } from "../../middlewares/licence.middleware.js";
import { getDashboardOverview } from "../../controllers/admin/dashboard.controller.js";

const router = express.Router();

// GET /api/admin/dashboard/overview?days=14&today=YYYY-MM-DD
router.get("/overview", requireFeature("basicAnalytics"), getDashboardOverview);

export default router;

