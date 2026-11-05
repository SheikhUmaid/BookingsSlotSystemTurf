import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge, selectCls } from "./ui-bits";
import { adminFetch } from "@/lib/api";
import { inr } from "@/lib/turf-data";
import { METHOD_LABELS, MANUAL_METHODS, PAYMENT_STATUS_LABELS, fmtDateTime } from "@/lib/business";
import { useSubscription } from "@/lib/useSubscription";
import { useInvalidateMoney } from "@/lib/useInvalidateMoney";

interface LedgerRow {
  _id: string;
  kind: "payment" | "refund";
  amount: number;
  method: string;
  source: string;
  reference?: string | null;
  note?: string;
  paidAt: string;
  recordedBy?: { name?: string } | null;
}

interface BookingPaymentsResponse {
  booking_ref: string;
  total_payable: number;
  amount_paid: number;
  amount_refunded: number;
  balance: number;
  payment_status: string;
  transactions: LedgerRow[];
}

/**
 * Payment panel for one booking: totals, ledger and actions
 * (record payment, refund — admins only).
 */
export function BookingPayments({
  bookingId,
  bookingStatus,
}: {
  bookingId: string;
  bookingStatus: string;
}) {
  const { isInactive, isAdmin } = useSubscription();
  const [dialog, setDialog] = useState<"pay" | "refund" | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-booking-payments", bookingId],
    queryFn: () => adminFetch<BookingPaymentsResponse>(`/admin/bookings/${bookingId}/payments`),
  });

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const inactive = ["cancelled", "expired"].includes(bookingStatus);
  const canPay = !isInactive && !inactive && data.balance > 0;
  const canRefund = !isInactive && isAdmin && data.amount_paid > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
          Payment
        </h4>
        <StatusBadge status={PAYMENT_STATUS_LABELS[data.payment_status] ?? data.payment_status} />
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center">
        {(
          [
            ["Total", data.total_payable],
            ["Collected", data.amount_paid],
            ["Balance", data.balance],
          ] as const
        ).map(([label, v]) => (
          <div key={label} className="rounded-md bg-surface px-2 py-2">
            <dt className="text-[11px] text-muted-foreground">{label}</dt>
            <dd
              className={`text-[14px] font-semibold tabular-nums ${label === "Balance" && v > 0 ? "text-warning" : ""}`}
            >
              {inr(v)}
            </dd>
          </div>
        ))}
      </dl>
      {data.amount_refunded > 0 && (
        <p className="text-[12px] text-destructive">Refunded so far: {inr(data.amount_refunded)}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {canPay && (
          <Button size="sm" onClick={() => setDialog("pay")} className="gap-1.5">
            <Plus className="size-3.5" /> Record payment
          </Button>
        )}
        {canRefund && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDialog("refund")}
            className="gap-1.5 text-destructive"
          >
            <Undo2 className="size-3.5" /> Refund
          </Button>
        )}
      </div>

      <div>
        <div className="mb-1 text-[11.5px] font-medium text-muted-foreground">
          Transaction history
        </div>
        {data.transactions.length === 0 ? (
          <p className="text-[12px] text-muted-foreground">No money recorded yet.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {data.transactions.map((t) => (
              <li
                key={t._id}
                className="flex items-start justify-between gap-2 px-2.5 py-2 text-[12px]"
              >
                <div className="min-w-0">
                  <div className="font-medium">
                    {t.kind === "refund" ? "Refund" : "Payment"} ·{" "}
                    {METHOD_LABELS[t.method] ?? t.method}
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {fmtDateTime(t.paidAt)}
                    {t.recordedBy?.name
                      ? ` · by ${t.recordedBy.name}`
                      : t.source === "razorpay"
                        ? " · Razorpay"
                        : ""}
                    {t.reference ? ` · ${t.reference}` : ""}
                    {t.note ? ` · ${t.note}` : ""}
                  </div>
                </div>
                <span
                  className={`shrink-0 font-semibold tabular-nums ${t.kind === "refund" ? "text-destructive" : "text-success"}`}
                >
                  {t.kind === "refund" ? "−" : "+"}
                  {inr(t.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <RecordPaymentDialog
        open={dialog === "pay"}
        onClose={() => setDialog(null)}
        bookingId={bookingId}
        bookingRef={data.booking_ref}
        balance={data.balance}
      />
      <RefundDialog
        open={dialog === "refund"}
        onClose={() => setDialog(null)}
        bookingId={bookingId}
        bookingRef={data.booking_ref}
        maxAmount={data.amount_paid}
      />
    </div>
  );
}

export function RecordPaymentDialog({
  open,
  onClose,
  bookingId,
  bookingRef,
  balance,
}: {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  bookingRef: string;
  balance: number;
}) {
  const invalidate = useInvalidateMoney();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount(String(balance));
      setMethod("cash");
      setReference("");
      setNote("");
    }
  }, [open, balance]);

  const save = async () => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Enter an amount greater than zero");
      return;
    }
    if (n > balance) {
      toast.error(`Balance is only ${inr(balance)}`);
      return;
    }
    setSaving(true);
    try {
      const res = await adminFetch<{ message: string }>(`/admin/bookings/${bookingId}/payments`, {
        method: "POST",
        body: JSON.stringify({ amount: n, method, reference, note }),
      });
      toast.success(res.message);
      invalidate();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Record payment · {bookingRef}</DialogTitle>
          <DialogDescription>
            Money received at the venue. Balance due: {inr(balance)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                min={1}
                max={balance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Method</Label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className={selectCls + " h-9 w-full"}
              >
                {MANUAL_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {METHOD_LABELS[m]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Reference (optional)</Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="UPI ref / receipt no."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Note (optional)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-1.5 size-4 animate-spin" />}Save payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RefundDialog({
  open,
  onClose,
  bookingId,
  bookingRef,
  maxAmount,
}: {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  bookingRef: string;
  maxAmount: number;
}) {
  const invalidate = useInvalidateMoney();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount(String(maxAmount));
      setMethod("cash");
      setReason("");
    }
  }, [open, maxAmount]);

  const save = async () => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Enter an amount greater than zero");
      return;
    }
    if (!reason.trim()) {
      toast.error("Please give a reason");
      return;
    }
    setSaving(true);
    try {
      const res = await adminFetch<{ message: string }>(`/admin/bookings/${bookingId}/refunds`, {
        method: "POST",
        body: JSON.stringify({ amount: n, method, reason }),
      });
      toast.success(res.message);
      invalidate();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record refund");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Refund · {bookingRef}</DialogTitle>
          <DialogDescription>
            Records money you gave back. TurfOS doesn't send the money itself — refund online
            payments from your Razorpay dashboard too.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                min={1}
                max={maxAmount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Refunded via</Label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className={selectCls + " h-9 w-full"}
              >
                {(["online", ...MANUAL_METHODS] as const).map((m) => (
                  <option key={m} value={m}>
                    {METHOD_LABELS[m]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Rain-out, double payment"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={saving}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {saving && <Loader2 className="mr-1.5 size-4 animate-spin" />}Record refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
