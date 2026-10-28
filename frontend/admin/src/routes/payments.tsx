import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { inr } from "@/lib/turf-data";
import { BackendNote, PageHeader, Panel, StatusBadge, Td, Th, selectCls } from "@/components/turf/ui-bits";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/payments")({
  head: () => pageMeta("Payments", "Razorpay orders, collected amounts and outstanding balances."),
  component: PaymentsPage,
});

function PaymentsPage() {
  const { bookings } = useStore();
  const [type, setType] = useState("");
  const live = bookings.filter((b) => b.status !== "Cancelled" && b.status !== "Expired");
  const rows = live.filter((b) => !type || b.paymentType === type).slice(0, 40);
  const collected = live.reduce((a, b) => a + b.paid, 0);
  const outstanding = live.reduce((a, b) => a + b.total - b.paid, 0);

  return (
    <div>
      <PageHeader title="Payments" desc="Payment details recorded on each booking." />
      <BackendNote>Razorpay order creation and payment-capture webhooks are integrated. Refunds and settlement reports are not available.</BackendNote>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {[["Collected", inr(collected), "text-success"], ["Outstanding balance", inr(outstanding), "text-warning"], ["Partial payments", String(live.filter((b) => b.paymentType === "Partial").length), ""]].map(([l, v, c]) => (
          <Panel key={l} className="p-4"><div className="text-[12.5px] text-muted-foreground">{l}</div><div className={`mt-1 text-[20px] font-semibold ${c}`}>{v}</div></Panel>
        ))}
      </div>
      <Panel className="overflow-x-auto">
        <div className="flex items-center justify-between border-b p-3">
          <span className="text-[13.5px] font-semibold">Booking payments</span>
          <select value={type} onChange={(e) => setType(e.target.value)} className={selectCls}><option value="">All types</option><option>Full</option><option>Partial</option></select>
        </div>
        <table className="w-full whitespace-nowrap">
          <thead><tr><Th>Booking</Th><Th>Order ID</Th><Th>Payment ID</Th><Th className="text-right">Paid</Th><Th className="text-right">Total payable</Th><Th>Type</Th><Th>Status</Th></tr></thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id} className="hover:bg-surface">
                <Td className="font-medium text-primary">{b.id}</Td>
                <Td className="font-mono text-[12px] text-muted-foreground">{b.orderId}</Td>
                <Td className="font-mono text-[12px] text-muted-foreground">{b.paymentId ?? "—"}</Td>
                <Td className="text-right font-semibold">{inr(b.paid)}</Td>
                <Td className="text-right">{inr(b.total)}</Td>
                <Td><StatusBadge status={b.paymentType} /></Td>
                <Td><StatusBadge status={b.status} /></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
