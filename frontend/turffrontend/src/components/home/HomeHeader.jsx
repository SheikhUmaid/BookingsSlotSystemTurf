import { useState } from "react";
import { Bell, User } from "lucide-react";
import LoginModal from "../shared/LoginModal";
import { useAuth } from "../../services/auth.service";
import { useVenue } from "../../hooks/useVenue";

export default function HomeHeader() {
    const { isAuthenticated } = useAuth();
    const [loginOpen, setLoginOpen] = useState(false);
    const { venue, venueName, loading } = useVenue();
    const subline = venue?.tagline || venue?.city;

    return (
        <>
            <header className="flex items-start justify-between gap-3 px-5 pt-6 pb-4">
                {/* Arena identity — the turf's own name is the hero brand */}
                <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10">
                        <span className="material-symbols-outlined text-[22px] text-emerald-400">
                            sports_soccer
                        </span>
                    </div>
                    <div className="min-w-0">
                        {loading ? (
                            <div className="h-7 w-40 animate-pulse rounded bg-white/10" aria-hidden="true" />
                        ) : (
                            <h1
                                className="line-clamp-2 break-words font-['Barlow_Condensed'] text-[28px] font-bold uppercase leading-[0.95] tracking-wide text-white"
                                title={venueName}
                            >
                                {venueName}
                            </h1>
                        )}
                        {subline && (
                            <p className="mt-1 truncate font-['Space_Grotesk'] text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-400/90">
                                {subline}
                            </p>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-2 pt-1">
                    <button
                        type="button"
                        aria-label="Notifications"
                        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.09] bg-surface-container text-on-surface-variant transition hover:border-white/20 hover:text-white"
                    >
                        <Bell size={17} strokeWidth={1.8} />
                        {/* Unread indicator */}
                        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-400 ring-1 ring-[#121416]" />
                    </button>

                    <button
                        type="button"
                        onClick={() => { if (!isAuthenticated) setLoginOpen(true); }}
                        aria-label={isAuthenticated ? "Profile" : "Sign in"}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-400/10 text-emerald-400 transition hover:bg-emerald-400/20"
                    >
                        <User size={18} strokeWidth={1.8} />
                    </button>
                </div>
            </header>

            <LoginModal
                isOpen={loginOpen}
                onClose={() => setLoginOpen(false)}
                onSuccess={() => setLoginOpen(false)}
            />
        </>
    );
}

