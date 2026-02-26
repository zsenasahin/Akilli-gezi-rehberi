import { supabase } from '../config/supabase';

/**
 * Favorites service – CRUD for the `favorites` table.
 * Keeps favorites logic separated from UI components.
 */

/**
 * Get all favorites for the current user, joining place data.
 * @param {string} userId
 * @returns {Promise<{ data: Array, error: object|null }>}
 */
export const getFavorites = async (userId) => {
    const { data, error } = await supabase
        .from('favorites')
        .select(`
            id,
            place_id,
            created_at,
            places (
                id,
                name,
                short_description,
                category,
                image_url,
                entry_fee,
                avg_duration,
                popularity_score,
                lat,
                lng,
                city_id,
                cities ( name )
            )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    return { data, error };
};

/**
 * Check if a place is in the user's favorites.
 * @param {string} userId
 * @param {number} placeId
 * @returns {Promise<{ isFavorite: boolean, favoriteId: number|null, error: object|null }>}
 */
export const checkIsFavorite = async (userId, placeId) => {
    const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('place_id', placeId)
        .maybeSingle();

    return {
        isFavorite: !!data,
        favoriteId: data?.id ?? null,
        error,
    };
};

/**
 * Add a place to the user's favorites.
 * @param {string} userId
 * @param {number} placeId
 * @returns {Promise<{ data: object, error: object|null }>}
 */
export const addFavorite = async (userId, placeId) => {
    const { data, error } = await supabase
        .from('favorites')
        .insert([{ user_id: userId, place_id: placeId }])
        .select()
        .single();

    return { data, error };
};

/**
 * Remove a place from the user's favorites.
 * @param {string} userId
 * @param {number} placeId
 * @returns {Promise<{ error: object|null }>}
 */
export const removeFavorite = async (userId, placeId) => {
    const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('place_id', placeId);

    return { error };
};

/**
 * Toggle a place in/out of favorites.
 * Returns the new state.
 * @param {string} userId
 * @param {number} placeId
 * @returns {Promise<{ isFavorite: boolean, error: object|null }>}
 */
export const toggleFavorite = async (userId, placeId) => {
    const { isFavorite, error: checkError } = await checkIsFavorite(userId, placeId);

    if (checkError) return { isFavorite: false, error: checkError };

    if (isFavorite) {
        const { error } = await removeFavorite(userId, placeId);
        return { isFavorite: false, error };
    } else {
        const { error } = await addFavorite(userId, placeId);
        return { isFavorite: true, error };
    }
};
