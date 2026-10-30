import express from "express";
import {
    getSubscriptionStatus,
    renewSubscription,
} from "../../controllers/admin/subscription.controller.js";

const router = express.Router();

// GET /api/admin/subscription/status
router.get("/status", getSubscriptionStatus);

// POST /api/admin/subscription/renew
router.post("/renew", renewSubscription);

export default router;

