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
import { useSubscription } from "@/lib/useSubscription";

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
  const { isInactive, status } = useSubscription();
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
  const [pitch, setPitch] = useState<string>("Football Turf A");

  // Fetch pitches/services to populate pitch dropdown
  const { data: servicesData } = useQuery({
    queryKey: ["admin-services-list"],
    queryFn: () => adminFetch<{ services: Array<{ _id: string; name: string }> }>("/admin/services"),
    enabled: isClient,
  });

  const pitchOptions = useMemo(() => {
    if (servicesData?.services && servicesData.services.length > 0) {
      return servicesData.services.map((s) => s.name);
    }
    return ["Football Turf A", "Football Turf B"];
  }, [servicesData]);

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

  const dateObj = new Date(date + "T00:00:00");
  const weekday = dateObj.toLocaleDateString("en-US", { weekday: "long" });
  const dayNum = dateObj.getDate();
  const monthName = dateObj.toLocaleDateString("en-US", { month: "long" });
  const dateLabel = isNaN(dayNum) ? date : `${weekday}, ${dayNum} ${monthName}`;

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
            <Mini label="Open" value={openCount} cls="text-emerald-600" />
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
                {dateLabel} · <span className="font-semibold text-emerald-600">{openCount} open</span> of {slots.length}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={pitch}
                onChange={(e) => setPitch(e.target.value)}
                className={selectCls}
                aria-label="Turf / Pitch"
              >
                {pitchOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>

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
                      "rounded px-2.5 py-1 text-[12px] font-medium text-muted-foreground transition-all",
                      filter === f && "bg-background text-foreground shadow-xs font-semibold"
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

          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {slotsLoading && slots.length === 0 ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex h-18 animate-pulse items-center gap-3 rounded-lg border bg-card p-3.5">
                  <div className="size-10 rounded-md bg-muted" />
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
                const bookable = !s.is_booked && !isPast && !isInactive;
                return (
                  <div
                    key={s._id}
                    onClick={() => {
                      if (bookable) openBooking({ date, slotId: s._id });
                    }}
                    className={cn(
                      "group flex items-center justify-between gap-3 rounded-lg border p-3.5 text-left transition-all",
                      bookable
                        ? "cursor-pointer border-l-4 border-l-emerald-500 bg-card hover:border-emerald-600 hover:shadow-xs"
                        : "bg-surface/80 opacity-80",
                      pending && "border-l-4 border-l-amber-500"
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={cn(
                          "grid size-10 shrink-0 place-items-center rounded-lg",
                          bookable
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="size-4.5" />
                      </div>
                      <div className="min-w-0">
                        <div className={cn("text-[14px] font-semibold text-foreground", !bookable && "text-foreground/80")}>
                          {to12(s.start_time)} – {to12(s.end_time)}
                        </div>
                        <div className="truncate text-[12px] text-muted-foreground">
                          {b ? `${b.customer_name} · ${b.booking_ref}` : `${s.category} · 60 min`}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0 pl-2">
                      <span className={cn("text-[14px] font-semibold text-foreground", !bookable && "text-muted-foreground")}>
                        {inr(s.price)}
                      </span>
                      {bookable ? (
                        <button
                          type="button"
                          disabled={isInactive}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isInactive) return;
                            openBooking({ date, slotId: s._id });
                          }}
                          className="flex items-center gap-1 rounded bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 text-[11.5px] font-medium shadow-xs transition-colors"
                        >
                          <Plus className="size-3" /> Book
                        </button>
                      ) : pending ? (
                        <span className="flex items-center gap-1 text-[11.5px] font-medium text-amber-600">
                          <Clock className="size-3.5" /> Pending
                        </span>
                      ) : s.is_booked ? (
                        <span className="flex items-center gap-1 text-[11.5px] font-medium text-muted-foreground">
                          <Clock className="size-3.5" /> Booked
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11.5px] text-muted-foreground">
                          <Ban className="size-3.5" /> Closed
                        </span>
                      )}
                    </div>
                  </div>
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
      <div className="text-[12px] text-muted-foreground">{label}</div>
      <div className={cn("text-[18px] font-bold text-foreground", cls)}>{value}</div>
    </div>
  );
}
