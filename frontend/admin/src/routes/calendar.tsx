import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useCallback } from "react";
import { Ban, CheckCircle2, Clock, Plus, Sun, Sunset, Moon, CloudSun, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useStore } from "@/lib/store";
import { fmtDate, inr, slotCategories, type SlotCategory } from "@/lib/turf-data";
import { MonthCalendar, type DayState } from "@/components/turf/MonthCalendar";
import { PageHeader, Panel, selectCls } from "@/components/turf/ui-bits";
import { cn } from "@/lib/utils";
import { pageMeta } from "@/lib/meta";
import { adminFetch } from "@/lib/api";

export const Route = createFileRoute("/calendar")({
  head: () => pageMeta("Calendar & Availability", "Pick a date, see open turf slots and book a customer in seconds."),
  component: CalendarPage,
});

const catIcon: Record<string, typeof Sun> = {
  "Morning Sessions": Sun,
  "Afternoon Sessions": CloudSun,
  "Floodlit Evening": Sunset,
  "Late Night": Moon,
};

type Filter = "All" | "Available" | "Booked";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SlotBookingInfo {
  booking_id: string;
  booking_ref: string;
  customer_name: string;
  customer_phone: string;
  status: string;
  total_payable: number;
  amount_paid: number;
  service_name?: string;
}

interface ApiSlotItem {
  _id: string;
  id: string;
  start_time: string;
  end_time: string;
  category: SlotCategory;
  price: number;
  is_booked: boolean;
  booking: SlotBookingInfo | null;
}

interface AvailabilityResponse {
  date: string;
  total_slots: number;
  open_count: number;
  booked_count: number;
  revenue: number;
  slots: ApiSlotItem[];
}

interface MonthAvailabilityResponse {
  month: string;
  total_slots: number;
  days: Record<string, { booked: number; total: number; state: DayState }>;
}

