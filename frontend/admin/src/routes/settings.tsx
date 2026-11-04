import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Clock, Loader2, Lock, LocateFixed, MapPin, Navigation, Phone, Save } from "lucide-react";
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
  tagline: string;
  landmark: string;
  pincode: string;
  opening_hours: string;
  maps_url: string;
  latitude: string;
  longitude: string;
  allow_partial_payments: boolean;
  sms_confirmation: boolean;
  daily_summary_email: boolean;
}

type SettingsFromApi = Omit<BusinessSettings, "latitude" | "longitude"> & {
  latitude: number | null;
  longitude: number | null;
};

interface SettingsResponse {
  settings: SettingsFromApi;
}

// Mirrors backend/utils/venue.js so the preview matches what customers see.
function venueLinks(f: BusinessSettings) {
  const hasCoords = f.latitude.trim() !== "" && f.longitude.trim() !== "";
  const cityLine = [f.city, f.pincode].filter(Boolean).join(" ");
  const fullAddress = [f.address, f.landmark && `Near ${f.landmark}`, cityLine].filter(Boolean).join(", ");
  const coords = `${f.latitude.trim()},${f.longitude.trim()}`;
  const directions = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${coords}`
    : f.maps_url.trim() ||
      (fullAddress ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}` : "");
  const query = hasCoords ? coords : fullAddress;
  const embed = query ? `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed` : "";
  return { fullAddress, directions, embed };
}

