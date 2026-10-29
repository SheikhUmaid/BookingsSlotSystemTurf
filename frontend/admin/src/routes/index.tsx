import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { ArrowUpRight, CalendarCheck, CalendarClock, IndianRupee, ListChecks, Wallet, Loader2 } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { fmtDate, inr } from "@/lib/turf-data";
import { PageHeader, Panel, PanelHead, StatusBadge, Td, Th, selectCls } from "@/components/turf/ui-bits";
import { pageMeta } from "@/lib/meta";
import { adminFetch } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => pageMeta("Overview", "Bookings, revenue and today's turf schedule at a glance."),
  component: Overview,
});

const statusColors: Record<string, string> = {
  Paid: "var(--chart-2)",
  Partial: "var(--chart-3)",
  Pending: "var(--chart-1)",
  Cancelled: "var(--chart-4)",
  Expired: "var(--chart-5)",
};

interface DashboardMetrics {
  totalBookings: number;
  todaysBookings: number;
  upcoming: number;
  revenueCollected: number;
  pendingPayments: number;
}

interface DayTrend {
  date: string;
  day: string;
  revenue: number;
  bookings: number;
}

interface StatusDist {
  name: string;
  value: number;
}

interface TodaySlotBooking {
  id: string;
  _id: string;
  customer: string;
  phone?: string;
  serviceName: string;
  startTime: string;
  endTime: string;
  status: string;
  total: number;
  paid: number;
}

interface RecentBookingItem {
  id: string;
  _id: string;
  customer: string;
  phone?: string;
  pitch: string;
  date: string;
  amount: number;
  paid: number;
  status: string;
  createdAt: string;
}

interface DashboardOverviewResponse {
  today: string;
  range: number;
  metrics: DashboardMetrics;
  days: DayTrend[];
  dist: StatusDist[];
  todaysBookings: TodaySlotBooking[];
  recentBookings: RecentBookingItem[];
}

