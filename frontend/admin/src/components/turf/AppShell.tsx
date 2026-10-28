import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell, CalendarDays, ChevronDown, Clock, CreditCard, Goal, LayoutDashboard, LogOut, Plus, Search, Settings, Ticket, ListChecks, Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { BookingModal } from "./BookingModal";

const nav = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/bookings", label: "Bookings", icon: ListChecks },
  { to: "/calendar", label: "Calendar & Availability", icon: CalendarDays },
  { to: "/services", label: "Services / Pitches", icon: Layers },
  { to: "/pricing", label: "Time Slots & Pricing", icon: Clock },
  { to: "/coupons", label: "Coupons", icon: Ticket },
  { to: "/payments", label: "Payments", icon: CreditCard },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { openBooking } = useStore();
  const current = nav.find((n) => n.to === path) ?? nav[0];

  return (
    <div className="flex min-h-screen w-full bg-surface">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[220px] flex-col border-r bg-sidebar md:flex">
        <div className="flex h-14 items-center gap-2.5 border-b px-4">
          <div className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <Goal className="size-4.5" />
          </div>
          <div className="leading-tight">
            <div className="text-[13.5px] font-semibold">Turf Booking</div>
            <div className="text-[11px] text-muted-foreground">Admin console</div>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 p-2.5">
          {nav.map((n) => {
            const active = n.to === path;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium text-sidebar-foreground transition-colors hover:bg-secondary",
                  active && "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent",
                )}
              >
                <n.icon className={cn("size-4", active ? "text-primary" : "text-muted-foreground")} />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-2.5">
          <div className="flex items-center gap-2.5 rounded-md px-2 py-2">
            <div className="grid size-8 place-items-center rounded-full bg-primary-soft text-[12px] font-semibold text-primary-soft-foreground">SU</div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-[13px] font-medium">Sheikh Umaid</div>
              <div className="truncate text-[11px] text-muted-foreground">Owner</div>
            </div>
            <button aria-label="Log out" className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground">
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:pl-[220px]">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background px-5">
          <div className="text-[13px] text-muted-foreground">
            Admin <span className="mx-1">/</span> <span className="font-medium text-foreground">{current.label}</span>
          </div>
          <div className="relative ml-auto hidden w-64 lg:block">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Search bookings or customers…" className="h-8 w-full rounded-md border bg-surface pl-8 pr-3 text-[13px] outline-none focus:border-primary/40 focus:bg-background" />
          </div>
          <button aria-label="Notifications" className="relative grid size-8 place-items-center rounded-md hover:bg-secondary">
            <Bell className="size-4" />
            <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-destructive" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-secondary">
              <div className="grid size-7 place-items-center rounded-full bg-primary-soft text-[11px] font-semibold text-primary-soft-foreground">SU</div>
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel>Sheikh Umaid</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link to="/settings">Settings</Link></DropdownMenuItem>
              <DropdownMenuItem>Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" onClick={() => openBooking()} className="gap-1.5">
            <Plus className="size-4" /> Quick Booking
          </Button>
        </header>
        <main className="flex-1 p-5 lg:p-6">{children}</main>
      </div>
      <BookingModal />
    </div>
  );
}
