import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarClock,
  CheckCircle2,
  Copy,
  ArrowDown,
  Lock,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PageHeader, Panel } from "@/components/turf/ui-bits";
import { ChangePlan } from "@/components/turf/ChangePlan";
import { FEATURE_INFO } from "@/lib/features";
import { pageMeta } from "@/lib/meta";
import { cn } from "@/lib/utils";
import { useSubscription, type UsageEntry } from "@/lib/useSubscription";

export const Route = createFileRoute("/subscription")({
  head: () =>
    pageMeta("Subscription", "Your TurfOS plan, what it includes, and what changes if you switch."),
  component: SubscriptionPage,
});

const fmtDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : "—";

const fmtTime = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "never";

const LIMITS: { key: string; title: string; one: string; many: string }[] = [
  { key: "maxPitches", title: "Pitches", one: "pitch", many: "pitches" },
  { key: "maxAdmins", title: "Admin logins", one: "admin", many: "admins" },
  { key: "maxStaff", title: "Staff logins", one: "staff account", many: "staff accounts" },
];

type Health = "active" | "expiring" | "blocked";

function SubscriptionPage() {
  const { data, isLoading, isFetching, refetch, plan, noPlan, isInactive, usage, deploymentId } =
    useSubscription();

  const daysLeft = data?.daysLeft ?? 0;
  const health: Health = isInactive ? "blocked" : daysLeft <= 7 ? "expiring" : "active";

  const features = Object.keys({ ...FEATURE_INFO, ...(plan?.features ?? {}) });
  const included = features.filter((k) => plan?.features?.[k] === true);
  const locked = features.filter((k) => plan?.features?.[k] !== true);

  const copyId = () => {
    navigator.clipboard.writeText(deploymentId);
    toast.success(`Deployment ID ${deploymentId} copied`);
  };

  const refresh = async () => {
    const res = await refetch();
    if (res.data?.registryReachable) toast.success("Subscription status is up to date");
    else toast.warning("Couldn't reach Zinth Labs right now — showing your last saved plan");
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader
        title="Subscription"
        desc="Your TurfOS plan, what it includes, and what happens if you change it."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isFetching}
            className="gap-1.5"
          >
            <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
            Refresh status
          </Button>
        }
      />

      {/* ───────────── 1. Where you stand ───────────── */}
      <Panel
        className={cn(
          "overflow-hidden border-2",
          health === "blocked"
            ? "border-destructive/30"
            : health === "expiring"
              ? "border-warning/40"
              : "border-primary/20",
        )}
      >
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
              Your plan
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Sparkles className="size-6 text-primary" />
              <span className="text-[28px] font-semibold leading-none tracking-tight">
                {isLoading ? "…" : (plan?.name ?? "No plan")}
              </span>
              {!isLoading && <HealthBadge health={health} noPlan={noPlan} status={data?.status} />}
            </div>

            <p className="max-w-xl text-[13.5px] leading-relaxed text-foreground/90">
              {isLoading ? (
                "Checking your subscription…"
              ) : noPlan ? (
                <>
                  There is no plan attached to your TurfOS account. Until one is added,{" "}
                  <strong>customers can't book</strong> and you can look at your data but{" "}
                  <strong>can't change anything</strong>.
                </>
              ) : health === "blocked" ? (
                <>
                  Your subscription is <strong>{data?.isExpired ? "expired" : data?.status}</strong>
                  . Your data is safe, but until it's renewed <strong>customers can't book</strong>{" "}
                  and you can only view — not edit — anything in this panel.
                </>
              ) : health === "expiring" ? (
                <>
                  Everything is working, but your subscription ends in{" "}
                  <strong>
                    {daysLeft} {daysLeft === 1 ? "day" : "days"}
                  </strong>
                  . Renew before <strong>{fmtDate(data?.expiresAt)}</strong> to avoid interruption.
                </>
              ) : (
                <>
                  Everything is working normally. Your subscription is paid until{" "}
                  <strong>{fmtDate(data?.expiresAt)}</strong> ({daysLeft} days left).
                </>
              )}
            </p>

            {!isLoading && !isInactive && data?.bookingEnabled === false && (
              <p className="flex items-start gap-2 rounded-md bg-warning-soft px-3 py-2 text-[12.5px] text-warning">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                Online bookings are currently switched off for your venue. Contact Zinth Labs if
                this is unexpected.
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
            <Button asChild className="gap-1.5">
              <a href="#change-plan">
                {health === "active" ? "Change plan" : "Renew subscription"}
                <ArrowDown className="size-3.5" />
              </a>
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t bg-surface px-5 py-2.5 text-[12px] text-muted-foreground sm:px-6">
          <span className="flex items-center gap-1.5">
            <CalendarClock className="size-3.5" />
            Paid until {fmtDate(data?.expiresAt)}
          </span>
          <span className="flex items-center gap-1.5">
            Account ID <span className="font-mono text-foreground">{deploymentId}</span>
            <button
              onClick={copyId}
              title="Copy account ID"
              className="text-primary hover:text-primary/80"
            >
              <Copy className="size-3.5" />
            </button>
          </span>
          <span>
            Last checked {fmtTime(data?.syncedAt)}
            {data && !data.registryReachable && " · offline, showing saved plan"}
          </span>
        </div>
      </Panel>

      {/* ───────────── 2. Usage against limits ───────────── */}
      {plan && (
        <section>
          <SectionTitle
            title="How much of your plan you're using"
            desc="Some things have a maximum number you can add on your plan."
          />
          <div className="grid gap-3 sm:grid-cols-3">
            {LIMITS.map((l) => (
              <UsageCard key={l.key} title={l.title} one={l.one} many={l.many} u={usage(l.key)} />
            ))}
          </div>
        </section>
      )}

      {/* ───────────── 3. What's included ───────────── */}
      {plan && (
        <section>
          <SectionTitle
            title="What your plan includes"
            desc={`Everything on the left works now. Things on the right need a higher plan.`}
          />
          <div className="grid gap-3 lg:grid-cols-2">
            <Panel className="p-4">
              <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-success">
                <CheckCircle2 className="size-4" /> Included in {plan.name} ({included.length})
              </div>
              <FeatureList keys={included} on />
            </Panel>
            <Panel className="p-4">
              <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-muted-foreground">
                <Lock className="size-4" /> Not included — upgrade to unlock ({locked.length})
              </div>
              {locked.length ? (
                <FeatureList keys={locked} on={false} />
              ) : (
                <p className="text-[12.5px] text-muted-foreground">
                  You have every feature TurfOS offers. 🎉
                </p>
              )}
            </Panel>
          </div>
        </section>
      )}

      {/* ───────────── 4. Changing plans explained ───────────── */}
      <section>
        <SectionTitle
          title="Thinking of changing your plan?"
          desc="Here's exactly what happens either way. You never lose your data."
        />
        <div className="grid gap-3 md:grid-cols-2">
          <ChangeCard
            icon={<ArrowUpCircle className="size-5" />}
            tone="up"
            title="Moving to a higher plan"
            points={[
              "Locked features unlock on their own within a few minutes — nothing to install.",
              "Your limits go up, so you can add more pitches, admins or staff straight away.",
              "All your bookings, customers, coupons and settings stay exactly as they are.",
            ]}
          />
          <ChangeCard
            icon={<ArrowDownCircle className="size-5" />}
            tone="down"
            title="Moving to a lower plan"
            points={[
              "Nothing is deleted. Your bookings, pitches, coupons and reports data are kept.",
              "If you have more pitches or staff than the new plan allows, they keep working — you just can't add new ones until you're under the limit.",
              "Features that aren't in the new plan get locked. Their data is saved and comes back if you upgrade again.",
              "If the new plan has no staff logins, staff can't sign in until you upgrade again (their accounts are kept).",
            ]}
            footer={<DowngradeCheck />}
          />
        </div>
      </section>

      {/* ───────────── 5. Renew / change plan ───────────── */}
      <section id="change-plan" className="scroll-mt-4">
        <SectionTitle
          title="Renew or change your plan"
          desc="Pick a plan, pay with any UPI app, then let us know. Your plan updates as soon as we confirm the payment."
        />
        <ChangePlan deploymentId={deploymentId} />
      </section>

      {/* ───────────── 6. Common questions ───────────── */}
      <section>
        <SectionTitle title="Common questions" />
        <Panel className="px-5">
          <Accordion type="single" collapsible>
            <Faq q="What happens if my subscription expires?">
              Your data is kept safe, but customers can't make new bookings and this panel switches
              to view-only until you renew. As soon as it's renewed, everything works again — no
              setup needed.
            </Faq>
            <Faq q="Will I lose anything if I downgrade?">
              No. TurfOS never deletes data because of a plan change. Extra pitches and staff keep
              working; you just can't add more until you're within the new plan's limits. Locked
              features keep their data for when you upgrade again.
            </Faq>
            <Faq q="I upgraded but a feature still shows as locked.">
              Press <strong>Refresh status</strong> at the top of this page. If it still shows the
              old plan after Zinth Labs has confirmed your payment, contact us with your account ID.
            </Faq>
            <Faq q="Is this the money my customers pay me?">
              No — this page is only about your TurfOS subscription with Zinth Labs. Customer
              booking payments are shown on the Bookings page.
            </Faq>
          </Accordion>
        </Panel>
      </section>
    </div>
  );
}

