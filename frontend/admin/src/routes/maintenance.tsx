import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Pencil, Plus, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, Panel, StatusBadge, selectCls } from "@/components/turf/ui-bits";
import { adminFetch, ApiError } from "@/lib/api";
import { pageMeta } from "@/lib/meta";
import { to12 } from "@/lib/turf-data";
import { usePitches } from "@/lib/usePitches";
import { MAINTENANCE_STATUS_LABELS, fmtDay, todayLocal } from "@/lib/business";
import { useSubscription } from "@/lib/useSubscription";

export const Route = createFileRoute("/maintenance")({
  head: () => pageMeta("Maintenance", "Close pitches for repairs; blocked slots can't be booked."),
  component: MaintenancePage,
});

interface Record_ {
  _id: string;
  pitch: { _id: string; name: string };
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  createdBy?: { name?: string };
}

interface Conflict {
  booking_ref: string;
  date: string;
  customer: string;
  phone: string;
  slots: string;
}

const timeRange = (r: Pick<Record_, "start_time" | "end_time">) =>
  r.start_time === "00:00" && (r.end_time === "24:00" || r.end_time === "00:00")
    ? "All day"
    : `${to12(r.start_time)} – ${r.end_time === "24:00" ? "midnight" : to12(r.end_time)}`;