const defaultSettings: BusinessSettings = {
  business_name: "Green Arena Turf",
  contact_phone: "+91 98765 43210",
  email: "hello@greenarena.in",
  city: "Bengaluru",
  address: "Plot 21, Sports Complex Road",
  tagline: "",
  landmark: "",
  pincode: "",
  opening_hours: "06:00 – Midnight",
  maps_url: "",
  latitude: "",
  longitude: "",
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
        tagline: data.settings.tagline ?? "",
        landmark: data.settings.landmark ?? "",
        pincode: data.settings.pincode ?? "",
        opening_hours: data.settings.opening_hours ?? "",
        maps_url: data.settings.maps_url ?? "",
        latitude: data.settings.latitude != null ? String(data.settings.latitude) : "",
        longitude: data.settings.longitude != null ? String(data.settings.longitude) : "",
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
    if ((form.latitude.trim() === "") !== (form.longitude.trim() === "")) {
      toast.error("Enter both latitude and longitude, or leave both empty");
      return;
    }

    setSavingSettings(true);
    try {
      await adminFetch<{ message: string; settings: SettingsFromApi }>("/admin/settings", {
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

  const [locating, setLocating] = useState(false);
  const captureLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Location is not supported in this browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setForm((f) => ({
          ...f,
          latitude: coords.latitude.toFixed(6),
          longitude: coords.longitude.toFixed(6),
        }));
        setLocating(false);
        toast.success("Location captured — remember to save");
      },
      () => {
        setLocating(false);
        toast.error("Couldn't get your location. Allow location access and try again.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const links = venueLinks(form);

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
    <div>
      <PageHeader title="Settings" desc="Manage business information, operational preferences, and account security." />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-5">

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
            <Label className="text-[12.5px]">Tagline</Label>
            <Input
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              className="h-9"
              placeholder="e.g. Downtown Arena Pitch"
              maxLength={80}
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

      {/* Location Panel */}
      <Panel>
        <PanelHead
          title="Location & directions"
          right={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={captureLocation}
              disabled={locating || isLoading}
            >
              {locating ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <LocateFixed className="mr-1.5 size-3.5" />
              )}
              Use my current location
            </Button>
          }
        />
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-[12.5px]">Landmark</Label>
            <Input
              value={form.landmark}
              onChange={(e) => setForm({ ...form, landmark: e.target.value })}
              className="h-9"
              placeholder="e.g. Opposite City Mall"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12.5px]">Pincode</Label>
            <Input
              value={form.pincode}
              onChange={(e) => setForm({ ...form, pincode: e.target.value })}
              className="h-9"
              placeholder="e.g. 560001"
              inputMode="numeric"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-[12.5px]">Opening hours</Label>
            <Input
              value={form.opening_hours}
              onChange={(e) => setForm({ ...form, opening_hours: e.target.value })}
              className="h-9"
              placeholder="e.g. 06:00 – Midnight"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-[12.5px]">Google Maps link</Label>
            <Input
              value={form.maps_url}
              onChange={(e) => setForm({ ...form, maps_url: e.target.value })}
              className="h-9"
              placeholder="https://maps.app.goo.gl/…"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12.5px]">Latitude</Label>
            <Input
              value={form.latitude}
              onChange={(e) => setForm({ ...form, latitude: e.target.value })}
              className="h-9"
              placeholder="e.g. 12.971599"
              inputMode="decimal"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12.5px]">Longitude</Label>
            <Input
              value={form.longitude}
              onChange={(e) => setForm({ ...form, longitude: e.target.value })}
              className="h-9"
              placeholder="e.g. 77.594566"
              inputMode="decimal"
              disabled={isLoading}
            />
          </div>
          <p className="text-[12px] text-muted-foreground sm:col-span-2">
            Customers get directions to the exact coordinates if set. Otherwise they go to the Maps link, then the address.
          </p>
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

      {/* Booking app preview */}
      <Panel className="overflow-hidden xl:sticky xl:top-4">
        <PanelHead
          title="Booking app preview"
          right={<span className="text-[11.5px] text-muted-foreground">What customers see</span>}
        />
        {links.embed ? (
          <iframe
            title="Turf location map"
            src={links.embed}
            className="h-48 w-full border-0 bg-muted"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <div className="grid h-48 place-items-center bg-muted text-[12.5px] text-muted-foreground">
            Add an address to show the map
          </div>
        )}
        <div className="space-y-3 p-4">
          <div>
            <div className="text-[16px] font-semibold leading-tight">{form.business_name || "Your turf"}</div>
            {form.tagline && <div className="text-[12.5px] text-muted-foreground">{form.tagline}</div>}
          </div>
          <div className="space-y-2 text-[12.5px]">
            {links.fullAddress && (
              <div className="flex gap-2">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span>{links.fullAddress}</span>
              </div>
            )}
            {form.opening_hours && (
              <div className="flex gap-2">
                <Clock className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span>{form.opening_hours}</span>
              </div>
            )}
            {form.contact_phone && (
              <div className="flex gap-2">
                <Phone className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span>{form.contact_phone}</span>
              </div>
            )}
          </div>
          {links.directions ? (
            <Button asChild className="w-full">
              <a href={links.directions} target="_blank" rel="noreferrer">
                <Navigation className="mr-1.5 size-4" /> Get directions
              </a>
            </Button>
          ) : (
            <Button className="w-full" disabled>
              <Navigation className="mr-1.5 size-4" /> Get directions
            </Button>
          )}
          <p className="text-[11.5px] text-muted-foreground">
            Changes show in the booking app after you save.
          </p>
        </div>
      </Panel>
      </div>

      {/* ─────────────────── TURFOS & ZINTH LABS PLATFORM INFO ─────────────────── */}
      <Panel className="mt-5 border border-border/80 bg-gradient-to-r from-card via-card to-primary-soft/10 p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-[14.5px] font-bold text-foreground">TurfOS</h3>
              <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">v2.4 Enterprise</span>
            </div>
            <p className="text-[12.5px] text-muted-foreground">
              Engineered by <strong className="text-foreground">Zinth Labs</strong> — a digital product studio building specialized sports and venue operating software.
            </p>
          </div>
          <div className="text-[11.5px] text-muted-foreground sm:text-right shrink-0">
            <div>Support: <a href="mailto:support@zinthlabs.in" className="text-primary hover:underline">support@zinthlabs.in</a></div>
            <div className="text-[11px]">zinthlabs.in</div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