function HealthBadge({
  health,
  noPlan,
  status,
}: {
  health: Health;
  noPlan: boolean;
  status?: string | undefined;
}) {
  if (health === "blocked") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-0.5 text-[12px] font-semibold text-destructive">
        <ShieldAlert className="size-3.5" />
        {noPlan
          ? "No plan"
          : status === "suspended"
            ? "Suspended"
            : status === "inactive"
              ? "Inactive"
              : "Expired"}
      </span>
    );
  }
  if (health === "expiring") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning-soft px-2.5 py-0.5 text-[12px] font-semibold text-warning">
        <AlertTriangle className="size-3.5" /> Ending soon
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success-soft px-2.5 py-0.5 text-[12px] font-semibold text-success">
      <span className="size-1.5 rounded-full bg-current" /> Active
    </span>
  );
}

function SectionTitle({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mb-2.5">
      <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
      {desc && <p className="text-[12.5px] text-muted-foreground">{desc}</p>}
    </div>
  );
}

function UsageCard({
  title,
  one,
  many,
  u,
}: {
  title: string;
  one: string;
  many: string;
  u: UsageEntry | undefined;
}) {
  if (!u) return null;
  const noun = (n: number) => (n === 1 ? one : many);
  const unlimited = u.max === null;
  const max = u.max ?? 0;
  const left = unlimited ? Infinity : Math.max(0, max - u.used);
  const pct = unlimited ? 0 : max === 0 ? 100 : Math.min(100, (u.used / max) * 100);

  let message: ReactNode;
  let tone = "text-muted-foreground";
  if (unlimited) {
    message = `No limit — add as many ${many} as you need.`;
  } else if (max === 0 && u.used === 0) {
    message = `Not included in your plan.`;
  } else if (u.overLimit) {
    tone = "text-destructive";
    message = `You have ${u.used - max} more than your plan allows. They still work, but you can't add new ones.`;
  } else if (u.atLimit) {
    tone = "text-warning";
    message = `Limit reached. Upgrade to add more ${many}.`;
  } else {
    message = `You can add ${left} more ${noun(left)}.`;
  }

  return (
    <Panel className="p-4">
      <div className="text-[12.5px] text-muted-foreground">{title}</div>
      <div className="mt-1 text-[22px] font-semibold tabular-nums tracking-tight">
        {u.used}
        <span className="text-[14px] font-normal text-muted-foreground">
          {" "}
          / {unlimited ? "unlimited" : max}
        </span>
      </div>
      {!unlimited && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className={cn(
              "h-full rounded-full",
              u.overLimit ? "bg-destructive" : u.atLimit ? "bg-warning" : "bg-primary",
            )}
            style={{ width: `${Math.max(pct, u.used > 0 ? 4 : 0)}%` }}
          />
        </div>
      )}
      <p className={cn("mt-2 text-[12px] leading-snug", tone)}>{message}</p>
    </Panel>
  );
}