function MaintenancePage() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  const qc = useQueryClient();
  const { isInactive, can } = useSubscription();
  const canEdit = can("maintenance") && !isInactive;
  const [filter, setFilter] = useState("open");
  const [editing, setEditing] = useState<Record_ | "new" | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-maintenance", filter],
    queryFn: () => adminFetch<{ maintenance: Record_[] }>(`/admin/maintenance?status=${filter}`),
    enabled: isClient,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-maintenance"] });
    qc.invalidateQueries({ queryKey: ["admin-time-slots-availability"] });
    qc.invalidateQueries({ queryKey: ["admin-month-availability"] });
  };

  const setStatus = async (r: Record_, status: string) => {
    try {
      await adminFetch(`/admin/maintenance/${r._id}`, { method: "PATCH", body: JSON.stringify({ status, acknowledge_conflicts: true }) });
      toast.success(`Marked ${MAINTENANCE_STATUS_LABELS[status]?.toLowerCase()}`);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const remove = async (r: Record_) => {
    if (!window.confirm(`Delete "${r.title}"? Its slots become bookable again.`)) return;
    try {
      await adminFetch(`/admin/maintenance/${r._id}`, { method: "DELETE" });
      toast.success("Deleted");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  return (
    <div>
      <PageHeader
        title="Maintenance"
        desc="While maintenance is scheduled or in progress, those slots are closed in the booking app and the admin panel."
        actions={
          <Button size="sm" onClick={() => setEditing("new")} disabled={!canEdit} className="gap-1.5">
            <Plus className="size-4" /> Schedule maintenance
          </Button>
        }
      />
      <div className="mb-3 flex flex-wrap gap-1.5">
        {(
          [
            ["open", "Scheduled & in progress"],
            ["completed", "Completed"],
            ["cancelled", "Cancelled"],
            ["", "All"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k || "all"}
            onClick={() => setFilter(k)}
            className={`rounded-full border px-3 py-1 text-[12px] font-medium ${filter === k ? "border-primary bg-primary-soft text-primary-soft-foreground" : "text-muted-foreground hover:bg-secondary"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Loader2 className="mx-auto mt-10 size-5 animate-spin text-muted-foreground" />
      ) : !data?.maintenance.length ? (
        <Panel className="p-10 text-center">
          <Wrench className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-2 text-[14px] font-medium">Nothing here</p>
        </Panel>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.maintenance.map((r) => {
            const blocking = r.status === "pending" || r.status === "in_progress";
            return (
              <Panel key={r._id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-semibold">{r.title}</div>
                    <div className="text-[12.5px] text-muted-foreground">{r.pitch?.name}</div>
                  </div>
                  <StatusBadge status={MAINTENANCE_STATUS_LABELS[r.status] ?? r.status} />
                </div>
                <div className="mt-2 text-[12.5px]">
                  {fmtDay(r.start_date)}
                  {r.end_date.slice(0, 10) !== r.start_date.slice(0, 10) && ` → ${fmtDay(r.end_date)}`} · {timeRange(r)}
                </div>
                {r.description && <p className="mt-1 text-[12.5px] text-muted-foreground">{r.description}</p>}
                {blocking && <p className="mt-2 text-[11.5px] font-medium text-warning">Slots in this window can't be booked.</p>}
                {canEdit && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t pt-3">
                    {r.status === "pending" && (
                      <Button size="sm" variant="outline" className="h-7 text-[12px]" onClick={() => setStatus(r, "in_progress")}>
                        Start
                      </Button>
                    )}
                    {blocking && (
                      <Button size="sm" variant="outline" className="h-7 text-[12px]" onClick={() => setStatus(r, "completed")}>
                        Mark completed
                      </Button>
                    )}
                    {blocking && (
                      <Button size="sm" variant="ghost" className="h-7 text-[12px]" onClick={() => setStatus(r, "cancelled")}>
                        Cancel
                      </Button>
                    )}
                    <div className="ml-auto flex gap-1">
                      <button title="Edit" onClick={() => setEditing(r)} className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-secondary">
                        <Pencil className="size-3.5" />
                      </button>
                      <button title="Delete" onClick={() => remove(r)} className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-danger-soft hover:text-destructive">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </Panel>
            );
          })}
        </div>
      )}
      <MaintenanceDialog value={editing} onClose={() => setEditing(null)} onSaved={refresh} />
    </div>
  );
}

function MaintenanceDialog({ value, onClose, onSaved }: { value: Record_ | "new" | null; onClose: () => void; onSaved: () => void }) {
  const { pitches } = usePitches();
  const isNew = value === "new";
  const blank = { pitch: "", title: "", description: "", start_date: todayLocal(), end_date: todayLocal(), all_day: true, start_time: "06:00", end_time: "10:00", status: "pending" };
  const [f, setF] = useState(blank);
  const [conflicts, setConflicts] = useState<Conflict[] | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!value) return;
    setConflicts(null);
    if (value === "new") setF({ ...blank, pitch: pitches[0]?._id ?? "" });
    else {
      const allDay = value.start_time === "00:00" && value.end_time === "24:00";
      setF({
        pitch: value.pitch?._id ?? "",
        title: value.title,
        description: value.description,
        start_date: value.start_date.slice(0, 10),
        end_date: value.end_date.slice(0, 10),
        all_day: allDay,
        start_time: allDay ? "06:00" : value.start_time,
        end_time: allDay ? "10:00" : value.end_time === "24:00" ? "23:59" : value.end_time,
        status: value.status,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, pitches]);

  const save = async (acknowledge = false) => {
    setSaving(true);
    try {
      const body = {
        pitch: f.pitch,
        title: f.title,
        description: f.description,
        start_date: f.start_date,
        end_date: f.end_date,
        all_day: f.all_day,
        start_time: f.all_day ? undefined : f.start_time,
        end_time: f.all_day ? undefined : f.end_time,
        ...(isNew ? {} : { status: f.status }),
        acknowledge_conflicts: acknowledge,
      };
      const res = await adminFetch<{ message: string }>(isNew ? "/admin/maintenance" : `/admin/maintenance/${(value as Record_)._id}`, {
        method: isNew ? "POST" : "PATCH",
        body: JSON.stringify(body),
      });
      toast.success(res.message);
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && (err.body as { conflicts?: Conflict[] })?.conflicts) {
        setConflicts((err.body as { conflicts: Conflict[] }).conflicts);
      } else {
        toast.error(err instanceof Error ? err.message : "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!value} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{isNew ? "Schedule maintenance" : "Edit maintenance"}</DialogTitle>
          <DialogDescription>Customers won't be able to book the affected slots while this is scheduled or in progress.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Pitch</Label>
              <select value={f.pitch} onChange={(e) => { setF({ ...f, pitch: e.target.value }); setConflicts(null); }} className={selectCls + " h-9 w-full"}>
                {pitches.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            {!isNew && (
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} className={selectCls + " h-9 w-full"}>
                  {Object.entries(MAINTENANCE_STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>What's being done</Label>
            <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Turf repair, floodlight replacement…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>From</Label>
              <Input type="date" value={f.start_date} onChange={(e) => { setF({ ...f, start_date: e.target.value, end_date: e.target.value > f.end_date ? e.target.value : f.end_date }); setConflicts(null); }} />
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <Input type="date" value={f.end_date} min={f.start_date} onChange={(e) => { setF({ ...f, end_date: e.target.value }); setConflicts(null); }} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-[13px]">
            <Switch checked={f.all_day} onCheckedChange={(v) => { setF({ ...f, all_day: v }); setConflicts(null); }} />
            Closed all day
          </label>
          {!f.all_day && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Daily from</Label>
                <Input type="time" value={f.start_time} onChange={(e) => { setF({ ...f, start_time: e.target.value }); setConflicts(null); }} />
              </div>
              <div className="space-y-1.5">
                <Label>Until</Label>
                <Input type="time" value={f.end_time} onChange={(e) => { setF({ ...f, end_time: e.target.value }); setConflicts(null); }} />
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </div>

          {conflicts && (
            <div className="rounded-md border border-warning/40 bg-warning-soft p-3 text-[12.5px]">
              <div className="flex items-center gap-1.5 font-semibold text-warning">
                <AlertTriangle className="size-4" /> {conflicts.length} booking(s) already in this window
              </div>
              <p className="mt-1 text-foreground/80">
                They are <strong>not</strong> cancelled automatically. Contact these customers to move or cancel them:
              </p>
              <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto">
                {conflicts.map((c) => (
                  <li key={c.booking_ref}>
                    {c.booking_ref} · {fmtDay(c.date)} · {c.slots} · {c.customer} ({c.phone})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => save(!!conflicts)} disabled={saving || !f.pitch || !f.title.trim()}>
            {saving && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            {conflicts ? "Save anyway" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
