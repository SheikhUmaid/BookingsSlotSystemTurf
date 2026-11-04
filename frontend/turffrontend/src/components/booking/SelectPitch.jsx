export default function PitchEnclosure({ pitches = [], loading = false, selectedPitch, onPitchChange }) {
    const selected = pitches.find((pitch) => pitch._id === selectedPitch);
    const specLabel = selected
        ? [selected.size, selected.description].filter(Boolean).join(' • ')
        : '';

    const gridCols = pitches.length >= 3 ? 'grid-cols-3' : pitches.length === 2 ? 'grid-cols-2' : 'grid-cols-1';

    return (
        <div className="p-4">
            <div className="flex items-center justify-between gap-3 mb-2">
                <span className="shrink-0 font-headline-sm text-xs uppercase tracking-wider font-semibold text-on-surface-variant">
                    2. Pitch Enclosure
                </span>

                <span
                    className="text-[11px] text-on-surface-variant font-medium truncate"
                    id="pitch-spec-label"
                >
                    {specLabel}
                </span>
            </div>

            {loading ? (
                <div className="p-3 rounded-xl bg-surface-container-lowest border border-white/10 text-xs text-on-surface-variant">
                    Loading pitches...
                </div>
            ) : pitches.length === 0 ? (
                <div className="p-3 rounded-xl bg-surface-container-lowest border border-white/10 text-xs text-on-surface-variant">
                    No pitches available right now.
                </div>
            ) : (
                <div
                    className={`relative grid ${gridCols} p-1 rounded-xl bg-surface-container-lowest border border-white/10 gap-1 overflow-hidden`}
                    id="pitch-container"
                >
                    {pitches.map((pitch) => {
                        const isSelected = selectedPitch === pitch._id;

                        return (
                            <button
                                key={pitch._id}
                                id={`pitch-btn-${pitch._id}`}
                                type="button"
                                onClick={() => onPitchChange?.(pitch._id)}
                                aria-pressed={isSelected}
                                className={`pitch-segment relative z-10 py-2.5 px-3 rounded-lg text-center text-xs font-headline-sm transition-all active:scale-98 ${isSelected
                                        ? 'text-on-primary font-bold bg-primary shadow-sm'
                                        : 'text-on-surface-variant hover:text-white font-medium bg-transparent'
                                    }`}
                            >
                                {pitch.name}{' '}
                                <span
                                    className={`text-[11px] font-normal block sm:inline sm:ml-1 ${isSelected ? 'opacity-80' : 'opacity-60'
                                        }`}
                                >
                                    ({pitch.size})
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
