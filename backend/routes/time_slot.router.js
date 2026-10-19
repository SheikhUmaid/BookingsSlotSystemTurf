import { getAllTimeSlots, getAvailableTimeSlots } from "../controllers/time_slot.controller.js";
import express from "express";
const router = express.Router();

router.get("/", getAllTimeSlots);
router.get("/available/:date", getAvailableTimeSlots);


export default router;