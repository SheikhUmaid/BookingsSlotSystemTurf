import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, ShieldCheck, SlidersHorizontal, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { PageHeader, Panel, PanelHead } from "@/components/turf/ui-bits";
import { FeatureLocked, OverLimitNotice, UpgradeBadge, UsageMeter } from "@/components/turf/plan";
import { adminFetch } from "@/lib/api";
import { pageMeta } from "@/lib/meta";
import { SUBSCRIPTION_QUERY_KEY, useSubscription, type StaffArea } from "@/lib/useSubscription";

export const Route = createFileRoute("/team")({
  head: () => pageMeta("Team", "Admin and staff accounts for the TurfOS panel."),
  component: TeamPage,
});

interface Member {
  _id: string;
  name: string;
  phone: string;
  email: string;
  role: "admin" | "staff";
  permissions: StaffArea[];
  assignedPermissions: StaffArea[] | null;
}

interface TeamResponse {
  members: Member[];
  areas: StaffArea[];
  defaultStaffPermissions: StaffArea[];
}

const AREA_LABELS: Record<string, string> = {
  dashboard: "Overview",
  bookings: "Bookings",
  calendar: "Calendar",
  pricing: "Time slots & pricing",
  services: "Services",
  pitches: "Pitches",
  coupons: "Coupons",
  reports: "Reports",
};

const emptyForm = { name: "", phone: "", email: "", password: "" };

