import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight, CalendarCheck, CalendarClock, IndianRupee, ListChecks, Wallet } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useStore } from "@/lib/store";
import { fmtDate, inr, services, timeSlots, to12 } from "@/lib/turf-data";
import { BackendNote, PageHeader, Panel, PanelHead, StatusBadge, Td, Th, selectCls } from "@/components/turf/ui-bits";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/")({
  head: () => pageMeta("Overview", "Bookings, revenue and today's turf schedule at a glance."),
  component: Overview,
});

const statusColors: Record<string, string> = { Paid: "var(--chart-2)", Partial: "var(--chart-3)", Pending: "var(--chart-1)", Cancelled: "var(--chart-4)", Expired: "var(--chart-5)" };

function Overview() {
  const { bookings, today } = useStore();
  const [range, setRange] = useState(14);
  const t = fmtDate(today);
  const from = new Date(today); from.setDate(from.getDate() - range + 1);
  const inRange = bookings.filter((b) => b.date >= fmtDate(from) && b.date <= t);
  const active = (s: string) => s !== "Cancelled" && s !== "Expired";

  const days = Array.from({ length: range }, (_, i) => {
    const d = new Date(from); d.setDate(d.getDate() + i);
    const ds = fmtDate(d);
    const bs = bookings.filter((b) => b.date === ds);
    return { day: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), revenue: bs.reduce((a, b) => a + b.paid, 0), bookings: bs.filter((b) => active(b.status)).length };
  });
  const dist = ["Paid", "Partial", "Pending", "Cancelled", "Expired"].map((s) => ({ name: s, value: inRange.filter((b) => b.status === s).length })).filter((d) => d.value);

  const metrics = [
    { label: "Total bookings", value: inRange.filter((b) => active(b.status)).length, icon: ListChecks },
    { label: "Today's bookings", value: bookings.filter((b) => b.date === t && active(b.status)).length, icon: CalendarCheck },
    { label: "Upcoming", value: bookings.filter((b) => b.date > t && active(b.status)).length, icon: CalendarClock },
    { label: "Revenue collected", value: inr(inRange.reduce((a, b) => a + b.paid, 0)), icon: IndianRupee },
    { label: "Pending payments", value: inr(bookings.filter((b) => b.date >= t && active(b.status)).reduce((a, b) => a + b.total - b.paid, 0)), icon: Wallet },
  ];
  const todays = bookings.filter((b) => b.date === t && active(b.status)).sort((a, b) => a.slotIds[0]!.localeCompare(b.slotIds[0]!, undefined, { numeric: true }));
  const slot = (id: string) => timeSlots.find((s) => s.id === id)!;
  const svc = (id: string) => services.find((s) => s.id === id)!;

  return (
    <div>
      <PageHeader
        title="Overview"
        desc={today.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        actions={
          <select value={range} onChange={(e) => setRange(Number(e.target.value))} className={selectCls}>
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={21}>Last 21 days</option>
          </select>
        }
      />
      <BackendNote>Analytics use sample data until backend aggregation endpoints are available.</BackendNote>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {metrics.map((m) => (
          <Panel key={m.label} className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[12.5px] text-muted-foreground">{m.label}</span>
              <span className="grid size-7 place-items-center rounded-md bg-primary-soft text-primary"><m.icon className="size-3.5" /></span>
            </div>
            <div className="mt-2 text-[20px] font-semibold tracking-tight">{m.value}</div>
          </Panel>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHead title="Revenue trend" />
          <div className="h-56 p-3">
            <ResponsiveContainer>
              <AreaChart data={days}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v / 1000}k`} width={40} />
                <Tooltip formatter={(v: number) => inr(v)} contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid var(--border)" }} />
                <Area dataKey="revenue" stroke="var(--chart-1)" strokeWidth={2} fill="var(--primary-soft)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel>
          <PanelHead title="Booking status" />
          <div className="flex h-56 items-center gap-2 p-3">
            <ResponsiveContainer width="55%">
              <PieChart>
                <Pie data={dist} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={2}>
                  {dist.map((d) => <Cell key={d.name} fill={statusColors[d.name]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 text-[12.5px]">
              {dist.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ background: statusColors[d.name] }} />
                  <span className="text-muted-foreground">{d.name}</span>
                  <span className="font-medium">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHead title="Recent bookings" right={<Link to="/bookings" className="flex items-center gap-1 text-[12.5px] font-medium text-primary">View all <ArrowUpRight className="size-3.5" /></Link>} />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><Th>ID</Th><Th>Customer</Th><Th>Pitch</Th><Th>Date</Th><Th className="text-right">Amount</Th><Th>Status</Th></tr></thead>
              <tbody>
                {bookings.filter((b) => b.date <= t).slice(0, 6).map((b) => (
                  <tr key={b.id} className="hover:bg-surface">
                    <Td className="font-medium text-primary">{b.id}</Td>
                    <Td>{b.customer}</Td>
                    <Td className="text-muted-foreground">{svc(b.serviceId).name}</Td>
                    <Td className="text-muted-foreground">{new Date(b.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</Td>
                    <Td className="text-right font-medium">{inr(b.total)}</Td>
                    <Td><StatusBadge status={b.status} /></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel>
          <PanelHead title="Today's slots" right={<Link to="/calendar" className="text-[12.5px] font-medium text-primary">Calendar</Link>} />
          <div className="max-h-[300px] divide-y overflow-y-auto">
            {todays.slice(0, 8).map((b) => (
              <div key={b.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="w-16 text-[12.5px] font-semibold">{to12(slot(b.slotIds[0]!).start)}</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium">{b.customer}</div>
                  <div className="truncate text-[11.5px] text-muted-foreground">{svc(b.serviceId).name}</div>
                </div>
                <StatusBadge status={b.status} />
              </div>
            ))}
            {todays.length === 0 && <div className="p-6 text-center text-[13px] text-muted-foreground">No bookings today.</div>}
          </div>
        </Panel>
      </div>

      <Panel className="mt-4">
        <PanelHead title="Bookings over time" />
        <div className="h-48 p-3">
          <ResponsiveContainer>
            <BarChart data={days}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} cursor={{ fill: "var(--surface)" }} />
              <Bar dataKey="bookings" fill="var(--chart-1)" radius={[3, 3, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </div>
  );
}
