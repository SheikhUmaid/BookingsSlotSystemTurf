import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Loader2, Pencil, Search, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  PageHeader,
  Panel,
  PanelHead,
  StatusBadge,
  Td,
  Th,
  selectCls,
} from "@/components/turf/ui-bits";
import { adminFetch } from "@/lib/api";
import { pageMeta } from "@/lib/meta";
import { inr, to12 } from "@/lib/turf-data";
import {
  CATEGORY_LABELS,
  METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  contactLines,
  copyText,
  fmtDateTime,
  fmtDay,
} from "@/lib/business";
import { useSubscription } from "@/lib/useSubscription";

export const Route = createFileRoute("/customers")({
  head: () => pageMeta("Customers", "Customer profiles, history, dues, notes and retention."),
  component: CustomersPage,
});

export interface Customer {
  _id: string;
  name: string;
  phone: string;
  email: string;
  joinedAt: string;
  totalBookings: number;
  cancelledBookings: number;
  bookingsLast90: number;
  bookingsPerMonth: number;
  avgDaysBetween: number | null;
  totalSpent: number;
  outstanding: number;
  lastBookingDate: string | null;
  nextBookingDate: string | null;
  daysSinceLastBooking: number | null;
  lifecycle: string;
  categories: string[];
}

interface ListResponse {
  customers: Customer[];
  total: number;
  page: number;
  pages: number;
  counts: Record<string, number>;
  settings: { highValueThreshold: number; inactiveDays: number; regularMinBookings: number };
}

const FILTERS: [string, string][] = [
  ["", "All"],
  ["new", "New"],
  ["regular", "Regular"],
  ["inactive", "Inactive"],
  ["high_value", "High-Value"],
  ["outstanding", "Has dues"],
];

function CategoryBadges({ categories }: { categories: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {categories.map((c) => (
        <StatusBadge key={c} status={CATEGORY_LABELS[c] ?? c} />
      ))}
    </div>
  );
}

function CustomersPage() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  const [tab, setTab] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div>
      <PageHeader
        title="Customers"
        desc="Everyone who has booked with you — history, spend, dues and notes."
        actions={
          <Button size="sm" onClick={() => setAdding(true)} className="gap-1.5">
            <UserPlus className="size-4" /> Add customer
          </Button>
        }
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">All customers</TabsTrigger>
          <TabsTrigger value="retention">Retention</TabsTrigger>
        </TabsList>
        <TabsContent value="all">{isClient && <CustomerList onOpen={setOpenId} />}</TabsContent>
        <TabsContent value="retention">{isClient && <Retention onOpen={setOpenId} />}</TabsContent>
      </Tabs>

      <CustomerProfile customerId={openId} onClose={() => setOpenId(null)} />
      <AddCustomerDialog
        open={adding}
        onClose={() => setAdding(false)}
        onCreated={(id) => setOpenId(id)}
      />
    </div>
  );
}

