// Sport icons are Google Material Symbols names set by the admin (Services → Icon).
// Keep this list in sync with admin/src/lib/sportIcons.ts.
const KNOWN = new Set([
    "sports_cricket", "sports_soccer", "sports_tennis", "badminton", "pickleball",
    "sports_basketball", "sports_volleyball", "sports_hockey", "sports_baseball",
    "sports_rugby", "sports_handball", "sports_kabaddi", "sports_golf", "pool",
    "skateboarding", "directions_run", "fitness_center", "sports_martial_arts",
    "emoji_events", "stadium", "sports",
]);

// Names saved by the old admin picker that the icon font can't draw.
const LEGACY = {
    goal: "sports_soccer",
    trophy: "emoji_events",
    target: "sports",
    "circle-dot": "sports",
};

function resolveSportIcon(icon) {
    if (!icon) return "sports_soccer";
    if (KNOWN.has(icon)) return icon;
    return LEGACY[icon] ?? "sports";
}

export default function SportIcon({ icon, className = "" }) {
    return (
        <span className={`material-symbols-outlined ${className}`} aria-hidden="true">
            {resolveSportIcon(icon)}
        </span>
    );
}
