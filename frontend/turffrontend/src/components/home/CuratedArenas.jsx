import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const ARENAS = [
    {
        id: "cricket",
        tag: "CAGE 01-02",
        modality: "Box Cricket",
        description: "High-tension rebound netting & Robo-Bowl v4",
        icon: "sports_cricket",
        price: 38,
        imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuD-ixRWa64aBLRX50PA03BpkaBzX7KTtVzJuJY9LnI9RU7jUifnf_mlf_KsFfsGc5wztUPs62Qa6tsDhkbyui8OmEDJBbqn6Urh1Ueqf8iaiBmpPhNJojnLedewXEeObif0qgbBhHwlK6JOEsfonmTb-5FyqYF-6hYUH8dWA4w3YcpQdUsKtCmZ91OWorNb8g9LhPvtXYSR9z23xYBy5HPDOVWWw0hr2dP_79MWvpX0nm_EuRQTD_LZAA",
    },
    {
        id: "football",
        tag: "FIFA 4G",
        modality: "5V5 Football",
        description: "Monofilament turf, tournament acoustics",
        icon: "sports_soccer",
        price: 54,
        imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuD52RbJc0wj_ndHUQRnsOg1h2iqXjin-K_6WnFsVEXE_lHwgcFc-n-hmgZhJEeKqPKDGQVxd4Xh3YD7k0p6_Nt2RS6kAsShWMWSqD9wIuzUKZF6NybX-OdU5GNk_FCbyUpS2aRT0F3vlxMzyCKw_UFcRKkeGczgqQ_SKiFvSkbxCFCh_7tujCUIvCDfRrbWj9CRsIzl7gi-YO8aeX1PzrhjdgGcrEf0QeXCDTz8XZ-OHn1R2lNU-o3x-w",
    },
];

function ArenaCard({ arena }) {
    return (
        <Link
            to="/book"
            className="flex flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-surface-container transition hover:border-emerald-400/20"
        >
            {/* Image zone */}
            <div className="relative h-24 w-full overflow-hidden rounded-t-xl">
                <img
                    src={arena.imageUrl}
                    alt={arena.modality}
                    className="h-full w-full object-cover"
                    loading="lazy"
                />
                {/* Subtle bottom fade into card body */}
                <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-transparent to-transparent" />

                {/* Corner tag */}
                <span className="absolute top-1.5 right-1.5 rounded bg-surface-container-lowest/80 px-1.5 py-0.5 font-['Space_Grotesk'] text-[9px] font-bold uppercase tracking-wider text-on-surface-variant">
                    {arena.tag}
                </span>
            </div>

            {/* Card body */}
            <div className="p-3">
                <div className="mb-0.5 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-emerald-400">
                        {arena.icon}
                    </span>
                    <span className="font-['Space_Grotesk'] text-[11px] font-bold uppercase tracking-wider text-white">
                        {arena.modality}
                    </span>
                </div>

                <p className="mb-2 font-['Hanken_Grotesk'] text-[11px] leading-relaxed text-on-surface-variant">
                    {arena.description}
                </p>

                <div className="flex items-center justify-between">
                    <span className="font-['Space_Grotesk'] text-[15px] font-bold text-white">
                        ${arena.price}
                        <span className="font-['Hanken_Grotesk'] text-[11px] font-normal text-on-surface-variant">
                            /hr
                        </span>
                    </span>

                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400">
                        <ArrowRight size={13} strokeWidth={2.2} />
                    </span>
                </div>
            </div>
        </Link>
    );
}

export default function CuratedArenas() {
    return (
        <section className="px-5 mb-6">
            {/* Section header */}
            <div className="mb-3 flex items-center justify-between">
                <span className="font-['Space_Grotesk'] text-[11px] font-semibold uppercase tracking-widest text-[#bccac0]">
                    Curated Arenas
                </span>
                <span className="font-['Space_Grotesk'] text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                    Select Modality
                </span>
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-2 gap-3">
                {ARENAS.map((arena) => (
                    <ArenaCard key={arena.id} arena={arena} />
                ))}
            </div>
        </section>
    );
}

