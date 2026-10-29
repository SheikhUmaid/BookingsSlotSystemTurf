import express from "express";
import {
    getAllBookings,
    getBookingById,
    updateBookingStatus,
    getBookingStats,
    createAdminBooking,
} from "../../controllers/admin/bookings.controller.js";

const router = express.Router();

// GET  /api/admin/bookings/stats   — must be registered before /:bookingId
router.get("/stats", getBookingStats);

// GET  /api/admin/bookings         — paginated list with filters
router.get("/", getAllBookings);

// POST /api/admin/bookings         — create manual booking
router.post("/", createAdminBooking);

// GET  /api/admin/bookings/:bookingId
router.get("/:bookingId", getBookingById);

// PATCH /api/admin/bookings/:bookingId/status
router.patch("/:bookingId/status", updateBookingStatus);

export default router;

