import { useState, useEffect } from 'react';
import { fetchSports } from '../services/api.service';

export const useSports = () => {
    const [sports, setSports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const response = await fetchSports();
                setSports(response.data);
            } catch (err) {
                setError(err);
                console.error('Error fetching sports:', err);
            } finally {
                setLoading(false);
                console.log('Sports data fetched:', sports);
            }
        })();

    }, []);
    return { sports, loading, error };
}