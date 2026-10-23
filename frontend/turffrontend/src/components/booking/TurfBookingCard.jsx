
import {
    ArrowLeft,
    Headset,
    UserRound,
    MapPin,
    Clock,
    ShieldCheck,
    CircleDot,
    ChevronRight,
} from "lucide-react";

const venue = {
    brand: "STRIKERS YARD",
    name: "Downtown Arena",
    lighting: "FLOODLIT 4G",
    pavilion: "Pavilion B",
    hours: "06:00 – Midnight",
    price: "₹1,200",
};

const sports = [
    {
        id: "football",
        name: "Football",
        description: "5-a-side · 60 min",
        price: "₹1,200",
    },
    {
        id: "cricket",
        name: "Box Cricket",
        description: "Box cricket · 60 min",
        price: "₹1,000",
    },
];

export default function TurfBookingCard() {
  return (
    <section className="relative w-full overflow-hidden bg-surface-container-lowest border-b border-white/5">
      <div className="relative w-full h-36 overflow-hidden">
        {/* Stadium background image */}
        <img
          alt="Downtown Arena floodlit turf at twilight"
          className="w-full h-full object-cover object-center"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCd7-AZ52XPVXBpoSexcVVphhCQhIPv4i32Qm3Xu7bgh9eT_q_jC_gBlZiK_ov5m3cnfjoGQey1wj0IEKFKGTyxbXxJiCFkQuQ_5B4kVWUPPAqht86K6xgzadjNGJyPj6FgLHoGmkHS1WqcF-VikQUBt-wb68OnIZSIFZCOL6laZ_evfxufqjkBp51m_TgROLb22aotILp43wOS609xAiuYTDeEG6quYyUtlVqCoVV8TQiflydaR90LBw"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-surface via-surface/70 to-surface/30" />

        {/* Venue badges */}
        <div className="absolute top-2.5 left-4 flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-[10px] font-label-caps uppercase tracking-wider text-primary border border-primary/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Floodlit 4G
          </span>

          <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-[10px] text-on-surface-variant border border-white/10">
            Pavilion B
          </span>
        </div>

        {/* Venue information and pricing */}
        <div className="absolute bottom-2.5 left-4 right-4 flex items-end justify-between">
          <div>
            <div className="text-[11px] text-on-surface-variant font-medium flex items-center gap-1.5 mb-0.5">
              <span>Downtown Arena</span>
              <span>•</span>
              <span>06:00 – Midnight</span>
            </div>

            <h2 className="font-headline-lg text-lg sm:text-xl font-bold tracking-tight text-white leading-tight">
              Reserve a Pitch
            </h2>
          </div>

          <div className="text-right">
            <span className="block text-[10px] uppercase tracking-wider text-on-surface-variant font-medium">
              Standard
            </span>

            <span className="font-headline-sm text-sm sm:text-base text-primary font-bold">
              from ₹1,200
              <span className="text-[11px] text-on-surface-variant font-normal">
                /hr
              </span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
