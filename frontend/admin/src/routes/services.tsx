import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { CircleDot, Goal, Pencil, Plus, Target, Trash2, Trophy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { PageHeader, Panel, selectCls } from "@/components/turf/ui-bits";
import { pageMeta } from "@/lib/meta";
import { adminFetch } from "@/lib/api";
import { useSubscription } from "@/lib/useSubscription";

export const Route = createFileRoute("/services")({
  head: () => pageMeta("Services / Pitches", "Manage the pitches and courts customers can book."),
  component: ServicesPage,
});

interface ApiService {
  _id: string;
  name: string;
  description: string;
  icon: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ServicesResponse {
  services: ApiService[];
  total?: number;
}

const icons: Record<string, typeof Goal> = {
  goal: Goal,
  trophy: Trophy,
  target: Target,
  "circle-dot": CircleDot,
};

function ServicesPage() {
  const queryClient = useQueryClient();
  const { isInactive, status } = useSubscription();
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ApiService | null>(null);
  const [deletingService, setDeletingService] = useState<ApiService | null>(null);
  const [form, setForm] = useState({ name: "", description: "", icon: "goal" });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch all services from admin API
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-services"],
    queryFn: async () => {
      const res = await adminFetch<ServicesResponse | ApiService[]>("/admin/services");
      if (Array.isArray(res)) return { services: res, total: res.length };
      return res;
    },
    enabled: isClient,
  });

  const list: ApiService[] = data?.services ?? [];

  const openAddDialog = () => {
    setEditingService(null);
    setForm({ name: "", description: "", icon: "goal" });
    setDialogOpen(true);
  };

  const openEditDialog = (service: ApiService) => {
    setEditingService(service);
    setForm({
      name: service.name,
      description: service.description,
      icon: service.icon || "goal",
    });
    setDialogOpen(true);
  };

  const saveService = async () => {
    if (!form.name.trim()) {
      toast.error("Service name is required");
      return;
    }
    if (!form.description.trim()) {
      toast.error("Description is required");
      return;
    }

    setSubmitting(true);
    try {
      if (editingService) {
        await adminFetch<{ message: string; service: ApiService }>(
          `/admin/services/${editingService._id}`,
          {
            method: "PATCH",
            body: JSON.stringify(form),
          }
        );
        toast.success(`Service "${form.name.trim()}" updated successfully`);
      } else {
        await adminFetch<{ message: string; service: ApiService }>("/admin/services", {
          method: "POST",
          body: JSON.stringify(form),
        });
        toast.success(`Service "${form.name.trim()}" created successfully`);
      }

      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      setDialogOpen(false);
      setEditingService(null);
      setForm({ name: "", description: "", icon: "goal" });
    } catch (err: any) {
      toast.error(err.message || "Failed to save service");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingService) return;
    setDeleting(true);
    try {
      await adminFetch<{ message: string }>(`/admin/services/${deletingService._id}`, {
        method: "DELETE",
      });
      toast.success(`Service "${deletingService.name}" deleted successfully`);
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      setDeletingService(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete service");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Services / Pitches"
        desc={isLoading ? "Loading services…" : `${list.length} services`}
        actions={
          isInactive ? (
            <Button size="sm" disabled className="gap-1.5 opacity-60">
              <Plus className="size-4" /> Add Service (Locked)
            </Button>
          ) : (
            <Button size="sm" onClick={openAddDialog}>
              <Plus className="size-4" /> Add Service
            </Button>
          )
        }
      />

      {isError && (
        <div className="mb-4 rounded-md border border-destructive/20 bg-danger-soft p-4 text-[13px] text-destructive">
          Failed to load services: {error instanceof Error ? error.message : "Unknown error"}
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
                <div className="mt-3 h-3 w-1/3 rounded bg-muted" />
              </Panel>
            ))
          : list.map((s) => {
              const I = icons[s.icon] ?? Goal;
              return (
                <Panel key={s._id} className="p-4 transition-shadow hover:shadow-card">
                  <div className="flex items-start justify-between">
                    <div className="grid size-10 place-items-center rounded-lg bg-primary-soft text-primary">
                      <I className="size-5" />
                    </div>
                    <div className="flex gap-1">
                      <button
                        title={isInactive ? "Account inactive (read only)" : "Edit service"}
                        disabled={isInactive}
                        onClick={() => openEditDialog(s)}
                        className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        title={isInactive ? "Account inactive (read only)" : "Delete service"}
                        disabled={isInactive}
                        onClick={() => setDeletingService(s)}
                        className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-danger-soft hover:text-destructive disabled:opacity-40 disabled:hover:bg-transparent"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                  <h3 className="mt-3 text-[14px] font-semibold">{s.name}</h3>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                    {s.description}
                  </p>
                  <div className="mt-3 text-[11.5px] text-muted-foreground">
                    Icon: <code className="rounded bg-surface px-1">{s.icon}</code>
                  </div>
                </Panel>
              );
            })}
      </div>

      {!isLoading && list.length === 0 && !isError && (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-[14px] font-medium text-foreground">No services configured yet</p>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            Get started by adding your first pitch or sport modality.
          </p>
          <Button size="sm" onClick={openAddDialog} className="mt-4">
            <Plus className="size-4" /> Add Service
          </Button>
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{editingService ? "Edit Service" : "Add Service"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Football Turf C"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="e.g. 7-a-side FIFA-grade artificial grass, floodlit"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Icon</Label>
              <select
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                className={selectCls + " h-9 w-full"}
              >
                {Object.keys(icons).map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={saveService} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                  Saving…
                </>
              ) : editingService ? (
                "Update Service"
              ) : (
                "Save Service"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={!!deletingService}
        onOpenChange={(open) => !open && setDeletingService(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                "{deletingService?.name}"
              </span>
              ? This action cannot be undone. Services linked to active bookings cannot be deleted.
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
