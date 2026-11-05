import { toast } from "sonner";

export type PaymentMethod = "online" | "cash" | "upi" | "card" | "bank_transfer" | "other";
export type PaymentStatus = "paid" | "partial" | "pending" | "refunded" | "cancelled";

export const METHOD_LABELS: Record<string, string> = {
  online: "Online (Razorpay)",
  cash: "Cash",
  upi: "UPI",
  card: "Card",
  bank_transfer: "Bank transfer",
  other: "Other",
};

/** Methods staff can record by hand (online payments come from Razorpay automatically). */
export const MANUAL_METHODS: PaymentMethod[] = ["cash", "upi", "card", "bank_transfer", "other"];

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: "Paid",
  partial: "Partly paid",
  pending: "Unpaid",
  refunded: "Refunded",
  cancelled: "Cancelled",
};

export const CATEGORY_LABELS: Record<string, string> = {
  new: "New",
  regular: "Regular",
  inactive: "Inactive",
  high_value: "High-Value",
};

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  electricity: "Electricity",
  rent: "Rent",
  salaries: "Staff salaries",
  maintenance: "Maintenance",
  equipment: "Equipment",
  marketing: "Marketing",
  other: "Other",
};

export const MAINTENANCE_STATUS_LABELS: Record<string, string> = {
  pending: "Scheduled",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Venue-local today (YYYY-MM-DD) using the browser clock. */
export const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const shiftDate = (ymd: string, days: number) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** Booking dates are stored as UTC midnight of the calendar day. */
export const fmtDay = (iso?: string | null, withYear = true) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        ...(withYear ? { year: "numeric" } : {}),
        timeZone: "UTC",
      })
    : "—";

export const fmtDateTime = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export async function copyText(text: string, label = "Copied") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  } catch {
    toast.error("Couldn't copy — your browser blocked clipboard access.");
  }
}

/** "Name — 98765 43210" lines for manual follow-up. */
export const contactLines = (rows: { name?: string; phone: string }[]) =>
  rows.map((r) => `${r.name || "Customer"} — ${r.phone}`).join("\n");
