import express from "express";
import "dotenv/config";
import authRoutes from "./routes/auth.router.js";
import timeSlotRoutes from "./routes/time_slot.router.js";
import bookingRoutes from "./routes/booking.router.js";
import serviceRoutes from "./routes/service.router.js";
import "./services/cron.service.js"; // Import the cron service to start the scheduled tasks
import paymentsRouter from "./routes/payments.router.js";
import couponsRouter from "./routes/coupons.router.js";
import profileRouter from "./routes/profile.router.js";
import adminBookingsRouter from "./routes/admin/bookings.router.js";
import adminTimeSlotsRouter from "./routes/admin/timslots.router.js";
import adminServicesRouter from "./routes/admin/services.router.js";
import adminDashboardRouter from "./routes/admin/dashboard.router.js";
import adminCouponRouter from "./routes/admin/coupon.router.js";
import adminSettingsRouter from "./routes/admin/settings.router.js";
import adminSubscriptionRouter from "./routes/admin/subscription.router.js";
import authMiddleware from "./middlewares/auth.middleware.js";
import adminMiddleware from "./middlewares/admin.middleware.js";
import subscriptionGuard from "./middlewares/subscription.middleware.js";
import cors from "cors";
import morgan from "morgan";


const app = express();

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (mobile apps, curl, server-to-server)
            if (!origin) return callback(null, true);

            // Allow any localhost/127.0.0.1 port in development or dev tunnels
            if (
                origin.startsWith("http://localhost:") ||
                origin.startsWith("http://127.0.0.1:") ||
                origin.startsWith("http://10.168.78.5:") ||
                origin.startsWith("https://9jv5v14k-5000.inc1.devtunnels.ms")
            ) {
                return callback(null, true);
            }

            callback(new Error(`CORS: origin '${origin}' not allowed`));
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

app.use(morgan("dev"));

//payments routes before json parser middleware to handle raw body for webhooks
app.use("/api/payments", paymentsRouter);


//configure express to parse JSON
app.use(express.json());



// Global subscription write guard: blocks POST, PUT, PATCH, DELETE when deploymentStatus !== "active"
app.use(subscriptionGuard);

app.use("/api/auth", authRoutes);
app.use("/api/time-slots", timeSlotRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/coupons", couponsRouter);
app.use("/api/profile/", profileRouter);

// Admin routes — protected by both auth and admin role guards
app.use("/api/admin/bookings", authMiddleware, adminMiddleware, adminBookingsRouter);
app.use("/api/admin/time-slots", authMiddleware, adminMiddleware, adminTimeSlotsRouter);
app.use("/api/admin/services", authMiddleware, adminMiddleware, adminServicesRouter);
app.use("/api/admin/dashboard", authMiddleware, adminMiddleware, adminDashboardRouter);
app.use("/api/admin/coupons", authMiddleware, adminMiddleware, adminCouponRouter);
app.use("/api/admin/settings", authMiddleware, adminMiddleware, adminSettingsRouter);
app.use("/api/admin/subscription", authMiddleware, adminMiddleware, adminSubscriptionRouter);


export default app;