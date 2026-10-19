import {createBooking,getMyBookings  } from "../controllers/booking.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import express from "express";
const router = express.Router();

router.post("/create", authMiddleware, createBooking);
router.get("/my-bookings/:userId", authMiddleware, getMyBookings);

export default router;