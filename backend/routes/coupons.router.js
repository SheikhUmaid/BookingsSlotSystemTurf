import {createCoupon, verifyCoupon} from "../controllers/coupons.controller.js";
import express from "express";

const router = express.Router();

// Route to create a new coupon
router.post("/", createCoupon);
router.get("/:code", verifyCoupon)

export default router;