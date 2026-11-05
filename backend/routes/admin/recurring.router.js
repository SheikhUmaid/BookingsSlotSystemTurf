import express from "express";
import {
    previewSchedule,
    createSchedule,
    listSchedules,
    getSchedule,
    cancelOccurrence,
    cancelSchedule,
} from "../../controllers/admin/recurring.controller.js";
import { requireBookingEnabled, requireFeature } from "../../middlewares/licence.middleware.js";

const router = express.Router();

// Recurring sessions are manual bookings, so they follow the same plan rules.
const canBook = [requireBookingEnabled, requireFeature("manualBookings")];

router.get("/", listSchedules);
router.post("/preview", ...canBook, previewSchedule);
router.post("/", ...canBook, createSchedule);
router.get("/:scheduleId", getSchedule);
router.post("/:scheduleId/cancel", cancelSchedule);
router.post("/:scheduleId/occurrences/:bookingId/cancel", cancelOccurrence);

export default router;
