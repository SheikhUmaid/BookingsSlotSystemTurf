import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CircleDot, Goal, Pencil, Plus, Target, Trash2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { services as seed, type Service } from "@/lib/turf-data";
import { BackendNote, PageHeader, Panel, selectCls } from "@/components/turf/ui-bits";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/services")({
  head: () => pageMeta("Services / Pitches", "Manage the pitches and courts customers can book."),
  component: ServicesPage,
});

const icons: Record<string, typeof Goal> = { goal: Goal, trophy: Trophy, target: Target, "circle-dot": CircleDot };

function ServicesPage() {
  const [list, setList] = useState<Service[]>(seed);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", icon: "goal" });

  const save = () => {
    if (!form.name.trim()) { toast.error("Service name is required"); return; }
    setList([...list, { id: `s${Date.now()}`, ...form }]);
    setOpen(false);
    setForm({ name: "", description: "", icon: "goal" });
    toast.success("Service added (prototype only)");
  };

  return (
    <div>
      <PageHeader title="Services / Pitches" desc={`${list.length} services`} actions={<Button size="sm" onClick={() => setOpen(true)}><Plus className="size-4" /> Add Service</Button>} />
      <BackendNote>The Service model stores name, description and icon. Editing and deleting need backend endpoints and are shown here as design only.</BackendNote>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {list.map((s) => {
          const I = icons[s.icon] ?? Goal;
          return (
            <Panel key={s.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="grid size-10 place-items-center rounded-lg bg-primary-soft text-primary"><I className="size-5" /></div>
                <div className="flex gap-1">
                  <button title="Requires backend" onClick={() => toast("Editing requires backend support")} className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-secondary"><Pencil className="size-3.5" /></button>
                  <button title="Requires backend" onClick={() => toast("Deleting requires backend support")} className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-danger-soft hover:text-destructive"><Trash2 className="size-3.5" /></button>
                </div>
              </div>
              <h3 className="mt-3 text-[14px] font-semibold">{s.name}</h3>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{s.description}</p>
              <div className="mt-3 text-[11.5px] text-muted-foreground">Icon: <code className="rounded bg-surface px-1">{s.icon}</code></div>
            </Panel>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle>Add Service</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Football Turf C" /></div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
            <div className="space-y-1.5"><Label>Icon</Label>
              <select value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className={selectCls + " h-9 w-full"}>
                {Object.keys(icons).map((k) => <option key={k}>{k}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save Service</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
