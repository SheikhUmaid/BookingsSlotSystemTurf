import { useEffect, useState } from "react";
import { fetchLicence } from "../services/api.service";

/**
 * Venue licence as reported by the backend (which mirrors the Subscription Registry).
 * Feature flags decide what the booking app shows; the backend enforces the same
 * rules, so if this request fails we fall back to "allowed" and let the API decide.
 */
export const useLicence = () => {
    const [licence, setLicence] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetchLicence();
                if (!cancelled) setLicence(res.data);
            } catch {
                if (!cancelled) setLicence(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const known = Boolean(licence);
    const hasFeature = (key) => (known ? licence.features?.[key] === true : true);
    const bookingOpen = known ? licence.bookingEnabled === true && hasFeature("bookingPWA") : true;
    const paymentsOpen = hasFeature("onlinePayments");

    return { licence, loading, hasFeature, bookingOpen, paymentsOpen };
};
