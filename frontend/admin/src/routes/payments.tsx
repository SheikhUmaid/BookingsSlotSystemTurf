import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, Panel, StatusBadge, Td, Th, selectCls } from "@/components/turf/ui-bits";
import { BookingPayments } from "@/components/turf/BookingPayments";
import { adminFetch } from "@/lib/api";
import { pageMeta } from "@/lib/meta";
import { inr, to12 } from "@/lib/turf-data";
import {
  METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  fmtDateTime,
  fmtDay,
  shiftDate,
  todayLocal,
} from "@/lib/business";

export const Route = createFileRoute("/payments")({
  head: () =>
    pageMeta("Payments", "What each booking owes, what's been collected, and every transaction."),
  component: PaymentsPage,
});

interface PaymentRecord {
  _id: string;
  booking_ref: string;
  customer: { _id: string; name: string; phone: string } | null;
  pitch: string;
  date: string;
  time_slots: { start_time: string; end_time: string }[];
  status: string;
  total_payable: number;
  amount_paid: number;
  amount_refunded: number;
  balance: number;
  payment_status: string;
  methods: string[];
}

interface RecordsResponse {
  records: PaymentRecord[];
  total: number;
  page: number;
  pages: number;
  counts: Record<string, number>;
  summary: { bookingValue: number; collected: number; refunded: number; outstanding: number };
}

interface Transaction {
  _id: string;
  kind: "payment" | "refund";
  amount: number;
  method: string;
  source: string;
  reference?: string | null;
  note?: string;
  paidAt: string;
  user?: { name?: string; phone?: string } | null;
  recordedBy?: { name?: string } | null;
  booking_ref: string | null;
}

const STATUS_CHIPS: [string, string][] = [
  ["", "All"],
  ["paid", "Fully paid"],
  ["partial", "Partly paid"],
  ["pending", "Unpaid"],
  ["refunded", "Refunded"],
];

function PaymentsPage() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  return (
    <div>
      <PageHeader
        title="Payments"
        desc="What every booking owes, what's been collected, and every rupee in and out."
      />
      <Tabs defaultValue="records">
        <TabsList className="mb-4">
          <TabsTrigger value="records">Booking payments</TabsTrigger>
          <TabsTrigger value="transactions">Transaction history</TabsTrigger>
        </TabsList>
        <TabsContent value="records">{isClient && <Records />}</TabsContent>
        <TabsContent value="transactions">{isClient && <Transactions />}</TabsContent>
      </Tabs>
    </div>
  );
}

