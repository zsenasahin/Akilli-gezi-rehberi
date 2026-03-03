import { supabase } from '../../config/supabase';

/**
 * PlaceRepository – `places` tablosu okuma işlemleri.
 * UI bileşenleri Supabase'e doğrudan erişmez; bu repository'yi kullanır.
 */

/**
 * @param {object} filters
 * @param {number}  [filters.cityId]
 * @param {string}  [filters.category]
 * @param {'popularity'|'name'|'fee_asc'|'fee_desc'} [filters.sortBy]
 * @param {number}  [filters.limit]
 * @param {number}  [filters.offset]
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

    if (cityId) query = query.eq('city_id', cityId);
    if (category && category !== 'all') query = query.eq('category', category);

    switch (sortBy) {
        case 'name': query = query.order('name', { ascending: true }); break;
        case 'fee_asc': query = query.order('entry_fee', { ascending: true }); break;
        case 'fee_desc': query = query.order('entry_fee', { ascending: false }); break;
        default: query = query.order('popularity_score', { ascending: false }); break;
    }

    const { data, error } = await query;
    return { data, error };
};

export const getPlacesByCity = (cityId) =>
    getPlaces({ cityId, sortBy: 'popularity' });

export const getPlacesByCityAndCategory = (cityId, category) =>
    getPlaces({ cityId, category, sortBy: 'popularity' });

export const getPlaceById = async (placeId) => {
    const { data, error } = await supabase
        .from('places')
        .select('*, cities(name)')
        .eq('id', placeId)
        .single();
    return { data, error };
};

export const getCategories = async (cityId) => {
    let query = supabase.from('places').select('category');
    if (cityId) query = query.eq('city_id', cityId);

    const { data, error } = await query;
    if (error) return { data: null, error };

    const unique = [...new Set(data.map((row) => row.category))];
    return { data: unique, error: null };
};
