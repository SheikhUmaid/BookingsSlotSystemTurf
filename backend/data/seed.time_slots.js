import "dotenv/config";
import mongoose from "mongoose";
import timeSlot from "../models/time_slot.model.js";


const timeSlots = [
    {
        start_time: "06:00",
        end_time: "08:00",
        category: "Morning Sessions",
        price: 1000
    },
    {
        start_time: "08:00",
        end_time: "10:00",
        category: "Morning Sessions",
        price: 1000
    },
    {
        start_time: "10:00",
        end_time: "12:00",
        category: "Morning Sessions",
        price: 1000
    },
    {
        start_time: "12:00",
        end_time: "14:00",
        category: "Afternoon Sessions",
        price: 1200
    },
    {
        start_time: "14:00",
        end_time: "16:00",
        category: "Afternoon Sessions",
        price: 1200
    },
    {
        start_time: "16:00",
        end_time: "18:00",
        category: "Floodlit Evening",
        price: 1500
    },
    {
        start_time: "18:00",
        end_time: "20:00",
        category: "Floodlit Evening",
        price: 1500
    },
    {
        start_time: "20:00",
        end_time: "22:00",
        category: "Floodlit Evening",
        price: 1500
    },
    {
        start_time: "22:00",
        end_time: "00:00",
        category: "Late Night",
        price: 1800
    } 
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