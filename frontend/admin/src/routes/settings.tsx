import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BackendNote, PageHeader, Panel, PanelHead } from "@/components/turf/ui-bits";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/settings")({
  head: () => pageMeta("Settings", "Business details and admin preferences."),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" desc="Business information and preferences." />
      <BackendNote>These settings are proposed future functionality — they're not stored by the backend yet.</BackendNote>
      <Panel className="mb-4">
        <PanelHead title="Business information" />
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <Field label="Business name" value="Green Arena Turf" />
          <Field label="Contact phone" value="+91 98765 43210" />
          <Field label="Email" value="hello@greenarena.in" />
          <Field label="City" value="Bengaluru" />
          <div className="sm:col-span-2"><Field label="Address" value="Plot 21, Sports Complex Road" /></div>
        </div>
      </Panel>
      <Panel className="mb-4">
        <PanelHead title="Preferences" />
        <div className="divide-y">
          {[["Allow partial (advance) payments", true], ["SMS confirmation to customers", true], ["Daily booking summary email", false]].map(([l, v]) => (
            <label key={String(l)} className="flex items-center justify-between px-4 py-3 text-[13px]">{l}<Switch defaultChecked={Boolean(v)} /></label>
          ))}
        </div>
      </Panel>
      <div className="flex justify-end"><Button onClick={() => toast("Settings aren't saved yet — requires backend support")}>Save changes</Button></div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return <div className="space-y-1.5"><Label className="text-[12.5px]">{label}</Label><Input defaultValue={value} className="h-9" /></div>;
}
