import { supabase } from '../../config/supabase';
import { cache, TTL } from '../../services/cacheService';

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

export const getPlacesByCity = async (cityId) => {
    const CACHE_KEY = `places_city_${cityId}`;
    const cached = await cache.get(CACHE_KEY);
    if (cached) return { data: cached, error: null, fromCache: true };
    const result = await getPlaces({ cityId, sortBy: 'popularity', limit: 200 });
    if (result.data) await cache.set(CACHE_KEY, result.data, TTL.LONG);
    return { ...result, fromCache: false };
};

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

/**
 * Belirli bir şehir ve gün için öğle + akşam yemeği önerileri üretir.
 * Mevcut getPlacesByCity cache'ini kullanır — ek Supabase çağrısı yapmaz.
 *
 * @param {number} cityId
 * @param {string[]} usedPlaceIds - O günün itinerary_items'ındaki place_id'ler
 * @param {number} day - Gün numarası (loglama için)
 * @returns {Promise<{ lunch: object|null, dinner: object|null }>}
 */
export const getMealSuggestions = async (cityId, usedPlaceIds = [], day = 1) => {
    try {
        const { data: allPlaces } = await getPlacesByCity(cityId);
        if (!allPlaces || allPlaces.length === 0) return { lunch: null, dinner: null };

        const usedSet = new Set(usedPlaceIds.map(String));

        const candidates = allPlaces
            .filter(p =>
                (p.category === 'restoran' || p.category === 'kafe') &&
                !usedSet.has(String(p.id))
            )
            .sort((a, b) => (b.popularity_score ?? 0) - (a.popularity_score ?? 0));

        return {
            lunch: candidates[0] ?? null,
            dinner: candidates[1] ?? null,
        };
    } catch {
        return { lunch: null, dinner: null };
    }
};
