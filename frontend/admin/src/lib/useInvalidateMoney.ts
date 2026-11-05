import { useQueryClient } from "@tanstack/react-query";

/** Invalidate everything that shows booking money. */
export function useInvalidateMoney() {
  const qc = useQueryClient();
  return () => {
    for (const key of [
      "admin-bookings",
      "admin-booking-detail",
      "admin-booking-payments",
      "admin-payments",
      "admin-transactions",
      "admin-daily-report",
      "admin-customers",
      "admin-customer",
      "admin-recurring",
      "admin-dashboard-overview",
    ]) {
      qc.invalidateQueries({ queryKey: [key] });
    }
  };
}
