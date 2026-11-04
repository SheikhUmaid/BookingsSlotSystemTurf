import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader2, Medal, Trophy } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Panel, PanelHead, Td, Th } from "@/components/turf/ui-bits";
import { FeatureLocked, UpgradeBadge } from "@/components/turf/plan";
import { adminDownload, adminFetch } from "@/lib/api";
import { pageMeta } from "@/lib/meta";
import { inr } from "@/lib/turf-data";
import { useSubscription } from "@/lib/useSubscription";

export const Route = createFileRoute("/reports")({
  head: () =>
    pageMeta("Reports", "Advanced analytics, leaderboards, pitch-wise reports and exports."),
  component: ReportsPage,
});

interface Range {
  from: string;
  to: string;
}

interface AnalyticsResponse {
  kpis: {
    bookings: number;
    revenue: number;
    avgBookingValue: number;
    collectionRate: number;
    customers: number;
    repeatCustomerRate: number;
    cancellationRate: number;
  };
  byWeekday: { day: string; bookings: number; revenue: number }[];
  byHour: { hour: string; slots: number }[];
  byService: { service: string; bookings: number; revenue: number }[];
}

interface LeaderRow {
  userId: string;
  name: string;
  phone: string;
  bookings: number;
  hours: number;
  spent: number;
}
interface LeaderboardResponse {
  byBookings: LeaderRow[];
  bySpend: LeaderRow[];
}

interface PitchRow {
  pitchId: string | null;
  name: string;
  size: string;
  bookings: number;
  slotsBooked: number;
  cancelled: number;
  revenue: number;
  outstanding: number;
  revenueShare: number;
}
interface PitchReportResponse {
  totalRevenue: number;
  pitches: PitchRow[];
}

const localDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const pct = (v: number) => `${Math.round(v * 100)}%`;

function defaultRange(): Range {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return { from: localDate(from), to: localDate(to) };
}

