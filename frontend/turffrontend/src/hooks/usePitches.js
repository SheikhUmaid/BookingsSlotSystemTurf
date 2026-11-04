import { useState, useEffect } from 'react';
import { fetchPitches } from '../services/api.service';

export const usePitches = () => {
    const [pitches, setPitches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const response = await fetchPitches();
                setPitches(response.data);
            } catch (err) {
                setError(err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return { pitches, loading, error };
};
