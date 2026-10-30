import { useEffect, useState } from "react";
import { AlertTriangle, CalendarDays, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { inr } from "@/lib/turf-data";
import { selectCls } from "./ui-bits";
import { adminFetch } from "@/lib/api";
import { useSubscription } from "@/lib/useSubscription";

interface ApiSlotItem {
  _id: string;
  id: string;
  start_time: string;
  end_time: string;
  category: string;
  price: number;
  is_booked: boolean;
}

interface AvailabilityResponse {
  date: string;
  slots: ApiSlotItem[];
}

const to12 = (t?: string) => {
  if (!t) return "";
  const [hStr, mStr = "00"] = t.split(":");
  const h = Number(hStr);
  const s = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr} ${s}`;
};

export function BookingModal() {
  const { draft, closeBooking } = useStore();
  const queryClient = useQueryClient();
  const { isInactive, status } = useSubscription();
  const open = !!draft;

  const [date, setDate] = useState("");
  const [slotId, setSlotId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string; slot?: string }>({});
  const [conflict, setConflict] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);

  // Sync draft state when opened
  useEffect(() => {
    if (draft) {
      setDate(draft.date ?? new Date().toISOString().slice(0, 10));
      setSlotId(draft.slotId ?? "");
      setPrefilled(!!draft.slotId);
      setName("");
      setPhone("");
      setErrors({});
      setConflict(null);
    }
  }, [draft]);

  // Fetch availability for selected date (slots are global across the venue)
  const { data: availabilityData, isLoading: slotsLoading } = useQuery({
    queryKey: ["admin-time-slots-availability", date],
    queryFn: () =>
      adminFetch<AvailabilityResponse>(
        `/admin/time-slots/availability?date=${date}`
      ),
    enabled: open && !!date,
  });

  const slots = availabilityData?.slots ?? [];
  const slot = slots.find((s) => s._id === slotId || s.id === slotId);
  const availableSlots = slots.filter((s) => !s.is_booked);

  const dateLabel = date
    ? new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isInactive) {
      toast.error(`Account is ${status.toUpperCase()}. Write access is blocked until subscription is renewed.`);
      return;
    }
    const errs: typeof errors = {};
    if (name.trim().length < 2) errs.name = "Enter the customer's name";
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      errs.phone = "Enter a valid 10-digit mobile number";
    }
    if (!slotId) errs.slot = "Choose a time slot";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSubmitting(true);
    setConflict(null);

    try {
      // Book slot globally without requiring admin to select service
      const res = await adminFetch<{
        message: string;
        booking: { _id: string; booking_ref: string };
      }>("/admin/bookings", {
        method: "POST",
        body: JSON.stringify({
          customer_name: name.trim(),
          customer_phone: cleanPhone,
          date,
          time_slots: [slotId],
          status: "paid",
          payment_type: "full",
        }),
      });

      toast.success(`Booking ${res.booking.booking_ref} confirmed`, {
        description: `${name.trim()} · ${to12(slot?.start_time)} on ${dateLabel}`,
      });

      // Invalidate query caches so Calendar & Bookings refresh immediately
      queryClient.invalidateQueries({ queryKey: ["admin-time-slots-availability"] });
      queryClient.invalidateQueries({ queryKey: ["admin-month-availability"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });

      closeBooking();
    } catch (err: any) {
      setConflict(err.message || "Failed to create booking");
      setPrefilled(false);
      setSlotId("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeBooking()}>
      <DialogContent className="gap-0 p-0 sm:max-w-[440px]">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="text-[16px]">Book Time Slot</DialogTitle>
          <DialogDescription className="text-[12.5px]">
            Manual booking · customer pays at venue
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 px-5 py-4">
          {conflict && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/25 bg-danger-soft px-3 py-2 text-[12.5px] text-destructive">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {conflict}
            </div>
          )}

          {prefilled && slot ? (
            <div className="rounded-md border border-primary/20 bg-primary-soft p-3">
              <div className="grid grid-cols-2 gap-y-2 text-[13px]">
                <Row icon={CalendarDays} text={dateLabel} />
                <Row icon={Clock} text={`${to12(slot.start_time)} – ${to12(slot.end_time)}`} />
                <span className="col-span-2 text-[12px] text-muted-foreground">{slot.category}</span>
              </div>
              <button
                type="button"
                onClick={() => setPrefilled(false)}
                className="mt-2 text-[12px] font-medium text-primary hover:underline"
              >
                Change slot
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[12.5px]">Date</Label>
                <Input
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setSlotId("");
                  }}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12.5px]">Available slot</Label>
                <select
                  value={slotId}
                  onChange={(e) => setSlotId(e.target.value)}
                  className={selectCls + " h-9 w-full"}
                  aria-invalid={!!errors.slot}
                  disabled={slotsLoading}
                >
                  <option value="">
                    {slotsLoading
                      ? "Loading open slots…"
                      : availableSlots.length
                      ? `Select from ${availableSlots.length} open slots`
                      : "No slots open on this date"}
                  </option>
                  {availableSlots.map((s) => (
                    <option key={s._id} value={s._id}>
                      {to12(s.start_time)} – {to12(s.end_time)} · {inr(s.price)} ({s.category})
                    </option>
                  ))}
                </select>
                {errors.slot && <p className="text-[12px] text-destructive">{errors.slot}</p>}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="bk-name" className="text-[12.5px]">
              Customer name
            </Label>
            <Input
              id="bk-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="h-9"
              aria-invalid={!!errors.name}
            />
            {errors.name && <p className="text-[12px] text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bk-phone" className="text-[12.5px]">
              Phone number
            </Label>
            <div className="flex">
              <span className="grid place-items-center rounded-l-md border border-r-0 bg-surface px-2.5 text-[13px] text-muted-foreground">
                +91
              </span>
              <Input
                id="bk-phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="98765 43210"
                className="h-9 rounded-l-none"
                aria-invalid={!!errors.phone}
              />
            </div>
            {errors.phone && <p className="text-[12px] text-destructive">{errors.phone}</p>}
          </div>

          <div className="flex items-center justify-between rounded-md bg-surface px-3 py-2.5">
            <span className="text-[13px] text-muted-foreground">Booking price</span>
            <span className="text-[17px] font-semibold">{slot ? inr(slot.price) : "—"}</span>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={closeBooking} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || isInactive}>
              {submitting ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                  Booking…
                </>
              ) : isInactive ? (
                "Locked (Account Inactive)"
              ) : (
                "Confirm Booking"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Row({ icon: I, text }: { icon: typeof Clock; text: string }) {
  return (
    <span className="flex items-center gap-1.5 font-medium">
      <I className="size-3.5 text-primary" /> {text}
    </span>
  );
}
