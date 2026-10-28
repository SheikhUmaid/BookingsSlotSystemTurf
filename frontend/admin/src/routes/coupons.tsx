import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { coupons as seed, type Coupon } from "@/lib/turf-data";
import { BackendNote, PageHeader, Panel, StatusBadge, Td, Th } from "@/components/turf/ui-bits";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/coupons")({
  head: () => pageMeta("Coupons", "Create and track percentage discount coupons."),
  component: CouponsPage,
});

const empty = { code: "", discount: "", validFrom: "", validUntil: "", usageLimit: "", active: true };

function CouponsPage() {
  const [list, setList] = useState<Coupon[]>(seed);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(empty);

  const save = () => {
    const d = Number(f.discount);
    if (!/^[A-Z0-9]{3,20}$/.test(f.code)) { toast.error("Code must be 3–20 letters/numbers"); return; }
    if (!(d > 0 && d <= 100)) { toast.error("Discount must be between 1 and 100%"); return; }
    if (!f.validFrom || !f.validUntil || f.validUntil < f.validFrom) { toast.error("Check the validity dates"); return; }
    setList([{ code: f.code, discount: d, validFrom: f.validFrom, validUntil: f.validUntil, usageLimit: Number(f.usageLimit) || 0, used: 0, active: f.active }, ...list]);
    setOpen(false); setF(empty);
    toast.success(`Coupon ${f.code} created`);
  };
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div>
      <PageHeader title="Coupons" desc="Percentage discounts applied at checkout." actions={<Button size="sm" onClick={() => setOpen(true)}><Plus className="size-4" /> Create Coupon</Button>} />
      <BackendNote>Coupon creation and verification exist in the backend. Listing, editing and deactivation need additional backend support.</BackendNote>
      <Panel className="overflow-x-auto">
        <table className="w-full whitespace-nowrap">
          <thead><tr><Th>Code</Th><Th className="text-right">Discount</Th><Th>Valid from</Th><Th>Valid until</Th><Th>Usage</Th><Th>Status</Th></tr></thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.code} className="hover:bg-surface">
                <Td><code className="rounded border border-dashed border-primary/40 bg-primary-soft px-2 py-0.5 text-[12.5px] font-semibold text-primary-soft-foreground">{c.code}</code></Td>
                <Td className="text-right font-semibold">{c.discount}%</Td>
                <Td>{fmt(c.validFrom)}</Td>
                <Td>{fmt(c.validUntil)}</Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary" style={{ width: `${Math.min(100, (c.used / (c.usageLimit || 1)) * 100)}%` }} /></div>
                    <span className="text-[12px] text-muted-foreground">{c.used} / {c.usageLimit}</span>
                  </div>
                </Td>
                <Td><StatusBadge status={c.active ? "Active" : "Inactive"} /></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle>Create Coupon</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5"><Label>Coupon code</Label><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase().replace(/\s/g, "") })} placeholder="SUMMER15" /></div>
            <div className="space-y-1.5"><Label>Discount (%)</Label><Input type="number" min={1} max={100} value={f.discount} onChange={(e) => setF({ ...f, discount: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Usage limit</Label><Input type="number" min={1} value={f.usageLimit} onChange={(e) => setF({ ...f, usageLimit: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Valid from</Label><Input type="date" value={f.validFrom} onChange={(e) => setF({ ...f, validFrom: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Valid until</Label><Input type="date" value={f.validUntil} onChange={(e) => setF({ ...f, validUntil: e.target.value })} /></div>
            <label className="col-span-2 flex items-center justify-between rounded-md border px-3 py-2 text-[13px]">Active <Switch checked={f.active} onCheckedChange={(v) => setF({ ...f, active: v })} /></label>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Create Coupon</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
