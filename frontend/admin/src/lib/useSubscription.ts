import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { adminFetch } from "@/lib/api";

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
}

export function useSubscription() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const query = useQuery({
    queryKey: ["global-subscription-status"],
    queryFn: () => adminFetch<SubscriptionStatus>("/admin/subscription/status"),
    enabled: isClient,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  const isInactive =
    query.data?.status === "inactive" ||
    query.data?.status === "suspended" ||
    query.data?.isExpired === true;

  return {
    ...query,
    isInactive,
    isSuspended: query.data?.status === "suspended",
    isExpired: query.data?.isExpired ?? false,
    deploymentId: query.data?.deploymentId ?? "DEP-0001",
    daysLeft: query.data?.daysLeft ?? 0,
    status: query.data?.status ?? "active",
  };
}

