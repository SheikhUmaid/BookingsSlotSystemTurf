import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CalendarRange, CheckCircle2, Loader2, Plus, Repeat, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PageHeader, Panel, StatusBadge, selectCls } from "@/components/turf/ui-bits";
import { useInvalidateMoney } from "@/lib/useInvalidateMoney";
import { adminFetch, ApiError } from "@/lib/api";
import { pageMeta } from "@/lib/meta";
import { inr, to12 } from "@/lib/turf-data";
import { usePitches } from "@/lib/usePitches";
import { PAYMENT_STATUS_LABELS, WEEKDAYS, fmtDay, shiftDate, todayLocal } from "@/lib/business";
import { useSubscription } from "@/lib/useSubscription";

export const Route = createFileRoute("/recurring")({
  head: () => pageMeta("Recurring bookings", "Weekly and monthly fixed-slot reservations."),
  component: RecurringPage,
});

interface Slot {
  _id: string;
  start_time: string;
  end_time: string;
  price: number;
}

interface Schedule {
  _id: string;
  title: string;
  status: "active" | "cancelled";
  frequency: "weekly" | "monthly";
  weekdays: number[];
  interval: number;
  day_of_month: number | null;
  start_date: string;
  end_date: string;
  price_per_occurrence: number;
  user: { _id: string; name: string; phone: string };
  pitch: { name: string };
  time_slots: { start_time: string; end_time: string }[];
  stats: { total: number; cancelled: number; upcoming: number; nextDate: string | null; outstanding: number; collected: number };
}

interface Occurrence {
  date: string;
  available: boolean;
  reason?: string;
  detail?: string;
}

const describe = (s: Pick<Schedule, "frequency" | "weekdays" | "interval" | "day_of_month">) =>
  s.frequency === "weekly"
    ? `${s.interval > 1 ? `Every ${s.interval} weeks` : "Every week"} on ${[...s.weekdays].sort().map((d) => WEEKDAYS[d]).join(", ")}`
    : `Monthly on day ${s.day_of_month}`;

