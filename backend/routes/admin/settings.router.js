import express from "express";
import {
    getSettings,
    updateSettings,
    changePassword,
} from "../../controllers/admin/settings.controller.js";

const router = express.Router();

// GET /api/admin/settings
router.get("/", getSettings);

// PUT / PATCH /api/admin/settings
router.put("/", updateSettings);
router.patch("/", updateSettings);

// POST /api/admin/settings/change-password
router.post("/change-password", changePassword);

export default router;

