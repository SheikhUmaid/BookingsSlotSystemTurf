import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useEffect } from "react";
import { Eye, Search, Loader2 } from "lucide-react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { inr, to12 } from "@/lib/turf-data";
import { PageHeader, Panel, StatusBadge, Td, Th, selectCls } from "@/components/turf/ui-bits";
import { pageMeta } from "@/lib/meta";
import { adminFetch } from "@/lib/api";

export const Route = createFileRoute("/bookings")({
  head: () => pageMeta("Bookings", "Search, filter and review every turf booking."),
  component: BookingsPage,
});

// ─── API types ────────────────────────────────────────────────────────────────

interface ApiCustomer {
  _id: string;
  name: string;
  phone: string;
  email?: string;
}

interface ApiService {
  _id: string;
  name: string;
  description?: string;
  icon?: string;
}

interface ApiTimeSlot {
  start_time: string; // "HH:MM"
  end_time: string;
}

export interface ApiBooking {
  _id: string;
  booking_ref: string;
  customer: ApiCustomer;
  service: ApiService;
  time_slots: ApiTimeSlot[];
  date: string; // ISO date string
  status: string; // "pending" | "partial" | "paid" | "cancelled" | "expired"
  total_payable: number;
  amount_paid: number;
  payment_type: string;
  payment_id?: string;
  payment_order_id?: string;
  expires_at?: string;
  createdAt: string;
}

