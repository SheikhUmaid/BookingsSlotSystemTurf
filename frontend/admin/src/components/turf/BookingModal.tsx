import { useEffect, useState } from "react";
import { AlertTriangle, CalendarDays, Clock, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { inr, isSlotTaken, services, timeSlots, to12 } from "@/lib/turf-data";
import { selectCls } from "./ui-bits";

export function BookingModal() {
  const { draft, closeBooking, createBooking, bookings, today } = useStore();
  const open = !!draft;
  const [date, setDate] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [slotId, setSlotId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<{ name?: string; phone?: string; slot?: string }>({});
  const [conflict, setConflict] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    if (draft) {
      setDate(draft.date ?? "");
      setServiceId(draft.serviceId ?? services[0]!.id);
      setSlotId(draft.slotId ?? "");
      setPrefilled(!!draft.slotId);
      setName("");
      setPhone("");
      setErrors({});
      setConflict(null);
    }
  }, [draft]);

  const slot = timeSlots.find((s) => s.id === slotId);
  const service = services.find((s) => s.id === serviceId);
  const available = timeSlots.filter((s) => !isSlotTaken(bookings, date, serviceId, s.id));
  const dateLabel = date ? new Date(date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (name.trim().length < 2) errs.name = "Enter the customer's name";
    if (!/^[6-9]\d{9}$/.test(phone.replace(/\D/g, "").slice(-10)) || phone.replace(/\D/g, "").length < 10) errs.phone = "Enter a valid 10-digit mobile number";
    if (!slotId) errs.slot = "Choose a time slot";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const res = createBooking({ date, serviceId, slotId, customer: name.trim(), phone: phone.replace(/\D/g, "").slice(-10) });
    if (!res.ok) {
      setConflict(res.error);
      setPrefilled(false);
      setSlotId("");
      return;
    }
    toast.success(`Booking ${res.booking.id} confirmed`, { description: `${name.trim()} · ${to12(slot!.start)} on ${dateLabel}` });
    closeBooking();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeBooking()}>
      <DialogContent className="gap-0 p-0 sm:max-w-[440px]">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="text-[16px]">Book Time Slot</DialogTitle>
          <DialogDescription className="text-[12.5px]">Manual booking · customer pays at venue</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 px-5 py-4">
          {conflict && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/25 bg-danger-soft px-3 py-2 text-[12.5px] text-destructive">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {conflict}
            </div>
          )}

          {prefilled && slot && service ? (
            <div className="rounded-md border border-primary/20 bg-primary-soft p-3">
              <div className="grid grid-cols-2 gap-y-2 text-[13px]">
                <Row icon={CalendarDays} text={dateLabel} />
                <Row icon={Clock} text={`${to12(slot.start)} – ${to12(slot.end)}`} />
                <Row icon={MapPin} text={service.name} />
                <span className="text-[12px] text-muted-foreground">{slot.category}</span>
              </div>
              <button type="button" onClick={() => setPrefilled(false)} className="mt-2 text-[12px] font-medium text-primary hover:underline">
                Change slot
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[12.5px]">Date</Label>
                <Input type="date" min={today.toISOString().slice(0, 10)} value={date} onChange={(e) => { setDate(e.target.value); setSlotId(""); }} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12.5px]">Pitch</Label>
                <select value={serviceId} onChange={(e) => { setServiceId(e.target.value); setSlotId(""); }} className={selectCls + " h-9 w-full"}>
                  {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-[12.5px]">Available slot</Label>
                <select value={slotId} onChange={(e) => setSlotId(e.target.value)} className={selectCls + " h-9 w-full"} aria-invalid={!!errors.slot}>
                  <option value="">{available.length ? `Select from ${available.length} open slots` : "No slots open on this date"}</option>
                  {available.map((s) => <option key={s.id} value={s.id}>{to12(s.start)} – {to12(s.end)} · {inr(s.price)}</option>)}
                </select>
                {errors.slot && <p className="text-[12px] text-destructive">{errors.slot}</p>}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="bk-name" className="text-[12.5px]">Customer name</Label>
            <Input id="bk-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rahul Sharma" className="h-9" aria-invalid={!!errors.name} />
            {errors.name && <p className="text-[12px] text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bk-phone" className="text-[12.5px]">Phone number</Label>
            <div className="flex">
              <span className="grid place-items-center rounded-l-md border border-r-0 bg-surface px-2.5 text-[13px] text-muted-foreground">+91</span>
              <Input id="bk-phone" type="tel" inputMode="numeric" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} placeholder="98765 43210" className="h-9 rounded-l-none" aria-invalid={!!errors.phone} />
            </div>
            {errors.phone && <p className="text-[12px] text-destructive">{errors.phone}</p>}
          </div>

          <div className="flex items-center justify-between rounded-md bg-surface px-3 py-2.5">
            <span className="text-[13px] text-muted-foreground">Booking price</span>
            <span className="text-[17px] font-semibold">{slot ? inr(slot.price) : "—"}</span>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={closeBooking}>Cancel</Button>
            <Button type="submit">Confirm Booking</Button>
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
