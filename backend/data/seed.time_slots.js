import "dotenv/config";
import mongoose from "mongoose";
import timeSlot from "../models/time_slot.model.js";

const timeSlots = [
  { start_time: "09:00", end_time: "10:00" },
  { start_time: "10:00", end_time: "11:00" },
  { start_time: "11:00", end_time: "12:00" },
  { start_time: "12:00", end_time: "13:00" },
  { start_time: "13:00", end_time: "14:00" },
  { start_time: "14:00", end_time: "15:00" },
  { start_time: "15:00", end_time: "16:00" },
  { start_time: "16:00", end_time: "17:00" },
];

async function seedTimeSlots() {
  try {
    await mongoose.connect(process.env.DATABASE_URL);

    console.log("MongoDB connected for seeding");

    await timeSlot.insertMany(timeSlots);

    console.log("Time slots seeded successfully");
  } catch (error) {
    console.error("Error seeding time slots:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

await seedTimeSlots();