interface BookingsListResponse {
  bookings: ApiBooking[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

interface ServicesListResponse {
  services: ApiService[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** "pending" → "Pending" */
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Format list of time slots as "10:00 AM – 11:00 AM, 11:00 AM – 12:00 PM" */
const slotLabel = (slots: ApiTimeSlot[]) =>
  slots.map((s) => `${to12(s.start_time)} – ${to12(s.end_time)}`).join(", ");

/** Format a booking's date for display: "18 Nov 2026" */
const fmtBookingDate = (iso: string) => {
  // iso may be "2026-11-18T00:00:00.000Z" or "2026-11-18"
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

// ─── Page ─────────────────────────────────────────────────────────────────────

function BookingsPage() {
  const [q, setQ] = useState("");
  const [date, setDate] = useState("");
  const [service, setService] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<ApiBooking | null>(null);

  // Accumulate rows across pages for "Load more"
  const [allRows, setAllRows] = useState<ApiBooking[]>([]);

  const LIMIT = 25;

  // ── Fetch services for the filter dropdown ────────────────────────────────
  const { data: servicesData } = useQuery({
    queryKey: ["admin-services"],
    queryFn: () => adminFetch<ServicesListResponse | ApiService[]>("/admin/services"),
    staleTime: 5 * 60 * 1000,
  });
  const serviceOptions = Array.isArray(servicesData) ? servicesData : (servicesData?.services ?? []);

  // ── Fetch bookings ─────────────────────────────────────────────────────────
  const params = new URLSearchParams({
    ...(q ? { search: q } : {}),
    ...(date ? { date } : {}),
    ...(service ? { service } : {}),
    ...(status ? { status: status.toLowerCase() } : {}),
    page: String(page),
    limit: String(LIMIT),
    sort: "createdAt",
    order: "desc",
  });

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["admin-bookings", q, date, service, status, page],
    queryFn: async () => {
      const result = await adminFetch<BookingsListResponse>(`/admin/bookings?${params}`);
      // Merge new page results into allRows
      setAllRows((prev) => {
        if (page === 1) return result.bookings;
        // Avoid duplicates
        const ids = new Set(prev.map((b) => b._id));
        return [...prev, ...result.bookings.filter((b) => !ids.has(b._id))];
      });
      return result;
    },
    placeholderData: keepPreviousData,
  });

  // Reset to page 1 whenever filters change
  const resetAndFilter = useCallback((fn: () => void) => {
    fn();
    setPage(1);
    setAllRows([]);
  }, []);

  const total = data?.total ?? 0;
  const hasMore = allRows.length < total;

  // ── Detail query (re-fetch when opening a booking for fresh data) ──────────
  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ["admin-booking-detail", open?._id],
    queryFn: () => adminFetch<{ booking: ApiBooking }>(`/admin/bookings/${open!._id}`),
    enabled: !!open,
    staleTime: 30_000,
  });
  const detail = detailData?.booking ?? open;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader title="Bookings" desc={isLoading ? "Loading…" : `${total} bookings`} />
      <Panel>
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => resetAndFilter(() => setQ(e.target.value))}
              placeholder="Search ID, name or phone"
              className={selectCls + " w-full pl-8"}
            />
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => resetAndFilter(() => setDate(e.target.value))}
            className={selectCls}
            aria-label="Date"
          />
          <select
            value={service}
            onChange={(e) => resetAndFilter(() => setService(e.target.value))}
            className={selectCls}
          >
            <option value="">All pitches</option>
            {serviceOptions.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => resetAndFilter(() => setStatus(e.target.value))}
            className={selectCls}
          >
            <option value="">All statuses</option>
            {["Pending", "Partial", "Paid", "Cancelled", "Expired"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          {(q || date || service || status) && (
            <button
              onClick={() =>
                resetAndFilter(() => {
                  setQ("");
                  setDate("");
                  setService("");
                  setStatus("");
                })
              }
              className="text-[12.5px] font-medium text-primary"
            >
              Clear
            </button>
          )}
          {isFetching && (
            <Loader2 className="ml-auto size-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Error state */}
        {isError && (
          <div className="p-6 text-center text-[13px] text-destructive">
            Failed to load bookings:{" "}
            {error instanceof Error ? error.message : "Unknown error"}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap">
            <thead>
              <tr>
                <Th>Booking ID</Th>
                <Th>Customer</Th>
                <Th>Pitch</Th>
                <Th>Date</Th>
                <Th>Time slots</Th>
                <Th className="text-right">Total</Th>
                <Th className="text-right">Paid</Th>
                <Th>Status</Th>
                <Th>Payment</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {isLoading && allRows.length === 0
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 10 }).map((_, j) => (
                        <Td key={j}>
                          <div className="h-3 animate-pulse rounded bg-muted" />
                        </Td>
                      ))}
                    </tr>
                  ))
                : allRows.map((b) => (
                    <tr
                      key={b._id}
                      className="cursor-pointer hover:bg-surface"
                      onClick={() => setOpen(b)}
                    >
                      <Td className="font-medium text-primary">{b.booking_ref}</Td>
                      <Td>
                        <div className="font-medium">{b.customer?.name}</div>
                        <div className="text-[11.5px] text-muted-foreground">
                          {b.customer?.phone}
                        </div>
                      </Td>
                      <Td>{b.service?.name ?? "—"}</Td>
                      <Td>{fmtBookingDate(b.date)}</Td>
                      <Td className="text-muted-foreground">
                        {b.time_slots?.length ? slotLabel(b.time_slots) : "—"}
                      </Td>
                      <Td className="text-right font-medium">{inr(b.total_payable)}</Td>
                      <Td className="text-right">{inr(b.amount_paid)}</Td>
                      <Td>
                        <StatusBadge status={capitalize(b.status)} />
                      </Td>
                      <Td>
                        <StatusBadge status={capitalize(b.payment_type ?? "")} />
                      </Td>
                      <Td>
                        <Eye className="size-4 text-muted-foreground" />
                      </Td>
                    </tr>
                  ))}
            </tbody>
          </table>
          {!isLoading && allRows.length === 0 && !isError && (
            <div className="p-10 text-center text-[13px] text-muted-foreground">
              No bookings found.
            </div>
          )}
        </div>

        {/* Load more */}
        {hasMore && (
          <div className="border-t p-3 text-center">
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={isFetching}
              className="text-[13px] font-medium text-primary disabled:opacity-50"
            >
              {isFetching ? "Loading…" : `Load more (${total - allRows.length} remaining)`}
            </button>
          </div>
        )}
      </Panel>

      {/* Detail sheet */}
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-[380px] sm:max-w-[380px]">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle>{detail?.booking_ref ?? open.booking_ref}</SheetTitle>
              </SheetHeader>
              {detailLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : detail ? (
                <div className="space-y-5 px-4 text-[13px]">
                  <StatusBadge status={capitalize(detail.status)} />
                  <Section
                    title="Customer"
                    rows={[
                      ["Name", detail.customer?.name ?? "—"],
                      ["Phone", detail.customer?.phone ?? "—"],
                      ["Email", detail.customer?.email ?? "—"],
                    ]}
                  />
                  <Section
                    title="Booking"
                    rows={[
                      ["Pitch", detail.service?.name ?? "—"],
                      ["Date", fmtBookingDate(detail.date)],
                      ["Slots", detail.time_slots?.length ? slotLabel(detail.time_slots) : "—"],
                    ]}
                  />
                  <Section
                    title="Payment"
                    rows={[
                      ["Total payable", inr(detail.total_payable)],
                      ["Amount paid", inr(detail.amount_paid)],
                      ["Balance", inr(detail.total_payable - detail.amount_paid)],
                      ["Type", capitalize(detail.payment_type ?? "")],
                      ["Order ID", detail.payment_order_id ?? "—"],
                      ["Payment ID", detail.payment_id ?? "—"],
                    ]}
                  />
                </div>
              ) : null}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Section({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div>
      <div className="mb-2 text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <div className="divide-y rounded-md border">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 px-3 py-2">
            <span className="text-muted-foreground">{k}</span>
            <span className="truncate text-right font-medium">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
