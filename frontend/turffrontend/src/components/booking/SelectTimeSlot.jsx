import { useState, useEffect } from "react";
import { useTimeSlots } from "../../hooks/useTimeSlots";

const MAX_SELECTED_SLOTS = 4;

export default function TimeSlotSelection({ date, onSlotChange }) {
    const [selectedSlot, setSelectedSlot] = useState([]);

    const { timeSlots, loading, error } = useTimeSlots(date);

    const sessions = timeSlots;

    // Clear the selection when the selected date changes.
    useEffect(() => {
        setSelectedSlot([]);
        onSlotChange?.({
            time_slots: [],
            price: 0,
        });
    }, [date]);

    const handleSlotSelect = (slot) => {
        if (slot.booked) return;

        const isAlreadySelected = selectedSlot.some(
            (selected) => selected.id === slot.id
        );

        let updatedSlots;

        if (isAlreadySelected) {
            // Deselect an already selected slot.
            updatedSlots = selectedSlot.filter(
                (selected) => selected.id !== slot.id
            );
        } else {
            // Enforce the maximum of four slots.
            if (selectedSlot.length >= MAX_SELECTED_SLOTS) return;

            updatedSlots = [
                ...selectedSlot,
                {
                    id: slot.id,
                    time: slot.time,
                    price: slot.price,
                },
            ];
        }

        setSelectedSlot(updatedSlots);
        // onSlotChange?.(updatedSlots.map((slot) => slot.id));

        const totalPrice = updatedSlots.reduce(
            (total, slot) => total + slot.price,
            0
        );

        onSlotChange?.({
            time_slots: updatedSlots.map((slot) => slot.id),
            price: totalPrice,
        });

    };

    if (loading) {
        return (
            <div className="p-4 text-sm text-on-surface-variant">
                Loading time slots...
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 text-sm text-error">
                Failed to load time slots. Please try again.
            </div>
        );
    }

    return (
        <div className="space-y-5 p-4">
            <div className="flex items-center justify-between">
                <span className="font-headline-sm text-xs uppercase tracking-wider font-semibold text-on-surface-variant">
                    4. Select Time Slots
                </span>

                <span className="text-[11px] font-medium text-primary">
                    {selectedSlot.length}/{MAX_SELECTED_SLOTS} selected
                </span>
            </div>

            {sessions.map((session) => (
                <div key={session.title}>
                    <div className="flex items-center gap-2 mb-2">
                        <span
                            className={`material-symbols-outlined text-[15px] ${session.iconColor}`}
                        >
                            {session.icon}
                        </span>

                        <h3 className="font-headline-sm text-xs font-semibold text-white uppercase tracking-wider">
                            {session.title}
                        </h3>

                        <div className="flex-1 h-px bg-white/10" />

                        {session.prime && (
                            <span className="text-[10px] font-bold text-primary uppercase tracking-wide">
                                Prime
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        {session.slots.map((slot) => {
                            const isSelected = selectedSlot.some(
                                (selected) => selected.id === slot.id
                            );

                            const isBooked = Boolean(slot.booked);

                            const isAtLimit =
                                selectedSlot.length >= MAX_SELECTED_SLOTS;

                            const isDisabled =
                                isBooked || (!isSelected && isAtLimit);

                            if (isBooked) {
                                return (
                                    <div
                                        key={slot.id}
                                        aria-disabled="true"
                                        className={`locked-card p-3 rounded-xl bg-surface-container-lowest border border-white/5 text-left flex flex-col justify-between h-18 opacity-35 cursor-not-allowed select-none ${slot.fullWidth ? "col-span-2" : ""
                                            }`}
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <span className="font-headline-sm text-xs font-medium text-on-surface-variant line-through">
                                                {slot.time}
                                            </span>

                                            <span className="material-symbols-outlined text-[14px] text-on-surface-variant">
                                                lock
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between w-full mt-1">
                                            <span className="font-headline-sm text-xs text-on-surface-variant">
                                                ₹{slot.price.toLocaleString("en-IN")}
                                            </span>

                                            <span className="text-[10px] uppercase font-bold text-on-surface-variant">
                                                Booked
                                            </span>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <button
                                    key={slot.id}
                                    type="button"
                                    data-time={slot.time}
                                    aria-pressed={isSelected}
                                    disabled={isDisabled}
                                    onClick={() => handleSlotSelect(slot)}
                                    className={`slot-card group p-3 rounded-xl text-left transition-all flex ${slot.fullWidth
                                        ? "col-span-2 items-center justify-between active:scale-[0.99]"
                                        : "flex-col justify-between h-18 active:scale-[0.98]"
                                        } ${isSelected
                                            ? "active bg-surface-container-high border-2 border-primary shadow-sm relative"
                                            : "bg-surface-container-low border border-white/10 hover:border-white/25"
                                        } ${isDisabled
                                            ? "opacity-40 cursor-not-allowed"
                                            : ""
                                        }`}
                                >
                                    {slot.fullWidth ? (
                                        <>
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                                                    nightlight
                                                </span>

                                                <span
                                                    className={`font-headline-sm text-xs ${isSelected
                                                        ? "font-bold text-primary"
                                                        : "font-semibold text-white"
                                                        }`}
                                                >
                                                    {slot.time}
                                                </span>

                                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface-variant font-medium uppercase">
                                                    Late Night
                                                </span>

                                                {isSelected && (
                                                    <span className="w-4 h-4 rounded-full bg-primary flex items-center justify-center text-on-primary">
                                                        <span className="material-symbols-outlined text-[12px] font-bold">
                                                            check
                                                        </span>
                                                    </span>
                                                )}
                                            </div>

                                            <span className="font-headline-sm text-sm font-bold text-primary">
                                                ₹{slot.price.toLocaleString("en-IN")}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex items-center justify-between w-full">
                                                <span
                                                    className={`font-headline-sm text-xs ${isSelected
                                                        ? "font-bold text-primary"
                                                        : "font-semibold text-white"
                                                        }`}
                                                >
                                                    {slot.time}
                                                </span>

                                                {isSelected && (
                                                    <span className="w-4 h-4 rounded-full bg-primary flex items-center justify-center text-on-primary check-pop">
                                                        <span className="material-symbols-outlined text-[12px] font-bold">
                                                            check
                                                        </span>
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between w-full mt-1">
                                                <span
                                                    className={`font-headline-sm text-sm ${isSelected
                                                        ? "font-black text-primary"
                                                        : "font-bold text-primary"
                                                        }`}
                                                >
                                                    ₹{slot.price.toLocaleString("en-IN")}
                                                </span>

                                                <span
                                                    className={`slot-badge text-[10px] ${isSelected
                                                        ? "font-semibold text-primary/90 tracking-wide"
                                                        : "text-on-surface-variant font-medium"
                                                        }`}
                                                >
                                                    {isSelected
                                                        ? "Selected"
                                                        : isAtLimit
                                                            ? "Limit reached"
                                                            : "Available"}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}

            {selectedSlot.length > 0 && (
                <div className="flex items-center justify-between border-t border-white/10 pt-3">
                    <div>
                        <p className="text-xs text-on-surface-variant">
                            {selectedSlot.length} slot
                            {selectedSlot.length > 1 ? "s" : ""} selected
                        </p>

                        <p className="font-headline-sm text-lg font-bold text-primary">
                            ₹
                            {selectedSlot
                                .reduce((total, slot) => total + slot.price, 0)
                                .toLocaleString("en-IN")}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            setSelectedSlot([]);
                            onSlotChange?.({
                                time_slots: [],
                                price: 0,
                            });
                        }}
                        className="text-xs font-medium text-on-surface-variant underline underline-offset-2 hover:text-white"
                    >
                        Clear selection
                    </button>
                </div>
            )}
        </div>
    );
}