function ReportsPage() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  const [range, setRange] = useState<Range>(defaultRange);
  const { hasFeature, plan } = useSubscription();

  const qs = `from=${range.from}&to=${range.to}`;
  const sections = [
    "advancedAnalytics",
    "leaderboards",
    "pitchWiseReports",
    "financialExports",
  ] as const;
  const anyOn = sections.some((f) => hasFeature(f));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        desc={`Deeper insight into bookings and revenue${plan?.name ? ` · ${plan.name} plan` : ""}.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={range.from}
              max={range.to}
              onChange={(e) => e.target.value && setRange((r) => ({ ...r, from: e.target.value }))}
              className="h-8 w-[140px] text-[13px]"
              aria-label="From date"
            />
            <span className="text-[12px] text-muted-foreground">to</span>
            <Input
              type="date"
              value={range.to}
              min={range.from}
              onChange={(e) => e.target.value && setRange((r) => ({ ...r, to: e.target.value }))}
              className="h-8 w-[140px] text-[13px]"
              aria-label="To date"
            />
            <ExportButton qs={qs} range={range} />
          </div>
        }
      />

      {!anyOn && (
        <div className="rounded-md border border-primary/15 bg-primary-soft px-3 py-2 text-[12.5px] text-primary-soft-foreground">
          Reports aren't included in your current plan. Upgrade to unlock the sections below.
        </div>
      )}

      {hasFeature("advancedAnalytics") ? (
        <AdvancedAnalytics qs={qs} enabled={isClient} />
      ) : (
        <FeatureLocked feature="advancedAnalytics" compact />
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        {hasFeature("pitchWiseReports") ? (
          <PitchReport qs={qs} enabled={isClient} />
        ) : (
          <FeatureLocked feature="pitchWiseReports" compact />
        )}
        {hasFeature("leaderboards") ? (
          <Leaderboard qs={qs} enabled={isClient} />
        ) : (
          <FeatureLocked feature="leaderboards" compact />
        )}
      </div>
    </div>
  );
}

function ExportButton({ qs, range }: { qs: string; range: Range }) {
  const { hasFeature } = useSubscription();
  const [busy, setBusy] = useState(false);
  const allowed = hasFeature("financialExports");

  const run = async () => {
    setBusy(true);
    try {
      await adminDownload(
        `/admin/reports/export/bookings?${qs}`,
        `bookings_${range.from}_to_${range.to}.csv`,
      );
      toast.success("Export downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusy(false);
    }
  };

  if (!allowed) {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled
        className="gap-1.5"
        title="Financial exports aren't in your plan"
      >
        <Download className="size-3.5" /> Export CSV{" "}
        <UpgradeBadge label="Upgrade" className="ml-1" />
      </Button>
    );
  }
  return (
    <Button size="sm" variant="outline" onClick={run} disabled={busy} className="gap-1.5">
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
      Export CSV
    </Button>
  );
}

function SectionError({ error }: { error: unknown }) {
  return (
    <div className="p-4 text-[12.5px] text-destructive">
      {error instanceof Error ? error.message : "Failed to load"}
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center p-8 text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
    </div>
  );
}

function AdvancedAnalytics({ qs, enabled }: { qs: string; enabled: boolean }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-report-analytics", qs],
    queryFn: () => adminFetch<AnalyticsResponse>(`/admin/reports/analytics?${qs}`),
    enabled,
  });

  const k = data?.kpis;
  const kpis: [string, string][] = k
    ? [
        ["Bookings", String(k.bookings)],
        ["Revenue collected", inr(k.revenue)],
        ["Avg. booking value", inr(k.avgBookingValue)],
        ["Collection rate", pct(k.collectionRate)],
        ["Customers", String(k.customers)],
        ["Repeat customers", pct(k.repeatCustomerRate)],
        ["Cancellation rate", pct(k.cancellationRate)],
      ]
    : [];

  return (
    <Panel>
      <PanelHead title="Advanced analytics" />
      {isLoading ? (
        <Loading />
      ) : error ? (
        <SectionError error={error} />
      ) : (
        <div className="space-y-5 p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
            {kpis.map(([label, value]) => (
              <div key={label} className="rounded-md border bg-surface px-3 py-2.5">
                <div className="text-[11.5px] text-muted-foreground">{label}</div>
                <div className="mt-0.5 text-[16px] font-semibold tabular-nums">{value}</div>
              </div>
            ))}
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <div className="mb-2 text-[12.5px] font-medium">Bookings by weekday</div>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.byWeekday ?? []}>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      width={28}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--secondary)" }}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Bar
                      dataKey="bookings"
                      name="Bookings"
                      fill="var(--chart-1)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <div className="mb-2 text-[12.5px] font-medium">Peak hours (slots booked)</div>
              <div className="h-[200px]">
                {data?.byHour.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.byHour}>
                      <CartesianGrid stroke="var(--border)" vertical={false} />
                      <XAxis
                        dataKey="hour"
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                        axisLine={false}
                        tickLine={false}
                        width={28}
                      />
                      <Tooltip
                        cursor={{ fill: "var(--secondary)" }}
                        contentStyle={{ fontSize: 12 }}
                      />
                      <Bar
                        dataKey="slots"
                        name="Slots"
                        fill="var(--chart-2)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty />
                )}
              </div>
            </div>
          </div>
          {!!data?.byService.length && (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full">
                <thead>
                  <tr>
                    <Th>Service</Th>
                    <Th className="text-right">Bookings</Th>
                    <Th className="text-right">Revenue</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.byService.map((s) => (
                    <tr key={s.service}>
                      <Td>{s.service}</Td>
                      <Td className="text-right tabular-nums">{s.bookings}</Td>
                      <Td className="text-right tabular-nums">{inr(s.revenue)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

function Empty() {
  return (
    <div className="grid h-full place-items-center text-[12.5px] text-muted-foreground">
      No bookings in this range
    </div>
  );
}

function PitchReport({ qs, enabled }: { qs: string; enabled: boolean }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-report-pitches", qs],
    queryFn: () => adminFetch<PitchReportResponse>(`/admin/reports/pitches?${qs}`),
    enabled,
  });

  return (
    <Panel className="overflow-hidden">
      <PanelHead
        title="Pitch-wise revenue & stats"
        right={
          data ? (
            <span className="text-[12px] text-muted-foreground">
              {inr(data.totalRevenue)} total
            </span>
          ) : null
        }
      />
      {isLoading ? (
        <Loading />
      ) : error ? (
        <SectionError error={error} />
      ) : !data?.pitches.length ? (
        <div className="h-[120px]">
          <Empty />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <Th>Pitch</Th>
                <Th className="text-right">Bookings</Th>
                <Th className="text-right">Slots</Th>
                <Th className="text-right">Cancelled</Th>
                <Th className="text-right">Revenue</Th>
                <Th className="text-right">Outstanding</Th>
              </tr>
            </thead>
            <tbody>
              {data.pitches.map((p) => (
                <tr key={p.pitchId ?? "none"}>
                  <Td>
                    <div className="font-medium">{p.name}</div>
                    <div className="mt-1 h-1 w-full max-w-[120px] overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${Math.round(p.revenueShare * 100)}%` }}
                      />
                    </div>
                  </Td>
                  <Td className="text-right tabular-nums">{p.bookings}</Td>
                  <Td className="text-right tabular-nums">{p.slotsBooked}</Td>
                  <Td className="text-right tabular-nums">{p.cancelled}</Td>
                  <Td className="text-right tabular-nums">{inr(p.revenue)}</Td>
                  <Td className="text-right tabular-nums text-warning">{inr(p.outstanding)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function Leaderboard({ qs, enabled }: { qs: string; enabled: boolean }) {
  const [by, setBy] = useState<"byBookings" | "bySpend">("byBookings");
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-report-leaderboard", qs],
    queryFn: () => adminFetch<LeaderboardResponse>(`/admin/reports/leaderboard?${qs}&limit=10`),
    enabled,
  });
  const rows = data?.[by] ?? [];

  return (
    <Panel className="overflow-hidden">
      <PanelHead
        title="Leaderboard"
        right={
          <div className="flex rounded-md border p-0.5 text-[12px]">
            {(
              [
                ["byBookings", "Most bookings"],
                ["bySpend", "Top spenders"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setBy(key)}
                className={`rounded px-2 py-0.5 ${by === key ? "bg-primary-soft font-medium text-primary-soft-foreground" : "text-muted-foreground"}`}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />
      {isLoading ? (
        <Loading />
      ) : error ? (
        <SectionError error={error} />
      ) : !rows.length ? (
        <div className="h-[120px]">
          <Empty />
        </div>
      ) : (
        <ol className="divide-y">
          {rows.map((r, i) => (
            <li key={r.userId} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-[12px] font-semibold">
                {i === 0 ? (
                  <Trophy className="size-3.5 text-primary" />
                ) : i < 3 ? (
                  <Medal className="size-3.5 text-primary" />
                ) : (
                  i + 1
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{r.name}</div>
                <div className="text-[11.5px] text-muted-foreground">{r.phone}</div>
              </div>
              <div className="text-right tabular-nums">
                <div className="font-semibold">
                  {by === "byBookings" ? `${r.bookings} bookings` : inr(r.spent)}
                </div>
                <div className="text-[11.5px] text-muted-foreground">
                  {by === "byBookings" ? inr(r.spent) : `${r.bookings} bookings`} · {r.hours} slots
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
