import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, Search } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useStore } from "@/lib/store";
import { inr, services, timeSlots, to12, type Booking } from "@/lib/turf-data";
import { PageHeader, Panel, StatusBadge, Td, Th, selectCls } from "@/components/turf/ui-bits";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/bookings")({
  head: () => pageMeta("Bookings", "Search, filter and review every turf booking."),
  component: BookingsPage,
});

const svc = (id: string) => services.find((s) => s.id === id)!;
const slotLabel = (b: Booking) => b.slotIds.map((id) => { const s = timeSlots.find((t) => t.id === id)!; return `${to12(s.start)} – ${to12(s.end)}`; }).join(", ");

function BookingsPage() {
  const { bookings } = useStore();
  const [q, setQ] = useState("");
  const [date, setDate] = useState("");
  const [service, setService] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState<Booking | null>(null);
  const [limit, setLimit] = useState(25);

  const rows = bookings.filter((b) =>
    (!q || `${b.id} ${b.customer} ${b.phone}`.toLowerCase().includes(q.toLowerCase())) &&
    (!date || b.date === date) && (!service || b.serviceId === service) && (!status || b.status === status));

  return (
    <div>
      <PageHeader title="Bookings" desc={`${rows.length} bookings`} />
      <Panel>
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ID, name or phone" className={selectCls + " w-full pl-8"} />
          </div>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={selectCls} aria-label="Date" />
          <select value={service} onChange={(e) => setService(e.target.value)} className={selectCls}>
            <option value="">All pitches</option>
            {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
            <option value="">All statuses</option>
            {["Pending", "Partial", "Paid", "Cancelled", "Expired"].map((s) => <option key={s}>{s}</option>)}
          </select>
          {(q || date || service || status) && (
            <button onClick={() => { setQ(""); setDate(""); setService(""); setStatus(""); }} className="text-[12.5px] font-medium text-primary">Clear</button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap">
            <thead><tr><Th>Booking ID</Th><Th>Customer</Th><Th>Pitch</Th><Th>Date</Th><Th>Time slots</Th><Th className="text-right">Total</Th><Th className="text-right">Paid</Th><Th>Status</Th><Th>Payment</Th><Th /></tr></thead>
            <tbody>
              {rows.slice(0, limit).map((b) => (
                <tr key={b.id} className="cursor-pointer hover:bg-surface" onClick={() => setOpen(b)}>
                  <Td className="font-medium text-primary">{b.id}</Td>
                  <Td><div className="font-medium">{b.customer}</div><div className="text-[11.5px] text-muted-foreground">+91 {b.phone}</div></Td>
                  <Td>{svc(b.serviceId).name}</Td>
                  <Td>{new Date(b.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</Td>
                  <Td className="text-muted-foreground">{slotLabel(b)}</Td>
                  <Td className="text-right font-medium">{inr(b.total)}</Td>
                  <Td className="text-right">{inr(b.paid)}</Td>
                  <Td><StatusBadge status={b.status} /></Td>
                  <Td><StatusBadge status={b.paymentType} /></Td>
                  <Td><Eye className="size-4 text-muted-foreground" /></Td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <div className="p-10 text-center text-[13px] text-muted-foreground">No bookings found.</div>}
        </div>
        {rows.length > limit && (
          <div className="border-t p-3 text-center">
            <button onClick={() => setLimit(limit + 25)} className="text-[13px] font-medium text-primary">Load more ({rows.length - limit} remaining)</button>
          </div>
        )}
      </Panel>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-[380px] sm:max-w-[380px]">
          {open && (
            <>
              <SheetHeader><SheetTitle>{open.id}</SheetTitle></SheetHeader>
              <div className="space-y-5 px-4 text-[13px]">
                <StatusBadge status={open.status} />
                <Section title="Customer" rows={[["Name", open.customer], ["Phone", `+91 ${open.phone}`]]} />
                <Section title="Booking" rows={[["Pitch", svc(open.serviceId).name], ["Date", new Date(open.date).toDateString()], ["Slots", slotLabel(open)]]} />
                <Section title="Payment" rows={[["Total payable", inr(open.total)], ["Amount paid", inr(open.paid)], ["Balance", inr(open.total - open.paid)], ["Type", open.paymentType], ["Order ID", open.orderId], ["Payment ID", open.paymentId ?? "—"]]} />
              </div>
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
      <div className="mb-2 text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="divide-y rounded-md border">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 px-3 py-2"><span className="text-muted-foreground">{k}</span><span className="truncate text-right font-medium">{v}</span></div>
        ))}
      </div>
    </div>
  );
}
