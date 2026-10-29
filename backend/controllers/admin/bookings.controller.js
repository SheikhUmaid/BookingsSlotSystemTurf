import Booking from "../../models/booking.model.js";
import User from "../../models/user.model.js";
import Service from "../../models/service.model.js";
import TimeSlot from "../../models/time_slot.model.js";
import mongoose from "mongoose";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse a dd/mm/yyyy string (the format shown in the admin UI date picker)
 * and return { startDate, endDate } representing the full UTC day, or null
 * if the input is blank / invalid.
 */
function parseDayFilter(rawDate) {
    if (!rawDate || typeof rawDate !== "string") return null;

    // Accept both YYYY-MM-DD (from <input type="date">) and dd/mm/yyyy
    let isoString;
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        isoString = rawDate;
    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) {
        const [dd, mm, yyyy] = rawDate.split("/");
        isoString = `${yyyy}-${mm}-${dd}`;
    } else {
        return null;
    }

    const startDate = new Date(`${isoString}T00:00:00.000Z`);
    if (Number.isNaN(startDate.getTime())) return null;

    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + 1);

    return { startDate, endDate };
}

// ---------------------------------------------------------------------------
// GET /api/admin/bookings
// ---------------------------------------------------------------------------
/**
 * List all bookings with optional filters + pagination.
 *
 * Query parameters
 * ─────────────────────────────────────────────────────────────────────────
 * search    – free-text search across: booking _id prefix, customer name,
 *             and customer phone number                       (string)
 * date      – single-day filter.  Accepts:
 *               • YYYY-MM-DD  (native <input type="date"> value)
 *               • dd/mm/yyyy  (the format shown in the UI screenshot)
 * service   – MongoDB ObjectId of the service (pitch) to filter by        (string)
 * status    – one of: pending | partial | paid | cancelled | expired       (string)
 * page      – 1-based page number  (default: 1)                           (number)
 * limit     – results per page    (default: 20, max: 100)                 (number)
 * sort      – field to sort by   (default: "createdAt")                   (string)
 * order     – "asc" | "desc"     (default: "desc")                        (string)
 *
 * Response shape
 * ─────────────────────────────────────────────────────────────────────────
 * {
 *   bookings: [...],   // populated booking documents
 *   total:    1037,    // total matching documents (for pagination)
 *   page:     1,
 *   pages:    52,      // total pages
 *   limit:    20
 * }
 */
export const getAllBookings = async (req, res) => {
    try {
        // ── 1. Parse & validate query params ────────────────────────────
        let {
            search = "",
            date,
            service: serviceId,
            status,
            page = 1,
            limit = 20,
            sort = "createdAt",
            order = "desc",
        } = req.query;

        page = Math.max(1, parseInt(page, 10) || 1);
        limit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const skip = (page - 1) * limit;
        const sortOrder = order === "asc" ? 1 : -1;

        // Whitelist sortable fields to prevent injection
        const SORTABLE = new Set([
            "createdAt", "updatedAt", "date",
            "total_payable", "amount_paid", "status",
        ]);
        if (!SORTABLE.has(sort)) sort = "createdAt";

        // ── 2. Build the Booking-level match filter ──────────────────────
        const bookingFilter = {};

        // 2a. Status filter
        const VALID_STATUSES = ["pending", "partial", "paid", "cancelled", "expired"];
        if (status && VALID_STATUSES.includes(status)) {
            bookingFilter.status = status;
        }

        // 2b. Date filter (single-day range)
        const dayRange = parseDayFilter(date);
        if (dayRange) {
            bookingFilter.date = {
                $gte: dayRange.startDate,
                $lt: dayRange.endDate,
            };
        }

        // 2c. Service (pitch) filter
        if (serviceId && mongoose.Types.ObjectId.isValid(serviceId)) {
            bookingFilter.service = new mongoose.Types.ObjectId(serviceId);
        }

        // ── 3. Handle search (requires a $lookup on User) ────────────────
        // We use an aggregation pipeline only when a search term is present
        // so that the simple-filter path remains a fast Mongoose query.

        if (search && search.trim()) {
            const term = search.trim();
            const safeRegex = new RegExp(
                term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                "i"
            );

            // Try to match booking _id by hex prefix
            const idFilter = mongoose.Types.ObjectId.isValid(term)
                ? { _id: new mongoose.Types.ObjectId(term) }
                : null;

            // Find matching users first (name or phone)
            const matchingUsers = await User.find({
                $or: [
                    { name: safeRegex },
                    { phone: safeRegex },
                ],
            }).select("_id").lean();

            const userIds = matchingUsers.map((u) => u._id);

            // Combine: booking matches the main filter AND (user matches OR id matches)
            const searchOr = [{ user: { $in: userIds } }];
            if (idFilter) searchOr.push(idFilter);

            bookingFilter.$or = searchOr;
        }

        // ── 4. Run count + paginated find in parallel ────────────────────
        const [total, bookings] = await Promise.all([
            Booking.countDocuments(bookingFilter),
            Booking.find(bookingFilter)
                .sort({ [sort]: sortOrder })
                .skip(skip)
                .limit(limit)
                .populate({
                    path: "user",
                    select: "name phone email",
                })
                .populate({
                    path: "service",
                    select: "name description icon",
                })
                .populate({
                    path: "time_slots",
                    select: "start_time end_time category price",
                })
                .lean(),
        ]);

        // ── 5. Shape each booking for the admin table ────────────────────
        const shaped = bookings.map((b) => ({
            _id: b._id,
            // Short booking reference displayed in the UI (e.g. "BK-2077")
            booking_ref: `BK-${b._id.toString().slice(-4).toUpperCase()}`,
            customer: b.user ?? null,
            service: b.service ?? null,
            date: b.date,
            time_slots: b.time_slots ?? [],
            status: b.status,
            total_payable: b.total_payable,
            amount_paid: b.amount_paid,
            payment_type: b.payment_type,
            payment_id: b.payment_id ?? null,
            payment_order_id: b.payment_order_id ?? null,
            expires_at: b.expires_at,
            createdAt: b.createdAt,
            updatedAt: b.updatedAt,
        }));

        return res.status(200).json({
            bookings: shaped,
            total,
            page,
            pages: Math.ceil(total / limit),
            limit,
        });
    } catch (error) {
        console.error("Admin getAllBookings error:", error);
        return res.status(500).json({ message: "Failed to fetch bookings." });
    }
};

