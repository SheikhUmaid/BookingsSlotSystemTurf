/**
 * Demo data for trying out the dashboard, reports and leaderboards.
 *
 *   npm run seed:demo          → (re)creates demo customers + ~2 months of bookings
 *   npm run seed:demo:clear    → removes ONLY the demo customers and their bookings
 *
 * Demo customers are recognised by their phone number prefix (DEMO_PHONE_PREFIX),
 * so real customers and real bookings are never touched. Uses the services,
 * pitches and time slots already in the database, and never double-books a slot
 * that a real booking already occupies.
 */
import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/user.model.js";
import Booking from "../models/booking.model.js";
import Service from "../models/service.model.js";
import Pitch from "../models/pitch.model.js";
import TimeSlot from "../models/time_slot.model.js";

const DEMO_PHONE_PREFIX = "70000";
const DAYS_BACK = 60;
const DAYS_AHEAD = 14;

const NAMES = [
    "Aarav Sharma", "Vihaan Mir", "Rohan Gupta", "Ishaan Bhat", "Kabir Khan", "Arjun Reddy",
    "Zaid Lone", "Aditya Rao", "Faizan Dar", "Siddharth Jain", "Owais Wani", "Karan Mehta",
    "Danish Malik", "Yash Verma", "Rehan Shah", "Nikhil Nair", "Tariq Hussain", "Varun Iyer",
    "Imran Qureshi", "Dev Patel", "Sameer Kaul", "Aman Singh", "Junaid Ahmad", "Pranav Joshi",
    "Hamza Butt", "Rahul Kapoor", "Adil Rather", "Manav Sethi", "Sahil Kumar", "Uzair Ganie",
];

// --- deterministic random so every run produces the same picture -------------
let seed = 20261104;
const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const weighted = (items) => {
    const total = items.reduce((s, [, w]) => s + w, 0);
    let r = rand() * total;
    for (const [v, w] of items) if ((r -= w) <= 0) return v;
    return items[items.length - 1][0];
};

const todayIST = () => {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    return new Date(`${get("year")}-${get("month")}-${get("day")}T00:00:00.000Z`);
};

// Evening is prime time; mornings are decent; afternoons are quiet.
const hourWeight = (hour) => {
    if (hour >= 18 && hour <= 22) return 10;
    if (hour === 17 || hour === 23) return 6;
    if (hour >= 6 && hour <= 8) return 5;
    if (hour === 0) return 2;
    return 1.5;
};

async function clearDemo() {
    const demoUsers = await User.find({ phone: { $regex: `^${DEMO_PHONE_PREFIX}` } }).select("_id").lean();
    const ids = demoUsers.map((u) => u._id);
    const { deletedCount: bookings } = await Booking.deleteMany({ user: { $in: ids } });
    const { deletedCount: users } = await User.deleteMany({ _id: { $in: ids } });
    return { bookings, users };
}

