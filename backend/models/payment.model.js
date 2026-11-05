import mongoose from "mongoose";

export const PAYMENT_METHODS = ["online", "cash", "upi", "card", "bank_transfer", "other"];

/**
 * One row per money movement (in or out). Booking.amount_paid is the running
 * net of these rows for that booking.
 *
 *  kind   "payment" (money in) | "refund" (money out)
 *  source "razorpay" (webhook) | "admin" (recorded in the panel) | "legacy" (backfilled
 *         from bookings created before the ledger existed)
 */
const paymentSchema = new mongoose.Schema(
    {
        booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        kind: { type: String, enum: ["payment", "refund"], required: true },
        amount: { type: Number, required: true, min: 0.01 },
        method: { type: String, enum: PAYMENT_METHODS, required: true },
        source: { type: String, enum: ["razorpay", "admin", "legacy"], required: true },
        // Gateway payment id, UPI ref, cheque no. etc.
        reference: { type: String, trim: true, default: null },
        note: { type: String, trim: true, default: "" },
        recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        paidAt: { type: Date, required: true, default: Date.now },
    },
    { timestamps: true }
);

paymentSchema.index({ booking: 1, paidAt: 1 });
paymentSchema.index({ user: 1, paidAt: -1 });
paymentSchema.index({ paidAt: -1, method: 1 });
// A Razorpay payment can only ever be recorded once (webhooks are retried).
paymentSchema.index(
    { reference: 1 },
    { unique: true, partialFilterExpression: { source: "razorpay", reference: { $type: "string" } } }
);
// Legacy backfill writes at most one row per booking.
paymentSchema.index(
    { booking: 1, source: 1 },
    { unique: true, partialFilterExpression: { source: "legacy" } }
);

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