// ---------------------------------------------------------------------------
// GET /api/admin/bookings/:bookingId
// ---------------------------------------------------------------------------
/**
 * Fetch a single booking by its MongoDB _id with all relations populated.
 * Used for the "view" eye-icon action in the admin table.
 */
export const getBookingById = async (req, res) => {
    try {
        const { bookingId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(bookingId)) {
            return res.status(400).json({ message: "Invalid booking ID." });
        }

        const booking = await Booking.findById(bookingId)
            .populate({ path: "user", select: "name phone email role" })
            .populate({ path: "service", select: "name description icon" })
            .populate({ path: "time_slots", select: "start_time end_time category price" })
            .lean();

        if (!booking) {
            return res.status(404).json({ message: "Booking not found." });
        }

        return res.status(200).json({ booking });
    } catch (error) {
        console.error("Admin getBookingById error:", error);
        return res.status(500).json({ message: "Failed to fetch booking." });
    }
};

// ---------------------------------------------------------------------------
// PATCH /api/admin/bookings/:bookingId/status
// ---------------------------------------------------------------------------
/**
 * Manually override a booking's status.
 * Body: { status: "cancelled" | "paid" | "partial" | "pending" }
 */
export const updateBookingStatus = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { status } = req.body;

        if (!mongoose.Types.ObjectId.isValid(bookingId)) {
            return res.status(400).json({ message: "Invalid booking ID." });
        }

        const VALID_STATUSES = ["pending", "partial", "paid", "cancelled"];
        if (!VALID_STATUSES.includes(status)) {
            return res.status(400).json({
                message: `Status must be one of: ${VALID_STATUSES.join(", ")}.`,
            });
        }

        const booking = await Booking.findByIdAndUpdate(
            bookingId,
            { $set: { status } },
            { new: true, runValidators: true }
        )
            .populate({ path: "user", select: "name phone" })
            .populate({ path: "service", select: "name" })
            .lean();

        if (!booking) {
            return res.status(404).json({ message: "Booking not found." });
        }

        return res.status(200).json({
            message: `Booking status updated to "${status}".`,
            booking,
        });
    } catch (error) {
        console.error("Admin updateBookingStatus error:", error);
        return res.status(500).json({ message: "Failed to update booking status." });
    }
};

// ---------------------------------------------------------------------------
// GET /api/admin/bookings/stats
// ---------------------------------------------------------------------------
/**
 * Aggregate summary statistics for the dashboard:
 *   total, by status breakdown, revenue (total_payable vs amount_paid).
 *
 * Optional query params:
 *   from  – ISO date string for start of period
 *   to    – ISO date string for end of period
 */
export const getBookingStats = async (req, res) => {
    try {
        const { from, to } = req.query;

        const dateFilter = {};
        if (from) dateFilter.$gte = new Date(from);
        if (to) dateFilter.$lte = new Date(to);

        const matchStage = Object.keys(dateFilter).length
            ? { $match: { createdAt: dateFilter } }
            : { $match: {} };

        const [stats] = await Booking.aggregate([
            matchStage,
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    total_revenue: { $sum: "$total_payable" },
                    total_collected: { $sum: "$amount_paid" },
                    pending: {
                        $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
                    },
                    partial: {
                        $sum: { $cond: [{ $eq: ["$status", "partial"] }, 1, 0] },
                    },
                    paid: {
                        $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] },
                    },
                    cancelled: {
                        $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    total: 1,
                    total_revenue: 1,
                    total_collected: 1,
                    outstanding: { $subtract: ["$total_revenue", "$total_collected"] },
                    by_status: {
                        pending: "$pending",
                        partial: "$partial",
                        paid: "$paid",
                        cancelled: "$cancelled",
                    },
                },
            },
        ]);

        return res.status(200).json(
            stats ?? {
                total: 0,
                total_revenue: 0,
                total_collected: 0,
                outstanding: 0,
                by_status: { pending: 0, partial: 0, paid: 0, cancelled: 0 },
            }
        );
    } catch (error) {
        console.error("Admin getBookingStats error:", error);
        return res.status(500).json({ message: "Failed to fetch booking stats." });
    }
};

