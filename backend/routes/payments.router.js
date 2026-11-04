import {createPaymentOrder, razorpayWebhook} from "../controllers/payment.controller.js";
import express from "express";
import  authMiddleware from "../middlewares/auth.middleware.js";
import subscriptionGuard from "../middlewares/subscription.middleware.js";
import { requireBookingEnabled, requireFeature } from "../middlewares/licence.middleware.js";

const router = express.Router();

// Route to create a payment order

// Route to handle Razorpay webhooks
router.post("/razorpay-webhook",express.raw({ type: "application/json" }), razorpayWebhook);

router.use(express.json()); // Middleware to parse JSON for subsequent routes


router.post("/create-order", subscriptionGuard, authMiddleware, requireBookingEnabled, requireFeature("onlinePayments"), createPaymentOrder);

export default router;