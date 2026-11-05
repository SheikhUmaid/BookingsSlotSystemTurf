import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Info, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Panel, PanelHead } from "@/components/turf/ui-bits";
import { adminFetch } from "@/lib/api";
import { pageMeta } from "@/lib/meta";
import { inr } from "@/lib/turf-data";
import { EXPENSE_CATEGORY_LABELS, METHOD_LABELS, shiftDate, todayLocal } from "@/lib/business";

export const Route = createFileRoute("/daily-report")({
  head: () =>
    pageMeta("Daily report", "Daily closing: bookings, money collected, dues and expenses."),
  component: DailyReportPage,
});

interface DailyReport {
  date: string;
  isToday: boolean;
  bookings: {
    total: number;
    completed: number;
    upcoming: number;
    cancelled: number;
    expired: number;
    hoursBooked: number;
  };
  bookingValue: { total: number; collectedSoFar: number; pending: number };
  collections: {
    received: number;
    online: number;
    cash: number;
    otherManual: number;
    byMethod: Record<string, number>;
    refunds: number;
    net: number;
    forTodaysBookings: number;
    forOtherDaysBookings: number;
    transactions: number;
  };
  expenses: {
    total: number;
    byCategory: Record<string, number>;
    items: { _id: string; title: string; category: string; amount: number }[];
  };
  operatingResult: number;
}

