import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/turf-data";

export type DayState = "open" | "limited" | "full" | "past";

export function MonthCalendar({
  selected,
  onSelect,
  today,
  dayState,
}: {
  selected: string;
  onSelect: (d: string) => void;
  today: Date;
  dayState: (date: string) => DayState;
}) {
  const sel = new Date(selected + "T00:00:00");
  const [view, setView] = useState(new Date(sel.getFullYear(), sel.getMonth(), 1));
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const startPad = (first.getDay() + 6) % 7; // Monday first
  const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [...Array(startPad).fill(null), ...Array.from({ length: days }, (_, i) => new Date(view.getFullYear(), view.getMonth(), i + 1))];
  while (cells.length % 7) cells.push(null);
  const todayStr = fmtDate(today);

  const shift = (n: number) => setView(new Date(view.getFullYear(), view.getMonth() + n, 1));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold">
          {view.toLocaleString("en-IN", { month: "long" })} <span className="text-muted-foreground">{view.getFullYear()}</span>
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setView(new Date(today.getFullYear(), today.getMonth(), 1));
              onSelect(todayStr);
            }}
            className="h-7 rounded-md border px-2.5 text-[12px] font-medium hover:bg-secondary"
          >
            Today
          </button>
          <button aria-label="Previous month" onClick={() => shift(-1)} className="grid size-7 place-items-center rounded-md border hover:bg-secondary">
            <ChevronLeft className="size-4" />
          </button>
          <button aria-label="Next month" onClick={() => shift(1)} className="grid size-7 place-items-center rounded-md border hover:bg-secondary">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((d) => (
          <div key={d} className="pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground">
            {d}
          </div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="h-10" />;
          const ds = fmtDate(d);
          const st = dayState(ds);
          const isSel = ds === selected;
          const isToday = ds === todayStr;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(ds)}
              className={cn(
                "relative flex h-10 flex-col items-center justify-center rounded-lg border border-transparent text-[13px] font-medium transition-all",
                st === "past"
                  ? "text-muted-foreground/50 hover:bg-muted/50"
                  : "text-foreground hover:bg-accent/60",
                isToday && !isSel && "border-blue-500 font-semibold text-blue-600",
                isSel && "border-blue-600 bg-blue-600 font-semibold text-white shadow-sm hover:bg-blue-600"
              )}
            >
              <span>{d.getDate()}</span>
              {(st !== "past" || isSel) && (
                <span
                  className={cn(
                    "absolute bottom-1 size-1 rounded-full",
                    isSel
                      ? "bg-white"
                      : st === "open"
                      ? "bg-emerald-500"
                      : st === "limited"
                      ? "bg-amber-500"
                      : "bg-red-500"
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t pt-3 text-[11.5px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-500" /> Open
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-amber-500" /> Limited
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-red-500" /> Fully booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded border border-blue-500" /> Today
        </span>
      </div>
    </div>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-2 rounded-full", cls)} /> {label}
    </span>
  );
}