async function seedDemo() {
    const [services, pitches, slots] = await Promise.all([
        Service.find().lean(),
        Pitch.find().sort({ createdAt: 1 }).lean(),
        TimeSlot.find().lean(),
    ]);
    if (!services.length || !pitches.length || !slots.length) {
        throw new Error("Need at least one service, pitch and time slot in the database before seeding demo bookings.");
    }

    const removed = await clearDemo();
    if (removed.bookings || removed.users) {
        console.log(`Removed previous demo data: ${removed.users} customers, ${removed.bookings} bookings.`);
    }

    // Customers — a few regulars book a lot, most book occasionally (good leaderboard spread).
    const customers = await User.insertMany(
        NAMES.map((name, i) => ({
            name,
            phone: `${DEMO_PHONE_PREFIX}${String(i + 1).padStart(5, "0")}`,
            role: "user",
        }))
    );
    const customerWeights = customers.map((c, i) => [c._id, 1 / (1 + i * 0.35)]);

    // Football is the main sport; others get a share.
    const serviceWeights = services.map((s, i) => [
        s._id,
        /foot/i.test(s.name) ? 7 : /crick/i.test(s.name) ? 2.5 : i === 0 ? 5 : 1,
    ]);
    const pitchWeights = pitches.map((p, i) => [p._id, i === 0 ? 1.4 : 1]);

    const slotsByStart = [...slots].sort((a, b) => a.start_time.localeCompare(b.start_time));
    const nextSlot = (slot) => {
        const idx = slotsByStart.findIndex((s) => s._id.equals(slot._id));
        const next = slotsByStart[idx + 1];
        return next && next.start_time === slot.end_time ? next : null;
    };

    // Slots already taken by REAL bookings: (pitch|date|slot). Legacy pitch-less bookings block every pitch.
    const today = todayIST();
    const from = new Date(today);
    from.setUTCDate(from.getUTCDate() - DAYS_BACK);
    const to = new Date(today);
    to.setUTCDate(to.getUTCDate() + DAYS_AHEAD + 1);
    const taken = new Set();
    const existing = await Booking.find({ date: { $gte: from, $lt: to }, status: { $ne: "cancelled" } })
        .select("pitch date time_slots")
        .lean();
    for (const b of existing) {
        const day = b.date.toISOString().slice(0, 10);
        const pitchIds = b.pitch ? [b.pitch] : pitches.map((p) => p._id);
        for (const p of pitchIds) for (const s of b.time_slots) taken.add(`${p}|${day}|${s}`);
    }

    const now = new Date();
    const docs = [];

    for (let offset = -DAYS_BACK; offset <= DAYS_AHEAD; offset++) {
        const date = new Date(today);
        date.setUTCDate(date.getUTCDate() + offset);
        const day = date.toISOString().slice(0, 10);
        const weekday = date.getUTCDay();
        const isWeekend = weekday === 0 || weekday === 6;
        const isFuture = offset > 0;
        const isToday = offset === 0;

        // Business grows over the period; weekends are busier; future days are partly booked so far.
        const growth = 0.75 + 0.5 * ((offset + DAYS_BACK) / (DAYS_BACK + DAYS_AHEAD));
        let target = (isWeekend ? 9 : 5) * growth;
        if (isFuture) target *= Math.max(0.15, 1 - offset / (DAYS_AHEAD + 2));
        const count = Math.max(0, Math.round(target + (rand() - 0.5) * 4));

        for (let n = 0; n < count; n++) {
            const pitch = weighted(pitchWeights);
            const first = weighted(slotsByStart.map((s) => [s, hourWeight(Number(s.start_time.slice(0, 2)))]));
            const chosen = [first];
            if (rand() < 0.22) {
                const second = nextSlot(first);
                if (second) chosen.push(second);
            }
            const keys = chosen.map((s) => `${pitch}|${day}|${s._id}`);
            if (keys.some((k) => taken.has(k))) continue; // never double-book
            keys.forEach((k) => taken.add(k));

            let total = chosen.reduce((s, sl) => s + sl.price, 0);
            if (rand() < 0.12) total = Math.round(total * (1 - pick([0.1, 0.15, 0.2]))); // coupon used

            const status = isFuture || isToday
                ? weighted([["paid", 55], ["partial", 25], ["pending", 14], ["cancelled", 6]])
                : weighted([["paid", 78], ["partial", 10], ["cancelled", 12]]);
            const amountPaid =
                status === "paid" ? total : status === "partial" ? Math.round(total * 0.3) : 0;

            // Booked 0–7 days in advance, never in the future.
            const createdAt = new Date(date.getTime() - Math.floor(rand() * 7 * 24 + 2) * 3600 * 1000);
            if (createdAt > now) createdAt.setTime(now.getTime() - Math.floor(rand() * 48) * 3600 * 1000);

            const ref = Math.floor(rand() * 1e12).toString(36);
            const bookingEnd = new Date(date);
            bookingEnd.setUTCDate(bookingEnd.getUTCDate() + 1);
            docs.push({
                user: weighted(customerWeights),
                service: weighted(serviceWeights),
                pitch,
                time_slots: chosen.map((s) => s._id),
                date,
                status,
                total_payable: total,
                amount_paid: amountPaid,
                payment_type: status === "partial" ? "partial" : "full",
                // Pending bookings stay pending until their day so the expiry cron leaves them alone.
                expires_at: status === "pending" ? bookingEnd : new Date(createdAt.getTime() + 5 * 60 * 1000),
                ...(amountPaid > 0
                    ? { payment_order_id: `order_demo_${ref}`, payment_order_amount: amountPaid * 100, payment_id: `pay_demo_${ref}` }
                    : {}),
                createdAt,
                updatedAt: createdAt,
            });
        }
    }

    // timestamps:false keeps our back-dated createdAt values.
    await Booking.insertMany(docs, { timestamps: false });

    const byStatus = docs.reduce((m, d) => ((m[d.status] = (m[d.status] || 0) + 1), m), {});
    const revenue = docs.reduce((s, d) => s + d.amount_paid, 0);
    console.log(`Created ${customers.length} demo customers and ${docs.length} demo bookings`);
    console.log(`  range: ${from.toISOString().slice(0, 10)} → ${new Date(to - 864e5).toISOString().slice(0, 10)}`);
    console.log(`  by status: ${JSON.stringify(byStatus)}`);
    console.log(`  revenue collected: ₹${revenue.toLocaleString("en-IN")}`);
}

try {
    await mongoose.connect(process.env.DATABASE_URL);
    if (process.argv.includes("--clear")) {
        const { users, bookings } = await clearDemo();
        console.log(`Removed ${users} demo customers and ${bookings} demo bookings. Real data untouched.`);
    } else {
        await seedDemo();
    }
} catch (error) {
    console.error("Demo seed failed:", error.message);
    process.exitCode = 1;
} finally {
    await mongoose.disconnect();
}
