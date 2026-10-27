import { useAuth } from "../../services/auth.service";

// Returns greeting based on current hour
function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
}

export default function MemberGreeting({ name = "Player" }) {
    const { isAuthenticated } = useAuth();

    return (
        <section className="px-5 pb-3">
            {/* Field command label */}
            <p className="mb-1 font-['Space_Grotesk'] text-[10px] font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
                Field Command • Tier 01
            </p>

            {/* Greeting row */}
            <div className="flex items-center justify-between gap-3">
                <h1 className="font-['Space_Grotesk'] text-[26px] font-bold leading-tight tracking-tight text-white">
                    {getGreeting()}, {isAuthenticated ? name : "Athlete"}.
                </h1>

                {isAuthenticated && (
                    <span className="flex shrink-0 items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 font-['Space_Grotesk'] text-[9px] font-bold uppercase tracking-widest text-emerald-400">
                        <span className="material-symbols-outlined text-[11px]">
                            verified
                        </span>
                        Pro Member
                    </span>
                )}
            </div>
        </section>
    );
}

