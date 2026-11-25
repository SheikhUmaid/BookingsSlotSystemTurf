// Sport icons are stored as Google Material Symbols names (e.g. "sports_cricket"),
// because the customer booking app renders them with the Material Symbols font.
// Keep this list in sync with turffrontend/src/components/shared/SportIcon.jsx.

export const SPORT_ICONS: { value: string; label: string }[] = [
  { value: "sports_cricket", label: "Cricket" },
  { value: "sports_soccer", label: "Football" },
  { value: "sports_tennis", label: "Tennis" },
  { value: "badminton", label: "Badminton" },
  { value: "pickleball", label: "Pickleball" },
  { value: "sports_basketball", label: "Basketball" },
  { value: "sports_volleyball", label: "Volleyball" },
  { value: "sports_hockey", label: "Hockey" },
  { value: "sports_baseball", label: "Baseball" },
  { value: "sports_rugby", label: "Rugby" },
  { value: "sports_handball", label: "Handball" },
  { value: "sports_kabaddi", label: "Kabaddi" },
  { value: "sports_golf", label: "Golf" },
  { value: "pool", label: "Swimming" },
  { value: "skateboarding", label: "Skating" },
  { value: "directions_run", label: "Running" },
  { value: "fitness_center", label: "Gym" },
  { value: "sports_martial_arts", label: "Martial arts" },
  { value: "emoji_events", label: "Tournament" },
  { value: "stadium", label: "Arena" },
  { value: "sports", label: "Other" },
];

export const DEFAULT_SPORT_ICON = "sports_soccer";

// Names saved by the old admin picker (lucide icon names) that the font can't draw.
const LEGACY_ICONS: Record<string, string> = {
  goal: "sports_soccer",
  trophy: "emoji_events",
  target: "sports",
  "circle-dot": "sports",
};

const KNOWN = new Set(SPORT_ICONS.map((i) => i.value));

/** Turn whatever is stored into a Material Symbols name the font can draw. */
export function resolveSportIcon(icon: string | undefined | null): string {
  if (!icon) return DEFAULT_SPORT_ICON;
  if (KNOWN.has(icon)) return icon;
  return LEGACY_ICONS[icon] ?? "sports";
}

export function sportIconLabel(icon: string | undefined | null): string {
  const name = resolveSportIcon(icon);
  return SPORT_ICONS.find((i) => i.value === name)?.label ?? "Other";
}
