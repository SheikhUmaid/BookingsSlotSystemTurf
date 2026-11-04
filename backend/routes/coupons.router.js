import {createCoupon, verifyCoupon} from "../controllers/coupons.controller.js";
import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import adminMiddleware from "../middlewares/admin.middleware.js";
import { requireFeature } from "../middlewares/licence.middleware.js";

const router = express.Router();

// Route to create a new coupon
router.use(requireFeature("coupons"));

// Admin-only: this endpoint was previously unauthenticated.
router.post("/", authMiddleware, adminMiddleware, createCoupon);
router.get("/:code", verifyCoupon)

export default router;