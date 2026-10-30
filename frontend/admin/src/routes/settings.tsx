import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Loader2, Lock, Save } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageHeader, Panel, PanelHead } from "@/components/turf/ui-bits";
import { pageMeta } from "@/lib/meta";
import { adminFetch } from "@/lib/api";
import { useSubscription } from "@/lib/useSubscription";

export const Route = createFileRoute("/settings")({
  head: () => pageMeta("Settings", "Business details, preferences and account security."),
  component: SettingsPage,
});

interface BusinessSettings {
  business_name: string;
  contact_phone: string;
  email: string;
  city: string;
  address: string;
  allow_partial_payments: boolean;
  sms_confirmation: boolean;
  daily_summary_email: boolean;
}

interface SettingsResponse {
  settings: BusinessSettings;
}

const defaultSettings: BusinessSettings = {
  business_name: "Green Arena Turf",
  contact_phone: "+91 98765 43210",
  email: "hello@greenarena.in",
  city: "Bengaluru",
  address: "Plot 21, Sports Complex Road",
  allow_partial_payments: true,
  sms_confirmation: true,
  daily_summary_email: false,
};

function SettingsPage() {
  const queryClient = useQueryClient();
  const { isInactive, status } = useSubscription();
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const [form, setForm] = useState<BusinessSettings>(defaultSettings);
  const [savingSettings, setSavingSettings] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Fetch settings from backend
  const { data, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => adminFetch<SettingsResponse>("/admin/settings"),
    enabled: isClient,
  });

  useEffect(() => {
    if (data?.settings) {
      setForm({
        business_name: data.settings.business_name || defaultSettings.business_name,
        contact_phone: data.settings.contact_phone || defaultSettings.contact_phone,
        email: data.settings.email || defaultSettings.email,
        city: data.settings.city || defaultSettings.city,
        address: data.settings.address || defaultSettings.address,
        allow_partial_payments: data.settings.allow_partial_payments ?? true,
        sms_confirmation: data.settings.sms_confirmation ?? true,
        daily_summary_email: data.settings.daily_summary_email ?? false,
      });
    }
  }, [data]);

  const handleSaveSettings = async () => {
    if (!form.business_name.trim()) {
      toast.error("Business name is required");
      return;
    }

    setSavingSettings(true);
    try {
      await adminFetch<{ message: string; settings: BusinessSettings }>("/admin/settings", {
        method: "PUT",
        body: JSON.stringify(form),
      });

      toast.success("Settings saved successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error("Please enter your current password");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setUpdatingPassword(true);
    try {
      const res = await adminFetch<{ message: string }>("/admin/settings/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      toast.success(res.message || "Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to change password");
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="Settings" desc="Manage business information, operational preferences, and account security." />

      {/* Business Information Panel */}
      <Panel>
        <PanelHead title="Business information" />
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-[12.5px]">Business name</Label>
            <Input
              value={form.business_name}
              onChange={(e) => setForm({ ...form, business_name: e.target.value })}
              className="h-9"
              placeholder="e.g. Green Arena Turf"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12.5px]">Contact phone</Label>
            <Input
              value={form.contact_phone}
              onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
              className="h-9"
              placeholder="e.g. +91 98765 43210"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12.5px]">Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="h-9"
              placeholder="e.g. hello@greenarena.in"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12.5px]">City</Label>
            <Input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="h-9"
              placeholder="e.g. Bengaluru"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-[12.5px]">Address</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="h-9"
              placeholder="e.g. Plot 21, Sports Complex Road"
              disabled={isLoading}
            />
          </div>
        </div>
      </Panel>

      {/* Preferences Panel */}
      <Panel>
        <PanelHead title="Preferences" />
        <div className="divide-y">
          <label className="flex cursor-pointer items-center justify-between px-4 py-3 text-[13px]">
            <div>
              <div className="font-medium">Allow partial (advance) payments</div>
              <div className="text-[12px] text-muted-foreground">
                Customers can pay advance at booking and settle remaining at venue
              </div>
            </div>
            <Switch
              checked={form.allow_partial_payments}
              onCheckedChange={(v) => setForm({ ...form, allow_partial_payments: v })}
              disabled={isLoading}
            />
          </label>
          <label className="flex cursor-pointer items-center justify-between px-4 py-3 text-[13px]">
            <div>
              <div className="font-medium">SMS confirmation to customers</div>
              <div className="text-[12px] text-muted-foreground">
                Send booking receipt and slot confirmation via SMS
              </div>
            </div>
            <Switch
              checked={form.sms_confirmation}
              onCheckedChange={(v) => setForm({ ...form, sms_confirmation: v })}
              disabled={isLoading}
            />
          </label>
          <label className="flex cursor-pointer items-center justify-between px-4 py-3 text-[13px]">
            <div>
              <div className="font-medium">Daily booking summary email</div>
              <div className="text-[12px] text-muted-foreground">
                Receive end-of-day revenue and schedule digest
              </div>
            </div>
            <Switch
              checked={form.daily_summary_email}
              onCheckedChange={(v) => setForm({ ...form, daily_summary_email: v })}
              disabled={isLoading}
            />
          </label>
        </div>
        <div className="border-t p-3 text-right">
          <Button onClick={handleSaveSettings} disabled={savingSettings || isLoading || isInactive}>
            {savingSettings ? (
              <>
                <Loader2 className="mr-1.5 size-4 animate-spin" /> Saving…
              </>
            ) : isInactive ? (
              "Save locked (Account Inactive)"
            ) : (
              <>
                <Save className="mr-1.5 size-4" /> Save changes
              </>
            )}
          </Button>
        </div>
      </Panel>

      {/* Change Password Panel */}
      <Panel>
        <PanelHead
          title="Change password"
          right={
            <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
              <Lock className="size-3.5" /> Security
            </span>
          }
        />
        <form onSubmit={handleChangePassword} className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label className="text-[12.5px]" htmlFor="current-pw">
              Current password
            </Label>
            <Input
              id="current-pw"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="h-9"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[12.5px]" htmlFor="new-pw">
                New password
              </Label>
              <Input
                id="new-pw"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-9"
                placeholder="At least 6 characters"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12.5px]" htmlFor="confirm-pw">
                Confirm new password
              </Label>
              <Input
                id="confirm-pw"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-9"
                placeholder="Repeat new password"
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button type="submit" variant="outline" disabled={updatingPassword}>
              {updatingPassword ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" /> Updating password…
                </>
              ) : (
                "Update password"
              )}
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
