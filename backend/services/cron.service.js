import cron from "node-cron";
import Booking from "./models/Booking.js";

// Run every minute
cron.schedule("* * * * *", async () => {
  try {
    await Booking.updateMany(
      {
        status: "pending",
        expires_at: { $lte: new Date() }
      },
      {
        $set: { status: "expired" }
      }
    );
  } catch (error) {
    console.error("Booking expiry job failed:", error);
  }
});
