import express from "express";
import "dotenv/config";
import authRoutes from "./routes/auth.router.js";
import timeSlotRoutes from "./routes/time_slot.router.js";
import bookingRoutes from "./routes/booking.router.js";
import serviceRoutes from "./routes/service.router.js";
import "./services/cron.service.js"; // Import the cron service to start the scheduled tasks
import paymentsRouter from "./routes/payments.router.js";
import cors from "cors";
const app = express();

app.use(
    cors({
        origin: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
        credentials: true,
    })
);

//payments routes before json parser middleware to handle raw body for webhooks
app.use("/api/payments", paymentsRouter);


//configure express to parse JSON
app.use(express.json());



app.use("/api/auth", authRoutes);
app.use("/api/time-slots", timeSlotRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/services", serviceRoutes);


export default app;