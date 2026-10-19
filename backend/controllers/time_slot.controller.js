import TimeSlot from "../models/time_slot.model.js";
import Booking from "../models/booking.model.js";

export const createTimeSlot = async (req, res) => {
    try {
        const { start_time, end_time } = req.body;
        const newTimeSlot = new TimeSlot({ start_time, end_time });
        await newTimeSlot.save();
        res.status(201).json(newTimeSlot);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getAllTimeSlots = async (req, res) => {
    try {
        const timeSlots = await TimeSlot.find();
        res.status(200).json(timeSlots);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}


// Get available time slots for a specific date
export const getAvailableTimeSlots = async (req, res) => {
    try {
        const { date } = req.params;

        // 1. Validate YYYY-MM-DD format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({
                message: "Date must be in YYYY-MM-DD format"
            });
        }

        const startDate = new Date(`${date}T00:00:00.000Z`);

        // 2. Reject invalid calendar dates
        if (
            Number.isNaN(startDate.getTime()) ||
            startDate.toISOString().slice(0, 10) !== date
        ) {
            return res.status(400).json({
                message: "Invalid calendar date"
            });
        }

        // 3. Find the start and end of the selected day
        const endDate = new Date(startDate);
        endDate.setUTCDate(endDate.getUTCDate() + 1);

        // 4. Find all bookings for this date
        const bookedSlots = await Booking.find({
            date: {
                $gte: startDate,
                $lt: endDate
            },
            status: { $ne: "cancelled" }
        }).select("time_slots");

        // 5. Collect all booked slot IDs
        const bookedSlotIds = bookedSlots.flatMap(
            booking => booking.time_slots.map(slot => slot.toString())
        );

        // 6. Fetch slots that have not been booked
        let availableTimeSlots = await TimeSlot.find({
            _id: { $nin: bookedSlotIds }
        });

        // 7. Remove past slots only when the selected date is today
        const parts = new Intl.DateTimeFormat("en-GB", {
            timeZone: "Asia/Kolkata",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23"
        }).formatToParts(new Date());

        const getPart = type =>
            parts.find(part => part.type === type).value;

        const today =
            `${getPart("year")}-${getPart("month")}-${getPart("day")}`;

        const currentMinutes =
            Number(getPart("hour")) * 60 +
            Number(getPart("minute"));

        if (date === today) {
            availableTimeSlots = availableTimeSlots.filter(slot => {
                // Assumes start_time is stored as "HH:mm"
                const [hours, minutes] = slot.start_time
                    .split(":")
                    .map(Number);

                const slotStartMinutes = hours * 60 + minutes;

                // Exclude slots that have already started
                return slotStartMinutes > currentMinutes;
            });
        }

        // 8. Return available slots
        return res.status(200).json(availableTimeSlots);

    } catch (error) {
        console.error("Get available time slots error:", error);

        return res.status(500).json({
            message: "Failed to fetch available time slots"
        });
    }
};