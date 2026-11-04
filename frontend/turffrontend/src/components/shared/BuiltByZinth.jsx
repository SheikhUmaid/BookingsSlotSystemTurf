// Zinth Labs brand credit — same look as the admin panel's "Built by" card.
export const ZINTH_URL = "https://zinthlabs.in";
const ZINTH_ORANGE = "#f55500"; // admin --primary: oklch(0.66 0.21 41)

export default function BuiltByZinth({ className = "" }) {
    return (
        <a
            href={ZINTH_URL}
            target="_blank"
            rel="noreferrer"
            className={`group block rounded-lg border border-white/5 bg-[#141414] px-3.5 py-3 transition-colors hover:bg-[#1b1b1b] ${className}`}
        >
            <div className="flex items-center justify-between">
                <span className="text-[9.5px] font-medium uppercase tracking-[0.16em] text-white/55">
                    Built by
                </span>
                <span
                    className="material-symbols-outlined text-[16px] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    style={{ color: ZINTH_ORANGE }}
                >
                    arrow_outward
                </span>
            </div>
            <div className="font-['Barlow_Condensed'] text-[19px] font-bold uppercase leading-tight tracking-wide text-white">
                Zinth <span style={{ color: ZINTH_ORANGE }}>Labs</span>
            </div>
            <div className="text-[10.5px] leading-snug text-white/60">
                Digital product studio for bold businesses.
            </div>
        </a>
    );
}
