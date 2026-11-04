import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { adminFetch } from "@/lib/api";

/**
 * Licence / plan state for the admin panel.
 *
 * Everything here comes from GET /admin/subscription/status, which mirrors the
 * Subscription Registry. No plan rules live in the frontend: which features are
 * on and what the limits are is whatever the registry last sent.
 */

export type FeatureKey =
  | "bookingPWA"
  | "onlinePayments"
  | "manualBookings"
  | "calendarManagement"
  | "basicAnalytics"
  | "coupons"
  | "advancedAnalytics"
  | "leaderboards"
  | "pitchWiseReports"
  | "staffManagement"
  | "roleBasedAccess"
  | "financialExports"
  | (string & {});

export type LimitKey = "maxPitches" | "maxStaff" | "maxAdmins" | (string & {});

export type StaffArea =
  | "dashboard"
  | "bookings"
  | "calendar"
  | "pricing"
  | "services"
  | "pitches"
  | "coupons"
  | "reports";

export interface Plan {
  code: string | null;
  name: string | null;
  limits: Record<string, number | null>;
  features: Record<string, boolean>;
}

export interface UsageEntry {
  used: number;
  /** null = unlimited */
  max: number | null;
  atLimit: boolean;
  overLimit: boolean;
}

export interface SubscriptionStatus {
  success: boolean;
  deploymentId: string;
  status: "active" | "inactive" | "suspended" | string;
  deploymentStatus: "active" | "inactive" | "suspended" | string;
  bookingEnabled: boolean;
  expiresAt: string;
  daysLeft: number;
  hoursLeft: number;
  isExpired: boolean;
  registryReachable: boolean;
  syncedAt?: string | null;
  plan: Plan | null;
  usage?: Record<string, UsageEntry>;
  me?: { id: string; role: "admin" | "staff" | string; permissions: StaffArea[] };
}

export const SUBSCRIPTION_QUERY_KEY = ["global-subscription-status"] as const;

export function useSubscription() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const query = useQuery({
    queryKey: SUBSCRIPTION_QUERY_KEY,
    queryFn: () => adminFetch<SubscriptionStatus>("/admin/subscription/status"),
    enabled: isClient,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  const data = query.data;
  const loaded = !!data;
  const plan = data?.plan ?? null;
  const noPlan = loaded && !plan;

  const isInactive =
    data?.status === "inactive" ||
    data?.status === "suspended" ||
    data?.isExpired === true ||
    noPlan;

  /**
   * Feature flag from the registry. While the licence is still loading this
   * returns true so pages don't flash a "locked" state; the backend enforces
   * the real rule regardless.
   */
  const hasFeature = (key: FeatureKey) => (loaded ? plan?.features?.[key] === true : true);

  /** Usage vs. limit for a plan limit (e.g. "maxPitches"). */
  const usage = (key: LimitKey): UsageEntry | undefined => data?.usage?.[key];

  const role = data?.me?.role ?? "admin";
  const isAdmin = role === "admin";
  /** Staff permission check; admins can do everything. */
  const can = (area: StaffArea) =>
    isAdmin || !loaded || (data?.me?.permissions ?? []).includes(area);

  const bookingsDisabled = loaded && data?.bookingEnabled === false;
  const manualBookingLocked = isInactive || bookingsDisabled || !hasFeature("manualBookings");

  return {
    ...query,
    loaded,
    plan,
    noPlan,
    isInactive,
    isSuspended: data?.status === "suspended",
    isExpired: data?.isExpired ?? false,
    deploymentId: data?.deploymentId ?? "DEP-0001",
    daysLeft: data?.daysLeft ?? 0,
    status: noPlan ? "no plan" : (data?.status ?? "active"),
    bookingsDisabled,
    manualBookingLocked,
    hasFeature,
    usage,
    role,
    isAdmin,
    can,
  };
}
