import express from "express";
import adminMiddleware from "../../middlewares/admin.middleware.js";
import {
    getSubscriptionStatus,
    renewSubscription,
    getPlanOptions,
    requestPlanChange,
} from "../../controllers/admin/subscription.controller.js";

const router = express.Router();

// GET /api/admin/subscription/status  (admins and staff — the panel needs the plan to render)
router.get("/status", getSubscriptionStatus);

// POST /api/admin/subscription/renew
router.post("/renew", adminMiddleware, renewSubscription);

// GET /api/admin/subscription/plans — plan options + payment QR details (admins only)
router.get("/plans", adminMiddleware, getPlanOptions);

// POST /api/admin/subscription/plan-request — "I've paid, notify Zinth Labs"
router.post("/plan-request", adminMiddleware, requestPlanChange);

export default router;