function CustomerList({ onOpen }: { onOpen: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["admin-customers", debounced, category, sort, page],
    queryFn: () =>
      adminFetch<ListResponse>(
        `/admin/customers?search=${encodeURIComponent(debounced)}&category=${category}&sort=${sort}&page=${page}&limit=25`,
      ),
    placeholderData: keepPreviousData,
  });
  const rows = data?.customers ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone or email"
            className="h-8 pl-8 text-[13px]"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className={selectCls}
          aria-label="Sort"
        >
          <option value="recent">Most recent booking</option>
          <option value="spent">Highest spend</option>
          <option value="bookings">Most bookings</option>
          <option value="outstanding">Highest dues</option>
          <option value="name">Name A–Z</option>
          <option value="joined">Newest customers</option>
        </select>
        <Button
          size="sm"
          variant="outline"
          className="ml-auto gap-1.5"
          disabled={!rows.length}
          onClick={() =>
            copyText(contactLines(rows), `Copied ${rows.length} contact(s) on this page`)
          }
        >
          <Copy className="size-3.5" /> Copy contacts
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map(([key, label]) => (
          <button
            key={key || "all"}
            onClick={() => {
              setCategory(key);
              setPage(1);
            }}
            className={`rounded-full border px-3 py-1 text-[12px] font-medium ${category === key ? "border-primary bg-primary-soft text-primary-soft-foreground" : "text-muted-foreground hover:bg-secondary"}`}
          >
            {label}
            {data?.counts && (
              <span className="ml-1 tabular-nums opacity-70">{data.counts[key || "all"] ?? 0}</span>
            )}
          </button>
        ))}
      </div>
      {data?.settings && (
        <p className="text-[11.5px] text-muted-foreground">
          High-Value = spent {inr(data.settings.highValueThreshold)}+ · Regular ={" "}
          {data.settings.regularMinBookings}+ bookings in 90 days · Inactive = no booking for{" "}
          {data.settings.inactiveDays} days. Change these in Settings.
        </p>
      )}

      {error && <div className="text-[13px] text-destructive">{(error as Error).message}</div>}
      <Panel className="overflow-x-auto">
        <table className="w-full whitespace-nowrap">
          <thead>
            <tr>
              <Th>Customer</Th>
              <Th>Category</Th>
              <Th className="text-right">Bookings</Th>
              <Th className="text-right">Spent</Th>
              <Th className="text-right">Dues</Th>
              <Th>Last booking</Th>
              <Th>Next</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <Td key={j}>
                        <div className="h-4 animate-pulse rounded bg-muted" />
                      </Td>
                    ))}
                  </tr>
                ))
              : rows.map((c) => (
                  <tr
                    key={c._id}
                    onClick={() => onOpen(c._id)}
                    className="cursor-pointer hover:bg-surface"
                  >
                    <Td>
                      <div className="font-medium">{c.name || "—"}</div>
                      <div className="text-[11.5px] text-muted-foreground">{c.phone}</div>
                    </Td>
                    <Td>
                      <CategoryBadges categories={c.categories} />
                    </Td>
                    <Td className="text-right tabular-nums">{c.totalBookings}</Td>
                    <Td className="text-right tabular-nums">{inr(c.totalSpent)}</Td>
                    <Td
                      className={`text-right tabular-nums ${c.outstanding > 0 ? "font-semibold text-warning" : "text-muted-foreground"}`}
                    >
                      {c.outstanding > 0 ? inr(c.outstanding) : "—"}
                    </Td>
                    <Td className="text-muted-foreground">
                      {c.lastBookingDate ? (
                        <>
                          {fmtDay(c.lastBookingDate)}
                          <span className="ml-1 text-[11px]">({c.daysSinceLastBooking}d ago)</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td className="text-muted-foreground">{fmtDay(c.nextBookingDate)}</Td>
                  </tr>
                ))}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-10 text-center text-[13px] text-muted-foreground">
                  No customers match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Panel>
      {data && data.pages > 1 && (
        <div className="flex items-center justify-between text-[12.5px] text-muted-foreground">
          <span>
            {data.total} customers · page {data.page} of {data.pages}
            {isFetching && <Loader2 className="ml-2 inline size-3.5 animate-spin" />}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= data.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Retention ────────────────────────────────────────────────────────────────

interface RetentionResponse {
  settings: { inactiveDays: number };
  totals: { customers: number; withBookings: number; active30: number };
  recentlyActive: Customer[];
  lapsed: Customer[];
  mostFrequent: Customer[];
  highestSpending: Customer[];
  frequency: { key: string; label: string; count: number }[];
}

function Retention({ onOpen }: { onOpen: (id: string) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-customers", "retention"],
    queryFn: () => adminFetch<RetentionResponse>("/admin/customers/retention"),
  });
  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const list = (
    title: string,
    rows: Customer[],
    value: (c: Customer) => string,
    hint: string,
    copyable = false,
  ) => (
    <Panel className="overflow-hidden">
      <PanelHead
        title={title}
        right={
          copyable && rows.length ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 text-[12px]"
              onClick={() =>
                copyText(contactLines(rows), `Copied ${rows.length} contact(s) for follow-up`)
              }
            >
              <Copy className="size-3.5" /> Copy contacts
            </Button>
          ) : null
        }
      />
      <p className="border-b px-4 py-2 text-[11.5px] text-muted-foreground">{hint}</p>
      {rows.length === 0 ? (
        <p className="p-6 text-center text-[12.5px] text-muted-foreground">Nobody here yet.</p>
      ) : (
        <ul className="divide-y">
          {rows.map((c) => (
            <li key={c._id}>
              <button
                onClick={() => onOpen(c._id)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium">{c.name || "Customer"}</div>
                  <div className="text-[11.5px] text-muted-foreground">{c.phone}</div>
                </div>
                <span className="shrink-0 text-right text-[12.5px] font-semibold tabular-nums">
                  {value(c)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat label="Customers" value={String(data.totals.customers)} />
        <Stat label="Booked in last 30 days" value={String(data.totals.active30)} />
        {data.frequency.map((f) => (
          <Stat key={f.key} label={f.label} value={String(f.count)} />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {list(
          "Haven't booked recently",
          data.lapsed,
          (c) => `${c.daysSinceLastBooking} days ago`,
          "Used to book, nothing upcoming. Call or WhatsApp them — most recently lapsed first (easiest to win back).",
          true,
        )}
        {list(
          "Recently active",
          data.recentlyActive,
          (c) => (c.daysSinceLastBooking === 0 ? "today" : `${c.daysSinceLastBooking}d ago`),
          "Played in the last 14 days.",
          true,
        )}
        {list(
          "Most frequent",
          data.mostFrequent,
          (c) => `${c.bookingsLast90} in 90 days`,
          "Your regulars — keep them happy.",
          true,
        )}
        {list(
          "Highest spending",
          data.highestSpending,
          (c) => inr(c.totalSpent),
          "Lifetime money paid.",
          true,
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Panel className="p-3">
      <div className="text-[11.5px] leading-tight text-muted-foreground">{label}</div>
      <div className={`mt-1 text-[18px] font-semibold tabular-nums ${tone ?? ""}`}>{value}</div>
    </Panel>
  );
}

// ─── Profile ──────────────────────────────────────────────────────────────────

interface ProfileResponse {
  customer: Customer;
  bookings: {
    _id: string;
    booking_ref: string;
    date: string;
    service: string;
    pitch: string;
    time_slots: { start_time: string; end_time: string }[];
    status: string;
    total_payable: number;
    amount_paid: number;
    balance: number;
    payment_status: string;
    recurring: string | null;
  }[];
  payments: {
    _id: string;
    kind: string;
    amount: number;
    method: string;
    paidAt: string;
    booking_ref: string | null;
    note?: string;
  }[];
  notes: {
    _id: string;
    body: string;
    createdAt: string;
    author?: { _id: string; name?: string } | null;
  }[];
  recurring: {
    _id: string;
    title: string;
    status: string;
    frequency: string;
    weekdays: number[];
    pitch?: { name: string };
    time_slots: { start_time: string; end_time: string }[];
    start_date: string;
    end_date: string;
  }[];
}

export function CustomerProfile({
  customerId,
  onClose,
}: {
  customerId: string | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { isAdmin, data: licence } = useSubscription();
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [editing, setEditing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-customer", customerId],
    queryFn: () => adminFetch<ProfileResponse>(`/admin/customers/${customerId}`),
    enabled: !!customerId,
  });
  const c = data?.customer;

  const addNote = async () => {
    if (!note.trim()) return;
    setSavingNote(true);
    try {
      await adminFetch(`/admin/customers/${customerId}/notes`, {
        method: "POST",
        body: JSON.stringify({ body: note }),
      });
      setNote("");
      qc.invalidateQueries({ queryKey: ["admin-customer", customerId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add note");
    } finally {
      setSavingNote(false);
    }
  };

  const deleteNote = async (id: string) => {
    try {
      await adminFetch(`/admin/customers/${customerId}/notes/${id}`, { method: "DELETE" });
      qc.invalidateQueries({ queryKey: ["admin-customer", customerId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete note");
    }
  };

  return (
    <Sheet open={!!customerId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:w-[600px] sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle>{c?.name || "Customer"}</SheetTitle>
        </SheetHeader>
        {isLoading || !data || !c ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 px-4 pb-6">
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              <span className="font-mono">{c.phone}</span>
              {c.email && <span className="text-muted-foreground">· {c.email}</span>}
              <button
                onClick={() => copyText(contactLines([c]), "Contact copied")}
                title="Copy contact"
                className="text-primary"
              >
                <Copy className="size-3.5" />
              </button>
              <button
                onClick={() => setEditing(true)}
                title="Edit contact details"
                className="text-muted-foreground hover:text-foreground"
              >
                <Pencil className="size-3.5" />
              </button>
              <div className="ml-auto">
                <CategoryBadges categories={c.categories} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Stat label="Bookings" value={String(c.totalBookings)} />
              <Stat label="Total spent" value={inr(c.totalSpent)} />
              <Stat
                label="Dues"
                value={c.outstanding > 0 ? inr(c.outstanding) : "—"}
                tone={c.outstanding > 0 ? "text-warning" : ""}
              />
              <Stat label="Last booking" value={fmtDay(c.lastBookingDate)} />
              <Stat label="Next booking" value={fmtDay(c.nextBookingDate)} />
              <Stat
                label="Books every"
                value={c.avgDaysBetween ? `${c.avgDaysBetween} days` : "—"}
              />
            </div>
            <p className="text-[11.5px] text-muted-foreground">
              Customer since {fmtDay(c.joinedAt)} · {c.bookingsLast90} booking(s) in the last 90
              days
              {c.cancelledBookings ? ` · ${c.cancelledBookings} cancelled` : ""}
            </p>

            <Tabs defaultValue="bookings">
              <TabsList className="w-full">
                <TabsTrigger value="bookings">Bookings ({data.bookings.length})</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
                <TabsTrigger value="notes">Notes ({data.notes.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="bookings">
                {data.bookings.length === 0 ? (
                  <p className="py-6 text-center text-[12.5px] text-muted-foreground">
                    No bookings yet.
                  </p>
                ) : (
                  <ul className="divide-y rounded-md border">
                    {data.bookings.map((b) => (
                      <li
                        key={b._id}
                        className="flex items-center justify-between gap-2 px-3 py-2 text-[12.5px]"
                      >
                        <div className="min-w-0">
                          <div className="font-medium">
                            {fmtDay(b.date)} ·{" "}
                            {b.time_slots.map((s) => to12(s.start_time)).join(", ")}
                            {b.recurring && (
                              <span className="ml-1.5 rounded bg-secondary px-1 text-[10.5px]">
                                recurring
                              </span>
                            )}
                          </div>
                          <div className="truncate text-[11.5px] text-muted-foreground">
                            {b.booking_ref} · {b.pitch || "—"} · {b.service}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <StatusBadge
                            status={
                              b.status === "cancelled" || b.status === "expired"
                                ? b.status[0]!.toUpperCase() + b.status.slice(1)
                                : (PAYMENT_STATUS_LABELS[b.payment_status] ?? b.payment_status)
                            }
                          />
                          <div className="mt-0.5 text-[11.5px] tabular-nums text-muted-foreground">
                            {inr(b.amount_paid)} / {inr(b.total_payable)}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {data.recurring.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <div className="text-[11.5px] font-medium text-muted-foreground">
                      Recurring schedules
                    </div>
                    {data.recurring.map((r) => (
                      <div key={r._id} className="rounded-md border px-3 py-2 text-[12.5px]">
                        {r.title || "Schedule"} · {r.pitch?.name} ·{" "}
                        {r.time_slots.map((s) => to12(s.start_time)).join(", ")} ·{" "}
                        {fmtDay(r.start_date, false)}–{fmtDay(r.end_date)} ·{" "}
                        <span className="capitalize">{r.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="payments">
                {data.payments.length === 0 ? (
                  <p className="py-6 text-center text-[12.5px] text-muted-foreground">
                    No payments recorded.
                  </p>
                ) : (
                  <ul className="divide-y rounded-md border">
                    {data.payments.map((p) => (
                      <li
                        key={p._id}
                        className="flex items-center justify-between px-3 py-2 text-[12.5px]"
                      >
                        <div>
                          <div className="font-medium">
                            {p.kind === "refund" ? "Refund" : "Payment"} ·{" "}
                            {METHOD_LABELS[p.method] ?? p.method}
                          </div>
                          <div className="text-[11.5px] text-muted-foreground">
                            {fmtDateTime(p.paidAt)} · {p.booking_ref ?? p.note ?? "—"}
                          </div>
                        </div>
                        <span
                          className={`font-semibold tabular-nums ${p.kind === "refund" ? "text-destructive" : "text-success"}`}
                        >
                          {p.kind === "refund" ? "−" : "+"}
                          {inr(p.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="notes">
                <div className="space-y-2">
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="Internal note — e.g. prefers evening slots, team captain of FC Tigers"
                  />
                  <div className="flex justify-end">
                    <Button size="sm" onClick={addNote} disabled={savingNote || !note.trim()}>
                      {savingNote && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}Add note
                    </Button>
                  </div>
                  <ul className="space-y-2">
                    {data.notes.map((n) => (
                      <li
                        key={n._id}
                        className="rounded-md border bg-surface px-3 py-2 text-[12.5px]"
                      >
                        <p className="whitespace-pre-wrap">{n.body}</p>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>
                            {n.author?.name ?? "Team"} · {fmtDateTime(n.createdAt)}
                          </span>
                          {(isAdmin || n.author?._id === licence?.me?.id) && (
                            <button
                              onClick={() => deleteNote(n._id)}
                              title="Delete note"
                              className="hover:text-destructive"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </TabsContent>
            </Tabs>

            <EditCustomerDialog open={editing} onClose={() => setEditing(false)} customer={c} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function EditCustomerDialog({
  open,
  onClose,
  customer,
}: {
  open: boolean;
  onClose: () => void;
  customer: Customer;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(customer.name);
  const [email, setEmail] = useState(customer.email);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) {
      setName(customer.name);
      setEmail(customer.email);
    }
  }, [open, customer]);

  const save = async () => {
    setSaving(true);
    try {
      await adminFetch(`/admin/customers/${customer._id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, email }),
      });
      toast.success("Customer updated");
      qc.invalidateQueries({ queryKey: ["admin-customer"] });
      qc.invalidateQueries({ queryKey: ["admin-customers"] });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle>Contact details</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="optional"
            />
          </div>
          <p className="text-[11.5px] text-muted-foreground">
            The phone number ({customer.phone}) is how the customer signs in, so it can't be changed
            here.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddCustomerDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) setForm({ name: "", phone: "", email: "" });
  }, [open]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await adminFetch<{ customer: { _id: string } }>("/admin/customers", {
        method: "POST",
        body: JSON.stringify(form),
      });
      toast.success("Customer added");
      qc.invalidateQueries({ queryKey: ["admin-customers"] });
      onClose();
      onCreated(res.customer._id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add customer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle>Add customer</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Mobile number</Label>
            <Input
              value={form.phone}
              inputMode="numeric"
              maxLength={10}
              onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })}
              placeholder="98765 43210"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Email (optional)</Label>
            <Input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-1.5 size-4 animate-spin" />}Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
