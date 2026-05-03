import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    getFavorites,
    toggleFavorite,
    checkIsFavorite,
} from '../data/repositories/favoriteRepository';

/**
 * Custom hook for managing favorites state.
 * Provides the user's favorites list, optimistic toggle, and lookup.
 *
 * Usage:
 *   const { favorites, favoriteIds, isFavorite, toggle, loading } = useFavorites();
 */
const useFavorites = () => {
    const { user } = useAuth();
    const [favorites, setFavorites] = useState([]);
    const [favoriteIds, setFavoriteIds] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchFavorites = useCallback(async () => {
        if (!user) {
            setFavorites([]);
            setFavoriteIds(new Set());
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await getFavorites(user.id);

        if (fetchError) {
            setError(fetchError.message);
        } else {
            setFavorites(data || []);
            setFavoriteIds(new Set((data || []).map((f) => f.place_id)));
        }

        setLoading(false);
    }, [user]);

    useEffect(() => {
        fetchFavorites();
    }, [fetchFavorites]);

    /**
     * Check if a place is favorited.
     * @param {string|number} placeId
     * @returns {boolean}
     */
    const isFavorite = useCallback(
        (placeId) => favoriteIds.has(placeId),
        [favoriteIds]
    );

    /**
     * Toggle a place in/out of favorites with optimistic update.
     * @param {object} place
     */
    const toggle = useCallback(
        async (place) => {
            if (!user || !place || !place.id) return;
            const placeId = place.id;

            // Optimistic update
            const wasFavorite = favoriteIds.has(placeId);
            const newIds = new Set(favoriteIds);

            if (wasFavorite) {
                newIds.delete(placeId);
            } else {
                newIds.add(placeId);
            }
            setFavoriteIds(newIds);

            // Server call
            const { error: toggleError } = await toggleFavorite(user.id, place);

            if (toggleError) {
                // Revert on error
                setFavoriteIds(favoriteIds);
                setError(toggleError.message);
            } else {
                // Refresh full list for consistency
                fetchFavorites();
            }
        },
        [user, favoriteIds, fetchFavorites]
    );

    return {
        favorites,
        favoriteIds,
        isFavorite,
        toggle,
        loading,
        error,
        refresh: fetchFavorites,
    };
};

export default useFavorites;
