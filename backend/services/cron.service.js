import cron from "node-cron";
import Booking from "../models/booking.model.js";
import { refreshLicence } from "./licence.service.js";

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


// Re-sync the licence/plan from the Subscription Registry every 10 minutes
cron.schedule("*/10 * * * *", async () => {
  try {
    await refreshLicence();
  } catch (error) {
    console.error("Licence refresh job failed:", error);
  }
});