function RecurringPage() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  const { manualBookingLocked } = useSubscription();
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("active");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-recurring", statusFilter],
    queryFn: () => adminFetch<{ schedules: Schedule[] }>(`/admin/recurring?status=${statusFilter}`),
    enabled: isClient,
  });
  const schedules = data?.schedules ?? [];

  return (
    <div>
      <PageHeader
        title="Recurring bookings"
        desc="Fixed weekly or monthly slots for teams and regulars. Each session is a normal booking you collect payment for."
        actions={
          <Button size="sm" onClick={() => setCreating(true)} disabled={manualBookingLocked} className="gap-1.5">
            <Plus className="size-4" /> New schedule
          </Button>
        }
      />
      <div className="mb-3 flex gap-1.5">
        {(["active", "cancelled"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full border px-3 py-1 text-[12px] font-medium capitalize ${statusFilter === s ? "border-primary bg-primary-soft text-primary-soft-foreground" : "text-muted-foreground hover:bg-secondary"}`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : schedules.length === 0 ? (
        <Panel className="p-10 text-center">
          <Repeat className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-2 text-[14px] font-medium">No {statusFilter} recurring schedules</p>
          <p className="mt-1 text-[12.5px] text-muted-foreground">e.g. “FC Tigers — every Monday at 7 PM on Pitch A”.</p>
        </Panel>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {schedules.map((s) => (
            <Panel key={s._id} className="cursor-pointer p-4 transition-shadow hover:shadow-card">
              <button onClick={() => setOpenId(s._id)} className="w-full text-left">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-semibold">{s.title || s.user.name}</div>
                    <div className="text-[12px] text-muted-foreground">
                      {s.user.name} · {s.user.phone}
                    </div>
                  </div>
                  <StatusBadge status={s.status === "active" ? "Active" : "Cancelled"} />
                </div>
                <div className="mt-3 space-y-1 text-[12.5px]">
                  <div className="flex items-center gap-1.5">
                    <Repeat className="size-3.5 text-muted-foreground" /> {describe(s)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CalendarRange className="size-3.5 text-muted-foreground" />
                    {s.time_slots.map((t) => `${to12(t.start_time)}–${to12(t.end_time)}`).join(", ")} · {s.pitch?.name}
                  </div>
                  <div className="text-muted-foreground">
                    {fmtDay(s.start_date, false)} → {fmtDay(s.end_date)} · {inr(s.price_per_occurrence)} per session
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-center text-[11.5px]">
                  <div>
                    <div className="text-[15px] font-semibold tabular-nums">{s.stats.upcoming}</div>
                    <div className="text-muted-foreground">upcoming</div>
                  </div>
                  <div>
                    <div className="text-[15px] font-semibold tabular-nums">{fmtDay(s.stats.nextDate, false)}</div>
                    <div className="text-muted-foreground">next</div>
                  </div>
                  <div>
                    <div className={`text-[15px] font-semibold tabular-nums ${s.stats.outstanding > 0 ? "text-warning" : ""}`}>
                      {inr(s.stats.outstanding)}
                    </div>
                    <div className="text-muted-foreground">to collect</div>
                  </div>
                </div>
              </button>
            </Panel>
          ))}
        </div>
      )}

      <CreateScheduleDialog open={creating} onClose={() => setCreating(false)} onCreated={setOpenId} />
      <ScheduleDetail scheduleId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

function CreateScheduleDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const invalidate = useInvalidateMoney();
  const qc = useQueryClient();
  const { pitches } = usePitches();
  const { data: slotData } = useQuery({
    queryKey: ["admin-time-slots"],
    queryFn: () => adminFetch<{ timeSlots: Slot[] }>("/admin/time-slots"),
    enabled: open,
  });
  const slots = useMemo(() => slotData?.timeSlots ?? [], [slotData]);

  const blank = () => ({
    title: "",
    customer_name: "",
    customer_phone: "",
    pitch: "",
    time_slots: [] as string[],
    frequency: "weekly" as "weekly" | "monthly",
    weekdays: [] as number[],
    interval: 1,
    day_of_month: Number(todayLocal().slice(8)),
    start_date: shiftDate(todayLocal(), 1),
    end_date: shiftDate(todayLocal(), 56),
    price_per_occurrence: "",
    notes: "",
  });
  const [form, setForm] = useState(blank);
  const [preview, setPreview] = useState<{ occurrences: Occurrence[]; summary: { total: number; available: number; conflicts: number; price_per_occurrence: number; total_value: number } } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(blank());
      setPreview(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useEffect(() => {
    if (open && !form.pitch && pitches[0]) setForm((f) => ({ ...f, pitch: pitches[0]!._id }));
  }, [open, pitches, form.pitch]);

  // Any change invalidates the preview
  const set = (patch: Partial<ReturnType<typeof blank>>) => {
    setForm((f) => ({ ...f, ...patch }));
    setPreview(null);
  };
  const listPrice = useMemo(
    () => slots.filter((s) => form.time_slots.includes(s._id)).reduce((t, s) => t + s.price, 0),
    [slots, form.time_slots],
  );

  const body = () => ({
    ...form,
    price_per_occurrence: form.price_per_occurrence === "" ? undefined : Number(form.price_per_occurrence),
  });

  const runPreview = async () => {
    setBusy(true);
    try {
      setPreview(await adminFetch("/admin/recurring/preview", { method: "POST", body: JSON.stringify(body()) }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    setBusy(true);
    try {
      const res = await adminFetch<{ message: string; schedule: { _id: string } }>("/admin/recurring", {
        method: "POST",
        body: JSON.stringify({ ...body(), skip_conflicts: true }),
      });
      toast.success(res.message);
      invalidate();
      qc.invalidateQueries({ queryKey: ["admin-time-slots-availability"] });
      qc.invalidateQueries({ queryKey: ["admin-month-availability"] });
      onClose();
      onCreated(res.schedule._id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create schedule");
      if (err instanceof ApiError && err.status === 409) runPreview();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>New recurring schedule</DialogTitle>
          <DialogDescription>
            Customers are not charged automatically — every session is created as an unpaid booking you collect for as usual.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-1">
              <Label>Team / label</Label>
              <Input value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="FC Tigers" />
            </div>
            <div className="space-y-1.5">
              <Label>Contact name</Label>
              <Input value={form.customer_name} onChange={(e) => set({ customer_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Mobile</Label>
              <Input
                value={form.customer_phone}
                inputMode="numeric"
                maxLength={10}
                onChange={(e) => set({ customer_phone: e.target.value.replace(/\D/g, "") })}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Pitch</Label>
              <select value={form.pitch} onChange={(e) => set({ pitch: e.target.value })} className={selectCls + " h-9 w-full"}>
                {pitches.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Repeat</Label>
              <select
                value={`${form.frequency}:${form.interval}`}
                onChange={(e) => {
                  const [f, i] = e.target.value.split(":");
                  set({ frequency: f as "weekly" | "monthly", interval: Number(i) });
                }}
                className={selectCls + " h-9 w-full"}
              >
                <option value="weekly:1">Every week</option>
                <option value="weekly:2">Every 2 weeks</option>
                <option value="monthly:1">Every month (same date)</option>
              </select>
            </div>
          </div>

          {form.frequency === "weekly" ? (
            <div className="space-y-1.5">
              <Label>On</Label>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((d, i) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => set({ weekdays: form.weekdays.includes(i) ? form.weekdays.filter((x) => x !== i) : [...form.weekdays, i] })}
                    className={`w-11 rounded-md border py-1.5 text-[12.5px] font-medium ${form.weekdays.includes(i) ? "border-primary bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Day of month</Label>
              <Input type="number" min={1} max={31} value={form.day_of_month} onChange={(e) => set({ day_of_month: Number(e.target.value) })} className="w-24" />
              <p className="text-[11.5px] text-muted-foreground">Shorter months use their last day.</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Time slot(s)</Label>
            <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
              {slots.map((s) => (
                <button
                  key={s._id}
                  type="button"
                  onClick={() => set({ time_slots: form.time_slots.includes(s._id) ? form.time_slots.filter((x) => x !== s._id) : [...form.time_slots, s._id] })}
                  className={`rounded-md border px-2 py-1 text-[12px] ${form.time_slots.includes(s._id) ? "border-primary bg-primary-soft font-medium text-primary-soft-foreground" : "hover:bg-secondary"}`}
                >
                  {to12(s.start_time)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Starts</Label>
              <Input type="date" value={form.start_date} min={todayLocal()} onChange={(e) => set({ start_date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Ends</Label>
              <Input type="date" value={form.end_date} min={form.start_date} onChange={(e) => set({ end_date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Price per session</Label>
              <Input
                type="number"
                min={0}
                value={form.price_per_occurrence}
                onChange={(e) => set({ price_per_occurrence: e.target.value })}
                placeholder={listPrice ? `${listPrice} (list)` : "list price"}
              />
            </div>
          </div>

          {preview && (
            <div className="rounded-md border">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-surface px-3 py-2 text-[12.5px]">
                <span>
                  <strong>{preview.summary.available}</strong> of {preview.summary.total} sessions available ·{" "}
                  {inr(preview.summary.total_value)} total
                </span>
                {preview.summary.conflicts > 0 && (
                  <span className="flex items-center gap-1 text-warning">
                    <AlertTriangle className="size-3.5" /> {preview.summary.conflicts} will be skipped
                  </span>
                )}
              </div>
              <ul className="max-h-48 divide-y overflow-y-auto">
                {preview.occurrences.map((o) => (
                  <li key={o.date} className="flex items-center justify-between px-3 py-1.5 text-[12.5px]">
                    <span>{fmtDay(o.date)} · {WEEKDAYS[new Date(`${o.date}T00:00:00Z`).getUTCDay()]}</span>
                    {o.available ? (
                      <span className="flex items-center gap-1 text-success">
                        <CheckCircle2 className="size-3.5" /> Free
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-warning">
                        <XCircle className="size-3.5" /> {o.detail}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          {!preview ? (
            <Button onClick={runPreview} disabled={busy}>
              {busy && <Loader2 className="mr-1.5 size-4 animate-spin" />}Check availability
            </Button>
          ) : (
            <Button onClick={create} disabled={busy || preview.summary.available === 0}>
              {busy && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Book {preview.summary.available} session{preview.summary.available === 1 ? "" : "s"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ScheduleDetail({ scheduleId, onClose }: { scheduleId: string | null; onClose: () => void }) {
  const invalidate = useInvalidateMoney();
  const qc = useQueryClient();
  const { isInactive } = useSubscription();
  const [confirmAll, setConfirmAll] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-recurring", "detail", scheduleId],
    queryFn: () =>
      adminFetch<{
        schedule: Schedule;
        occurrences: { _id: string; booking_ref: string; date: string; status: string; total_payable: number; amount_paid: number; balance: number; payment_status: string }[];
      }>(`/admin/recurring/${scheduleId}`),
    enabled: !!scheduleId,
  });
  const today = todayLocal();

  const refresh = () => {
    invalidate();
    qc.invalidateQueries({ queryKey: ["admin-time-slots-availability"] });
    qc.invalidateQueries({ queryKey: ["admin-month-availability"] });
  };

  const cancelOne = async (bookingId: string) => {
    setBusy(bookingId);
    try {
      const res = await adminFetch<{ message: string; refund_needed: boolean; paid_amount: number }>(
        `/admin/recurring/${scheduleId}/occurrences/${bookingId}/cancel`,
        { method: "POST" },
      );
      toast.success(res.message, res.refund_needed ? { description: `${inr(res.paid_amount)} was collected — refund it from the booking if needed.` } : undefined);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel session");
    } finally {
      setBusy(null);
    }
  };

  const cancelAll = async () => {
    setBusy("all");
    try {
      const res = await adminFetch<{ message: string; sessions_with_payments: number }>(`/admin/recurring/${scheduleId}/cancel`, { method: "POST" });
      toast.success(res.message, res.sessions_with_payments ? { description: `${res.sessions_with_payments} cancelled session(s) had payments — refund them from Payments if needed.` } : undefined);
      setConfirmAll(false);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel schedule");
    } finally {
      setBusy(null);
    }
  };

  const s = data?.schedule;
  return (
    <Sheet open={!!scheduleId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:w-[480px] sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle>{s ? s.title || s.user.name : "Schedule"}</SheetTitle>
        </SheetHeader>
        {isLoading || !data || !s ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 px-4 pb-6 text-[13px]">
            <div className="space-y-1 rounded-md bg-surface p-3">
              <div>
                {s.user.name} · {s.user.phone}
              </div>
              <div>
                {describe(s)} · {s.time_slots.map((t) => `${to12(t.start_time)}–${to12(t.end_time)}`).join(", ")} · {s.pitch?.name}
              </div>
              <div className="text-muted-foreground">
                {fmtDay(s.start_date)} → {fmtDay(s.end_date)} · {inr(s.price_per_occurrence)} per session
              </div>
            </div>

            <ul className="divide-y rounded-md border">
              {data.occurrences.map((o) => {
                const day = o.date.slice(0, 10);
                const cancelled = o.status === "cancelled";
                return (
                  <li key={o._id} className={`flex items-center justify-between gap-2 px-3 py-2 ${cancelled ? "opacity-60" : ""}`}>
                    <div>
                      <div className="font-medium">
                        {fmtDay(o.date)} · {WEEKDAYS[new Date(o.date).getUTCDay()]}
                      </div>
                      <div className="text-[11.5px] text-muted-foreground">
                        {o.booking_ref} · {inr(o.amount_paid)} / {inr(o.total_payable)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={cancelled ? "Cancelled" : PAYMENT_STATUS_LABELS[o.payment_status] ?? o.payment_status} />
                      {!cancelled && day >= today && (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-[12px] text-destructive" disabled={isInactive || busy === o._id} onClick={() => cancelOne(o._id)}>
                          {busy === o._id ? <Loader2 className="size-3.5 animate-spin" /> : "Cancel"}
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="text-[11.5px] text-muted-foreground">
              Collect payment for a session from the Bookings or Payments page — open the booking and use “Record payment”.
            </p>

            {s.status === "active" && (
              <Button variant="outline" className="w-full text-destructive" disabled={isInactive} onClick={() => setConfirmAll(true)}>
                Cancel entire schedule
              </Button>
            )}

            <AlertDialog open={confirmAll} onOpenChange={setConfirmAll}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel the whole schedule?</AlertDialogTitle>
                  <AlertDialogDescription>
                    All upcoming sessions are cancelled and their slots freed. Past sessions and any money collected stay on record.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={busy === "all"}>Keep it</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      cancelAll();
                    }}
                    disabled={busy === "all"}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Cancel schedule
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
