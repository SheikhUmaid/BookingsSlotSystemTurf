import { Clock } from "lucide-react";
import { Link } from "react-router-dom";

const PITCHES = [
    {
        id: "pitch-a",
        name: "Pitch A • Main Cage",
        subtitle: "In Play: Semi-Pro 7s League until 07:45 PM",
        nextSlot: "08:00 PM",
        status: "occupied",
        actionLabel: "Hold 08:00 PM",
        actionTo: "/book",
    },
    {
        id: "pitch-b",
        name: "Pitch B • Agility Bay",
        subtitle: "40×20m Shockpad Underlay • Ready now",
        nextSlot: null,
        status: "ready",
        actionLabel: "Reserve Bay",
        actionTo: "/book",
        subNote: "⚡ Instant kickoff available",
    },
];

const STATUS_CONFIG = {
    occupied: {
        dot: "bg-red-400",
        badge: "text-red-300 bg-red-400/[0.08] border border-red-400/20",
        label: "Occupied",
    },
    ready: {
        dot: "bg-emerald-400 animate-pulse",
        badge: "text-emerald-400 bg-emerald-400/[0.08] border border-emerald-400/20",
        label: "Ready",
    },
};

function PitchCard({ pitch }) {
    const cfg = STATUS_CONFIG[pitch.status];

    return (
        <div className="rounded-xl border border-white/[0.07] bg-surface-container p-4">
            {/* Header row */}
            <div className="mb-2 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${cfg.dot}`} />
                    <div>
                        <p className="font-['Space_Grotesk'] text-[14px] font-semibold text-white leading-snug">
                            {pitch.name}
                        </p>
                        <p className="font-['Hanken_Grotesk'] text-[11px] text-on-surface-variant leading-relaxed">
                            {pitch.subtitle}
                        </p>
                    </div>
                </div>

                <span className={`shrink-0 rounded-md px-2 py-0.5 font-['Space_Grotesk'] text-[10px] font-bold uppercase tracking-wide ${cfg.badge}`}>
                    {cfg.label}
                </span>
            </div>

            {/* Sub-note */}
            {pitch.subNote && (
                <p className="mb-3 font-['Hanken_Grotesk'] text-[11px] text-emerald-400">
                    {pitch.subNote}
                </p>
            )}

            {/* Next slot + action */}
            <div className="flex items-center justify-between gap-2">
                {pitch.nextSlot ? (
                    <div className="flex items-center gap-1.5 text-on-surface-variant">
                        <Clock size={13} strokeWidth={1.8} />
                        <span className="font-['Hanken_Grotesk'] text-xs">
                            Next Slot:{" "}
                            <span className="font-semibold text-white">{pitch.nextSlot}</span>
                        </span>
                    </div>
                ) : (
                    <div />
                )}

                <Link
                    to={pitch.actionTo}
                    className="flex items-center justify-center gap-1 rounded-lg bg-surface-container-high px-3 py-1.5 font-['Space_Grotesk'] text-[10px] font-bold uppercase tracking-wide text-emerald-400 transition hover:bg-surface-container-highest"
                >
                    {pitch.actionLabel}
                </Link>
            </div>
        </div>
    );
}

export default function LivePitchRadar() {
    return (
        <section className="px-5 mb-6">
            {/* Section header */}
            <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="font-['Space_Grotesk'] text-[11px] font-semibold uppercase tracking-widest text-[#bccac0]">
                        Live Pitch Radar
                    </span>
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <span className="font-['Space_Grotesk'] text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                    Sync: Live
                </span>
            </div>

            <div className="flex flex-col gap-3">
                {PITCHES.map((pitch) => (
                    <PitchCard key={pitch.id} pitch={pitch} />
                ))}
            </div>
        </section>
    );
}

