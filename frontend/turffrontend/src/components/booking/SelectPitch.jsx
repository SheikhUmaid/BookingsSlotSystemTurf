import { useState } from 'react';

export default function PitchEnclosure({ onPitchChange }) {
    const [selectedPitch, setSelectedPitch] = useState('A');

    const pitches = [
        {
            id: 'A',
            name: 'Pitch A',
            subtitle: 'Main Cage',
        },
        
    ];

    const handlePitchChange = (pitch) => {
        setSelectedPitch(pitch.id);

        onPitchChange?.({
            name: pitch.name,
            subtitle: pitch.subtitle,
            specLabel:
                pitch.id === 'A'
                    ? 'North Cage • Matting Installed'
                    : 'FIFA 50mm Monofilament Turf',
        });

    };

    const specLabel =
        selectedPitch === 'A'
            ? 'North Cage • Matting Installed'
            : 'FIFA 50mm Monofilament Turf';

    return (
        <div className="p-4">
            <div className="flex items-center justify-between mb-2">
                <span className="font-headline-sm text-xs uppercase tracking-wider font-semibold text-on-surface-variant">
                    2. Pitch Enclosure
                </span>

                <span
                    className="text-[11px] text-on-surface-variant font-medium"
                    id="pitch-spec-label"
                >
                    {specLabel}
                </span>
            </div>

            <div
                className="relative grid grid-cols-1 p-1 rounded-xl bg-surface-container-lowest border border-white/10 gap-1 overflow-hidden"
                id="pitch-container"
            >
                {pitches.map((pitch) => {
                    const isSelected = selectedPitch === pitch.id;

                    return (
                        <button
                            key={pitch.id}
                            id={`pitch-btn-${pitch.id.toLowerCase()}`}
                            type="button"
                            onClick={() => handlePitchChange(pitch)}
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
                                ({pitch.subtitle})
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>

    );
}