const to12 = (t?: string) => {
  if (!t) return "";
  const [hStr, mStr = "00"] = t.split(":");
  const h = Number(hStr);
  const s = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr} ${s}`;
};

function CalendarPage() {
  const { openBooking } = useStore();
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const todayStr = fmtDate(today);

  const [date, setDate] = useState(todayStr);
  const [category, setCategory] = useState<"All" | SlotCategory>("All");
  const [filter, setFilter] = useState<Filter>("All");

  // 1. Fetch month availability (slots are global across the venue)
  const currentMonth = date ? date.slice(0, 7) : todayStr.slice(0, 7);
  const { data: monthData } = useQuery({
    queryKey: ["admin-month-availability", currentMonth],
    queryFn: () =>
      adminFetch<MonthAvailabilityResponse>(
        `/admin/time-slots/month-availability?month=${currentMonth}`
      ),
    enabled: isClient,
    staleTime: 30 * 1000,
  });

  const dayState = useCallback(
    (d: string): DayState => {
      if (d < todayStr) return "past";
      return monthData?.days?.[d]?.state ?? "open";
    },
    [monthData, todayStr]
  );

  // 2. Fetch daily time slot availability (global across all bookings)
  const { data: availabilityData, isLoading: slotsLoading, isFetching } = useQuery({
    queryKey: ["admin-time-slots-availability", date],
    queryFn: () =>
      adminFetch<AvailabilityResponse>(
        `/admin/time-slots/availability?date=${date}`
      ),
    enabled: isClient && !!date,
  });

  const isPast = date < todayStr;
  const slots: ApiSlotItem[] = availabilityData?.slots ?? [];

  const visible = slots.filter(
    (s) =>
      (category === "All" || s.category === category) &&
      (filter === "All" || (filter === "Available" ? !s.is_booked : s.is_booked))
  );

  const openCount = availabilityData?.open_count ?? slots.filter((s) => !s.is_booked).length;
  const bookedCount = availabilityData?.booked_count ?? slots.filter((s) => s.is_booked).length;
  const revenue = availabilityData?.revenue ?? 0;

  const dateLabel = new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div>
      <PageHeader
        title="Calendar & Availability"
        desc="Select a date, then click an open slot to book a customer."
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(320px,35fr)_65fr]">
        {/* Left column: Month calendar & Mini stats */}
        <div className="space-y-4">
          <Panel className="p-4">
            <MonthCalendar selected={date} onSelect={setDate} today={today} dayState={dayState} />
          </Panel>
          <Panel className="grid grid-cols-3 divide-x">
            <Mini label="Open" value={openCount} cls="text-success" />
            <Mini label="Booked" value={bookedCount} />
            <Mini label="Revenue" value={inr(revenue)} />
          </Panel>
        </div>

        {/* Right column: Available Time Slots */}
        <Panel className="flex min-w-0 flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-semibold">Available Time Slots</h2>
                {isFetching && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
              </div>
              <p className="text-[12.5px] text-muted-foreground">
                {dateLabel} · <span className="font-medium text-success">{openCount} open</span> of {slots.length}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as typeof category)}
                className={selectCls}
                aria-label="Category"
              >
                <option value="All">All sessions</option>
                {slotCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <div className="flex rounded-md border bg-surface p-0.5">
                {(["All", "Available", "Booked"] as Filter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      "rounded px-2.5 py-1 text-[12px] font-medium text-muted-foreground",
                      filter === f && "bg-background text-foreground shadow-card"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {isPast && (
            <div className="mx-4 mt-3 rounded-md bg-surface px-3 py-2 text-[12.5px] text-muted-foreground">
              This date is in the past — slots are shown for reference only.
            </div>
          )}

          <div className="grid gap-2.5 p-4 sm:grid-cols-2">
            {slotsLoading && slots.length === 0 ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex h-16 animate-pulse items-center gap-3 rounded-lg border bg-card p-3">
                  <div className="size-9 rounded-md bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 rounded bg-muted" />
                    <div className="h-3 w-1/2 rounded bg-muted" />
                  </div>
                </div>
              ))
            ) : (
              visible.map((s) => {
                const Icon = catIcon[s.category] || Sun;
                const b = s.booking;
                const pending = b?.status === "pending" || b?.status === "Pending";
                const bookable = !s.is_booked && !isPast;
                return (
                  <button
                    key={s._id}
                    disabled={!bookable}
                    onClick={() => openBooking({ date, slotId: s._id })}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg border p-3 text-left transition-all",
                      bookable
                        ? "border-l-[3px] border-l-success bg-card hover:border-primary/40 hover:bg-primary-soft hover:shadow-pop focus-visible:ring-2 focus-visible:ring-ring/40 outline-none"
                        : "cursor-default bg-surface",
                      pending && "border-l-[3px] border-l-warning"
                    )}
                  >
                    <div
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-md",
                        bookable ? "bg-success-soft text-success" : "bg-secondary text-muted-foreground"
                      )}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={cn("text-[14px] font-semibold", !bookable && "text-muted-foreground")}>
                        {to12(s.start_time)} – {to12(s.end_time)}
                      </div>
                      <div className="truncate text-[12px] text-muted-foreground">
                        {b ? `${b.customer_name} · ${b.booking_ref}` : `${s.category} · 60 min`}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={cn("text-[13.5px] font-semibold", !bookable && "text-muted-foreground")}>
                        {inr(s.price)}
                      </span>
                      {bookable ? (
                        <span className="flex items-center gap-1 rounded-md bg-primary px-2 py-0.5 text-[11.5px] font-medium text-primary-foreground opacity-90 group-hover:opacity-100">
                          <Plus className="size-3" /> Book
                        </span>
                      ) : pending ? (
                        <span className="flex items-center gap-1 text-[11.5px] font-medium text-warning">
                          <Clock className="size-3" /> Pending
                        </span>
                      ) : s.is_booked ? (
                        <span className="flex items-center gap-1 text-[11.5px] font-medium text-muted-foreground">
                          <CheckCircle2 className="size-3" /> Booked
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11.5px] text-muted-foreground">
                          <Ban className="size-3" /> Closed
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
            {!slotsLoading && visible.length === 0 && (
              <div className="col-span-full py-12 text-center text-[13px] text-muted-foreground">
                No slots match these filters.
              </div>
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
