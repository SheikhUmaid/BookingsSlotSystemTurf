import express from "express";
import { getDashboardOverview } from "../../controllers/admin/dashboard.controller.js";

const router = express.Router();

// GET /api/admin/dashboard/overview?days=14&today=YYYY-MM-DD
router.get("/overview", getDashboardOverview);

export default router;

