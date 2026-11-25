import { useEffect, useState } from "react";
import { fetchVenue } from "../services/api.service";

// One request shared by every component on the page (header, booking card, login…).
let venuePromise = null;

const loadVenue = () => {
    if (!venuePromise) {
        venuePromise = fetchVenue()
            .then((res) => {
                const v = res.data?.venue ?? null;
                // Brand the browser tab / installed-app title with the turf's name.
                if (v?.name) document.title = v.name;
                return v;
            })
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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        loadVenue().then((v) => {
            if (cancelled) return;
            setVenue(v);
            setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    return { venue, venueName: venue?.name || "Turf", loading };
};
