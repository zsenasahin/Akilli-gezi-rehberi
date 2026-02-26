import { supabase } from '../config/supabase';

/**
 * Place service – all read operations for the `places` table.
 * UI components should NEVER call Supabase directly; they use this service.
 */

/**
 * Fetch all places, optionally filtered.
 *
 * @param {object}  filters
 * @param {number}  [filters.cityId]    – filter by city
 * @param {string}  [filters.category]  – filter by category (ignored if 'all')
 * @param {'popularity'|'name'|'fee_asc'|'fee_desc'} [filters.sortBy] – sort mode
 * @param {number}  [filters.limit]     – max results
 * @param {number}  [filters.offset]    – pagination offset
 * @returns {Promise<{ data: Array, error: object|null }>}
 */
export const getPlaces = async ({
    cityId,
    category,
    sortBy = 'popularity',
    limit = 50,
    offset = 0,
} = {}) => {
    let query = supabase
        .from('places')
        .select('*, cities(name)')
        .range(offset, offset + limit - 1);

    if (cityId) {
        query = query.eq('city_id', cityId);
    }

    if (category && category !== 'all') {
        query = query.eq('category', category);
    }

    // Apply sorting
    switch (sortBy) {
        case 'name':
            query = query.order('name', { ascending: true });
            break;
        case 'fee_asc':
            query = query.order('entry_fee', { ascending: true });
            break;
        case 'fee_desc':
            query = query.order('entry_fee', { ascending: false });
            break;
        case 'popularity':
        default:
            query = query.order('popularity_score', { ascending: false });
            break;
    }

    const { data, error } = await query;
    return { data, error };
};

/**
 * Fetch all places for a given city, ordered by popularity (descending).
 * @param {number} cityId
 */
export const getPlacesByCity = async (cityId) => {
    return getPlaces({ cityId, sortBy: 'popularity' });
};

/**
 * Fetch places filtered by city and category.
 * @param {number} cityId
 * @param {string} category
 */
export const getPlacesByCityAndCategory = async (cityId, category) => {
    return getPlaces({ cityId, category, sortBy: 'popularity' });
};

/**
 * Fetch a single place by ID, including city data.
 * @param {number} placeId
 */
export const getPlaceById = async (placeId) => {
    const { data, error } = await supabase
        .from('places')
        .select('*, cities(name)')
        .eq('id', placeId)
        .single();

    return { data, error };
};

/**
 * Fetch distinct categories for a given city.
 * Useful for dynamic filter chips.
 * @param {number} [cityId]
 * @returns {Promise<{ data: string[], error: object|null }>}
 */
export const getCategories = async (cityId) => {
    let query = supabase.from('places').select('category');

    if (cityId) {
        query = query.eq('city_id', cityId);
    }

    const { data, error } = await query;

    if (error) return { data: null, error };

    // Deduplicate categories
    const unique = [...new Set(data.map((row) => row.category))];
    return { data: unique, error: null };
};