function TeamPage() {
  const qc = useQueryClient();
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  const { hasFeature, usage, isInactive, data: licence } = useSubscription();
  const me = licence?.me;

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-team"],
    queryFn: () => adminFetch<TeamResponse>("/admin/team"),
    enabled: isClient,
  });

  const [addRole, setAddRole] = useState<"admin" | "staff" | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [perms, setPerms] = useState<StaffArea[]>([]);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [removing, setRemoving] = useState<Member | null>(null);

  const members = data?.members ?? [];
  const admins = members.filter((m) => m.role === "admin");
  const staff = members.filter((m) => m.role === "staff");
  const staffOn = hasFeature("staffManagement");
  const rbacOn = hasFeature("roleBasedAccess");
  const adminsFull = !!usage("maxAdmins")?.atLimit;
  const staffFull = !!usage("maxStaff")?.atLimit;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-team"] });
    qc.invalidateQueries({ queryKey: SUBSCRIPTION_QUERY_KEY });
  };

  const openAdd = (role: "admin" | "staff") => {
    setForm(emptyForm);
    setPerms(data?.defaultStaffPermissions ?? []);
    setAddRole(role);
  };

  const create = async () => {
    if (!addRole) return;
    setSaving(true);
    try {
      await adminFetch("/admin/team", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          email: form.email.trim() || undefined,
          role: addRole,
          ...(addRole === "staff" && rbacOn ? { permissions: perms } : {}),
        }),
      });
      toast.success(`${addRole === "staff" ? "Staff member" : "Admin"} added`);
      setAddRole(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setSaving(false);
    }
  };

  const savePerms = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await adminFetch(`/admin/team/${editing._id}/permissions`, {
        method: "PATCH",
        body: JSON.stringify({ permissions: perms }),
      });
      toast.success("Permissions updated");
      setEditing(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update permissions");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!removing) return;
    setSaving(true);
    try {
      await adminFetch(`/admin/team/${removing._id}`, { method: "DELETE" });
      toast.success(`${removing.name || removing.phone} removed`);
      setRemoving(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setSaving(false);
    }
  };

  const addButton = (role: "admin" | "staff", full: boolean, extraLock = false) => (
    <Button
      size="sm"
      onClick={() => openAdd(role)}
      disabled={isInactive || full || extraLock}
      title={full ? "Plan limit reached — upgrade to add more" : undefined}
      className="gap-1.5"
    >
      <Plus className="size-4" /> Add {role}
    </Button>
  );

  const toggle = (a: StaffArea) =>
    setPerms((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]));

  const permissionPicker = () => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Access</Label>
        {!rbacOn && <UpgradeBadge label="Custom roles: upgrade" />}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {(data?.areas ?? []).map((a) => (
          <label
            key={a}
            className={`flex items-center gap-2 text-[13px] ${rbacOn ? "" : "opacity-60"}`}
          >
            <Checkbox
              checked={perms.includes(a)}
              disabled={!rbacOn}
              onCheckedChange={() => toggle(a)}
            />
            {AREA_LABELS[a] ?? a}
          </label>
        ))}
      </div>
      {!rbacOn && (
        <p className="text-[11.5px] text-muted-foreground">
          Staff get the default access shown. Upgrade to a plan with Roles & permissions to
          customise it.
        </p>
      )}
    </div>
  );

  const row = (m: Member) => (
    <li key={m._id} className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="grid size-8 place-items-center rounded-full bg-primary-soft text-primary">
        {m.role === "admin" ? <ShieldCheck className="size-4" /> : <UserRound className="size-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-medium">
          {m.name || "—"}{" "}
          {me?.id === m._id && <span className="text-[11.5px] text-muted-foreground">(you)</span>}
        </div>
        <div className="text-[12px] text-muted-foreground">
          {m.phone}
          {m.email ? ` · ${m.email}` : ""}
        </div>
        {m.role === "staff" && (
          <div className="mt-1 flex flex-wrap gap-1">
            {m.permissions.map((p) => (
              <span
                key={p}
                className="rounded bg-secondary px-1.5 py-0.5 text-[10.5px] text-secondary-foreground"
              >
                {AREA_LABELS[p] ?? p}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-1">
        {m.role === "staff" && (
          <button
            title={rbacOn ? "Edit permissions" : "Roles & permissions isn't in your plan"}
            disabled={!rbacOn || isInactive}
            onClick={() => {
              setPerms(m.assignedPermissions ?? m.permissions);
              setEditing(m);
            }}
            className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40"
          >
            <SlidersHorizontal className="size-3.5" />
          </button>
        )}
        <button
          title="Remove"
          disabled={me?.id === m._id || isInactive}
          onClick={() => setRemoving(m)}
          className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-danger-soft hover:text-destructive disabled:opacity-40"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </li>
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Team" desc="Who can sign in to this admin panel." />
      {error && (
        <div className="text-[13px] text-destructive">
          {error instanceof Error ? error.message : "Failed to load team"}
        </div>
      )}

      <OverLimitNotice limitKey="maxAdmins" />
      <Panel className="overflow-hidden">
        <PanelHead
          title="Admins"
          right={
            <div className="flex items-center gap-3">
              <UsageMeter limitKey="maxAdmins" className="hidden sm:block" />
              {addButton("admin", adminsFull)}
            </div>
          }
        />
        {isLoading ? (
          <div className="flex justify-center p-6">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ul className="divide-y">{admins.map(row)}</ul>
        )}
      </Panel>

      {staffOn ? (
        <>
          <OverLimitNotice limitKey="maxStaff" />
          <Panel className="overflow-hidden">
            <PanelHead
              title="Staff"
              right={
                <div className="flex items-center gap-3">
                  <UsageMeter limitKey="maxStaff" className="hidden sm:block" />
                  {addButton("staff", staffFull)}
                </div>
              }
            />
            {staff.length ? (
              <ul className="divide-y">{staff.map(row)}</ul>
            ) : (
              <p className="p-6 text-center text-[12.5px] text-muted-foreground">
                No staff accounts yet.
              </p>
            )}
          </Panel>
        </>
      ) : (
        <>
          <FeatureLocked feature="staffManagement" compact />
          {staff.length > 0 && (
            <Panel className="overflow-hidden">
              <PanelHead title={`Existing staff (${staff.length}) — can't sign in on this plan`} />
              <ul className="divide-y opacity-70">{staff.map(row)}</ul>
            </Panel>
          )}
        </>
      )}

      {/* Add member */}
      <Dialog open={!!addRole} onOpenChange={(o) => !o && setAddRole(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Add {addRole}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoFocus
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="9876543210"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email (optional)</Label>
                <Input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="At least 8 characters"
              />
            </div>
            {addRole === "staff" && permissionPicker()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddRole(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={create} disabled={saving}>
              {saving && <Loader2 className="mr-1.5 size-4 animate-spin" />}Add {addRole}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit permissions */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Permissions · {editing?.name}</DialogTitle>
          </DialogHeader>
          {permissionPicker()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={savePerms} disabled={saving || !rbacOn}>
              {saving && <Loader2 className="mr-1.5 size-4 animate-spin" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove */}
      <AlertDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removing?.role}</AlertDialogTitle>
            <AlertDialogDescription>
              {removing?.name || removing?.phone} will no longer be able to sign in to the admin
              panel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                remove();
              }}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
