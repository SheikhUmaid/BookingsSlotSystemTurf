import { Users, MessageSquare } from "lucide-react";

const RALLIES = [
    {
        id: "1",
        time: "Tonight",
        pitch: "Pitch A",
        slotTime: "08:00 PM",
        squadName: "Midnight Strikers 5v5",
        description:
            "High tempo, competitive recreational run. Two midfield slots vacant after late dropout. Bibs and water provided.",
        need: 2,
        confirmed: 8,
        total: 10,
        members: [
            { initials: "MF", color: "#4ade80" },
            { initials: "RL", color: "#60a5fa" },
            { initials: "DS", color: "#f97316" },
        ],
        price: 6.5,
    },
];

export default function MatchFinder() {
    return (
        <section className="px-5 mb-6">
            {/* Section header */}
            <div className="mb-3 flex items-center justify-between">
                <span className="font-['Space_Grotesk'] text-[11px] font-semibold uppercase tracking-widest text-[#bccac0]">
                    Locker Room Match Finder
                </span>
                <span className="font-['Space_Grotesk'] text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                    {RALLIES.length} Open {RALLIES.length === 1 ? "Rally" : "Rallies"}
                </span>
            </div>

            <div className="flex flex-col gap-3">
                {RALLIES.map((rally) => (
                    <div
                        key={rally.id}
                        className="overflow-hidden rounded-xl border border-white/[0.07] bg-surface-container"
                    >
                        {/* Top label bar */}
                        <div className="flex items-center gap-2 border-b border-white/[0.06] bg-surface-container-low px-4 py-2">
                            <span className="font-['Space_Grotesk'] text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                                {rally.time} • {rally.pitch} @ {rally.slotTime}
                            </span>

                            <span className="ml-auto flex items-center gap-1 rounded border border-emerald-400/20 bg-emerald-400/[0.07] px-1.5 py-0.5 font-['Space_Grotesk'] text-[10px] font-bold uppercase tracking-wide text-emerald-400">
                                <Users size={10} />
                                Need {rally.need}
                            </span>
                        </div>

                        <div className="p-4">
                            {/* Squad icon + name */}
                            <div className="mb-2 flex items-start gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-400">
                                    <span className="material-symbols-outlined text-[20px]">
                                        groups
                                    </span>
                                </div>
                                <div>
                                    <p className="font-['Space_Grotesk'] text-[15px] font-bold leading-tight text-white">
                                        {rally.squadName}
                                    </p>
                                </div>
                            </div>

                            {/* Description */}
                            <p className="mb-4 font-['Hanken_Grotesk'] text-[12px] leading-relaxed text-on-surface-variant">
                                {rally.description}
                            </p>

                            {/* Member avatars + confirmed count */}
                            <div className="mb-4 flex items-center gap-3">
                                <div className="flex items-center">
                                    {rally.members.map((m, i) => (
                                        <div
                                            key={i}
                                            className="-ml-1.5 first:ml-0 flex h-6 w-6 items-center justify-center rounded-full border border-surface-container font-['Space_Grotesk'] text-[8px] font-bold uppercase"
                                            style={{ backgroundColor: m.color + "26", color: m.color }}
                                        >
                                            {m.initials}
                                        </div>
                                    ))}
                                </div>

                                <span className="font-['Hanken_Grotesk'] text-[11px] text-on-surface-variant">
                                    {rally.confirmed}/{rally.total} Confirmed
                                </span>

                                {/* Progress bar */}
                                <div className="flex-1 h-1 rounded-full bg-surface-container-high overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-emerald-400 transition-all"
                                        style={{ width: `${(rally.confirmed / rally.total) * 100}%` }}
                                    />
                                </div>
                            </div>

                            {/* Action row */}
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    className="flex h-[46px] flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-400 font-['Space_Grotesk'] text-xs font-bold uppercase tracking-wider text-[#052e16] transition hover:bg-emerald-300 active:scale-[0.98]"
                                >
                                    <Users size={14} strokeWidth={2.2} />
                                    Join Squad • ${rally.price.toFixed(2)}
                                </button>

                                <button
                                    type="button"
                                    aria-label="Chat with squad"
                                    className="flex h-[46px] w-[46px] items-center justify-center rounded-xl border border-white/[0.1] bg-surface-container-high text-on-surface-variant transition hover:border-white/20 hover:text-white"
                                >
                                    <MessageSquare size={16} strokeWidth={1.8} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

