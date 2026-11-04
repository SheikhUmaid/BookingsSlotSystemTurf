import express from "express";
import { requireFeature } from "../../middlewares/licence.middleware.js";
import {
    getAllCoupons,
    getCouponById,
    createCoupon,
    updateCoupon,
    toggleCouponStatus,
    deleteCoupon,
} from "../../controllers/admin/coupon.controller.js";

const router = express.Router();

// Every coupon route requires the plan's "coupons" feature.
router.use(requireFeature("coupons"));

// GET /api/admin/coupons
router.get("/", getAllCoupons);

// POST /api/admin/coupons
router.post("/", createCoupon);

// GET /api/admin/coupons/:couponId
router.get("/:couponId", getCouponById);

// PUT / PATCH /api/admin/coupons/:couponId
router.put("/:couponId", updateCoupon);
router.patch("/:couponId", updateCoupon);

// PATCH /api/admin/coupons/:couponId/toggle
router.patch("/:couponId/toggle", toggleCouponStatus);

// DELETE /api/admin/coupons/:couponId
router.delete("/:couponId", deleteCoupon);

export default router;

