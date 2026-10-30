import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  Layers,
  Loader2,
  QrCode,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { inr } from "@/lib/turf-data";
import { PageHeader, Panel, StatusBadge, Td, Th, selectCls } from "@/components/turf/ui-bits";
import { pageMeta } from "@/lib/meta";
import { adminFetch } from "@/lib/api";

export const Route = createFileRoute("/payments")({
  head: () => pageMeta("Payments & Subscription", "Razorpay booking payments and Zinth OS license subscription status."),
  component: PaymentsPage,
});

interface SubscriptionData {
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

interface ApiBooking {
  _id: string;
  booking_ref: string;
  customer?: { name: string; phone: string };
  service?: { name: string };
  total_payable: number;
  amount_paid: number;
  payment_type: string;
  payment_order_id?: string;
  payment_id?: string;
  status: string;
  date: string;
  createdAt: string;
}

interface BookingsResponse {
  bookings: ApiBooking[];
  total: number;
}

interface StatsResponse {
  total: number;
  total_revenue: number;
  total_collected: number;
  outstanding: number;
  by_status: {
    pending: number;
    partial: number;
    paid: number;
    cancelled: number;
  };
}

const formatDateTime = (iso: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function PaymentsPage() {
  const queryClient = useQueryClient();
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const [paymentTypeFilter, setPaymentTypeFilter] = useState("");
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("monthly");
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  // 1. Fetch Subscription Status from backend (which queries localhost:5001/api/registry/status)
  const {
    data: subData,
    isLoading: subLoading,
    isFetching: subFetching,
    refetch: refetchSub,
  } = useQuery({
    queryKey: ["admin-subscription-status"],
    queryFn: () => adminFetch<SubscriptionData>("/admin/subscription/status"),
    enabled: isClient,
    refetchInterval: 60 * 1000,
  });

  // 2. Fetch real booking payments list
  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ["admin-payment-bookings", paymentTypeFilter],
    queryFn: () =>
      adminFetch<BookingsResponse>(
        `/admin/bookings?limit=50&status=paid,partial&sort=createdAt&order=desc`
      ),
    enabled: isClient,
  });

  // 3. Fetch aggregated stats
  const { data: statsData } = useQuery({
    queryKey: ["admin-booking-stats"],
    queryFn: () => adminFetch<StatsResponse>("/admin/bookings/stats"),
    enabled: isClient,
  });

  const allBookings = bookingsData?.bookings ?? [];
  const rows = allBookings.filter(
    (b) => !paymentTypeFilter || b.payment_type?.toLowerCase() === paymentTypeFilter.toLowerCase()
  );

  const collected = statsData?.total_collected ?? rows.reduce((a, b) => a + (b.amount_paid || 0), 0);
  const outstanding = statsData?.outstanding ?? rows.reduce((a, b) => a + Math.max(0, (b.total_payable || 0) - (b.amount_paid || 0)), 0);
  const partialCount = statsData?.by_status?.partial ?? rows.filter((b) => b.payment_type?.toLowerCase() === "partial").length;

  // Subscription calculation
  const expiresDate = subData?.expiresAt ? new Date(subData.expiresAt) : new Date("2026-11-29T00:00:00.000Z");
  const daysLeft = subData?.daysLeft ?? 30;
  const isSuspendedOrInactive = subData?.status === "suspended" || subData?.status === "inactive" || subData?.isExpired;

  const planAmount = selectedPlan === "monthly" ? 2999 : 29999;
  const fakeUpiId = "zinthlabs@icici";
  const fakeQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=upi://pay?pa=${fakeUpiId}&pn=Zinth%20Labs%20Turf%20OS&am=${planAmount}&cu=INR&tn=Deployment%20${subData?.deploymentId || "DEP-0001"}`;

