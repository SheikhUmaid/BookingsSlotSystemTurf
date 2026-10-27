import { Zap } from "lucide-react";
import { Link } from "react-router-dom";

export default function HeroBooking() {
    return (
        <section className="relative mx-5 mb-6 overflow-hidden rounded-2xl">
            {/* Floodlit top tag */}
            <div className="flex items-center gap-2 bg-emerald-400/15 px-4 py-2 border border-emerald-400/20 rounded-t-2xl">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="font-['Space_Grotesk'] text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
                    Floodlit 4G Open Till Midnight
                </p>
            </div>

            {/* Dark hero panel */}
            <div
                className="relative flex flex-col justify-end overflow-hidden rounded-b-2xl"
                style={{
                    backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBHvHM6uDbxB8C9Kf04H_BIDwfM7FrhrT_TuJzijzuqnwlvURBFrFF-utVQeidNAmsbUWvJy2Hc9ECmjG1sM8E1OFAed0vS0J6o-w7denrd4qdtlZWLB7Xt2zcDFCMgTKM--rDfv9tBvY0KDQegWLjR48hUiySvf9iiCUGLuvO1Ry8LDNtjR2Iv_HZKI393YxPg5AOIWu5eYSfD3DpJWJ9qmtfbEC8JeUJVr--fHtGRphhembrwfnvM7Q')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    minHeight: "220px",
                }}
            >
                {/* Gradient scrims over photo */}
                <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-surface-container/70 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-surface-container-lowest/80 via-transparent to-transparent" />

                {/* Content */}
                <div className="relative px-5 pb-5 pt-8">
                    <p className="mb-1 font-['Space_Grotesk'] text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-400">
                        Night Circuit
                    </p>
                    <h2 className="mb-5 font-['Space_Grotesk'] text-[28px] font-bold leading-tight tracking-tight text-white">
                        Own The Pitch
                        <br />
                        Under The Lights
                    </h2>

                    {/* CTA buttons */}
                    <div className="flex items-center gap-3">
                        <Link
                            to="/book"
                            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-400 font-['Space_Grotesk'] text-xs font-bold uppercase tracking-wider text-[#052e16] transition hover:bg-emerald-300 active:scale-[0.98]"
                        >
                            <span className="material-symbols-outlined text-[16px]">
                                sports_soccer
                            </span>
                            Book a Slot Now
                        </Link>

                        <button
                            type="button"
                            className="flex h-11 items-center gap-1.5 rounded-xl border border-white/[0.12] bg-white/[0.05] px-4 font-['Space_Grotesk'] text-xs font-semibold uppercase tracking-wider text-white transition hover:border-white/20 hover:bg-white/[0.08]"
                        >
                            <Zap size={14} strokeWidth={2} />
                            Fast Check-In
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}

