import { useState, useCallback } from 'react';
import { getPlaces } from '../services/placeService';

/**
 * Custom hook for fetching and filtering places.
 *
 * Usage:
 *   const { places, loading, error, fetchPlaces } = usePlaces();
 *   fetchPlaces({ cityId: 1, category: 'museum', sortBy: 'popularity' });
 */
const usePlaces = () => {
    const [places, setPlaces] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchPlaces = useCallback(async (filters = {}) => {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await getPlaces(filters);

        if (fetchError) {
            setError(fetchError.message);
            setPlaces([]);
        } else {
            setPlaces(data || []);
        }

        setLoading(false);
    }, []);

    return { places, loading, error, fetchPlaces };
};

export default usePlaces;
