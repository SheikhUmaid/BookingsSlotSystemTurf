import { useState } from 'react';

export default function SportSelection({ sports, handleSportChange, selectedSport }) {
    // const [selectedSport, setSelectedSport] = useState('cricket');

    

    return (
        <div className="p-4 ">
            <div className="flex items-center justify-between mb-2">
                <span className="font-headline-sm text-xs uppercase tracking-wider font-semibold text-on-surface-variant">
                    1. Choose Sport
                </span>

                <span className="text-[11px] text-primary font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">
                        sports
                    </span>
                    Gear Included
                </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
                {sports.map((sport) => {
                    const isSelected = selectedSport === sport._id;

                    return (
                        <button
                            key={sport._id}
                            id={`sport-${sport._id}`}
                            type="button"
                            onClick={() => handleSportChange(sport._id)}
                            aria-pressed={isSelected}
                            className={`sport-btn group relative p-3 rounded-xl text-left transition-all ${isSelected
                                    ? 'bg-surface-container-high border-2 border-primary text-white'
                                    : 'bg-surface-container-low border border-white/10 text-on-surface-variant hover:border-white/20 hover:text-white'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-1.5">
                                <div
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected
                                            ? 'bg-primary/20 text-primary'
                                            : 'bg-surface-container-highest text-on-surface-variant group-hover:text-white'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-[20px]">
                                        {sport.icon}
                                    </span>
                                </div>

                                <div
                                    className={`selected-badge w-5 h-5 rounded-full bg-primary items-center justify-center text-on-primary check-pop ${isSelected ? 'flex' : 'hidden'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-[14px] font-bold">
                                        check
                                    </span>
                                </div>
                            </div>

                            <p className="font-headline-sm text-sm font-bold text-white tracking-wide">
                                {sport.name}
                            </p>

                            <p className="text-[11px] text-on-surface-variant mt-0.5 line-clamp-1">
                                {sport.description}
                            </p>
                        </button>
                    );
                })}
            </div>
        </div>

    );
}