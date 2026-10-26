import {createBooking,getMyBookings  } from "../controllers/booking.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import express from "express";
const router = express.Router();

router.post("/", authMiddleware, createBooking);
router.get("/", authMiddleware, getMyBookings);

export default router;