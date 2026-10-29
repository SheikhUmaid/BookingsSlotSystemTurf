import Booking from "../../models/booking.model.js";
import TimeSlot from "../../models/time_slot.model.js";
import Service from "../../models/service.model.js";
import User from "../../models/user.model.js";

/**
 * Format a Date to YYYY-MM-DD
 */
function toDateStr(d) {
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/**
 * Capitalize status: "paid" -> "Paid"
 */
function capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ---------------------------------------------------------------------------
// GET /api/admin/dashboard/overview
// ---------------------------------------------------------------------------
/**
 * Main dashboard aggregated data:
 * - Summary metrics (total bookings, today's bookings, upcoming, revenue, pending)
 * - Daily revenue & bookings trend for chart
 * - Status distribution for pie chart
 * - Today's scheduled slots
 * - Recent bookings list
 *
 * Query params:
 *   days   – 7 | 14 | 21 (default: 14)
 *   today  – YYYY-MM-DD (optional, defaults to current date in Asia/Kolkata)
 */
export const getDashboardOverview = async (req, res) => {
    try {
        const daysParam = Number(req.query.days);
        const rangeDays = [7, 14, 21].includes(daysParam) ? daysParam : 14;

        // Determine current date
        let todayStr = "";
        if (req.query.today && /^\d{4}-\d{2}-\d{2}$/.test(req.query.today)) {
            todayStr = req.query.today;
        } else {
            const parts = new Intl.DateTimeFormat("en-GB", {
                timeZone: "Asia/Kolkata",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            }).formatToParts(new Date());
            const getPart = (type) => parts.find((p) => p.type === type)?.value;
            todayStr = `${getPart("year")}-${getPart("month")}-${getPart("day")}`;
        }

        const todayStart = new Date(`${todayStr}T00:00:00.000Z`);
        const todayEnd = new Date(todayStart);
        todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);

        const rangeStart = new Date(todayStart);
        rangeStart.setUTCDate(rangeStart.getUTCDate() - (rangeDays - 1));
        const rangeEnd = todayEnd;

        // 1. Fetch all bookings within the date range
        const inRangeBookings = await Booking.find({
            date: { $gte: rangeStart, $lt: rangeEnd },
        })
            .populate("user", "name phone email")
            .populate("service", "name description icon")
            .populate("time_slots", "start_time end_time category price")
            .lean();

        // 2. Fetch upcoming bookings count (dates strictly after today)
        const upcomingCount = await Booking.countDocuments({
            date: { $gte: todayEnd },
            status: { $ne: "cancelled" },
        });

        // 3. Pending payments (bookings from today onwards where total_payable > amount_paid)
        const futureActiveBookings = await Booking.find({
            date: { $gte: todayStart },
            status: { $ne: "cancelled" },
        })
            .select("total_payable amount_paid")
            .lean();

        const pendingPaymentsTotal = futureActiveBookings.reduce(
            (sum, b) => sum + Math.max(0, (b.total_payable || 0) - (b.amount_paid || 0)),
            0
        );

        // 4. Today's bookings
        const todaysBookings = inRangeBookings
            .filter((b) => {
                const bDateStr = toDateStr(new Date(b.date));
                return bDateStr === todayStr && b.status !== "cancelled";
            })
            .sort((a, b) => {
                const aTime = a.time_slots?.[0]?.start_time || "00:00";
                const bTime = b.time_slots?.[0]?.start_time || "00:00";
                return aTime.localeCompare(bTime);
            })
            .map((b) => ({
                id: `BK-${b._id.toString().slice(-4).toUpperCase()}`,
                _id: b._id,
                customer: b.user?.name || "Customer",
                phone: b.user?.phone || "",
                serviceName: b.service?.name || "General Turf",
                serviceId: b.service?._id || "",
                timeSlots: b.time_slots || [],
                startTime: b.time_slots?.[0]?.start_time || "",
                endTime: b.time_slots?.[0]?.end_time || "",
                status: capitalize(b.status),
                total: b.total_payable || 0,
                paid: b.amount_paid || 0,
            }));

        // 5. Recent bookings (latest 6 bookings created)
        const recentRaw = await Booking.find()
            .sort({ createdAt: -1 })
            .limit(6)
            .populate("user", "name phone")
            .populate("service", "name")
            .populate("time_slots", "start_time end_time")
            .lean();

        const recentBookings = recentRaw.map((b) => ({
            id: `BK-${b._id.toString().slice(-4).toUpperCase()}`,
            _id: b._id,
            customer: b.user?.name || "Customer",
            phone: b.user?.phone || "",
            pitch: b.service?.name || "General Turf",
            date: toDateStr(new Date(b.date)),
            amount: b.total_payable || 0,
            paid: b.amount_paid || 0,
            status: capitalize(b.status),
            createdAt: b.createdAt,
        }));

        // 6. Day-by-day trend data for chart
        const dayBookingsMap = new Map();
        for (const b of inRangeBookings) {
            const dayKey = toDateStr(new Date(b.date));
            if (!dayBookingsMap.has(dayKey)) {
                dayBookingsMap.set(dayKey, []);
            }
            dayBookingsMap.get(dayKey).push(b);
        }

        const days = [];
        for (let i = 0; i < rangeDays; i++) {
            const curDate = new Date(rangeStart);
            curDate.setUTCDate(curDate.getUTCDate() + i);
            const curStr = toDateStr(curDate);

            const dayBookings = dayBookingsMap.get(curStr) || [];
            const activeBookings = dayBookings.filter((b) => b.status !== "cancelled");
            const dayRevenue = dayBookings.reduce((sum, b) => sum + (b.amount_paid || 0), 0);

            days.push({
                date: curStr,
                day: curDate.toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    timeZone: "UTC",
                }),
                revenue: dayRevenue,
                bookings: activeBookings.length,
            });
        }

        // 7. Status distribution in the date range
        const statusCounts = {
            Paid: 0,
            Partial: 0,
            Pending: 0,
            Cancelled: 0,
        };

        for (const b of inRangeBookings) {
            const cap = capitalize(b.status);
            if (statusCounts[cap] !== undefined) {
                statusCounts[cap] += 1;
            } else {
                statusCounts[cap] = (statusCounts[cap] || 0) + 1;
            }
        }

        const dist = Object.entries(statusCounts)
            .map(([name, value]) => ({ name, value }))
            .filter((d) => d.value > 0);

        // 8. Key summary metrics
        const totalActiveInRange = inRangeBookings.filter((b) => b.status !== "cancelled").length;
        const totalRevenueInRange = inRangeBookings.reduce((sum, b) => sum + (b.amount_paid || 0), 0);

        return res.status(200).json({
            today: todayStr,
            range: rangeDays,
            metrics: {
                totalBookings: totalActiveInRange,
                todaysBookings: todaysBookings.length,
                upcoming: upcomingCount,
                revenueCollected: totalRevenueInRange,
                pendingPayments: pendingPaymentsTotal,
            },
            days,
            dist,
            todaysBookings,
            recentBookings,
        });
    } catch (error) {
        console.error("Admin getDashboardOverview error:", error);
        return res.status(500).json({ message: "Failed to fetch dashboard data." });
    }
};

