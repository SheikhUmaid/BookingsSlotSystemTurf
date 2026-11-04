import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowUpRight, Lock, ShieldOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Panel } from "./ui-bits";
import { useSubscription, type FeatureKey, type LimitKey } from "@/lib/useSubscription";
import { FEATURE_INFO } from "@/lib/features";

const LIMIT_NOUNS: Record<string, [string, string]> = {
  maxPitches: ["pitch", "pitches"],
  maxStaff: ["staff account", "staff accounts"],
  maxAdmins: ["admin", "admins"],
};

export function UpgradeBadge({
  className,
  label = "Upgrade plan",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary-soft px-2 py-0.5 text-[10.5px] font-semibold text-primary-soft-foreground",
        className,
      )}
    >
      <Lock className="size-3" />
      {label}
    </span>
  );
}

/** Link to the plan/subscription page (admins) or a hint to ask an admin (staff). */
export function UpgradeLink({ className }: { className?: string }) {
  const { isAdmin } = useSubscription();
  if (!isAdmin) {
    return (
      <span className={cn("text-[12px] text-muted-foreground", className)}>
        Ask your admin to upgrade the plan.
      </span>
    );
  }
  return (
    <Link
      to="/subscription"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[12.5px] font-semibold text-primary-foreground shadow-sm hover:bg-primary/90",
        className,
      )}
    >
      Upgrade plan <ArrowUpRight className="size-3.5" />
    </Link>
  );
}

/** Full-panel placeholder shown instead of a feature the plan doesn't include. */
export function FeatureLocked({
  feature,
  className,
  compact = false,
}: {
  feature: FeatureKey;
  className?: string;
  compact?: boolean;
}) {
  const { plan } = useSubscription();
  const info = FEATURE_INFO[feature] ?? { label: feature, desc: "" };
  return (
    <Panel
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "p-6" : "p-10",
        className,
      )}
    >
      <div className="grid size-11 place-items-center rounded-full bg-primary-soft text-primary">
        <Lock className="size-5" />
      </div>
      <h3 className="mt-3 text-[15px] font-semibold">{info.label}</h3>
      {info.desc && (
        <p className="mt-1 max-w-sm text-[12.5px] text-muted-foreground">{info.desc}</p>
      )}
      <p className="mt-2 text-[12.5px] text-muted-foreground">
        Not included in your{" "}
        <span className="font-medium text-foreground">{plan?.name ?? "current"}</span> plan.
      </p>
      <UpgradeLink className="mt-4" />
    </Panel>
  );
}

/** Renders children only when the feature is on, otherwise the locked placeholder. */
export function FeatureGate({
  feature,
  children,
  compact = false,
}: {
  feature: FeatureKey;
  children: ReactNode;
  compact?: boolean;
}) {
  const { hasFeature } = useSubscription();
  return hasFeature(feature) ? (
    <>{children}</>
  ) : (
    <FeatureLocked feature={feature} compact={compact} />
  );
}

/** "2 / 3 pitches" with a progress bar. */
export function UsageMeter({ limitKey, className }: { limitKey: LimitKey; className?: string }) {
  const { usage } = useSubscription();
  const u = usage(limitKey);
  if (!u) return null;
  const [one, many] = LIMIT_NOUNS[limitKey] ?? ["item", "items"];
  const noun = (n: number | null) => (n === 1 ? one : many);
  const pct = u.max === null ? 0 : u.max === 0 ? 100 : Math.min(100, (u.used / u.max) * 100);

  return (
    <div className={cn("min-w-[140px]", className)}>
      <div className="flex items-baseline justify-between gap-3 text-[12px]">
        <span
          className={cn(
            "font-semibold tabular-nums",
            u.atLimit && u.max !== null ? "text-warning" : "text-foreground",
          )}
        >
          {u.max === null ? (
            <>
              {u.used} {noun(u.used)}{" "}
              <span className="font-normal text-muted-foreground">· unlimited</span>
            </>
          ) : (
            <>
              {u.used} / {u.max} {noun(u.max)}
            </>
          )}
        </span>
      </div>
      {u.max !== null && (
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={cn(
              "h-full rounded-full",
              u.overLimit ? "bg-destructive" : u.atLimit ? "bg-warning" : "bg-primary",
            )}
            style={{ width: `${Math.max(pct, u.used > 0 ? 4 : 0)}%` }}
          />
        </div>
      )}
    </div>
  );
}

/** Banner shown when a downgrade left the account over a limit. Nothing is deleted. */
export function OverLimitNotice({ limitKey }: { limitKey: LimitKey }) {
  const { usage, plan } = useSubscription();
  const u = usage(limitKey);
  if (!u?.overLimit || u.max === null) return null;
  const [one, many] = LIMIT_NOUNS[limitKey] ?? ["item", "items"];
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-warning/30 bg-warning-soft px-3 py-2.5 text-[12.5px] text-warning">
      <span className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <span>
          You have {u.used} {u.used === 1 ? one : many}, but the {plan?.name ?? "current"} plan
          allows {u.max}. Everything you already have keeps working — you just can't add more.
        </span>
      </span>
      <UpgradeLink />
    </div>
  );
}

export function NoAccess() {
  return (
    <Panel className="flex flex-col items-center justify-center p-10 text-center">
      <div className="grid size-11 place-items-center rounded-full bg-secondary text-muted-foreground">
        <ShieldOff className="size-5" />
      </div>
      <h3 className="mt-3 text-[15px] font-semibold">You don't have access to this section</h3>
      <p className="mt-1 max-w-sm text-[12.5px] text-muted-foreground">
        Ask an admin to grant you access.
      </p>
    </Panel>
  );
}
