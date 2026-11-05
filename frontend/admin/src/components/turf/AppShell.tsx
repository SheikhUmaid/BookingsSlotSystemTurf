import { useState, type ReactNode } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  AlertOctagon,
  ArrowRight,
  Bell,
  CalendarDays,
  ChevronDown,
  Clock,
  CreditCard,
  LayoutDashboard,
  Menu,
  LogOut,
  Plus,
  Search,
  Settings,
  Ticket,
  ListChecks,
  Layers,
  LandPlot,
  Lock,
  BarChart3,
  Users,
  Sparkles,
  Contact,
  Wallet,
  Repeat,
  Receipt,
  ClipboardList,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { BookingModal } from "./BookingModal";
import { useSubscription, type FeatureKey, type StaffArea } from "@/lib/useSubscription";
import { NoAccess } from "./plan";
import { BuiltByZinth, ProductLockup, ZinthFooter } from "./brand";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** Staff permission needed (admins always pass). */
  area?: StaffArea;
  /** Admin-only section: hidden for staff. */
  adminOnly?: boolean;
  /** Shown with a lock + "Upgrade" tag unless at least one of these features is on. */
  features?: FeatureKey[];
  /** Sidebar section heading */
  group: "Operations" | "Customers" | "Money" | "Setup";
};

