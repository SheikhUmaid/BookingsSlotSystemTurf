import { MapPin, Navigation, Phone } from "lucide-react";
import { useVenue } from "../../hooks/useVenue";

export default function TurfBookingCard() {
  const { venue, venueName } = useVenue();

  return (
    <section className="relative w-full overflow-hidden bg-surface-container-lowest border-b border-white/5">
      <div className="relative w-full h-36 overflow-hidden">
        {/* Stadium background image */}
        <img
          alt={`${venueName} turf`}
          className="w-full h-full object-cover object-center"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCd7-AZ52XPVXBpoSexcVVphhCQhIPv4i32Qm3Xu7bgh9eT_q_jC_gBlZiK_ov5m3cnfjoGQey1wj0IEKFKGTyxbXxJiCFkQuQ_5B4kVWUPPAqht86K6xgzadjNGJyPj6FgLHoGmkHS1WqcF-VikQUBt-wb68OnIZSIFZCOL6laZ_evfxufqjkBp51m_TgROLb22aotILp43wOS609xAiuYTDeEG6quYyUtlVqCoVV8TQiflydaR90LBw"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-surface via-surface/70 to-surface/30" />

        {/* Venue badge */}
        {venue?.tagline && (
          <div className="absolute top-2.5 left-4 flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-[10px] font-label-caps uppercase tracking-wider text-primary border border-primary/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {venue.tagline}
            </span>
          </div>
        )}

        {/* Venue name and hours */}
        <div className="absolute bottom-2.5 left-4 right-4">
          <div className="text-[11px] text-on-surface-variant font-medium flex items-center gap-1.5 mb-0.5">
            <span className="truncate">{venueName}</span>
            {venue?.opening_hours && (
              <>
                <span>•</span>
                <span className="shrink-0">{venue.opening_hours}</span>
              </>
            )}
          </div>

          <h2 className="font-headline-lg text-lg sm:text-xl font-bold tracking-tight text-white leading-tight">
            Reserve a Pitch
          </h2>
        </div>
      </div>

      {/* Location & directions */}
      {venue?.full_address && (
        <div className="flex items-center gap-3 px-4 py-3">
          <MapPin size={16} className="shrink-0 text-primary" />
          <p className="min-w-0 flex-1 text-xs leading-snug text-on-surface-variant line-clamp-2">
            {venue.full_address}
          </p>

          {venue.phone && (
            <a
              href={`tel:${venue.phone.replace(/\s+/g, "")}`}
              aria-label={`Call ${venueName}`}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-on-surface-variant transition hover:border-white/20 hover:text-white"
            >
              <Phone size={14} />
            </a>
          )}

          {venue.directions_url && (
            <a
              href={venue.directions_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary transition hover:bg-primary/20"
            >
              <Navigation size={12} />
              Directions
            </a>
          )}
        </div>
      )}
    </section>
  );
}
