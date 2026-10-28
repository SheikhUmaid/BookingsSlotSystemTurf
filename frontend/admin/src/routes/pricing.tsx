import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inr, slotCategories, timeSlots, to12, type TimeSlot } from "@/lib/turf-data";
import { BackendNote, PageHeader, Panel, Td, Th, selectCls } from "@/components/turf/ui-bits";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/pricing")({
  head: () => pageMeta("Time Slots & Pricing", "Recurring slot definitions and hourly prices by session."),
  component: PricingPage,
});

function PricingPage() {
  const [edit, setEdit] = useState<TimeSlot | "new" | null>(null);
  return (
    <div>
      <PageHeader title="Time Slots & Pricing" desc="Recurring slot definitions used for every calendar date." actions={<Button size="sm" onClick={() => setEdit("new")}><Plus className="size-4" /> Add Time Slot</Button>} />
      <BackendNote>Slot creation and price updates are target designs — the backend doesn't expose these workflows yet, so changes here aren't saved.</BackendNote>
      <div className="grid gap-4 lg:grid-cols-2">
        {slotCategories.map((c) => {
          const rows = timeSlots.filter((s) => s.category === c);
          return (
            <Panel key={c}>
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h3 className="text-[13.5px] font-semibold">{c}</h3>
                <span className="text-[12px] text-muted-foreground">{rows.length} slots · from {inr(Math.min(...rows.map((r) => r.price)))}</span>
              </div>
              <table className="w-full">
                <thead><tr><Th>Start</Th><Th>End</Th><Th className="text-right">Price / hr</Th><Th className="w-12" /></tr></thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.id} className="hover:bg-surface">
                      <Td className="font-medium">{to12(s.start)}</Td>
                      <Td>{to12(s.end)}</Td>
                      <Td className="text-right font-semibold">{inr(s.price)}</Td>
                      <Td><button aria-label="Edit price" onClick={() => setEdit(s)} className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-secondary"><Pencil className="size-3.5" /></button></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          );
        })}
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>{edit === "new" ? "Add Time Slot" : "Edit Price"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Start time</Label><Input type="time" defaultValue={edit && edit !== "new" ? edit.start : ""} disabled={edit !== "new"} /></div>
            <div className="space-y-1.5"><Label>End time</Label><Input type="time" defaultValue={edit && edit !== "new" ? edit.end : ""} disabled={edit !== "new"} /></div>
            <div className="col-span-2 space-y-1.5"><Label>Category</Label>
              <select defaultValue={edit && edit !== "new" ? edit.category : slotCategories[0]} disabled={edit !== "new"} className={selectCls + " h-9 w-full"}>
                {slotCategories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2 space-y-1.5"><Label>Price (₹)</Label><Input type="number" min={0} defaultValue={edit && edit !== "new" ? edit.price : ""} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button>
            <Button onClick={() => { setEdit(null); toast("Not saved — requires backend support"); }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
