import { useEffect, useState } from "react";
import { fetchVenue } from "../services/api.service";

// One request shared by every component on the page (header, booking card, login…).
let venuePromise = null;

const loadVenue = () => {
    if (!venuePromise) {
        venuePromise = fetchVenue()
            .then((res) => res.data?.venue ?? null)
            .catch(() => {
                venuePromise = null; // allow a retry on next mount
                return null;
            });
    }
    return venuePromise;
};

/**
 * Turf details set by the venue admin in Settings:
 * { name, tagline, phone, address, full_address, opening_hours, directions_url, map_embed_url, ... }
 */
export const useVenue = () => {
    const [venue, setVenue] = useState(null);

    useEffect(() => {
        let cancelled = false;
        loadVenue().then((v) => {
            if (!cancelled) setVenue(v);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    return { venue, venueName: venue?.name || "Turf" };
};
