import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Ban, CheckCircle2, Clock, Plus, Sun, Sunset, Moon, CloudSun } from "lucide-react";
import { useStore } from "@/lib/store";
import { fmtDate, inr, isSlotTaken, services, slotCategories, timeSlots, to12, type SlotCategory } from "@/lib/turf-data";
import { MonthCalendar, type DayState } from "@/components/turf/MonthCalendar";
import { PageHeader, Panel, selectCls } from "@/components/turf/ui-bits";
import { cn } from "@/lib/utils";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/calendar")({
  head: () => pageMeta("Calendar & Availability", "Pick a date, see open turf slots and book a customer in seconds."),
  component: CalendarPage,
});

const catIcon: Record<SlotCategory, typeof Sun> = {
  "Morning Sessions": Sun,
  "Afternoon Sessions": CloudSun,
  "Floodlit Evening": Sunset,
  "Late Night": Moon,
};

type Filter = "All" | "Available" | "Booked";

function CalendarPage() {
  const { today, bookings, openBooking } = useStore();
  const [date, setDate] = useState(fmtDate(today));
  const [serviceId, setServiceId] = useState(services[0]!.id);
  const [category, setCategory] = useState<"All" | SlotCategory>("All");
  const [filter, setFilter] = useState<Filter>("All");
  const todayStr = fmtDate(today);

  const dayState = useMemo(() => {
    return (d: string): DayState => {
      if (d < todayStr) return "past";
      const taken = timeSlots.filter((s) => isSlotTaken(bookings, d, serviceId, s.id)).length;
      const ratio = taken / timeSlots.length;
      return ratio >= 1 ? "full" : ratio >= 0.6 ? "limited" : "open";
    };
  }, [bookings, serviceId, todayStr]);

  const isPast = date < todayStr;
  const slots = timeSlots.map((s) => ({ ...s, taken: isSlotTaken(bookings, date, serviceId, s.id) }));
  const booking = (slotId: string) =>
    bookings.find((b) => b.date === date && b.serviceId === serviceId && b.slotIds.includes(slotId) && b.status !== "Cancelled" && b.status !== "Expired");
  const visible = slots.filter(
    (s) => (category === "All" || s.category === category) && (filter === "All" || (filter === "Available" ? !s.taken : s.taken)),
  );
  const openCount = slots.filter((s) => !s.taken).length;
  const dateLabel = new Date(date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div>
      <PageHeader title="Calendar & Availability" desc="Select a date, then click an open slot to book a customer." />
      <div className="grid gap-5 lg:grid-cols-[minmax(320px,35fr)_65fr]">
        <div className="space-y-4">
          <Panel className="p-4">
            <MonthCalendar selected={date} onSelect={setDate} today={today} dayState={dayState} />
          </Panel>
          <Panel className="grid grid-cols-3 divide-x">
            <Mini label="Open" value={openCount} cls="text-success" />
            <Mini label="Booked" value={slots.length - openCount} />
            <Mini label="Revenue" value={inr(slots.filter((s) => s.taken).reduce((a, s) => a + s.price, 0))} />
          </Panel>
        </div>

        <Panel className="flex min-w-0 flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
            <div>
              <h2 className="text-[15px] font-semibold">Available Time Slots</h2>
              <p className="text-[12.5px] text-muted-foreground">
                {dateLabel} · <span className="font-medium text-success">{openCount} open</span> of {slots.length}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className={selectCls} aria-label="Pitch">
                {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select value={category} onChange={(e) => setCategory(e.target.value as typeof category)} className={selectCls} aria-label="Category">
                <option value="All">All sessions</option>
                {slotCategories.map((c) => <option key={c}>{c}</option>)}
              </select>
              <div className="flex rounded-md border bg-surface p-0.5">
                {(["All", "Available", "Booked"] as Filter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn("rounded px-2.5 py-1 text-[12px] font-medium text-muted-foreground", filter === f && "bg-background text-foreground shadow-card")}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {isPast && (
            <div className="mx-4 mt-3 rounded-md bg-surface px-3 py-2 text-[12.5px] text-muted-foreground">This date is in the past — slots are shown for reference only.</div>
          )}

          <div className="grid gap-2.5 p-4 sm:grid-cols-2">
            {visible.map((s) => {
              const Icon = catIcon[s.category];
              const b = s.taken ? booking(s.id) : undefined;
              const pending = b?.status === "Pending";
              const bookable = !s.taken && !isPast;
              return (
                <button
                  key={s.id}
                  disabled={!bookable}
                  onClick={() => openBooking({ date, serviceId, slotId: s.id })}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg border p-3 text-left transition-all",
                    bookable
                      ? "border-l-[3px] border-l-success bg-card hover:border-primary/40 hover:bg-primary-soft hover:shadow-pop focus-visible:ring-2 focus-visible:ring-ring/40 outline-none"
                      : "cursor-default bg-surface",
                    pending && "border-l-[3px] border-l-warning",
                  )}
                >
                  <div className={cn("grid size-9 shrink-0 place-items-center rounded-md", bookable ? "bg-success-soft text-success" : "bg-secondary text-muted-foreground")}>
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={cn("text-[14px] font-semibold", !bookable && "text-muted-foreground")}>
                      {to12(s.start)} – {to12(s.end)}
                    </div>
                    <div className="truncate text-[12px] text-muted-foreground">
                      {b ? `${b.customer} · ${b.id}` : `${s.category} · 60 min`}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={cn("text-[13.5px] font-semibold", !bookable && "text-muted-foreground")}>{inr(s.price)}</span>
                    {bookable ? (
                      <span className="flex items-center gap-1 rounded-md bg-primary px-2 py-0.5 text-[11.5px] font-medium text-primary-foreground opacity-90 group-hover:opacity-100">
                        <Plus className="size-3" /> Book
                      </span>
                    ) : pending ? (
                      <span className="flex items-center gap-1 text-[11.5px] font-medium text-warning"><Clock className="size-3" /> Pending</span>
                    ) : s.taken ? (
                      <span className="flex items-center gap-1 text-[11.5px] font-medium text-muted-foreground"><CheckCircle2 className="size-3" /> Booked</span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11.5px] text-muted-foreground"><Ban className="size-3" /> Closed</span>
                    )}
                  </div>
                </button>
              );
            })}
            {visible.length === 0 && (
              <div className="col-span-full py-12 text-center text-[13px] text-muted-foreground">No slots match these filters.</div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Mini({ label, value, cls }: { label: string; value: string | number; cls?: string }) {
  return (
    <div className="px-4 py-3">
      <div className="text-[11.5px] text-muted-foreground">{label}</div>
      <div className={cn("text-[16px] font-semibold", cls)}>{value}</div>
    </div>
  );
}
