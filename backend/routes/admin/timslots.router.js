import express from "express";
import {
    getTimeSlotsAvailability,
    getMonthAvailability,
    getAllAdminTimeSlots,
    getTimeSlotById,
    createTimeSlot,
    updateTimeSlot,
    deleteTimeSlot,
} from "../../controllers/admin/time_slots.controller.js";

const router = express.Router();

// GET /api/admin/time-slots/availability?date=YYYY-MM-DD
router.get("/availability", getTimeSlotsAvailability);

// GET /api/admin/time-slots/month-availability?month=YYYY-MM
router.get("/month-availability", getMonthAvailability);

// GET /api/admin/time-slots
router.get("/", getAllAdminTimeSlots);

// POST /api/admin/time-slots
router.post("/", createTimeSlot);

// GET /api/admin/time-slots/:slotId
router.get("/:slotId", getTimeSlotById);

// PUT / PATCH /api/admin/time-slots/:slotId
router.put("/:slotId", updateTimeSlot);
router.patch("/:slotId", updateTimeSlot);

// DELETE /api/admin/time-slots/:slotId
router.delete("/:slotId", deleteTimeSlot);

export default router;

