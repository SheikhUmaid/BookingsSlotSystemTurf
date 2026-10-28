// Prototype sample data shaped after the backend models (Service, TimeSlot, Booking, Coupon).
export type Service = { id: string; name: string; description: string; icon: string };
export type SlotCategory = "Morning Sessions" | "Afternoon Sessions" | "Floodlit Evening" | "Late Night";
export type TimeSlot = { id: string; start: string; end: string; category: SlotCategory; price: number };
export type BookingStatus = "Pending" | "Partial" | "Paid" | "Cancelled" | "Expired";
export type PaymentType = "Full" | "Partial";
export type Booking = {
  id: string;
  customer: string;
  phone: string;
  serviceId: string;
  date: string; // yyyy-MM-dd
  slotIds: string[];
  total: number;
  paid: number;
  status: BookingStatus;
  paymentType: PaymentType;
  orderId: string;
  paymentId?: string;
  createdAt: string;
};
export type Coupon = {
  code: string;
  discount: number;
  validFrom: string;
  validUntil: string;
  usageLimit: number;
  used: number;
  active: boolean;
};

export const services: Service[] = [
  { id: "s1", name: "Football Turf A", description: "7-a-side FIFA-grade artificial grass, floodlit", icon: "goal" },
  { id: "s2", name: "Football Turf B", description: "5-a-side compact pitch with side netting", icon: "trophy" },
  { id: "s3", name: "Box Cricket", description: "Enclosed cricket arena with bowling lane", icon: "target" },
  { id: "s4", name: "Pickleball Court", description: "Two hard courts, paddles available on request", icon: "circle-dot" },
];

const mk = (h: number, cat: SlotCategory, price: number): TimeSlot => {
  const f = (x: number) => `${String(x % 24).padStart(2, "0")}:00`;
  return { id: `t${h}`, start: f(h), end: f(h + 1), category: cat, price };
};
export const timeSlots: TimeSlot[] = [
  mk(6, "Morning Sessions", 900), mk(7, "Morning Sessions", 1000), mk(8, "Morning Sessions", 1000), mk(9, "Morning Sessions", 900),
  mk(12, "Afternoon Sessions", 800), mk(13, "Afternoon Sessions", 800), mk(14, "Afternoon Sessions", 800), mk(15, "Afternoon Sessions", 900),
  mk(18, "Floodlit Evening", 1500), mk(19, "Floodlit Evening", 1800), mk(20, "Floodlit Evening", 1800), mk(21, "Floodlit Evening", 1600),
  mk(22, "Late Night", 1300), mk(23, "Late Night", 1200),
];
export const slotCategories: SlotCategory[] = ["Morning Sessions", "Afternoon Sessions", "Floodlit Evening", "Late Night"];

export const coupons: Coupon[] = [
  { code: "WEEKEND20", discount: 20, validFrom: "2026-10-01", validUntil: "2026-11-30", usageLimit: 100, used: 42, active: true },
  { code: "EARLYBIRD", discount: 15, validFrom: "2026-09-15", validUntil: "2026-12-31", usageLimit: 200, used: 87, active: true },
  { code: "DIWALI25", discount: 25, validFrom: "2026-10-15", validUntil: "2026-11-05", usageLimit: 50, used: 50, active: false },
  { code: "FIRSTPLAY", discount: 10, validFrom: "2026-01-01", validUntil: "2026-12-31", usageLimit: 500, used: 213, active: true },
];

const names = ["Rahul Sharma", "Aarav Mehta", "Priya Nair", "Imran Khan", "Vikram Singh", "Sneha Patil", "Arjun Reddy", "Kabir Das", "Neha Gupta", "Rohan Iyer", "Faiz Ahmed", "Ananya Rao"];

function rand(seed: number) {
  let x = seed;
  return () => {
    x = (x * 9301 + 49297) % 233280;
    return x / 233280;
  };
}

export const fmtDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function generateBookings(today: Date): Booking[] {
  const r = rand(7);
  const out: Booking[] = [];
  let n = 1040;
  for (let off = -20; off <= 20; off++) {
    const d = new Date(today);
    d.setDate(d.getDate() + off);
    const date = fmtDate(d);
    const density = off % 7 === 3 ? 0.97 : off % 5 === 0 ? 0.7 : 0.32;
    for (const svc of services) {
      for (const slot of timeSlots) {
        if (r() > density) continue;
        const status: BookingStatus =
          off < 0 ? (r() < 0.82 ? "Paid" : r() < 0.5 ? "Cancelled" : "Expired") : r() < 0.55 ? "Paid" : r() < 0.6 ? "Partial" : "Pending";
        const paymentType: PaymentType = status === "Partial" ? "Partial" : "Full";
        const paid = status === "Paid" ? slot.price : status === "Partial" ? Math.round(slot.price * 0.3) : 0;
        n++;
        out.push({
          id: `BK-${n}`,
          customer: names[Math.floor(r() * names.length)]!,
          phone: `9${Math.floor(100000000 + r() * 899999999)}`,
          serviceId: svc.id,
          date,
          slotIds: [slot.id],
          total: slot.price,
          paid,
          status,
          paymentType,
          orderId: `order_${(n * 7919).toString(36).toUpperCase()}Q${n}`,
          paymentId: paid > 0 ? `pay_${(n * 104729).toString(36).toUpperCase()}` : undefined,
          createdAt: date,
        });
      }
    }
  }
  return out.reverse();
}

export const inr = (v: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

export const to12 = (t: string) => {
  const h = Number(t.slice(0, 2));
  const s = h >= 12 ? "PM" : "AM";
  return `${h % 12 === 0 ? 12 : h % 12}:00 ${s}`;
};

/** A slot is taken for a date+service when an active (non-cancelled, non-expired) booking holds it. */
export function isSlotTaken(bookings: Booking[], date: string, serviceId: string, slotId: string) {
  return bookings.some(
    (b) => b.date === date && b.serviceId === serviceId && b.slotIds.includes(slotId) && b.status !== "Cancelled" && b.status !== "Expired",
  );
}
