import express from "express";
import { requireBookingEnabled, requireFeature } from "../../middlewares/licence.middleware.js";
import {
    getAllBookings,
    getBookingById,
    updateBookingStatus,
    getBookingStats,
    createAdminBooking,
    deleteBooking,
} from "../../controllers/admin/bookings.controller.js";

const router = express.Router();

// GET  /api/admin/bookings/stats   — must be registered before /:bookingId
router.get("/stats", getBookingStats);

// GET  /api/admin/bookings         — paginated list with filters
router.get("/", getAllBookings);

// POST /api/admin/bookings         — create manual booking
router.post("/", requireBookingEnabled, requireFeature("manualBookings"), createAdminBooking);

// GET  /api/admin/bookings/:bookingId
router.get("/:bookingId", getBookingById);

// PATCH /api/admin/bookings/:bookingId/status
router.patch("/:bookingId/status", updateBookingStatus);

// DELETE /api/admin/bookings/:bookingId
router.delete("/:bookingId", deleteBooking);

export default router;

