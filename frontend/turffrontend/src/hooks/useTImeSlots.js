import { fetchAllTimeSlots, fetchAvailableTimeSlots } from "../services/api.service";
import { useEffect, useState } from "react";




export const useAllTimeSlots = () => {
    const [timeSlots, setTimeSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const response = await fetchAllTimeSlots();
                setTimeSlots(response.data);
            } catch (err) {
                setError(err);
                console.error('Error fetching sports:', err);
            } finally {
                setLoading(false);
                console.log('Sports data fetched:', timeSlots);
            }
        })();

    }, []);
    return { timeSlots, loading, error };
}