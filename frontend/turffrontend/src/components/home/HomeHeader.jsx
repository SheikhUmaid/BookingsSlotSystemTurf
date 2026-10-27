import { useState } from "react";
import { Bell, User } from "lucide-react";
import LoginModal from "../shared/LoginModal";
import { useAuth } from "../../services/auth.service";

export default function HomeHeader() {
    const { isAuthenticated } = useAuth();
    const [loginOpen, setLoginOpen] = useState(false);

    return (
        <>
            <header className="flex items-center justify-between px-5 pt-5 pb-3">
                {/* Logo / Arena Identity */}
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-400/10">
                        <span className="material-symbols-outlined text-[16px] text-emerald-400">
                            sports_soccer
                        </span>
                    </div>
                    <div>
                        <p className="font-['Space_Grotesk'] text-[11px] font-bold uppercase tracking-[0.18em] text-white leading-tight">
                            Strikers Yard
                        </p>
                        <p className="font-['Hanken_Grotesk'] text-[10px] text-on-surface-variant leading-tight">
                            Downtown Arena Pitch
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
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

