import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, Phone, ArrowRight, Loader2, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { pageMeta } from "@/lib/meta";
import { API_BASE } from "@/lib/api";
import { ZINTH_URL, ZinthMark, ZinthWordmark } from "@/components/turf/brand";

export const Route = createFileRoute("/login")({
  head: () => pageMeta("Admin Login", "Sign in to TurfOS by Zinth Labs — digital product studio."),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!identifier.trim()) {
      toast.error("Please enter your admin phone number or email");
      return;
    }
    if (!password) {
      toast.error("Please enter your password");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to sign in");
      }

      // Store tokens and admin details
      if (data.accessToken) {
        localStorage.setItem("access_token", data.accessToken);
        localStorage.setItem("accessToken", data.accessToken);
      }
      if (data.user) {
        localStorage.setItem("admin_user", JSON.stringify(data.user));
      }

      toast.success("Welcome back!", {
        description: `Signed in as ${data.user?.name || "Admin"}`,
      });

      // Redirect to dashboard
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err.message || "Invalid credentials or unauthorized");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-surface">
      {/* Brand panel (desktop) — mirrors the zinthlabs.in hero */}
      <aside className="relative hidden w-[44%] max-w-[620px] flex-col justify-between overflow-hidden bg-ink p-10 text-ink-foreground lg:flex">
        <ZinthWordmark size="lg" />
        <div className="space-y-5">
          <div>
            <div className="font-display text-[15px] font-semibold uppercase tracking-[0.2em] text-primary">
              We built
            </div>
            <div className="mt-1 font-display text-[44px] font-semibold leading-[0.95]">
              TurfOS — booking
              <br />
              engine for turfs.
            </div>
          </div>
          <p className="max-w-sm text-[13px] leading-relaxed text-ink-foreground/60">
            Elite software engineering meets product strategy. Manage bookings, pitches, pricing and
            payments from one console.
          </p>
          <div className="flex items-center justify-between border-t border-ink-foreground/10 pt-4 text-[11.5px] text-ink-foreground/50">
            <span>© {new Date().getFullYear()} Zinth Labs Pvt. Ltd.</span>
            <a
              href={ZINTH_URL}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary hover:underline"
            >
              zinthlabs.in ↗
            </a>
          </div>
        </div>
        <span className="pointer-events-none absolute -right-6 top-1/2 -translate-y-1/2 select-none font-display text-[180px] font-bold uppercase leading-none text-ink-foreground/[0.04]">
          Z
        </span>
      </aside>

      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:py-12">
        <div className="w-full max-w-md space-y-6">
          {/* Brand Header */}
          <div className="text-center space-y-2.5 lg:text-left">
            <ZinthMark className="mx-auto size-12 text-[28px] lg:mx-0" />
            <div>
              <h1 className="font-display text-[34px] font-bold uppercase leading-none tracking-wide text-foreground sm:text-[38px]">
                TurfOS
              </h1>
              <p className="mt-1 font-display text-[13px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                by <span className="text-primary">Zinth Labs</span>
              </p>
            </div>
            <p className="text-[13px] text-muted-foreground">
              Sign in with your admin credentials to manage bookings, pitches & availability.
            </p>
          </div>

          {/* Card */}
          <div className="rounded-xl border border-t-[3px] border-t-primary bg-card p-5 shadow-sm sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[12.5px]" htmlFor="login-id">
                  Phone Number or Email
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="login-id"
                    type="text"
                    placeholder="e.g. 9906532078 or admin@zinthlabs.in"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="pl-9 h-10"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[12.5px]" htmlFor="login-pw">
                    Password
                  </Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="login-pw"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-9 h-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full h-10 gap-2">
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Authenticating…
                  </>
                ) : (
                  <>
                    Sign in <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-5 rounded-lg border border-primary/20 bg-primary-soft/30 p-3 text-[11.5px] text-muted-foreground">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <ShieldCheck className="size-3.5 text-primary" /> TurfOS Admin Security
              </div>
              <p className="mt-1">
                Access is restricted strictly to registered turf administrators.
              </p>
            </div>
          </div>

          <div className="space-y-1 text-center text-[12px] text-muted-foreground lg:hidden">
            <p>
              Crafted by{" "}
              <a
                href={ZINTH_URL}
                target="_blank"
                rel="noreferrer"
                className="font-display text-[14px] font-bold uppercase tracking-wide text-foreground"
              >
                Zinth <span className="text-primary">Labs</span>
              </a>
            </p>
            <p className="text-[11px]">Digital product studio for bold businesses.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
