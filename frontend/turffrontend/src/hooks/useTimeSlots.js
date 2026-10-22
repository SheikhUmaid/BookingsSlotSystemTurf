
import { useEffect, useState } from "react";
import {
    fetchAllTimeSlots,
    fetchAvailableTimeSlots,
} from "../services/api.service";

const sessionConfig = {
    "Morning Sessions": {
        title: "Morning Sessions (06:00 – 12:00)",
        icon: "wb_twilight",
        iconColor: "text-primary",
    },
    "Afternoon Sessions": {
        title: "Afternoon Sessions (12:00 – 17:00)",
        icon: "light_mode",
        iconColor: "text-amber-400",
    },
    "Floodlit Evening": {
        title: "Floodlit Evening (17:00 – 23:00)",
        icon: "dark_mode",
        iconColor: "text-primary",
        prime: true,
    },
    "Late Night": {
        title: "Late Night (22:00 onwards)",
        icon: "nightlight",
        iconColor: "text-primary",
    },
};

const formatTime = (time) => {
    const [hours, minutes] = time.split(":").map(Number);
    const suffix = hours >= 12 ? "PM" : "AM";
    const displayHour = hours % 12 || 12;

    return `${String(displayHour).padStart(2, "0")}:${String(
        minutes
    ).padStart(2, "0")} ${suffix}`;
};

const formatTimeRange = (startTime, endTime) =>
    `${formatTime(startTime)} – ${formatTime(endTime)}`;

const getStartHour = (time) => Number(time.split(":")[0]);

const normalizeTimeSlots = (allSlots, availableSlots) => {
    const availableIds = new Set(
        availableSlots.map((slot) => String(slot._id))
    );

    const groupedSlots = new Map();

    for (const slot of allSlots) {
        const config = sessionConfig[slot.category];

        if (!config) continue;

        const startHour = getStartHour(slot.start_time);
        const endHour = getStartHour(slot.end_time);

        const normalizedSlot = {
            id: slot._id,
            time: formatTimeRange(slot.start_time, slot.end_time),
            price: slot.price,
            booked: !availableIds.has(String(slot._id)),
            ...(slot.category === "Late Night" && {
                lateNight: true,
                fullWidth: true,
            }),
        };

        if (!groupedSlots.has(slot.category)) {
            groupedSlots.set(slot.category, {
                ...config,
                slots: [],
            });
        }

        groupedSlots.get(slot.category).slots.push(normalizedSlot);
    }

    return Object.values(
        Object.fromEntries(groupedSlots)
    );
};

export const useTimeSlots = (date) => {
    const [timeSlots, setTimeSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!date) return;

        const controller = new AbortController();

        const loadTimeSlots = async () => {
            setLoading(true);
            setError(null);

            try {
                const [allResponse, availableResponse] =
                    await Promise.all([
                        fetchAllTimeSlots(),
                        fetchAvailableTimeSlots(date, {
                            signal: controller.signal,
                        }),
                    ]);

                if (controller.signal.aborted) return;

                const allSlots = allResponse.data;
                const availableSlots = availableResponse.data;

                setTimeSlots(
                    normalizeTimeSlots(allSlots, availableSlots)
                );
            } catch (err) {
                if (err.name === "AbortError" ||
                    err.name === "CanceledError") {
                    return;
                }

                setError(err);
                setTimeSlots([]);
                console.error("Error fetching time slots:", err);
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        loadTimeSlots();

        return () => controller.abort();
    }, [date]);

    return { timeSlots, loading, error };
};
