import express from "express";
import "dotenv/config";
import authRoutes from "./routes/auth.router.js";
import timeSlotRoutes from "./routes/time_slot.router.js";
import bookingRoutes from "./routes/booking.router.js";
import serviceRoutes from "./routes/service.router.js";
import pitchRoutes from "./routes/pitch.router.js";
import adminPitchesRouter from "./routes/admin/pitches.router.js";
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
import adminTeamRouter from "./routes/admin/team.router.js";
import adminReportsRouter from "./routes/admin/reports.router.js";
import licenceRouter from "./routes/licence.router.js";
import adminCustomersRouter from "./routes/admin/customers.router.js";
import adminPaymentsRouter from "./routes/admin/payments.router.js";
import adminRecurringRouter from "./routes/admin/recurring.router.js";
import adminExpensesRouter from "./routes/admin/expenses.router.js";
import adminMaintenanceRouter from "./routes/admin/maintenance.router.js";
import { getDailyReport } from "./controllers/admin/daily_report.controller.js";
import venueRouter from "./routes/venue.router.js";
import authMiddleware from "./middlewares/auth.middleware.js";
import adminMiddleware from "./middlewares/admin.middleware.js";
import subscriptionGuard from "./middlewares/subscription.middleware.js";
import { allowStaff } from "./middlewares/role.middleware.js";
import cors from "cors";
import morgan from "morgan";


const app = express();

// Live frontends allowed to call this API, comma-separated, e.g.
// CORS_ORIGINS=https://yourturf.netlify.app,https://admin-yourturf.netlify.app
// Exact origins only: scheme + host (+ port), no path or trailing slash.
const allowedOrigins = new Set(
    (process.env.CORS_ORIGINS || "")
        .split(",")
        .map((o) => o.trim().replace(/\/+$/, ""))
        .filter(Boolean)
);

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (mobile apps, curl, server-to-server)
            if (!origin) return callback(null, true);

            if (allowedOrigins.has(origin)) return callback(null, true);

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


// Expense receipts are sent as base64 JSON (max 2 MB file) — larger body limit on that route only.
// body-parser skips requests that were already parsed, so the global parser below leaves these alone.
app.use("/api/admin/expenses", express.json({ limit: "3mb" }));

//configure express to parse JSON
app.use(express.json());



// Global subscription write guard: blocks POST, PUT, PATCH, DELETE when deploymentStatus !== "active"
app.use(subscriptionGuard);

app.use("/api/auth", authRoutes);
app.use("/api/time-slots", timeSlotRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/pitches", pitchRoutes);
app.use("/api/coupons", couponsRouter);
app.use("/api/profile/", profileRouter);
app.use("/api/licence", licenceRouter);
app.use("/api/venue", venueRouter);

// Admin routes — auth required. Admins can access everything; staff accounts
// (plan feature "staffManagement") only the areas they are permitted.
// Plan features/limits are enforced inside each router (requireFeature / requireLimit).
const timeSlotArea = (req) => {
    if (req.method !== "GET") return "pricing";
    if (req.path.startsWith("/month-availability")) return "calendar";
    // Day availability powers both the calendar and the manual booking modal
    if (req.path.startsWith("/availability")) return ["calendar", "bookings"];
    return "pricing";
};

app.use("/api/admin/bookings", authMiddleware, allowStaff("bookings"), adminBookingsRouter);
app.use("/api/admin/time-slots", authMiddleware, allowStaff(timeSlotArea), adminTimeSlotsRouter);
app.use("/api/admin/services", authMiddleware, allowStaff("services", { readAll: true }), adminServicesRouter);
app.use("/api/admin/pitches", authMiddleware, allowStaff("pitches", { readAll: true }), adminPitchesRouter);
app.use("/api/admin/dashboard", authMiddleware, allowStaff("dashboard"), adminDashboardRouter);
app.use("/api/admin/coupons", authMiddleware, allowStaff("coupons"), adminCouponRouter);
app.use("/api/admin/reports", authMiddleware, allowStaff("reports"), adminReportsRouter);
app.use("/api/admin/subscription", authMiddleware, allowStaff("dashboard", { readAll: true }), adminSubscriptionRouter);
app.use("/api/admin/customers", authMiddleware, allowStaff("customers"), adminCustomersRouter);
app.use("/api/admin/payments", authMiddleware, allowStaff("payments"), adminPaymentsRouter);
app.use("/api/admin/recurring", authMiddleware, allowStaff("recurring"), adminRecurringRouter);
app.use("/api/admin/expenses", authMiddleware, allowStaff("expenses"), adminExpensesRouter);
app.use("/api/admin/maintenance", authMiddleware, allowStaff("maintenance", { readAll: true }), adminMaintenanceRouter);
app.get("/api/admin/daily-report", authMiddleware, allowStaff("reports"), getDailyReport);
app.use("/api/admin/settings", authMiddleware, adminMiddleware, adminSettingsRouter);
app.use("/api/admin/team", authMiddleware, adminMiddleware, adminTeamRouter);

export default app;