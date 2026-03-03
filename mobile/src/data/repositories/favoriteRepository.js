import { supabase } from '../../config/supabase';

/**
 * FavoriteRepository – `favorites` tablosu CRUD işlemleri.
 */

export const getFavorites = async (userId) => {
    const { data, error } = await supabase
        .from('favorites')
        .select(`
            id,
            place_id,
            created_at,
            places (
                id, name, short_description, category,
                image_url, entry_fee, avg_duration,
                popularity_score, lat, lng, city_id,
                cities ( name )
            )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    return { data, error };
};

export const getFavoriteIds = async (userId) => {
    const { data, error } = await supabase
        .from('favorites')
        .select('place_id')
        .eq('user_id', userId);

    const favoriteIds = new Set((data || []).map((f) => f.place_id));
    return { favoriteIds, error };
};

export const checkIsFavorite = async (userId, placeId) => {
    const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('place_id', placeId)
        .maybeSingle();

    return { isFavorite: !!data, favoriteId: data?.id ?? null, error };
};

export const addFavorite = async (userId, placeId) => {
    const { data, error } = await supabase
        .from('favorites')
        .insert([{ user_id: userId, place_id: placeId }])
        .select()
        .single();
    return { data, error };
};

export const removeFavorite = async (userId, placeId) => {
    const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('place_id', placeId);
    return { error };
};

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
