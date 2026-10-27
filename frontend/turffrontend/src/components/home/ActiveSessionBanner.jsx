import { QrCode } from "lucide-react";
import { useAuth } from "../../services/auth.service";

export default function ActiveSessionBanner({ session }) {
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated || !session) return null;

    return (
        <section className="mx-5 mb-4">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-surface-container px-4 py-3">
                {/* Icon */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-400">
                    <span className="material-symbols-outlined text-[18px]">
                        calendar_today
                    </span>
                </div>

                {/* Session info */}
                <div className="min-w-0 flex-1">
                    <p className="font-['Space_Grotesk'] text-[10px] font-semibold uppercase tracking-widest text-emerald-400">
                        Tonight
                    </p>
                    <p className="font-['Hanken_Grotesk'] text-sm font-medium text-white">
                        {session.time} &bull; {session.pitch}
                    </p>
                    {session.notice && (
                        <p className="font-['Hanken_Grotesk'] text-[11px] text-on-surface-variant">
                            {session.notice}
                        </p>
                    )}
                </div>

                {/* QR shortcut */}
                <button
                    type="button"
                    aria-label="Show QR pass"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.1] text-on-surface-variant transition hover:border-emerald-400/40 hover:text-emerald-400"
                >
                    <QrCode size={16} strokeWidth={1.8} />
                </button>
            </div>
        </section>
    );
}

