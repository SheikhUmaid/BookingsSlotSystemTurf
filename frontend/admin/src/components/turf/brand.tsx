import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const ZINTH_URL = "https://zinthlabs.in";

/** Square brand mark: black tile with the orange-underlined "Z". */
export function ZinthMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-md bg-ink font-display text-[19px] font-bold leading-none text-ink-foreground",
        className,
      )}
    >
      Z
      <span className="absolute inset-x-0 bottom-0 h-[3px] bg-primary" />
    </div>
  );
}

/**
 * Official TurfOS "Field" symbol (white top, Zinth Orange bottom), shown on a black
 * tile like the app icon so the white half stays visible on light backgrounds.
 * Never recolour the symbol itself.
 */
export function TurfOSMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-[22%] bg-[#0b0b0b]",
        className,
      )}
    >
      <img src="/turfos-symbol.svg" alt="" className="size-[72%]" />
    </span>
  );
}

/**
 * Official TurfOS wordmark ("Turf" + orange "OS"). Uses the ink artwork on light
 * backgrounds and the light artwork in dark mode, so "Turf" always stays readable.
 */
export function TurfOSWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex h-5 shrink-0", className)}>
      <img src="/turfos-wordmark-ink.png" alt="TurfOS" className="h-full w-auto dark:hidden" />
      <img src="/turfos-wordmark-light.png" alt="TurfOS" className="hidden h-full w-auto dark:block" />
    </span>
  );
}

/** Product lockup used in the sidebar / mobile drawer. */
export function ProductLockup() {
  return (
    <div className="flex items-center gap-2.5">
      <TurfOSMark />
      <div className="leading-none">
        <TurfOSWordmark className="h-[19px]" />
        <div className="mt-1 font-display text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          by <span className="text-primary">Zinth Labs</span>
        </div>
      </div>
    </div>
  );
}

/** Condensed "ZINTH LABS Pvt. Ltd." wordmark, matching the zinthlabs.in hero. */
export function ZinthWordmark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "text-[22px]",
    md: "text-[40px]",
    lg: "text-[64px] sm:text-[84px]",
  };
  return (
    <div
      className={cn(
        "font-display font-bold uppercase tracking-tight",
        sizes[size],
        "leading-[0.85]",
        className,
      )}
    >
      <div>Zinth</div>
      <div className="flex items-start">
        Labs
        <span className="ml-1.5 mt-[0.12em] text-[0.16em] font-semibold normal-case leading-none tracking-normal">
          Pvt Ltd
        </span>
      </div>
    </div>
  );
}

/** Small black credit card shown at the bottom of the sidebar. */
export function BuiltByZinth({ className }: { className?: string }) {
  return (
    <a
      href={ZINTH_URL}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "group block rounded-md bg-ink px-3 py-2.5 text-ink-foreground transition-colors hover:bg-ink/90",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[9.5px] font-medium uppercase tracking-[0.16em] text-ink-foreground/55">
          Built by
        </span>
        <ArrowUpRight className="size-3.5 text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </div>
      <div className="font-display text-[17px] font-bold uppercase leading-tight tracking-wide">
        Zinth <span className="text-primary">Labs</span>
      </div>
      <div className="text-[10px] leading-snug text-ink-foreground/60">
        Digital product studio for bold businesses.
      </div>
    </a>
  );
}

/** Thin page footer credit. */
export function ZinthFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "flex flex-col items-center justify-between gap-1.5 border-t px-4 py-3 text-[11.5px] text-muted-foreground sm:flex-row sm:px-5 lg:px-6",
        className,
      )}
    >
      <span>© {new Date().getFullYear()} Zinth Labs Pvt. Ltd. All rights reserved.</span>
      <a
        href={ZINTH_URL}
        target="_blank"
        rel="noreferrer"
        className="group inline-flex items-center gap-1 hover:text-foreground"
      >
        Crafted by
        <span className="font-display text-[13px] font-bold uppercase tracking-wide text-foreground">
          Zinth <span className="text-primary">Labs</span>
        </span>
        <ArrowUpRight className="size-3 text-primary" />
      </a>
    </footer>
  );
}