function Records() {
  const [status, setStatus] = useState("");
  const [method, setMethod] = useState("");
  const [from, setFrom] = useState(shiftDate(todayLocal(), -30));
  const [to, setTo] = useState(shiftDate(todayLocal(), 30));
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<PaymentRecord | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const qs = `status=${status}&method=${method}&from=${from}&to=${to}&search=${encodeURIComponent(debounced)}&page=${page}`;
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["admin-payments", qs],
    queryFn: () => adminFetch<RecordsResponse>(`/admin/payments?${qs}`),
    placeholderData: keepPreviousData,
  });
  const s = data?.summary;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard
          label="Booking value"
          value={s?.bookingValue}
          hint="What these bookings are worth"
        />
        <SummaryCard
          label="Collected (net)"
          value={s?.collected}
          hint="Money received, after refunds"
          tone="text-success"
        />
        <SummaryCard
          label="Still to collect"
          value={s?.outstanding}
          hint="Balance on active bookings"
          tone="text-warning"
        />
        <SummaryCard
          label="Refunded"
          value={s?.refunded}
          hint="Money given back"
          tone="text-destructive"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Customer name or phone"
            className="h-8 pl-8 text-[13px]"
          />
        </div>
        <label className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          Booking date
          <Input
            type="date"
            value={from}
            max={to}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className="h-8 w-[136px] text-[12.5px]"
          />
          –
          <Input
            type="date"
            value={to}
            min={from}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            className="h-8 w-[136px] text-[12.5px]"
          />
        </label>
        <select
          value={method}
          onChange={(e) => {
            setMethod(e.target.value);
            setPage(1);
          }}
          className={selectCls}
          aria-label="Payment method"
        >
          <option value="">Any method</option>
          {Object.entries(METHOD_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {STATUS_CHIPS.map(([key, label]) => (
          <button
            key={key || "all"}
            onClick={() => {
              setStatus(key);
              setPage(1);
            }}
            className={`rounded-full border px-3 py-1 text-[12px] font-medium ${status === key ? "border-primary bg-primary-soft text-primary-soft-foreground" : "text-muted-foreground hover:bg-secondary"}`}
          >
            {label}
            {key && data?.counts && (
              <span className="ml-1 tabular-nums opacity-70">{data.counts[key] ?? 0}</span>
            )}
          </button>
        ))}
      </div>

      {error && <div className="text-[13px] text-destructive">{(error as Error).message}</div>}
      <Panel className="overflow-x-auto">
        <table className="w-full whitespace-nowrap">
          <thead>
            <tr>
              <Th>Booking</Th>
              <Th>Customer</Th>
              <Th>Date</Th>
              <Th className="text-right">Total</Th>
              <Th className="text-right">Paid</Th>
              <Th className="text-right">Balance</Th>
              <Th>Method</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <Td key={j}>
                        <div className="h-4 animate-pulse rounded bg-muted" />
                      </Td>
                    ))}
                  </tr>
                ))
              : (data?.records ?? []).map((r) => (
                  <tr
                    key={r._id}
                    onClick={() => setOpen(r)}
                    className="cursor-pointer hover:bg-surface"
                  >
                    <Td className="font-medium text-primary">{r.booking_ref}</Td>
                    <Td>
                      <div className="font-medium">{r.customer?.name || "Customer"}</div>
                      <div className="text-[11.5px] text-muted-foreground">{r.customer?.phone}</div>
                    </Td>
                    <Td className="text-muted-foreground">
                      {fmtDay(r.date)}
                      <div className="text-[11.5px]">
                        {r.time_slots.map((t) => to12(t.start_time)).join(", ")} · {r.pitch}
                      </div>
                    </Td>
                    <Td className="text-right tabular-nums">{inr(r.total_payable)}</Td>
                    <Td className="text-right tabular-nums">{inr(r.amount_paid)}</Td>
                    <Td
                      className={`text-right tabular-nums ${r.balance > 0 ? "font-semibold text-warning" : "text-muted-foreground"}`}
                    >
                      {r.balance > 0 ? inr(r.balance) : "—"}
                    </Td>
                    <Td className="text-[12px] text-muted-foreground">
                      {r.methods.map((m) => METHOD_LABELS[m] ?? m).join(", ") || "—"}
                    </Td>
                    <Td>
                      <StatusBadge
                        status={
                          ["cancelled", "expired"].includes(r.status) &&
                          r.payment_status !== "refunded"
                            ? r.status[0]!.toUpperCase() + r.status.slice(1)
                            : (PAYMENT_STATUS_LABELS[r.payment_status] ?? r.payment_status)
                        }
                      />
                    </Td>
                  </tr>
                ))}
            {!isLoading && !data?.records.length && (
              <tr>
                <td colSpan={8} className="p-10 text-center text-[13px] text-muted-foreground">
                  No bookings match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Panel>
      {data && data.pages > 1 && (
        <Pager
          page={page}
          pages={data.pages}
          total={data.total}
          fetching={isFetching}
          onPage={setPage}
        />
      )}

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:w-[420px] sm:max-w-[420px]">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle>
                  {open.booking_ref} · {open.customer?.name}
                </SheetTitle>
              </SheetHeader>
              <div className="px-4 pb-6">
                <p className="mb-3 text-[12.5px] text-muted-foreground">
                  {fmtDay(open.date)} ·{" "}
                  {open.time_slots
                    .map((t) => `${to12(t.start_time)}–${to12(t.end_time)}`)
                    .join(", ")}{" "}
                  · {open.pitch}
                </p>
                <BookingPayments bookingId={open._id} bookingStatus={open.status} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Transactions() {
  const [from, setFrom] = useState(shiftDate(todayLocal(), -6));
  const [to, setTo] = useState(todayLocal());
  const [method, setMethod] = useState("");
  const [kind, setKind] = useState("");
  const [page, setPage] = useState(1);
  const qs = `from=${from}&to=${to}&method=${method}&kind=${kind}&page=${page}`;
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-transactions", qs],
    queryFn: () =>
      adminFetch<{
        transactions: Transaction[];
        total: number;
        page: number;
        pages: number;
        totals: { received: number; refunded: number; net: number };
      }>(`/admin/payments/transactions?${qs}`),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          Paid between
          <Input
            type="date"
            value={from}
            max={to}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className="h-8 w-[136px] text-[12.5px]"
          />
          –
          <Input
            type="date"
            value={to}
            min={from}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            className="h-8 w-[136px] text-[12.5px]"
          />
        </label>
        <select
          value={method}
          onChange={(e) => {
            setMethod(e.target.value);
            setPage(1);
          }}
          className={selectCls}
        >
          <option value="">Any method</option>
          {Object.entries(METHOD_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          value={kind}
          onChange={(e) => {
            setKind(e.target.value);
            setPage(1);
          }}
          className={selectCls}
        >
          <option value="">Payments & refunds</option>
          <option value="payment">Payments only</option>
          <option value="refund">Refunds only</option>
        </select>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Received" value={data?.totals.received} tone="text-success" />
        <SummaryCard label="Refunded" value={data?.totals.refunded} tone="text-destructive" />
        <SummaryCard label="Net" value={data?.totals.net} />
      </div>
      <Panel className="overflow-x-auto">
        <table className="w-full whitespace-nowrap">
          <thead>
            <tr>
              <Th>When</Th>
              <Th>Customer</Th>
              <Th>For</Th>
              <Th>Method</Th>
              <Th>Reference / note</Th>
              <Th>Recorded by</Th>
              <Th className="text-right">Amount</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center">
                  <Loader2 className="mx-auto size-4 animate-spin text-muted-foreground" />
                </td>
              </tr>
            ) : (
              (data?.transactions ?? []).map((t) => (
                <tr key={t._id}>
                  <Td className="text-muted-foreground">{fmtDateTime(t.paidAt)}</Td>
                  <Td>
                    <div className="font-medium">{t.user?.name || "Customer"}</div>
                    <div className="text-[11.5px] text-muted-foreground">{t.user?.phone}</div>
                  </Td>
                  <Td>{t.booking_ref ?? "—"}</Td>
                  <Td>{METHOD_LABELS[t.method] ?? t.method}</Td>
                  <Td className="max-w-[220px] truncate text-[12px] text-muted-foreground">
                    {[t.reference, t.note].filter(Boolean).join(" · ") || "—"}
                  </Td>
                  <Td className="text-[12px] text-muted-foreground">
                    {t.recordedBy?.name ?? (t.source === "razorpay" ? "Razorpay" : "—")}
                  </Td>
                  <Td
                    className={`text-right font-semibold tabular-nums ${t.kind === "refund" ? "text-destructive" : "text-success"}`}
                  >
                    {t.kind === "refund" ? "−" : "+"}
                    {inr(t.amount)}
                  </Td>
                </tr>
              ))
            )}
            {!isLoading && !data?.transactions.length && (
              <tr>
                <td colSpan={7} className="p-10 text-center text-[13px] text-muted-foreground">
                  No transactions in this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Panel>
      {data && data.pages > 1 && (
        <Pager
          page={page}
          pages={data.pages}
          total={data.total}
          fetching={isFetching}
          onPage={setPage}
        />
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value?: number | undefined;
  hint?: string;
  tone?: string;
}) {
  return (
    <Panel className="p-3.5">
      <div className="text-[12px] text-muted-foreground">{label}</div>
      <div className={`mt-1 text-[19px] font-semibold tabular-nums ${tone ?? ""}`}>
        {value === undefined ? "…" : inr(value)}
      </div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </Panel>
  );
}

function Pager({
  page,
  pages,
  total,
  fetching,
  onPage,
}: {
  page: number;
  pages: number;
  total: number;
  fetching: boolean;
  onPage: (p: number) => void;
}) {
  return (
    <div className="flex items-center justify-between text-[12.5px] text-muted-foreground">
      <span>
        {total} records · page {page} of {pages}
        {fetching && <Loader2 className="ml-2 inline size-3.5 animate-spin" />}
      </span>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
