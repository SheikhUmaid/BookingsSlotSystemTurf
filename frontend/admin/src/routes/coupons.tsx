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
import { Switch } from "@/components/ui/switch";
import { PageHeader, Panel, StatusBadge, Td, Th } from "@/components/turf/ui-bits";
import { pageMeta } from "@/lib/meta";
import { adminFetch } from "@/lib/api";

export const Route = createFileRoute("/coupons")({
  head: () => pageMeta("Coupons", "Create and track percentage discount coupons."),
  component: CouponsPage,
});

interface ApiCoupon {
  _id: string;
  code: string;
  discount_percentage: number;
  valid_from: string;
  valid_until: string;
  usage_limit: number | null;
  used_count: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface CouponsResponse {
  coupons: ApiCoupon[];
  total: number;
}

interface CouponForm {
  code: string;
  discount: string;
  validFrom: string;
  validUntil: string;
  usageLimit: string;
  active: boolean;
}

const getTodayStr = () => new Date().toISOString().slice(0, 10);
const getDefaultUntilStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
};

const emptyForm: CouponForm = {
  code: "",
  discount: "",
  validFrom: "",
  validUntil: "",
  usageLimit: "",
  active: true,
};

function CouponsPage() {
  const queryClient = useQueryClient();
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<ApiCoupon | null>(null);
  const [deletingCoupon, setDeletingCoupon] = useState<ApiCoupon | null>(null);
  const [form, setForm] = useState<CouponForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Fetch all coupons from the backend
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: () => adminFetch<CouponsResponse>("/admin/coupons"),
    enabled: isClient,
  });

  const list: ApiCoupon[] = data?.coupons ?? [];

  const openAddDialog = () => {
    setEditingCoupon(null);
    setForm({
      code: "",
      discount: "",
      validFrom: getTodayStr(),
      validUntil: getDefaultUntilStr(),
      usageLimit: "",
      active: true,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (coupon: ApiCoupon) => {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      discount: String(coupon.discount_percentage),
      validFrom: new Date(coupon.valid_from).toISOString().slice(0, 10),
      validUntil: new Date(coupon.valid_until).toISOString().slice(0, 10),
      usageLimit: coupon.usage_limit ? String(coupon.usage_limit) : "",
      active: coupon.active,
    });
    setDialogOpen(true);
  };

  const saveCoupon = async () => {
    const cleanCode = form.code.trim().toUpperCase().replace(/\s/g, "");
    const d = Number(form.discount);

    if (!/^[A-Z0-9]{3,20}$/.test(cleanCode)) {
      toast.error("Coupon code must be 3–20 alphanumeric characters");
      return;
    }
    if (Number.isNaN(d) || d <= 0 || d > 100) {
      toast.error("Discount must be between 1 and 100%");
      return;
    }
    if (!form.validFrom || !form.validUntil || form.validUntil < form.validFrom) {
      toast.error("Please verify validity dates (until date must be after or equal to from date)");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        code: cleanCode,
        discount_percentage: d,
        valid_from: form.validFrom,
        valid_until: form.validUntil,
        usage_limit: form.usageLimit ? Number(form.usageLimit) : null,
        active: form.active,
      };

      if (editingCoupon) {
        await adminFetch<{ message: string; coupon: ApiCoupon }>(
          `/admin/coupons/${editingCoupon._id}`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          }
        );
        toast.success(`Coupon ${cleanCode} updated successfully`);
      } else {
        await adminFetch<{ message: string; coupon: ApiCoupon }>("/admin/coupons", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success(`Coupon ${cleanCode} created successfully`);
      }

      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      setDialogOpen(false);
      setEditingCoupon(null);
      setForm(emptyForm);
    } catch (err: any) {
      toast.error(err.message || "Failed to save coupon");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (coupon: ApiCoupon) => {
    setTogglingId(coupon._id);
    try {
      const res = await adminFetch<{ message: string; coupon: ApiCoupon }>(
        `/admin/coupons/${coupon._id}/toggle`,
        { method: "PATCH" }
      );
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle status");
    } finally {
      setTogglingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deletingCoupon) return;
    setDeleting(true);
    try {
      await adminFetch<{ message: string }>(`/admin/coupons/${deletingCoupon._id}`, {
        method: "DELETE",
      });
      toast.success(`Coupon "${deletingCoupon.code}" deleted successfully`);
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      setDeletingCoupon(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete coupon");
    } finally {
      setDeleting(false);
    }
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <div>
      <PageHeader
        title="Coupons"
        desc={isLoading ? "Loading coupons…" : `${list.length} discount coupons configured.`}
        actions={
          <Button size="sm" onClick={openAddDialog}>
            <Plus className="size-4" /> Create Coupon
          </Button>
        }
      />

      {isError && (
        <div className="mb-4 rounded-md border border-destructive/20 bg-danger-soft p-4 text-[13px] text-destructive">
          Failed to load coupons: {error instanceof Error ? error.message : "Unknown error"}
        </div>
      )}

      <Panel className="overflow-x-auto">
        <table className="w-full whitespace-nowrap">
          <thead>
            <tr>
              <Th>Code</Th>
              <Th className="text-right">Discount</Th>
              <Th>Valid from</Th>
              <Th>Valid until</Th>
              <Th>Usage</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading && list.length === 0
              ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <Td key={j}>
                        <div className="h-4 animate-pulse rounded bg-muted" />
                      </Td>
                    ))}
                  </tr>
                ))
              : list.map((c) => {
                  const usagePct = c.usage_limit
                    ? Math.min(100, (c.used_count / c.usage_limit) * 100)
                    : 0;

                  return (
                    <tr key={c._id} className="hover:bg-surface">
                      <Td>
                        <code className="rounded border border-dashed border-primary/40 bg-primary-soft px-2 py-0.5 text-[12.5px] font-semibold text-primary-soft-foreground">
                          {c.code}
                        </code>
                      </Td>
                      <Td className="text-right font-semibold">{c.discount_percentage}%</Td>
                      <Td className="text-muted-foreground">{fmt(c.valid_from)}</Td>
                      <Td className="text-muted-foreground">{fmt(c.valid_until)}</Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{ width: `${c.usage_limit ? usagePct : 100}%` }}
                            />
                          </div>
                          <span className="text-[12px] text-muted-foreground">
                            {c.used_count} / {c.usage_limit ?? "∞"}
                          </span>
                        </div>
                      </Td>
                      <Td>
                        <button
                          onClick={() => toggleStatus(c)}
                          disabled={togglingId === c._id}
                          className="transition-opacity hover:opacity-80 disabled:opacity-50"
                          title="Click to toggle active status"
                        >
                          <StatusBadge status={c.active ? "Active" : "Inactive"} />
                        </button>
                      </Td>
                      <Td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            title="Edit coupon"
                            onClick={() => openEditDialog(c)}
                            className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            title="Delete coupon"
                            onClick={() => setDeletingCoupon(c)}
                            className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-danger-soft hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
        {!isLoading && list.length === 0 && !isError && (
          <div className="p-12 text-center">
            <p className="text-[14px] font-medium text-foreground">No coupons created yet</p>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              Create discount coupons to reward customers at checkout.
            </p>
            <Button size="sm" onClick={openAddDialog} className="mt-4">
              <Plus className="size-4" /> Create Coupon
            </Button>
          </div>
        )}
      </Panel>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{editingCoupon ? "Edit Coupon" : "Create Coupon"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label>Coupon code</Label>
              <Input
                value={form.code}
                onChange={(e) =>
                  setForm({
                    ...form,
                    code: e.target.value.toUpperCase().replace(/\s/g, ""),
                  })
                }
                placeholder="SUMMER15"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Discount (%)</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={form.discount}
                onChange={(e) => setForm({ ...form, discount: e.target.value })}
                placeholder="15"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Usage limit</Label>
              <Input
                type="number"
                min={1}
                value={form.usageLimit}
                onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                placeholder="Leave blank for ∞"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Valid from</Label>
              <Input
                type="date"
                value={form.validFrom}
                onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Valid until</Label>
              <Input
                type="date"
                value={form.validUntil}
                onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
              />
            </div>
            <label className="col-span-2 flex cursor-pointer items-center justify-between rounded-md border px-3 py-2 text-[13px]">
              <span>Active</span>
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={saveCoupon} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                  Saving…
                </>
              ) : editingCoupon ? (
                "Update Coupon"
              ) : (
                "Create Coupon"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={!!deletingCoupon}
        onOpenChange={(open) => !open && setDeletingCoupon(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Coupon</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete coupon{" "}
              <span className="font-semibold text-foreground">"{deletingCoupon?.code}"</span>?
              Customers will no longer be able to apply this discount.
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