const to12 = (t?: string) => {
  if (!t) return "";
  const [hStr, mStr = "00"] = t.split(":");
  const h = Number(hStr);
  const s = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr} ${s}`;
};

function Overview() {
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

  const [range, setRange] = useState(14);

  // Fetch real aggregated analytics from backend
  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["admin-dashboard-overview", range, todayStr],
    queryFn: () =>
      adminFetch<DashboardOverviewResponse>(
        `/admin/dashboard/overview?days=${range}&today=${todayStr}`
      ),
    enabled: isClient,
    staleTime: 60 * 1000,
  });

  const metricsData = data?.metrics ?? {
    totalBookings: 0,
    todaysBookings: 0,
    upcoming: 0,
    revenueCollected: 0,
    pendingPayments: 0,
  };

  const days = data?.days ?? [];
  const dist = data?.dist ?? [];
  const todaysBookings = data?.todaysBookings ?? [];
  const recentBookings = data?.recentBookings ?? [];

  const metrics = [
    { label: "Total bookings", value: metricsData.totalBookings, icon: ListChecks },
    { label: "Today's bookings", value: metricsData.todaysBookings, icon: CalendarCheck },
    { label: "Upcoming", value: metricsData.upcoming, icon: CalendarClock },
    { label: "Revenue collected", value: inr(metricsData.revenueCollected), icon: IndianRupee },
    { label: "Pending payments", value: inr(metricsData.pendingPayments), icon: Wallet },
  ];

  return (
    <div>
      <PageHeader
        title="Overview"
        desc={today.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        actions={
          <div className="flex items-center gap-2">
            {isFetching && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            <select value={range} onChange={(e) => setRange(Number(e.target.value))} className={selectCls}>
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={21}>Last 21 days</option>
            </select>
          </div>
        }
      />

      {isError && (
        <div className="mb-4 rounded-md border border-destructive/20 bg-danger-soft p-4 text-[13px] text-destructive">
          Failed to load dashboard data: {error instanceof Error ? error.message : "Unknown error"}
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {metrics.map((m) => (
          <Panel key={m.label} className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[12.5px] text-muted-foreground">{m.label}</span>
              <span className="grid size-7 place-items-center rounded-md bg-primary-soft text-primary">
                <m.icon className="size-3.5" />
              </span>
            </div>
            {isLoading ? (
              <div className="mt-2 h-7 w-20 animate-pulse rounded bg-muted" />
            ) : (
              <div className="mt-2 text-[20px] font-semibold tracking-tight">{m.value}</div>
            )}
          </Panel>
        ))}
      </div>

      {/* Charts Row */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHead title="Revenue trend" />
          <div className="h-56 p-3">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-[13px] text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : days.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={days}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => (v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${v}`)}
                    width={45}
                  />
                  <Tooltip formatter={(v: number) => inr(v)} contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid var(--border)" }} />
                  <Area dataKey="revenue" stroke="var(--chart-1)" strokeWidth={2} fill="var(--primary-soft)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-[13px] text-muted-foreground">
                No revenue recorded in this period.
              </div>
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHead title="Booking status" />
          <div className="flex h-56 items-center gap-2 p-3">
            {isLoading ? (
              <div className="flex size-full items-center justify-center text-[13px] text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : dist.length > 0 ? (
              <>
                <ResponsiveContainer width="55%" height="100%">
                  <PieChart>
                    <Pie data={dist} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={2}>
                      {dist.map((d) => (
                        <Cell key={d.name} fill={statusColors[d.name] ?? "var(--chart-1)"} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 text-[12.5px]">
                  {dist.map((d) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ background: statusColors[d.name] ?? "var(--chart-1)" }} />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="font-medium">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex size-full items-center justify-center text-[13px] text-muted-foreground">
                No bookings in this period.
              </div>
            )}
          </div>
        </Panel>
      </div>

      {/* Recent bookings & Today's slots */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHead
            title="Recent bookings"
            right={
              <Link to="/bookings" className="flex items-center gap-1 text-[12.5px] font-medium text-primary">
                View all <ArrowUpRight className="size-3.5" />
              </Link>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>ID</Th>
                  <Th>Customer</Th>
                  <Th>Pitch</Th>
                  <Th>Date</Th>
                  <Th className="text-right">Amount</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <Td key={j}>
                          <div className="h-3.5 animate-pulse rounded bg-muted" />
                        </Td>
                      ))}
                    </tr>
                  ))
                ) : recentBookings.length > 0 ? (
                  recentBookings.map((b) => (
                    <tr key={b._id} className="hover:bg-surface">
                      <Td className="font-medium text-primary">{b.id}</Td>
                      <Td>{b.customer}</Td>
                      <Td className="text-muted-foreground">{b.pitch}</Td>
                      <Td className="text-muted-foreground">
                        {new Date(b.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </Td>
                      <Td className="text-right font-medium">{inr(b.amount)}</Td>
                      <Td>
                        <StatusBadge status={b.status} />
                      </Td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-[13px] text-muted-foreground">
                      No recent bookings found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel>
          <PanelHead
            title="Today's slots"
            right={
              <Link to="/calendar" className="text-[12.5px] font-medium text-primary">
                Calendar
              </Link>
            }
          />
          <div className="max-h-[300px] divide-y overflow-y-auto">
            {isLoading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-8 animate-pulse rounded bg-muted" />
                ))}
              </div>
            ) : todaysBookings.length > 0 ? (
              todaysBookings.map((b) => (
                <div key={b._id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="w-16 text-[12.5px] font-semibold">{to12(b.startTime)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium">{b.customer}</div>
                    <div className="truncate text-[11.5px] text-muted-foreground">{b.serviceName}</div>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-[13px] text-muted-foreground">
                No bookings scheduled for today.
              </div>
            )}
          </div>
        </Panel>
      </div>

      {/* Bookings over time Bar Chart */}
      <Panel className="mt-4">
        <PanelHead title="Bookings over time" />
        <div className="h-48 p-3">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-[13px] text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : days.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={days}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} cursor={{ fill: "var(--surface)" }} />
                <Bar dataKey="bookings" fill="var(--chart-1)" radius={[3, 3, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-[13px] text-muted-foreground">
              No booking activity in this period.
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
