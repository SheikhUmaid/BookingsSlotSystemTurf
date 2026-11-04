import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { LandPlot, Loader2, Pencil, Plus, Ruler, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, Panel } from "@/components/turf/ui-bits";
import { pageMeta } from "@/lib/meta";
import { adminFetch } from "@/lib/api";
import { SUBSCRIPTION_QUERY_KEY, useSubscription } from "@/lib/useSubscription";
import { OverLimitNotice, UpgradeBadge, UsageMeter } from "@/components/turf/plan";

export const Route = createFileRoute("/pitches")({
  head: () => pageMeta("Pitches", "Manage the physical pitches customers can book."),
  component: PitchesPage,
});

export interface ApiPitch {
  _id: string;
  name: string;
  size: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

interface PitchesResponse {
  pitches: ApiPitch[];
  total?: number;
}

const emptyForm = { name: "", size: "", description: "" };

function PitchesPage() {
  const queryClient = useQueryClient();
  const { isInactive, usage, isAdmin } = useSubscription();
  const pitchUsage = usage("maxPitches");
  const atPitchLimit = !!pitchUsage?.atLimit;
  // Writes on pitches (edit/delete) are admin-only for staff without the pitches permission;
  // the backend enforces that too.
  const canAdd = !isInactive && !atPitchLimit;
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPitch, setEditingPitch] = useState<ApiPitch | null>(null);
  const [deletingPitch, setDeletingPitch] = useState<ApiPitch | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-pitches"],
    queryFn: () => adminFetch<PitchesResponse>("/admin/pitches"),
    enabled: isClient,
  });

  const list: ApiPitch[] = data?.pitches ?? [];

  const openAddDialog = () => {
    setEditingPitch(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (pitch: ApiPitch) => {
    setEditingPitch(pitch);
    setForm({ name: pitch.name, size: pitch.size, description: pitch.description ?? "" });
    setDialogOpen(true);
  };

  const savePitch = async () => {
    if (!form.name.trim()) {
      toast.error("Pitch name is required");
      return;
    }
    if (!form.size.trim()) {
      toast.error("Pitch size is required");
      return;
    }

    setSubmitting(true);
    try {
      if (editingPitch) {
        await adminFetch(`/admin/pitches/${editingPitch._id}`, {
          method: "PATCH",
          body: JSON.stringify(form),
        });
        toast.success(`Pitch "${form.name.trim()}" updated`);
      } else {
        await adminFetch("/admin/pitches", {
          method: "POST",
          body: JSON.stringify(form),
        });
        toast.success(`Pitch "${form.name.trim()}" created`);
      }

      queryClient.invalidateQueries({ queryKey: ["admin-pitches"] });
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_QUERY_KEY });
      setDialogOpen(false);
      setEditingPitch(null);
      setForm(emptyForm);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save pitch");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingPitch) return;
    setDeleting(true);
    try {
      await adminFetch(`/admin/pitches/${deletingPitch._id}`, { method: "DELETE" });
      toast.success(`Pitch "${deletingPitch.name}" deleted`);
      queryClient.invalidateQueries({ queryKey: ["admin-pitches"] });
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_QUERY_KEY });
      setDeletingPitch(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete pitch");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Pitches"
        desc={
          isLoading
            ? "Loading pitches…"
            : `${list.length} pitch${list.length === 1 ? "" : "es"} · each time slot can be booked once per pitch per day`
        }
        actions={
          <>
            <UsageMeter limitKey="maxPitches" className="mr-2 hidden sm:block" />
            {isInactive ? (
              <Button size="sm" disabled className="gap-1.5 opacity-60">
                <Plus className="size-4" /> Add Pitch (Locked)
              </Button>
            ) : atPitchLimit ? (
              <Button
                size="sm"
                disabled
                className="gap-1.5 opacity-70"
                title={`Your plan allows up to ${pitchUsage?.max} pitch${pitchUsage?.max === 1 ? "" : "es"}. Upgrade to add more.`}
              >
                <Plus className="size-4" /> Add Pitch
              </Button>
            ) : (
              <Button size="sm" onClick={openAddDialog}>
                <Plus className="size-4" /> Add Pitch
              </Button>
            )}
          </>
        }
      />

      <UsageMeter limitKey="maxPitches" className="mb-4 sm:hidden" />
      <OverLimitNotice limitKey="maxPitches" />
      {atPitchLimit && !pitchUsage?.overLimit && !isInactive && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-primary/15 bg-primary-soft px-3 py-2 text-[12.5px] text-primary-soft-foreground">
          <UpgradeBadge />
          <span>
            You've used all {pitchUsage?.max} pitch{pitchUsage?.max === 1 ? "" : "es"} in your plan.
            {isAdmin ? " Upgrade to add more." : " Ask your admin to upgrade to add more."}
          </span>
        </div>
      )}

      {isError && (
        <div className="mb-4 rounded-md border border-destructive/20 bg-danger-soft p-4 text-[13px] text-destructive">
          Failed to load pitches: {error instanceof Error ? error.message : "Unknown error"}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading && list.length === 0
          ? Array.from({ length: 4 }).map((_, i) => (
              <Panel key={i} className="animate-pulse p-4">
                <div className="flex items-start justify-between">
                  <div className="size-10 rounded-lg bg-muted" />
                  <div className="h-6 w-14 rounded bg-muted" />
                </div>
                <div className="mt-4 h-4 w-3/4 rounded bg-muted" />
                <div className="mt-2 h-10 rounded bg-muted" />
              </Panel>
            ))
          : list.map((p) => (
              <Panel key={p._id} className="p-4 transition-shadow hover:shadow-card">
                <div className="flex items-start justify-between">
                  <div className="grid size-10 place-items-center rounded-lg bg-primary-soft text-primary">
                    <LandPlot className="size-5" />
                  </div>
                  <div className="flex gap-1">
                    <button
                      title={isInactive ? "Account inactive (read only)" : "Edit pitch"}
                      disabled={isInactive}
                      onClick={() => openEditDialog(p)}
                      className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      title={isInactive ? "Account inactive (read only)" : "Delete pitch"}
                      disabled={isInactive}
                      onClick={() => setDeletingPitch(p)}
                      className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-danger-soft hover:text-destructive disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
                <h3 className="mt-3 text-[14px] font-semibold">{p.name}</h3>
                <div className="mt-1 flex items-center gap-1.5 text-[12px] font-medium text-foreground/80">
                  <Ruler className="size-3.5 text-muted-foreground" /> {p.size}
                </div>
                {p.description && (
                  <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
                    {p.description}
                  </p>
                )}
              </Panel>
            ))}
      </div>

      {!isLoading && list.length === 0 && !isError && (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-[14px] font-medium text-foreground">No pitches configured yet</p>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            Customers can't book until at least one pitch exists.
          </p>
          <Button size="sm" onClick={openAddDialog} disabled={!canAdd} className="mt-4">
            <Plus className="size-4" /> Add Pitch
          </Button>
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{editingPitch ? "Edit Pitch" : "Add Pitch"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Pitch A"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Size</Label>
              <Input
                value={form.size}
                onChange={(e) => setForm({ ...form, size: e.target.value })}
                placeholder="e.g. 5-a-side or 40 x 20 m"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="e.g. North cage, FIFA-grade turf, floodlit"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={savePitch} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                  Saving…
                </>
              ) : editingPitch ? (
                "Update Pitch"
              ) : (
                "Save Pitch"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingPitch} onOpenChange={(open) => !open && setDeletingPitch(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pitch</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">"{deletingPitch?.name}"</span>? This
              action cannot be undone. Pitches linked to active bookings cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