function DailyReportPage() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  const [date, setDate] = useState(todayLocal());
  const {
    data: r,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin-daily-report", date],
    queryFn: () => adminFetch<DailyReport>(`/admin/daily-report?date=${date}`),
    enabled: isClient,
  });

  const title = new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Daily report"
        desc={title}
        actions={
          <div className="flex items-center gap-1.5">
            <Button
              size="icon"
              variant="outline"
              className="size-8"
              onClick={() => setDate(shiftDate(date, -1))}
              aria-label="Previous day"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Input
              type="date"
              value={date}
              max={shiftDate(todayLocal(), 60)}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="h-8 w-[140px] text-[13px]"
            />
            <Button
              size="icon"
              variant="outline"
              className="size-8"
              onClick={() => setDate(shiftDate(date, 1))}
              aria-label="Next day"
            >
              <ChevronRight className="size-4" />
            </Button>
            {date !== todayLocal() && (
              <Button size="sm" variant="ghost" onClick={() => setDate(todayLocal())}>
                Today
              </Button>
            )}
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => window.print()}>
              <Printer className="size-3.5" /> Print
            </Button>
          </div>
        }
      />

      {error && <div className="text-[13px] text-destructive">{(error as Error).message}</div>}
      {isLoading || !r ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Bottom line */}
          <Panel
            className={`p-5 ${r.operatingResult >= 0 ? "border-success/30" : "border-destructive/30"}`}
          >
            <div className="text-[12.5px] text-muted-foreground">
              Estimated operating result for the day
            </div>
            <div
              className={`mt-1 text-[30px] font-semibold tabular-nums tracking-tight ${r.operatingResult >= 0 ? "text-success" : "text-destructive"}`}
            >
              {r.operatingResult < 0 ? "−" : ""}
              {inr(Math.abs(r.operatingResult))}
            </div>
            <div className="mt-1 text-[12.5px] text-muted-foreground">
              {inr(r.collections.received)} received − {inr(r.collections.refunds)} refunded −{" "}
              {inr(r.expenses.total)} expenses
            </div>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Bookings */}
            <Panel>
              <PanelHead title={`Bookings ${r.isToday ? "today" : "on this day"}`} />
              <div className="grid grid-cols-3 gap-3 p-4">
                <Big label="Total" value={r.bookings.total} />
                <Big
                  label={r.isToday ? "Completed so far" : "Completed"}
                  value={r.bookings.completed}
                />
                <Big label={r.isToday ? "Still to play" : "Upcoming"} value={r.bookings.upcoming} />
                <Big
                  label="Cancelled"
                  value={r.bookings.cancelled}
                  tone={r.bookings.cancelled ? "text-destructive" : ""}
                />
                <Big label="Hours booked" value={r.bookings.hoursBooked} />
              </div>
              <div className="space-y-1.5 border-t p-4 text-[13px]">
                <Row
                  label="Booking value (what these bookings are worth)"
                  value={inr(r.bookingValue.total)}
                  strong
                />
                <Row
                  label="…already collected (any day)"
                  value={inr(r.bookingValue.collectedSoFar)}
                />
                <Row
                  label="…still pending"
                  value={inr(r.bookingValue.pending)}
                  tone={r.bookingValue.pending > 0 ? "text-warning" : ""}
                />
              </div>
            </Panel>

            {/* Money received */}
            <Panel>
              <PanelHead title={`Money received ${r.isToday ? "today" : "on this day"}`} />
              <div className="grid grid-cols-3 gap-3 p-4">
                <Big label="Online" value={inr(r.collections.online)} />
                <Big label="Cash" value={inr(r.collections.cash)} />
                <Big label="UPI / card / bank" value={inr(r.collections.otherManual)} />
              </div>
              <div className="space-y-1.5 border-t p-4 text-[13px]">
                <Row label="Total received" value={inr(r.collections.received)} strong />
                <Row
                  label="…for today's bookings"
                  value={inr(r.collections.forTodaysBookings)}
                  muted
                />
                <Row
                  label="…for other days (advances & settled dues)"
                  value={inr(r.collections.forOtherDaysBookings)}
                  muted
                />
                <Row
                  label="Refunds paid out"
                  value={`− ${inr(r.collections.refunds)}`}
                  tone={r.collections.refunds ? "text-destructive" : ""}
                />
                <Row label="Net collections" value={inr(r.collections.net)} strong />
                {Object.keys(r.collections.byMethod).length > 0 && (
                  <div className="pt-1 text-[11.5px] text-muted-foreground">
                    {Object.entries(r.collections.byMethod)
                      .map(([m, v]) => `${METHOD_LABELS[m] ?? m}: ${inr(v)}`)
                      .join(" · ")}
                  </div>
                )}
              </div>
            </Panel>
          </div>

          <Panel>
            <PanelHead
              title="Expenses recorded for this day"
              right={
                <span className="text-[13px] font-semibold tabular-nums">
                  {inr(r.expenses.total)}
                </span>
              }
            />
            {r.expenses.items.length === 0 ? (
              <p className="p-4 text-[12.5px] text-muted-foreground">
                No expenses recorded for this day.
              </p>
            ) : (
              <ul className="divide-y">
                {r.expenses.items.map((e) => (
                  <li key={e._id} className="flex justify-between px-4 py-2 text-[13px]">
                    <span>
                      {e.title}{" "}
                      <span className="text-muted-foreground">
                        · {EXPENSE_CATEGORY_LABELS[e.category] ?? e.category}
                      </span>
                    </span>
                    <span className="tabular-nums">{inr(e.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <div className="flex items-start gap-2 rounded-md border border-primary/15 bg-primary-soft px-3 py-2.5 text-[12.5px] text-primary-soft-foreground">
            <Info className="mt-0.5 size-4 shrink-0" />
            <span>
              <strong>Booking value</strong> is what the day's bookings are worth, whenever they
              were paid. <strong>Money received</strong> is cash/online that actually came in on
              this day — including advances for future bookings. Each rupee is counted once, on the
              day it was received, so the two numbers are never added together. The operating result
              uses money received.
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function Big({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div>
      <div className="text-[11.5px] text-muted-foreground">{label}</div>
      <div className={`text-[20px] font-semibold tabular-nums ${tone ?? ""}`}>{value}</div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  muted,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
  tone?: string;
}) {
  return (
    <div className={`flex justify-between gap-3 ${muted ? "text-muted-foreground" : ""}`}>
      <span className={muted ? "pl-3" : ""}>{label}</span>
      <span className={`tabular-nums ${strong ? "font-semibold" : ""} ${tone ?? ""}`}>{value}</span>
    </div>
  );
}
