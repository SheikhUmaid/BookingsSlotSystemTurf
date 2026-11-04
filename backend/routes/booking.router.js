import {createBooking,getMyBookings  } from "../controllers/booking.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import express from "express";
import { requireBookingEnabled, requireFeature } from "../middlewares/licence.middleware.js";
const router = express.Router();

router.post("/", authMiddleware, requireBookingEnabled, requireFeature("bookingPWA"), createBooking);
router.get("/", authMiddleware, getMyBookings);

export default router;