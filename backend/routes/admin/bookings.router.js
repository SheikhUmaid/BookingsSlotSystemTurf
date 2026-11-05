import express from "express";
import { requireBookingEnabled, requireFeature } from "../../middlewares/licence.middleware.js";
import adminMiddleware from "../../middlewares/admin.middleware.js";
import {
    getBookingPayments,
    addBookingPayment,
    addBookingRefund,
} from "../../controllers/admin/payments.controller.js";
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

// Payments for one booking
// GET  /api/admin/bookings/:bookingId/payments          — ledger
// POST /api/admin/bookings/:bookingId/payments          — record cash/UPI/card… payment
// POST /api/admin/bookings/:bookingId/refunds           — admins only
router.get("/:bookingId/payments", getBookingPayments);
router.post("/:bookingId/payments", addBookingPayment);
router.post("/:bookingId/refunds", adminMiddleware, addBookingRefund);

// DELETE /api/admin/bookings/:bookingId
router.delete("/:bookingId", deleteBooking);

export default router;

