import express from "express";
import "dotenv/config";
import authRoutes from "./routes/auth.router.js";
import timeSlotRoutes from "./routes/time_slot.router.js";
import bookingRoutes from "./routes/booking.router.js";
import serviceRoutes from "./routes/service.router.js";
import "./services/cron.service.js"; // Import the cron service to start the scheduled tasks
import paymentsRouter from "./routes/payments.router.js";
import cors from "cors";
import morgan from "morgan";


const app = express();

app.use(
    cors({
        origin: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5501",
            "http://127.0.0.1:5501",
            "https://3288-2409-40f2-4b-1333-f92f-d3fa-d0a4-bce8.ngrok-free.app"
        ],
        credentials: true,
    })
);

app.use(morgan("dev"));

//payments routes before json parser middleware to handle raw body for webhooks
app.use("/api/payments", paymentsRouter);


//configure express to parse JSON
app.use(express.json());



app.use("/api/auth", authRoutes);
app.use("/api/time-slots", timeSlotRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/services", serviceRoutes);


export default app;