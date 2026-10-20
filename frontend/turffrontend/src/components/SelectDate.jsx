
import { useState } from "react";

const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

const formatDateLabel = (date) =>
    date.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
    });

const getDates = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() + index);

        return {
            day: date.toLocaleDateString("en-IN", {
                weekday: "short",
            }),
            date: date.getDate(),
            label:
                index === 0
                    ? "Today"
                    : index === 1
                        ? "Tomorrow"
                        : date.getDay() === 0 || date.getDay() === 6
                            ? "Prime"
                            : "Open",
            value: formatDateLabel(date),
            isoDate: getLocalDateString(date),
        };
    });
};

const getQuickDates = (dates) => [
    { label: "Today", value: dates[0].isoDate },
    { label: "Tomorrow", value: dates[1].isoDate },
    {
        label: "Weekend",
        value:
            dates.find((date) => {
                const day = new Date(
                    `${date.isoDate}T12:00:00`
                ).getDay();

                return day === 6;
            })?.isoDate ?? dates[6].isoDate,
    },
];

export default function DateSelector({ onDateChange }) {
    const [dates] = useState(getDates);
    const [selectedDate, setSelectedDate] = useState(dates[0].isoDate);
    const [activeQuickDate, setActiveQuickDate] = useState("Today");

    const quickDates = getQuickDates(dates);

    const handleDateSelect = (date) => {
        setSelectedDate(date.isoDate);

        const quickDate = quickDates.find(
            (item) => item.value === date.isoDate
        );

        setActiveQuickDate(quickDate?.label ?? "");

        onDateChange?.(date.isoDate);
    };

    const handleQuickDate = (quickDate) => {
        const matchingDate = dates.find(
            (date) => date.isoDate === quickDate.value
        );

        if (matchingDate) {
            handleDateSelect(matchingDate);
        }
    };

    return (
        <div className="p-4">
            <div className="flex items-center justify-between mb-2">
                <span className="font-headline-sm text-xs uppercase tracking-wider font-semibold text-on-surface-variant">
                    3. Select Date
                </span>

                <div className="flex items-center gap-1" id="quick-filters">
                    {quickDates.map((quickDate) => {
                        const isActive =
                            activeQuickDate === quickDate.label;

                        return (
                            <button
                                key={quickDate.label}
                                type="button"
                                onClick={() => handleQuickDate(quickDate)}
                                className={`quick-pill px-2.5 py-1 rounded-md text-[11px] transition-colors active:scale-95 ${isActive
                                        ? "active font-semibold bg-surface-container-highest text-white border border-white/10 shadow-sm"
                                        : "font-medium bg-surface-container-low text-on-surface-variant hover:text-white border border-white/5"
                                    }`}
                            >
                                {quickDate.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar -mx-4 px-4 pr-6 select-none">
                {dates.map((date) => {
                    const isSelected = selectedDate === date.isoDate;

                    return (
                        <button
                            key={date.isoDate}
                            type="button"
                            data-date={date.isoDate}
                            onClick={() => handleDateSelect(date)}
                            aria-pressed={isSelected}
                            className={`date-chip flex-shrink-0 w-14 py-2 flex flex-col items-center rounded-xl transition-all active:scale-95 ${isSelected
                                    ? "active bg-primary text-on-primary border-2 border-primary shadow-sm"
                                    : "bg-surface-container-low border border-white/10 hover:border-white/20 text-on-surface"
                                }`}
                        >
                            <span
                                className={`font-label-caps text-[10px] uppercase ${isSelected
                                        ? "font-bold text-on-primary"
                                        : "text-on-surface-variant"
                                    }`}
                            >
                                {date.day}
                            </span>

                            <span
                                className={`font-headline-sm text-base ${isSelected
                                        ? "font-black text-on-primary"
                                        : "font-bold text-white"
                                    }`}
                            >
                                {date.date}
                            </span>

                            <span
                                className={`text-[9px] mt-0.5 ${isSelected
                                        ? "font-bold text-on-primary"
                                        : date.label === "Today"
                                            ? "font-semibold text-primary"
                                            : date.label === "Prime"
                                                ? "text-primary font-medium"
                                                : "text-on-surface-variant"
                                    }`}
                            >
                                {isSelected ? "Active" : date.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