function FeatureList({ keys, on }: { keys: string[]; on: boolean }) {
  return (
    <ul className="space-y-2.5">
      {keys.map((k) => (
        <li key={k} className="flex items-start gap-2.5">
          {on ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
          ) : (
            <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground/60" />
          )}
          <div>
            <div className={cn("text-[13px] font-medium", !on && "text-muted-foreground")}>
              {FEATURE_INFO[k]?.label ?? k}
            </div>
            {FEATURE_INFO[k]?.desc && (
              <div className="text-[12px] text-muted-foreground">{FEATURE_INFO[k]?.desc}</div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function ChangeCard({
  icon,
  tone,
  title,
  points,
  footer,
}: {
  icon: ReactNode;
  tone: "up" | "down";
  title: string;
  points: string[];
  footer?: ReactNode;
}) {
  return (
    <Panel className="flex flex-col p-5">
      <div
        className={cn(
          "flex items-center gap-2 text-[14px] font-semibold",
          tone === "up" ? "text-success" : "text-foreground",
        )}
      >
        <span
          className={cn(
            "grid size-8 place-items-center rounded-full",
            tone === "up" ? "bg-success-soft" : "bg-secondary",
          )}
        >
          {icon}
        </span>
        {title}
      </div>
      <ul className="mt-3 space-y-2">
        {points.map((p) => (
          <li key={p} className="flex gap-2 text-[12.5px] leading-relaxed text-foreground/85">
            <span className="mt-[7px] size-1 shrink-0 rounded-full bg-muted-foreground" />
            {p}
          </li>
        ))}
      </ul>
      {footer}
    </Panel>
  );
}

/** Tells the owner, from their own numbers, what a smaller plan would need to cover. */
function DowngradeCheck() {
  const { usage, plan } = useSubscription();
  if (!plan) return null;
  const pitches = usage("maxPitches")?.used ?? 0;
  const staff = usage("maxStaff")?.used ?? 0;
  const admins = usage("maxAdmins")?.used ?? 0;
  return (
    <div className="mt-4 rounded-md border bg-surface px-3 py-2.5 text-[12px] leading-relaxed text-muted-foreground">
      <strong className="text-foreground">Before you downgrade:</strong> you currently have{" "}
      <strong className="text-foreground">
        {pitches} {pitches === 1 ? "pitch" : "pitches"}
      </strong>
      ,{" "}
      <strong className="text-foreground">
        {admins} {admins === 1 ? "admin" : "admins"}
      </strong>{" "}
      and{" "}
      <strong className="text-foreground">
        {staff} staff {staff === 1 ? "account" : "accounts"}
      </strong>
      . Pick a plan that allows at least these if you want to keep adding new ones.
    </div>
  );
}

function Faq({ q, children }: { q: string; children: ReactNode }) {
  return (
    <AccordionItem value={q}>
      <AccordionTrigger className="text-[13px]">{q}</AccordionTrigger>
      <AccordionContent className="text-[12.5px] leading-relaxed text-muted-foreground">
        {children}
      </AccordionContent>
    </AccordionItem>
  );
}
