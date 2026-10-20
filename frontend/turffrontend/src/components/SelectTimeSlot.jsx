import { useState } from 'react';
import {useAllTimeSlots} from "../hooks/useTImeSlots"




const sessions = [
    {
        title: 'Morning Sessions (06:00 – 12:00)',
        icon: 'wb_twilight',
        iconColor: 'text-primary',
        slots: [
            { time: '06:00 – 07:00 AM', price: 1200 },
            { time: '07:00 – 08:00 AM', price: 1200, booked: true },
            { time: '08:00 – 09:00 AM', price: 1200 },
            { time: '10:00 – 11:00 AM', price: 1200 },
        ],
    },
    {
        title: 'Afternoon Sessions (12:00 – 17:00)',
        icon: 'light_mode',
        iconColor: 'text-amber-400',
        slots: [
            { time: '12:00 – 01:00 PM', price: 1300 },
            { time: '02:00 – 03:00 PM', price: 1300 },
            { time: '03:00 – 04:00 PM', price: 1300, booked: true },
            { time: '04:00 – 05:00 PM', price: 1400 },
        ],
    },
    {
        title: 'Floodlit Evening (17:00 – 23:00)',
        icon: 'dark_mode',
        iconColor: 'text-primary',
        prime: true,
        slots: [
            { time: '06:00 – 07:00 PM', price: 1500 },
            { time: '07:00 – 08:00 PM', price: 1400 },
            { time: '08:00 – 09:00 PM', price: 1500 },
            { time: '09:00 – 10:00 PM', price: 1400 },
            {
                time: '10:00 – 11:00 PM',
                price: 1300,
                lateNight: true,
                fullWidth: true,
            },
        ],
    },
];

const initialSelectedSlot = '07:00 – 08:00 PM';


export default function TimeSlotSelection({ date, onSlotChange }) {
    const [selectedSlot, setSelectedSlot] = useState(initialSelectedSlot);

    const {timeSlots, _, __} = useAllTimeSlots();

    console.log(timeSlots)


    const handleSlotSelect = (slot) => {
        if (slot.booked) return;

        setSelectedSlot(slot.time);

        onSlotChange?.({
            time: slot.time,
            price: slot.price,
        });
    };

    return (
        <div className="space-y-5 p-4" >
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
                            const isSelected = selectedSlot === slot.time;
                            const isBooked = Boolean(slot.booked);

                            if (isBooked) {
                                return (
                                    <div
                                        key={slot.time}
                                        aria-disabled="true"
                                        className="locked-card p-3 rounded-xl bg-surface-container-lowest border border-white/5 text-left flex flex-col justify-between h-18 opacity-35 cursor-not-allowed select-none"
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
                                                ₹{slot.price.toLocaleString('en-IN')}
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
                                    key={slot.time}
                                    type="button"
                                    data-time={slot.time}
                                    aria-pressed={isSelected}
                                    onClick={() => handleSlotSelect(slot)}
                                    className={`slot-card group p-3 rounded-xl text-left transition-all flex ${slot.fullWidth
                                        ? 'col-span-2 items-center justify-between active:scale-[0.99]'
                                        : 'flex-col justify-between h-18 active:scale-[0.98]'
                                        } ${isSelected
                                            ? 'active bg-surface-container-high border-2 border-primary shadow-sm relative'
                                            : 'bg-surface-container-low border border-white/10 hover:border-white/25'
                                        }`}
                                >
                                    {slot.fullWidth ? (
                                        <>
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                                                    nightlight
                                                </span>

                                                <span className="font-headline-sm text-xs font-semibold text-white">
                                                    {slot.time}
                                                </span>

                                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface-variant font-medium uppercase">
                                                    Late Night
                                                </span>
                                            </div>

                                            <span className="font-headline-sm text-sm font-bold text-primary">
                                                ₹{slot.price.toLocaleString('en-IN')}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex items-center justify-between w-full">
                                                <span
                                                    className={`font-headline-sm text-xs ${isSelected
                                                        ? 'font-bold text-primary'
                                                        : 'font-semibold text-white'
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
                                                        ? 'font-black text-primary'
                                                        : 'font-bold text-primary'
                                                        }`}
                                                >
                                                    ₹{slot.price.toLocaleString('en-IN')}
                                                </span>

                                                <span
                                                    className={`slot-badge text-[10px] ${isSelected
                                                        ? 'font-semibold text-primary/90 tracking-wide'
                                                        : 'text-on-surface-variant font-medium'
                                                        }`}
                                                >
                                                    {isSelected ? 'Selected' : 'Available'}
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
        </div>
    );
}