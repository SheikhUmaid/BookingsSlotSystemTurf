import { RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../services/auth.service";

export default function LastPlayedBar({ lastSession }) {
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated || !lastSession) return null;

    return (
        <section className="mx-5 mb-4">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-surface-container px-4 py-3">
                {/* Clock icon */}
                <div className="flex h-7 w-7 shrink-0 items-center justify-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-[18px]">
                        history
                    </span>
                </div>

                {/* Session info */}
                <div className="min-w-0 flex-1">
                    <p className="font-['Space_Grotesk'] text-[9px] font-semibold uppercase tracking-widest text-on-surface-variant">
                        Last Played {lastSession.when}
                    </p>
                    <p className="font-['Hanken_Grotesk'] text-xs font-medium text-white">
                        {lastSession.description}
                    </p>
                </div>

                {/* Rebook button */}
                <Link
                    to="/book"
                    className="flex shrink-0 items-center gap-1 rounded-lg border border-white/[0.09] px-2.5 py-1.5 font-['Space_Grotesk'] text-[10px] font-bold uppercase tracking-wider text-emerald-400 transition hover:border-emerald-400/30 hover:bg-emerald-400/[0.06]"
                >
                    <RotateCcw size={12} strokeWidth={2} />
                    Rebook
                </Link>
            </div>
        </section>
    );
}