const nav: NavItem[] = [
  { to: "/", label: "Overview", icon: LayoutDashboard, area: "dashboard", features: ["basicAnalytics"], group: "Operations" },
  { to: "/bookings", label: "Bookings", icon: ListChecks, area: "bookings", group: "Operations" },
  { to: "/calendar", label: "Calendar & Availability", icon: CalendarDays, area: "calendar", features: ["calendarManagement"], group: "Operations" },
  { to: "/recurring", label: "Recurring Bookings", icon: Repeat, area: "recurring", features: ["manualBookings"], group: "Operations" },
  { to: "/maintenance", label: "Maintenance", icon: Wrench, area: "maintenance", group: "Operations" },
  { to: "/customers", label: "Customers", icon: Contact, area: "customers", group: "Customers" },
  { to: "/coupons", label: "Coupons", icon: Ticket, area: "coupons", features: ["coupons"], group: "Customers" },
  { to: "/daily-report", label: "Daily Report", icon: ClipboardList, area: "reports", group: "Money" },
  { to: "/payments", label: "Payments", icon: Wallet, area: "payments", group: "Money" },
  { to: "/expenses", label: "Expenses", icon: Receipt, area: "expenses", group: "Money" },
  {
    to: "/reports",
    label: "Reports",
    icon: BarChart3,
    area: "reports",
    features: ["advancedAnalytics", "leaderboards", "pitchWiseReports", "financialExports"],
    group: "Money",
  },
  { to: "/services", label: "Services", icon: Layers, area: "services", group: "Setup" },
  { to: "/pitches", label: "Pitches", icon: LandPlot, area: "pitches", group: "Setup" },
  { to: "/pricing", label: "Time Slots & Pricing", icon: Clock, area: "pricing", group: "Setup" },
  { to: "/team", label: "Team", icon: Users, adminOnly: true, group: "Setup" },
  { to: "/subscription", label: "Subscription", icon: CreditCard, adminOnly: true, group: "Setup" },
  { to: "/settings", label: "Settings", icon: Settings, adminOnly: true, group: "Setup" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { openBooking } = useStore();
  const current = nav.find((n) => n.to === path) ?? nav[0]!;

  const navigate = useNavigate();
  const { isInactive, status, noPlan, manualBookingLocked, bookingsDisabled, isAdmin, can, role } =
    useSubscription();
  const allowed = (n: NavItem) => (n.adminOnly ? isAdmin : !n.area || can(n.area));
  const currentRoute = nav.find((n) => n.to === path);
  const blockedHere = currentRoute ? !allowed(currentRoute) : false;
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("admin_user");
    toast.success("Logged out successfully");
    navigate({ to: "/login" });
  };

  const adminUser =
    typeof window !== "undefined"
      ? (() => {
          try {
            return JSON.parse(localStorage.getItem("admin_user") || "null");
          } catch {
            return null;
          }
        })()
      : null;
  const adminName = adminUser?.name || "Sheikh Umaid";
  const adminRole = role === "staff" ? "Staff" : "Owner / Admin";
  const adminInitials =
    adminName
      .split(" ")
      .filter(Boolean)
      .map((w: string) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "SU";

  return (
    <div className="flex min-h-screen w-full bg-surface">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[220px] flex-col border-r bg-sidebar md:flex">
        <SidebarBody
          path={path}
          adminName={adminName}
          adminRole={adminRole}
          adminInitials={adminInitials}
          onLogout={handleLogout}
        />
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          className="flex w-[260px] flex-col gap-0 bg-sidebar p-0 sm:max-w-[260px]"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarBody
            path={path}
            adminName={adminName}
            adminRole={adminRole}
            adminInitials={adminInitials}
            onLogout={handleLogout}
            onNavigate={() => setMobileNavOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col md:pl-[220px]">
        {/* GLOBAL INACTIVE WARNING BANNER */}
        {isInactive && (
          <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 bg-destructive px-4 py-2.5 sm:px-5 text-destructive-foreground shadow-md">
            <div className="flex min-w-0 items-center gap-2.5 text-[12.5px] font-medium sm:text-[13px]">
              <AlertOctagon className="size-4.5 shrink-0 animate-pulse" />
              <span>
                {noPlan ? (
                  <>
                    <strong>No active plan.</strong> This deployment has no subscription plan, so
                    write access is disabled (view-only mode) until a plan is assigned.
                  </>
                ) : (
                  <>
                    <strong>Your account is {status.toUpperCase()}.</strong> Write access is currently
                    disabled (view-only mode). You cannot create bookings, coupons, or update pitches
                    until the license is renewed.
                  </>
                )}
              </span>
            </div>
            {isAdmin && (
              <Link
                to="/subscription"
                className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1 text-[12px] font-semibold text-destructive shadow-sm hover:bg-white/95"
              >
                Renew Subscription <ArrowRight className="size-3.5" />
              </Link>
            )}
          </div>
        )}
        {!isInactive && bookingsDisabled && (
          <div className="flex items-center gap-2.5 bg-warning-soft px-4 py-2 text-[12.5px] font-medium text-warning sm:px-5">
            <AlertOctagon className="size-4 shrink-0" />
            Bookings are currently disabled for this venue by the licence registry. Existing data is
            unaffected.
          </div>
        )}

        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background px-3 sm:gap-3 sm:px-5">
          <button
            aria-label="Open navigation"
            onClick={() => setMobileNavOpen(true)}
            className="grid size-9 shrink-0 place-items-center rounded-md border border-primary/40 text-primary hover:bg-primary-soft md:hidden"
          >
            <Menu className="size-4.5" />
          </button>
          <div className="min-w-0 truncate text-[13px] text-muted-foreground">
            <span className="hidden font-display text-[15px] font-bold uppercase tracking-wide text-foreground/80 sm:inline">
              TurfOS
            </span>
            <span className="mx-1 hidden sm:inline">/</span>
            <span className="font-medium text-foreground">{current.label}</span>
          </div>
          <div className="relative ml-auto hidden w-64 lg:block">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search bookings or customers…"
              className="h-8 w-full rounded-md border bg-surface pl-8 pr-3 text-[13px] outline-none focus:border-primary/40 focus:bg-background"
            />
          </div>
          <button
            aria-label="Notifications"
            className="relative ml-auto grid size-8 shrink-0 place-items-center rounded-md hover:bg-secondary lg:ml-0"
          >
            <Bell className="size-4" />
            <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-destructive" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex shrink-0 items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-secondary">
              <div className="grid size-7 place-items-center rounded-full bg-primary-soft text-[11px] font-semibold text-primary-soft-foreground">
                {adminInitials}
              </div>
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>
                <div className="font-semibold text-foreground">{adminName}</div>
                <div className="text-[10.5px] font-normal text-muted-foreground">
                  TurfOS by Zinth Labs
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isAdmin && (
                <>
                  <DropdownMenuItem asChild>
                    <Link to="/settings">Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/subscription">Subscription</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 size-3.5" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {manualBookingLocked ? (
            <Button
              size="sm"
              disabled
              title={
                isInactive
                  ? "Account inactive: write access is blocked"
                  : bookingsDisabled
                    ? "Bookings are disabled for this venue"
                    : "Manual bookings are not included in your plan"
              }
              className="shrink-0 cursor-not-allowed gap-1.5 opacity-60"
            >
              <Lock className="size-3.5" />{" "}
              <span className="hidden sm:inline">Quick Booking (Locked)</span>
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => openBooking()}
              className="shrink-0 gap-1.5"
              aria-label="Quick Booking"
            >
              <Plus className="size-4" /> <span className="hidden sm:inline">Quick Booking</span>
            </Button>
          )}
        </header>

        <main className="min-w-0 flex-1 p-3 sm:p-5 lg:p-6">{blockedHere ? <NoAccess /> : children}</main>
        <ZinthFooter />
      </div>
      <BookingModal />
    </div>
  );
}

function SidebarBody({
  path,
  adminName,
  adminRole,
  adminInitials,
  onLogout,
  onNavigate,
}: {
  path: string;
  adminName: string;
  adminRole: string;
  adminInitials: string;
  onLogout: () => void;
  onNavigate?: () => void;
}) {
  const { hasFeature, plan, isAdmin, can } = useSubscription();
  const allowed = (n: NavItem) => (n.adminOnly ? isAdmin : !n.area || can(n.area));
  return (
    <>
      <div className="flex h-14 shrink-0 items-center border-b px-4">
        <ProductLockup />
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2.5">
        {nav.filter(allowed).map((n, i, list) => {
          const active = n.to === path;
          const heading = i === 0 || list[i - 1]!.group !== n.group ? n.group : null;
          const locked = !!n.features && !n.features.some((f) => hasFeature(f));
          return (
            <div key={n.to}>
            {heading && (
              <div className="px-2.5 pb-1 pt-3 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/80 first:pt-1">
                {heading}
              </div>
            )}
            <Link
              to={n.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-sidebar-foreground transition-colors hover:bg-secondary",
                active &&
                  "relative bg-sidebar-accent before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-primary text-sidebar-accent-foreground hover:bg-sidebar-accent",
              )}
            >
              <n.icon
                className={cn("size-4 shrink-0", active ? "text-primary" : "text-muted-foreground")}
              />
              <span className="min-w-0 flex-1 truncate">{n.label}</span>
              {locked && (
                <Lock
                  aria-label="Not in your plan"
                  className="size-3.5 shrink-0 text-muted-foreground/70"
                />
              )}
            </Link>
            </div>
          );
        })}
      </nav>
      <div className="border-t p-2.5">
        {plan && (
          <Link
            to={isAdmin ? "/subscription" : path}
            onClick={onNavigate}
            className="mb-1.5 flex items-center gap-2 rounded-md border border-primary/20 bg-primary-soft/60 px-2.5 py-1.5 text-[12px] hover:bg-primary-soft"
          >
            <Sparkles className="size-3.5 shrink-0 text-primary" />
            <span className="font-semibold text-primary-soft-foreground">{plan.name} plan</span>
            {isAdmin && <span className="ml-auto text-[11px] text-primary">Upgrade</span>}
          </Link>
        )}
        <div className="flex items-center gap-2.5 rounded-md px-2 py-2">
          <div className="grid size-8 place-items-center rounded-full bg-primary-soft text-[12px] font-semibold text-primary-soft-foreground">
            {adminInitials}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[13px] font-medium">{adminName}</div>
            <div className="truncate text-[11px] text-muted-foreground">{adminRole}</div>
          </div>
          <button
            aria-label="Log out"
            onClick={onLogout}
            title="Log out"
            className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="size-4" />
          </button>
        </div>
        <BuiltByZinth className="mt-1.5" />
      </div>
    </>
  );
}
