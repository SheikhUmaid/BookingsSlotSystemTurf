import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Pencil, Plus, Trash2, Loader2 } from "lucide-react";
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
import { inr, slotCategories, type SlotCategory } from "@/lib/turf-data";
import { PageHeader, Panel, Td, Th, selectCls } from "@/components/turf/ui-bits";
import { pageMeta } from "@/lib/meta";
import { adminFetch } from "@/lib/api";

export const Route = createFileRoute("/pricing")({
  head: () => pageMeta("Time Slots & Pricing", "Recurring slot definitions and hourly prices by session."),
  component: PricingPage,
});

interface ApiTimeSlot {
  _id: string;
  start_time: string;
  end_time: string;
  category: SlotCategory;
  price: number;
}

interface TimeSlotsResponse {
  timeSlots: ApiTimeSlot[];
  total: number;
}

interface SlotForm {
  start_time: string;
  end_time: string;
  category: SlotCategory;
  price: string;
}

const emptyForm: SlotForm = {
  start_time: "06:00",
  end_time: "07:00",
  category: "Morning Sessions",
  price: "1000",
};

const to12 = (t?: string) => {
  if (!t) return "";
  const [hStr, mStr = "00"] = t.split(":");
  const h = Number(hStr);
  const s = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr} ${s}`;
};

function PricingPage() {
  const queryClient = useQueryClient();
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<ApiTimeSlot | null>(null);
  const [deletingSlot, setDeletingSlot] = useState<ApiTimeSlot | null>(null);
  const [form, setForm] = useState<SlotForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch all time slots from backend
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-time-slots"],
    queryFn: () => adminFetch<TimeSlotsResponse>("/admin/time-slots"),
    enabled: isClient,
  });

  const slots = data?.timeSlots ?? [];

  const openAddDialog = () => {
    setEditingSlot(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (s: ApiTimeSlot) => {
    setEditingSlot(s);
    setForm({
      start_time: s.start_time,
      end_time: s.end_time,
      category: s.category,
      price: String(s.price),
    });
    setDialogOpen(true);
  };

  const saveSlot = async () => {
    const p = Number(form.price);
    if (!form.start_time || !/^\d{2}:\d{2}$/.test(form.start_time.trim())) {
      toast.error("Please provide a valid start time (HH:MM)");
      return;
    }
    if (!form.end_time || !/^\d{2}:\d{2}$/.test(form.end_time.trim())) {
      toast.error("Please provide a valid end time (HH:MM)");
      return;
    }
    if (Number.isNaN(p) || p < 0) {
      toast.error("Price must be a valid positive amount");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        start_time: form.start_time.trim(),
        end_time: form.end_time.trim(),
        category: form.category,
        price: p,
      };

      if (editingSlot) {
        await adminFetch<{ message: string; timeSlot: ApiTimeSlot }>(
          `/admin/time-slots/${editingSlot._id}`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          }
        );
        toast.success(`Time slot ${to12(payload.start_time)} – ${to12(payload.end_time)} updated`);
      } else {
        await adminFetch<{ message: string; timeSlot: ApiTimeSlot }>(
          "/admin/time-slots",
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        );
        toast.success(`Time slot ${to12(payload.start_time)} – ${to12(payload.end_time)} created`);
      }

      queryClient.invalidateQueries({ queryKey: ["admin-time-slots"] });
      queryClient.invalidateQueries({ queryKey: ["admin-time-slots-availability"] });
      queryClient.invalidateQueries({ queryKey: ["admin-month-availability"] });

      setDialogOpen(false);
      setEditingSlot(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to save time slot");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingSlot) return;
    setDeleting(true);
    try {
      await adminFetch<{ message: string }>(`/admin/time-slots/${deletingSlot._id}`, {
        method: "DELETE",
      });
      toast.success(
        `Time slot ${to12(deletingSlot.start_time)} – ${to12(deletingSlot.end_time)} deleted`
      );
      queryClient.invalidateQueries({ queryKey: ["admin-time-slots"] });
      queryClient.invalidateQueries({ queryKey: ["admin-time-slots-availability"] });
      queryClient.invalidateQueries({ queryKey: ["admin-month-availability"] });
      setDeletingSlot(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete time slot");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Time Slots & Pricing"
        desc={
          isLoading
            ? "Loading time slot definitions…"
            : `${slots.length} recurring slot definitions configured.`
        }
        actions={
          <Button size="sm" onClick={openAddDialog}>
            <Plus className="size-4" /> Add Time Slot
          </Button>
        }
      />

      {isError && (
        <div className="mb-4 rounded-md border border-destructive/20 bg-danger-soft p-4 text-[13px] text-destructive">
          Failed to load time slots: {error instanceof Error ? error.message : "Unknown error"}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {slotCategories.map((c) => {
          const rows = slots
            .filter((s) => s.category === c)
            .sort((a, b) => a.start_time.localeCompare(b.start_time));
          const minPrice = rows.length ? Math.min(...rows.map((r) => r.price)) : 0;

          return (
            <Panel key={c}>
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h3 className="text-[13.5px] font-semibold">{c}</h3>
                <span className="text-[12px] text-muted-foreground">
                  {isLoading ? (
                    "Loading…"
                  ) : (
                    `${rows.length} slots${rows.length ? ` · from ${inr(minPrice)}` : ""}`
                  )}
                </span>
              </div>
              <table className="w-full">
                <thead>
                  <tr>
                    <Th>Start</Th>
                    <Th>End</Th>
                    <Th className="text-right">Price / hr</Th>
                    <Th className="w-20 text-right">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && rows.length === 0 ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 4 }).map((_, j) => (
                          <Td key={j}>
                            <div className="h-4 animate-pulse rounded bg-muted" />
                          </Td>
                        ))}
                      </tr>
                    ))
                  ) : rows.length > 0 ? (
                    rows.map((s) => (
                      <tr key={s._id} className="hover:bg-surface">
                        <Td className="font-medium">{to12(s.start_time)}</Td>
                        <Td>{to12(s.end_time)}</Td>
                        <Td className="text-right font-semibold">{inr(s.price)}</Td>
                        <Td className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              aria-label="Edit price"
                              onClick={() => openEditDialog(s)}
                              className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            <button
                              aria-label="Delete slot"
                              onClick={() => setDeletingSlot(s)}
                              className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-danger-soft hover:text-destructive"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </Td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-[12.5px] text-muted-foreground">
                        No slots defined for this session category.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Panel>
          );
        })}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editingSlot ? "Edit Time Slot" : "Add Time Slot"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="space-y-1.5">
              <Label>Start time</Label>
              <Input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>End time</Label>
              <Input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Category</Label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as SlotCategory })}
                className={selectCls + " h-9 w-full"}
              >
                {slotCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Price (₹)</Label>
              <Input
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="1000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={saveSlot} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                  Saving…
                </>
              ) : editingSlot ? (
                "Update Slot"
              ) : (
                "Create Slot"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={!!deletingSlot}
        onOpenChange={(open) => !open && setDeletingSlot(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Time Slot</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete slot{" "}
              <span className="font-semibold text-foreground">
                {to12(deletingSlot?.start_time)} – {to12(deletingSlot?.end_time)}
              </span>
              ? Slots referenced in active bookings cannot be deleted.
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
