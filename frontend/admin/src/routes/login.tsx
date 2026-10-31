import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Goal, Lock, Phone, ArrowRight, Loader2, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { pageMeta } from "@/lib/meta";

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
      const res = await fetch("http://127.0.0.1:5000/api/auth/login", {
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
    <div className="flex min-h-screen w-full items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2.5">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Goal className="size-6" />
          </div>
          <div>
            <h1 className="text-[24px] font-bold tracking-tight text-foreground sm:text-[26px]">
              TurfOS
            </h1>
            <p className="text-[13px] font-medium text-primary">
              by Zinth Labs
            </p>
          </div>
          <p className="text-[13px] text-muted-foreground">
            Sign in with your admin credentials to manage bookings, pitches & availability.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
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

        <div className="text-center space-y-1 text-[12px] text-muted-foreground">
          <p className="font-medium text-foreground/85">
            TurfOS <span className="text-muted-foreground/60">•</span> by Zinth Labs
          </p>
          <p className="text-[11px] text-muted-foreground">
            Zinth Labs is a digital product studio
          </p>
        </div>
      </div>
    </div>
  );
}

