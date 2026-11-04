import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  Loader2,
  RefreshCw,
  Send,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel } from "@/components/turf/ui-bits";
import { ZINTH_URL } from "@/components/turf/brand";
import { adminFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

interface PlanOption {
  code: string;
  name: string;
  label: string;
  tagline: string;
  price: number;
  currency: string;
  interval: string;
  highlights: string[];
  includes: string | null;
}

interface PlanRequestInfo {
  id: string;
  requestedPlanCode: string;
  requestedPlanName: string;
  amount: number;
  paymentReference: string;
  status: "pending" | "approved" | "rejected";
  resolutionNote: string;
  createdAt: string;
  resolvedAt: string | null;
}

interface PlanOptionsResponse {
  currentPlanCode: string | null;
  plans: PlanOption[];
  payment: { upiId: string; payeeName: string } | null;
  latestRequest: PlanRequestInfo | null;
}

const PLAN_OPTIONS_KEY = ["subscription-plan-options"] as const;

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "";

/** Pick a plan → scan the UPI QR → enter the UPI reference → notify Zinth Labs. */
export function ChangePlan({ deploymentId }: { deploymentId: string }) {
  const queryClient = useQueryClient();
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: PLAN_OPTIONS_KEY,
    queryFn: () => adminFetch<PlanOptionsResponse>("/admin/subscription/plans"),
    enabled: isClient,
    staleTime: 60 * 1000,
  });

  const [selected, setSelected] = useState<string | null>(null);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [qr, setQr] = useState("");
  const [sending, setSending] = useState(false);

  const plans = data?.plans ?? [];
  const currentCode = data?.currentPlanCode ?? null;
  const currentIndex = plans.findIndex((p) => p.code === currentCode);
  const selectedCode = selected ?? currentCode ?? plans[1]?.code ?? plans[0]?.code ?? null;
  const plan = plans.find((p) => p.code === selectedCode);
  const payment = data?.payment ?? null;

  // Keep the UPI ID raw: some UPI apps reject an encoded "@" or "+" for spaces.
  const upiLink =
    plan && payment
      ? `upi://pay?pa=${payment.upiId}` +
        `&pn=${encodeURIComponent(payment.payeeName)}` +
        `&am=${plan.price}` +
        `&cu=${plan.currency || "INR"}` +
        `&tn=${encodeURIComponent(`TurfOS ${plan.name} ${deploymentId}`)}`
      : "";

  useEffect(() => {
    if (!upiLink) {
      setQr("");
      return;
    }
    QRCode.toDataURL(upiLink, { width: 240, margin: 1 })
      .then(setQr)
      .catch(() => setQr(""));
  }, [upiLink]);

  const actionFor = (index: number) =>
    currentIndex < 0 ? "Choose" : index === currentIndex ? "Renew" : index > currentIndex ? "Upgrade" : "Downgrade";

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const submit = async () => {
    if (!plan) return;
    if (reference.trim().length < 6) {
      toast.error("Enter the UPI reference / UTR from your payment app");
      return;
    }
    setSending(true);
    try {
      await adminFetch("/admin/subscription/plan-request", {
        method: "POST",
        body: JSON.stringify({ planCode: plan.code, paymentReference: reference.trim(), note: note.trim() }),
      });
      toast.success("Zinth Labs has been notified. We'll confirm your payment shortly.");
      setReference("");
      setNote("");
      queryClient.invalidateQueries({ queryKey: PLAN_OPTIONS_KEY });
    } catch (err: any) {
      toast.error(err.message || "Couldn't notify Zinth Labs. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (isLoading || !isClient) {
    return (
      <Panel className="flex items-center gap-2 p-5 text-[13px] text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading plans…
      </Panel>
    );
  }

  if (isError || !data) {
    return (
      <Panel className="flex flex-wrap items-center justify-between gap-3 p-5 text-[13px]">
        <span className="flex items-center gap-2 text-muted-foreground">
          <AlertTriangle className="size-4 text-warning" />
          {(error as Error)?.message || "Couldn't load plans from Zinth Labs."}
        </span>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-1.5">
          <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} /> Try again
        </Button>
      </Panel>
    );
  }

  const latest = data.latestRequest;

  return (
    <div className="space-y-4">
      {latest && <RequestBanner request={latest} />}

      {/* Step 1: choose a plan */}
      <div className="grid gap-3 md:grid-cols-3">
        {plans.map((p, i) => {
          const isSelected = p.code === selectedCode;
          const isCurrent = p.code === currentCode;
          return (
            <button
              key={p.code}
              type="button"
              onClick={() => setSelected(p.code)}
              className={cn(
                "flex flex-col rounded-lg border bg-card p-4 text-left shadow-card transition-colors",
                isSelected ? "border-primary ring-2 ring-primary/25" : "hover:border-primary/40",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[15px] font-semibold">{p.name}</span>
                {isCurrent ? (
                  <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success">
                    Current plan
                  </span>
                ) : (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {p.label}
                  </span>
                )}
              </div>
              <div className="mt-1.5 text-[22px] font-semibold tracking-tight">
                {inr(p.price)}
                <span className="text-[12.5px] font-normal text-muted-foreground"> /{p.interval}</span>
              </div>
              <p className="text-[12px] text-muted-foreground">{p.tagline}</p>
              <ul className="mt-3 space-y-1.5 text-[12px]">
                {p.includes && (
                  <li className="font-medium text-foreground">
                    Everything in {plans.find((x) => x.code === p.includes)?.name ?? p.includes}, plus:
                  </li>
                )}
                {p.highlights.slice(0, 6).map((h) => (
                  <li key={h} className="flex gap-1.5 text-foreground/85">
                    <CheckCircle2 className="mt-px size-3.5 shrink-0 text-success" />
                    {h}
                  </li>
                ))}
                {p.highlights.length > 6 && (
                  <li className="pl-5 text-muted-foreground">+{p.highlights.length - 6} more</li>
                )}
              </ul>
              <span
                className={cn(
                  "mt-auto pt-4 text-[12.5px] font-semibold",
                  isSelected ? "text-primary" : "text-muted-foreground",
                )}
              >
                {isSelected ? `✓ Selected — ${actionFor(i).toLowerCase()}` : actionFor(i)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Step 2 + 3: pay and notify */}
      {plan &&
        (payment ? (
          <Panel className="grid gap-5 p-5 md:grid-cols-[auto_minmax(0,1fr)]">
            <div className="flex flex-col items-center gap-2">
              {qr ? (
                <img src={qr} alt={`UPI QR code to pay ${inr(plan.price)}`} className="size-48 rounded-md border bg-white p-1.5" />
              ) : (
                <div className="grid size-48 place-items-center rounded-md border bg-muted">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              )}
              <span className="text-[11.5px] text-muted-foreground">GPay · PhonePe · Paytm · any UPI app</span>
              <a
                href={upiLink}
                className="flex items-center gap-1 text-[12px] font-medium text-primary md:hidden"
              >
                <Smartphone className="size-3.5" /> Open UPI app
              </a>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
                  Step 2 · Scan and pay
                </div>
                <div className="mt-1 text-[24px] font-semibold tracking-tight">{inr(plan.price)}</div>
                <div className="text-[12.5px] text-muted-foreground">
                  {plan.name} plan, 30 days · paid to {payment.payeeName}
                </div>
                <button
                  type="button"
                  onClick={() => copy(payment.upiId, "UPI ID")}
                  className="mt-1.5 inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 font-mono text-[12px] hover:bg-secondary/80"
                >
                  {payment.upiId} <Copy className="size-3" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
                  Step 3 · Tell us you've paid
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-[12.5px]" htmlFor="upi-ref">
                      UPI reference / UTR <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="upi-ref"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className="h-9 font-mono"
                      placeholder="e.g. 412345678901"
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[12.5px]" htmlFor="plan-note">
                      Note (optional)
                    </Label>
                    <Input
                      id="plan-note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="h-9"
                      placeholder="Anything we should know"
                      maxLength={300}
                    />
                  </div>
                </div>
                <p className="text-[11.5px] text-muted-foreground">
                  Find the reference in your UPI app under the payment details. It helps us match your payment quickly.
                </p>
                <Button onClick={submit} disabled={sending} className="gap-1.5">
                  {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  I've paid — notify Zinth Labs
                </Button>
              </div>
            </div>
          </Panel>
        ) : (
          <Panel className="p-5 text-[13px] text-muted-foreground">
            Online payment isn't set up yet. Contact{" "}
            <a href={ZINTH_URL} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
              zinthlabs.in
            </a>{" "}
            with account ID <span className="font-mono text-foreground">{deploymentId}</span> and the plan you want (
            {plan.name}, {inr(plan.price)}/{plan.interval}).
          </Panel>
        ))}
    </div>
  );
}

function RequestBanner({ request }: { request: PlanRequestInfo }) {
  if (request.status === "pending") {
    return (
      <div className="flex items-start gap-2.5 rounded-md border border-warning/30 bg-warning-soft px-3.5 py-3 text-[12.5px] text-warning">
        <Clock className="mt-0.5 size-4 shrink-0" />
        <div>
          <strong>Waiting for confirmation.</strong> You asked for {request.requestedPlanName} ({inr(request.amount)}) on{" "}
          {fmtDate(request.createdAt)}
          {request.paymentReference && <> with reference <span className="font-mono">{request.paymentReference}</span></>}.
          Your plan updates as soon as Zinth Labs confirms the payment. Sending a new request replaces this one.
        </div>
      </div>
    );
  }
  if (request.status === "rejected") {
    return (
      <div className="flex items-start gap-2.5 rounded-md border border-destructive/25 bg-destructive/10 px-3.5 py-3 text-[12.5px] text-destructive">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <div>
          <strong>Your request for {request.requestedPlanName} wasn't approved.</strong>{" "}
          {request.resolutionNote || "Please check the payment and send the request again."}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2.5 rounded-md border border-success/25 bg-success-soft px-3.5 py-3 text-[12.5px] text-success">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
      <div>
        Your {request.requestedPlanName} payment was confirmed on {fmtDate(request.resolvedAt)}.
      </div>
    </div>
  );
}