  const handleSimulatePayment = () => {
    setVerifyingPayment(true);
    setTimeout(() => {
      setVerifyingPayment(false);
      setPayModalOpen(false);
      toast.success("Payment Received & Verified!", {
        description: `License for ${subData?.deploymentId || "DEP-0001"} extended successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-subscription-status"] });
    }, 1600);
  };

  const copyUpi = () => {
    navigator.clipboard.writeText(fakeUpiId);
    toast.success("UPI ID copied to clipboard: " + fakeUpiId);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments & Subscription"
        desc="Deployment license status, subscription renewals and booking payment transactions."
      />

      {/* ─────────────────── SUBSCRIPTION & REGISTRY BANNER ─────────────────── */}
      <Panel className="relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-card via-card to-primary-soft/40 shadow-sm">
        <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11.5px] font-semibold tracking-wide text-primary uppercase">
                <Zap className="size-3.5 fill-current" /> Zinth OS Deployment
              </span>
              <span className="font-mono text-[13px] font-bold text-foreground">
                {subData?.deploymentId || "DEP-0001"}
              </span>

              {/* Status Badge */}
              {subData?.status === "active" ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11.5px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active License
                </span>
              ) : subData?.status === "suspended" ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-0.5 text-[11.5px] font-semibold text-destructive">
                  <ShieldAlert className="size-3.5" />
                  Suspended
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11.5px] font-semibold text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="size-3.5" />
                  Inactive
                </span>
              )}

              {subData?.bookingEnabled ? (
                <span className="hidden sm:inline-flex items-center gap-1 text-[12px] text-muted-foreground">
                  • Bookings Enabled
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[12px] font-medium text-destructive">
                  • Bookings Disabled
                </span>
              )}
            </div>

            <h2 className="text-[19px] font-semibold tracking-tight text-foreground sm:text-[21px]">
              {subLoading ? (
                "Connecting to Registry..."
              ) : isSuspendedOrInactive ? (
                <span className="text-destructive">Subscription Expired / Suspended</span>
              ) : (
                <span>
                  Subscription Active ·{" "}
                  <span className="text-primary">{daysLeft} {daysLeft === 1 ? "day" : "days"} remaining</span>
                </span>
              )}
            </h2>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-[12.5px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5 text-muted-foreground" />
                Valid until: <strong className="font-medium text-foreground">{formatDateTime(expiresDate.toISOString())}</strong>
              </span>
              <span className="flex items-center gap-1">
                <Clock className="size-3.5 text-muted-foreground" />
                Time left: <strong className="font-medium text-foreground">{daysLeft} days (~{subData?.hoursLeft || daysLeft * 24} hrs)</strong>
              </span>
              <span className="flex items-center gap-1 text-[11px]">
                {subData?.registryReachable ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="size-3" /> Registry Synced
                  </span>
                ) : (
                  <span className="text-muted-foreground flex items-center gap-1" title="Registry at localhost:5001/api/registry/status currently using local cache">
                    <ShieldCheck className="size-3 text-primary" /> License Cached
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-1 lg:pt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchSub();
                toast.info("Refreshed license status from registry");
              }}
              disabled={subFetching}
              className="gap-1.5"
            >
              <RefreshCw className={`size-3.5 ${subFetching ? "animate-spin" : ""}`} />
              Sync Status
            </Button>
            <Button
              size="sm"
              onClick={() => setPayModalOpen(true)}
              className="gap-1.5 bg-primary font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <CreditCard className="size-3.5" />
              Make Payment / Renew
            </Button>
          </div>
        </div>

        {/* Progress Bar of time left in month */}
        <div className="h-1.5 w-full bg-secondary">
          <div
            className={`h-full transition-all duration-500 ${
              daysLeft <= 3 ? "bg-destructive" : daysLeft <= 7 ? "bg-amber-500" : "bg-primary"
            }`}
            style={{ width: `${Math.min(100, Math.max(5, (daysLeft / 30) * 100))}%` }}
          />
        </div>
      </Panel>

      {/* ─────────────────── METRICS CARDS ─────────────────── */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Panel className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] text-muted-foreground">Collected revenue</span>
            <span className="rounded-md bg-success-soft p-1.5 text-success">
              <CheckCircle2 className="size-4" />
            </span>
          </div>
          <div className="mt-2 text-[22px] font-semibold tracking-tight text-success">{inr(collected)}</div>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">Successful customer settlements</p>
        </Panel>

        <Panel className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] text-muted-foreground">Outstanding balance</span>
            <span className="rounded-md bg-warning-soft p-1.5 text-warning">
              <Clock className="size-4" />
            </span>
          </div>
          <div className="mt-2 text-[22px] font-semibold tracking-tight text-warning">{inr(outstanding)}</div>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">To be collected at venue check-in</p>
        </Panel>

        <Panel className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] text-muted-foreground">Partial bookings</span>
            <span className="rounded-md bg-primary-soft p-1.5 text-primary">
              <Layers className="size-4" />
            </span>
          </div>
          <div className="mt-2 text-[22px] font-semibold tracking-tight">{partialCount}</div>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">Bookings with advance paid</p>
        </Panel>
      </div>

      {/* ─────────────────── TRANSACTIONS TABLE ─────────────────── */}
      <Panel className="overflow-x-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3">
          <div>
            <h3 className="text-[13.5px] font-semibold">Booking payments & Razorpay transactions</h3>
            <p className="text-[12px] text-muted-foreground">Customer booking payment records</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={paymentTypeFilter}
              onChange={(e) => setPaymentTypeFilter(e.target.value)}
              className={selectCls}
            >
              <option value="">All payment types</option>
              <option value="full">Full payments</option>
              <option value="partial">Partial payments</option>
            </select>
          </div>
        </div>

        <table className="w-full whitespace-nowrap">
          <thead>
            <tr>
              <Th>Booking</Th>
              <Th>Customer</Th>
              <Th>Pitch</Th>
              <Th>Order ID</Th>
              <Th>Payment ID</Th>
              <Th className="text-right">Paid</Th>
              <Th className="text-right">Total</Th>
              <Th>Type</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {bookingsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <Td key={j}>
                      <div className="h-4 animate-pulse rounded bg-muted" />
                    </Td>
                  ))}
                </tr>
              ))
            ) : rows.length > 0 ? (
              rows.map((b) => (
                <tr key={b._id} className="hover:bg-surface">
                  <Td className="font-medium text-primary">
                    {b.booking_ref || `BK-${b._id.slice(-4).toUpperCase()}`}
                  </Td>
                  <Td>
                    <div className="font-medium">{b.customer?.name || "Customer"}</div>
                    <div className="text-[11.5px] text-muted-foreground">{b.customer?.phone}</div>
                  </Td>
                  <Td className="text-muted-foreground">{b.service?.name || "General Turf"}</Td>
                  <Td className="font-mono text-[12px] text-muted-foreground">
                    {b.payment_order_id ?? "—"}
                  </Td>
                  <Td className="font-mono text-[12px] text-muted-foreground">
                    {b.payment_id ?? "—"}
                  </Td>
                  <Td className="text-right font-semibold text-foreground">{inr(b.amount_paid || 0)}</Td>
                  <Td className="text-right text-muted-foreground">{inr(b.total_payable || 0)}</Td>
                  <Td>
                    <StatusBadge
                      status={
                        b.payment_type?.toLowerCase() === "partial" ? "Partial" : "Full"
                      }
                    />
                  </Td>
                  <Td>
                    <StatusBadge
                      status={
                        b.status ? b.status.charAt(0).toUpperCase() + b.status.slice(1) : "Paid"
                      }
                    />
                  </Td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="p-10 text-center text-[13px] text-muted-foreground">
                  No payment records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Panel>

      {/* ─────────────────── RENEWAL PAYMENT MODAL WITH FAKE QR ─────────────────── */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="size-5" />
              <DialogTitle className="text-[17px]">Renew Turf OS Subscription</DialogTitle>
            </div>
            <DialogDescription className="text-[12.5px]">
              Deploy ID: <strong className="font-mono text-foreground">{subData?.deploymentId || "DEP-0001"}</strong> · Select your renewal plan and scan to pay.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Plan Selector */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedPlan("monthly")}
                className={`relative flex flex-col items-start rounded-lg border p-3 text-left transition-all ${
                  selectedPlan === "monthly"
                    ? "border-primary bg-primary-soft/40 shadow-sm ring-1 ring-primary"
                    : "border-border hover:bg-surface"
                }`}
              >
                <span className="text-[12px] font-semibold uppercase text-muted-foreground">Monthly</span>
                <span className="mt-1 text-[17px] font-bold text-foreground">₹2,999</span>
                <span className="text-[11px] text-muted-foreground">+ GST / month</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPlan("yearly")}
                className={`relative flex flex-col items-start rounded-lg border p-3 text-left transition-all ${
                  selectedPlan === "yearly"
                    ? "border-primary bg-primary-soft/40 shadow-sm ring-1 ring-primary"
                    : "border-border hover:bg-surface"
                }`}
              >
                <span className="absolute -top-2 right-2 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase">
                  Save 16%
                </span>
                <span className="text-[12px] font-semibold uppercase text-muted-foreground">Annual</span>
                <span className="mt-1 text-[17px] font-bold text-foreground">₹29,999</span>
                <span className="text-[11px] text-muted-foreground">12 months access</span>
              </button>
            </div>

            {/* QR Code Card */}
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-surface p-4 text-center">
              <div className="relative rounded-lg border bg-white p-2.5 shadow-sm">
                <img
                  src={fakeQrUrl}
                  alt="UPI Payment QR"
                  className="size-44 rounded-md object-contain"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 hover:opacity-100 transition-opacity bg-black/60 rounded-lg">
                  <span className="text-white text-[11px] font-medium">Scan with GPay/PhonePe</span>
                </div>
              </div>

              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-[13px] font-medium text-foreground">
                  <span>Pay: <strong>₹{planAmount.toLocaleString("en-IN")}</strong></span>
                  <span className="text-muted-foreground">•</span>
                  <span className="font-mono text-muted-foreground">{fakeUpiId}</span>
                  <button
                    type="button"
                    onClick={copyUpi}
                    className="text-primary hover:text-primary/80"
                    title="Copy UPI ID"
                  >
                    <Copy className="size-3.5" />
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Scan using Google Pay, PhonePe, Paytm or any UPI app.
                </p>
              </div>
            </div>

            <div className="rounded-md border border-primary/20 bg-primary-soft/30 p-2.5 text-[12px] text-muted-foreground">
              <strong className="text-foreground">Instant Activation:</strong> Once payment is confirmed, the license expiration will automatically renew on the registry.
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPayModalOpen(false)}>
              Close
            </Button>
            <Button onClick={handleSimulatePayment} disabled={verifyingPayment} className="gap-1.5">
              {verifyingPayment ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Verifying Payment...
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" /> I Have Made The Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
