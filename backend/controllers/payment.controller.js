import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import razorpay from "../config/razorpay.config.js";
import crypto from "node:crypto";


const PARTIAL_PAYMENT_PERCENT = Number(
  process.env.PARTIAL_PAYMENT_PERCENT || 30
);

export const createPaymentOrder = async (req, res) => {
  try {
    const { bookingId, paymentType } = req.body;
    const userId = req.user.id;

    // 1. Validate the request
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        message: "Invalid booking ID."
      });
    }

    if (!["full", "partial"].includes(paymentType)) {
      return res.status(400).json({
        message: "Payment type must be full or partial."
      });
    }

    if (
      !Number.isFinite(PARTIAL_PAYMENT_PERCENT) ||
      PARTIAL_PAYMENT_PERCENT <= 0 ||
      PARTIAL_PAYMENT_PERCENT > 100
    ) {
      throw new Error("Invalid partial payment percentage.");
    }

    // 2. Find the booking belonging to the authenticated user
    const booking = await Booking.findOne({
      _id: bookingId,
      user: userId
    });

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found."
      });
    }

    // 3. Reject bookings that cannot accept payment
    if (["cancelled", "expired", "paid"].includes(booking.status)) {
      return res.status(400).json({
        message: "This booking cannot accept payment."
      });
    }

    // This version creates the initial payment only.
    if (booking.amount_paid > 0 || booking.payment_order_id) {
      return res.status(409).json({
        message: "A payment has already been initiated for this booking."
      });
    }

    // 4. Ensure the booking has not expired
    if (booking.expires_at && booking.expires_at <= new Date()) {
      booking.status = "expired";
      await booking.save();

      return res.status(400).json({
        message: "Booking has expired. Please book again."
      });
    }

    // 5. Calculate the amount on the backend
    const totalPaise = Math.round(booking.total_payable * 100);

    const amountPaise =
      paymentType === "full"
        ? totalPaise
        : Math.round(
            totalPaise * PARTIAL_PAYMENT_PERCENT / 100
          );

    // Razorpay's minimum order amount for INR is ₹1
    if (
      !Number.isSafeInteger(amountPaise) ||
      amountPaise < 100 ||
      amountPaise > totalPaise
    ) {
      return res.status(400).json({
        message: "Invalid payment amount."
      });
    }

    // 6. Create the order with Razorpay
    const razorpayOrder = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `bk_${booking._id}`,
      notes: {
        bookingId: booking._id.toString(),
        paymentType
      }
    });

    // 7. Save the order details in MongoDB
    booking.payment_order_id = razorpayOrder.id;
    booking.payment_order_amount = amountPaise;
    booking.payment_type = paymentType;

    await booking.save();

    // 8. Return checkout information to the frontend
    return res.status(201).json({
      message: "Payment order created successfully.",
      key_id: process.env.RAZORPAY_KEY_ID,
      order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      payment_type: paymentType
    });
  } catch (error) {
    console.error("Create payment order error:", error);

    return res.status(500).json({
      message: "Unable to create payment order."
    });
  }
};





// Handle Razorpay payment webhooks
export const razorpayWebhook = async (req, res) => {
  try {
    // 1. Read the raw request body.
    // The route must use express.raw(), not express.json().
    const rawBody = req.body;

    if (!Buffer.isBuffer(rawBody)) {
      return res.status(400).send("Raw body required.");
    }

    // 2. Verify Razorpay's webhook signature
    const receivedSignature =
      req.headers["x-razorpay-signature"];

    if (
      typeof receivedSignature !== "string" ||
      !/^[a-f0-9]{64}$/i.test(receivedSignature)
    ) {
      return res.status(400).send("Invalid signature.");
    }

    const expectedSignature = crypto
      .createHmac(
        "sha256",
        process.env.RAZORPAY_WEBHOOK_SECRET
      )
      .update(rawBody)
      .digest("hex");

    const receivedBuffer = Buffer.from(
      receivedSignature,
      "hex"
    );

    const expectedBuffer = Buffer.from(
      expectedSignature,
      "hex"
    );

    if (
      receivedBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(
        receivedBuffer,
        expectedBuffer
      )
    ) {
      return res.status(400).send("Signature verification failed.");
    }

    // 3. Parse the body only after signature verification
    const event = JSON.parse(rawBody.toString("utf8"));

    // 4. Ignore events we do not process
    if (event.event !== "payment.captured") {
      return res.status(200).json({
        received: true
      });
    }

    const payment = event.payload?.payment?.entity;

    if (
      !payment?.id ||
      !payment?.order_id ||
      !Number.isSafeInteger(payment.amount) ||
      payment.status !== "captured"
    ) {
      return res.status(400).send("Invalid payment payload.");
    }

    // 5. Find the booking associated with this Razorpay order
    const booking = await Booking.findOne({
      payment_order_id: payment.order_id
    });

    if (!booking) {
      // Log this for reconciliation. A real captured payment
      // must never be silently forgotten.
      console.error(
        "Captured payment has no matching booking:",
        payment.order_id
      );

      // Acknowledge the event to avoid endless retries.
      // Reconcile this payment through monitoring or an alert.
      return res.status(200).json({
        received: true,
        reconciled: false
      });
    }

    // 6. Check currency and exact amount
    if (
      payment.currency !== "INR" ||
      payment.amount !== booking.payment_order_amount
    ) {
      console.error("Payment amount/currency mismatch:", {
        bookingId: booking._id.toString(),
        orderId: payment.order_id,
        paymentId: payment.id
      });

      // Flag for manual reconciliation; do not mark as paid.
      return res.status(200).json({
        received: true,
        reconciled: false
      });
    }

    // 7. Make webhook processing idempotent.
    // Razorpay may deliver the same event more than once.
    if (booking.payment_id === payment.id) {
      return res.status(200).json({
        received: true,
        alreadyProcessed: true
      });
    }

    // Do not silently reactivate expired/cancelled bookings.
    // A captured late payment requires reconciliation.
    if (["cancelled", "expired"].includes(booking.status)) {
      console.error("Payment captured for inactive booking:", {
        bookingId: booking._id.toString(),
        paymentId: payment.id
      });

      return res.status(200).json({
        received: true,
        reconciled: false
      });
    }

    // 8. Record the captured payment
    const amountPaidRupees = payment.amount / 100;

    booking.payment_id = payment.id;
    booking.amount_paid = amountPaidRupees;

    // 9. Update booking status
    if (booking.amount_paid >= booking.total_payable) {
      booking.status = "paid";
    } else {
      booking.status = "partial";
    }

    // 10. Persist the updated booking
    await booking.save();

    console.log("Payment captured successfully:", {
      bookingId: booking._id.toString(),
      paymentId: payment.id,
      amountPaid: amountPaidRupees,
      status: booking.status
    });

    return res.status(200).json({
      received: true
    });
  } catch (error) {
    console.error("Razorpay webhook error:", error);

    // A 5xx response allows the gateway to retry.
    return res.status(500).send("Webhook processing failed.");
  }
};