// ---------------------------------------------------------------------------
// POST /api/admin/bookings
// ---------------------------------------------------------------------------
/**
 * Create a manual booking directly from the admin panel.
 */
export const createAdminBooking = async (req, res) => {
    try {
        const {
            customer_name,
            customer_phone,
            customer_email,
            service,
            date,
            time_slots,
            status = "paid",
            payment_type = "full",
            amount_paid,
        } = req.body;

        // 1. Validate customer name & phone
        if (!customer_name || typeof customer_name !== "string" || customer_name.trim().length < 2) {
            return res.status(400).json({ message: "Customer name must be at least 2 characters." });
        }

        const cleanPhone = String(customer_phone || "").replace(/\D/g, "").slice(-10);
        if (cleanPhone.length !== 10) {
            return res.status(400).json({ message: "A valid 10-digit mobile number is required." });
        }

        // 2. Resolve pitch/service (slots are global; auto-assign default service if not provided)
        let resolvedServiceId = service;
        if (!resolvedServiceId || !mongoose.Types.ObjectId.isValid(resolvedServiceId)) {
            const defaultService = await Service.findOne();
            if (!defaultService) {
                return res.status(400).json({ message: "No service/pitch configured in the system." });
            }
            resolvedServiceId = defaultService._id;
        } else {
            const serviceDoc = await Service.findById(resolvedServiceId);
            if (!serviceDoc) {
                return res.status(404).json({ message: "Pitch/service not found." });
            }
        }

        // 3. Normalize & validate time slots
        const rawSlots = Array.isArray(time_slots) ? time_slots : [time_slots];
        const slotIds = rawSlots.filter((id) => id && mongoose.Types.ObjectId.isValid(id));
        if (slotIds.length === 0) {
            return res.status(400).json({ message: "At least one valid time slot is required." });
        }

        const slots = await TimeSlot.find({ _id: { $in: slotIds } });
        if (slots.length !== slotIds.length) {
            return res.status(400).json({ message: "One or more selected time slots do not exist." });
        }

        // 4. Validate & parse date
        const parsedDay = parseDayFilter(date);
        if (!parsedDay) {
            return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD or DD/MM/YYYY." });
        }
        const { startDate, endDate } = parsedDay;

        // 5. Check slot conflicts GLOBALLY (slots are global across all services)
        const conflict = await Booking.findOne({
            date: { $gte: startDate, $lt: endDate },
            time_slots: { $in: slotIds },
            status: { $ne: "cancelled" },
        });

        if (conflict) {
            return res.status(409).json({
                message: "This slot is already booked on this date. Please choose another slot.",
            });
        }

        // 6. Find or create user
        let user = await User.findOne({ phone: cleanPhone });
        if (!user) {
            user = await User.create({
                name: customer_name.trim(),
                phone: cleanPhone,
                email: customer_email?.trim() || undefined,
                role: "user",
            });
        } else if (customer_name && (!user.name || user.name === "Guest")) {
            user.name = customer_name.trim();
            if (customer_email) user.email = customer_email.trim();
            await user.save();
        }

        // 7. Calculate amounts
        const totalPayable = slots.reduce((acc, s) => acc + (s.price || 0), 0);
        const resolvedPaid =
            typeof amount_paid === "number"
                ? amount_paid
                : status === "paid"
                ? totalPayable
                : 0;

        const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year for admin bookings

        const newBooking = new Booking({
            user: user._id,
            service: resolvedServiceId,
            time_slots: slotIds,
            date: startDate,
            total_payable: totalPayable,
            amount_paid: resolvedPaid,
            payment_type: payment_type === "partial" ? "partial" : "full",
            status: ["pending", "partial", "paid"].includes(status) ? status : "paid",
            expires_at: expiresAt,
        });

        await newBooking.save();

        await newBooking.populate([
            { path: "user", select: "name phone email" },
            { path: "service", select: "name description icon" },
            { path: "time_slots", select: "start_time end_time category price" },
        ]);

        return res.status(201).json({
            message: "Booking created successfully.",
            booking: {
                _id: newBooking._id,
                booking_ref: `BK-${newBooking._id.toString().slice(-4).toUpperCase()}`,
                customer: newBooking.user,
                service: newBooking.service,
                date: newBooking.date,
                time_slots: newBooking.time_slots,
                status: newBooking.status,
                total_payable: newBooking.total_payable,
                amount_paid: newBooking.amount_paid,
                payment_type: newBooking.payment_type,
                expires_at: newBooking.expires_at,
                createdAt: newBooking.createdAt,
            },
        });
    } catch (error) {
        console.error("Admin createAdminBooking error:", error);
        return res.status(500).json({ message: "Failed to create manual booking." });
    }
};

