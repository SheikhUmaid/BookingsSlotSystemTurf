import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/lib/turf-data";

const statusStyles: Record<string, string> = {
  Paid: "bg-success-soft text-success border-success/20",
  Available: "bg-success-soft text-success border-success/20",
  Active: "bg-success-soft text-success border-success/20",
  Full: "bg-primary-soft text-primary-soft-foreground border-primary/20",
  Partial: "bg-warning-soft text-warning border-warning/30",
  Pending: "bg-warning-soft text-warning border-warning/30",
  Booked: "bg-secondary text-secondary-foreground border-border",
  Cancelled: "bg-danger-soft text-destructive border-destructive/20",
  Expired: "bg-secondary text-muted-foreground border-border",
  Inactive: "bg-secondary text-muted-foreground border-border",
};

export function StatusBadge({ status }: { status: BookingStatus | string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11.5px] font-medium", statusStyles[status] ?? statusStyles["Booked"])}>
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function PageHeader({ title, desc, actions }: { title: string; desc?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[20px] font-semibold tracking-tight">{title}</h1>
        {desc && <p className="mt-0.5 text-[13px] text-muted-foreground">{desc}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-lg border bg-card shadow-card", className)}>{children}</div>;
}

export function PanelHead({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b px-4 py-3">
      <h3 className="text-[13.5px] font-semibold">{title}</h3>
      {right}
    </div>
  );
}

export function BackendNote({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex items-start gap-2 rounded-md border border-primary/15 bg-primary-soft px-3 py-2 text-[12.5px] text-primary-soft-foreground">
      <Info className="mt-0.5 size-3.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export const selectCls =
  "h-8 rounded-md border border-input bg-background px-2.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring/30";

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cn("bg-surface px-3 py-2.5 text-left text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground", className)}>{children}</th>;
}
export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("border-t px-3 py-2.5 text-[13px]", className)}>{children}</td>;
}
