import { supabase } from '../../config/supabase';
import { getCityCenter } from '../../constants/cities';
import { getCityPOIs } from '../api/overpassApi';

/**
 * PlaceRepository – gezilecek yer işlemleri.
 */

export const getPlaceById = async (placeId) => {
    const { data, error } = await supabase
        .from('places')
        .select('*, cities(name)')
        .eq('id', placeId)
        .single();
    return { data, error };
};

export const getPlacesByCity = async (cityId, cityName = '') => {
    // Artık Supabase yerine Overpass'tan çekiyoruz
    const center = getCityCenter(cityName);
    const { data } = await getCityPOIs(center.lat, center.lng, 'restaurant', 3000);
    return { data: data || [], error: null };
};

// ─── Haversine mesafesi ───────────────────────────────────────────────────────
function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Belirli bir şehir ve gün için öğle + akşam yemeği yeri önerileri üretir.
 * Overpass API'den gerçek restoran/kafe çeker.
 *
 * - Öğle: günün ortasındaki iki yer arasına en yakın restoran
 * - Akşam: son yerden sonra en yakın restoran
 *
 * @param {number} cityId
 * @param {string} cityName
 * @param {string[]} usedPlaceIds
 * @param {Array} [orderedPlaces] - Günün sıralı yerleri
 * @returns {Promise<{ lunch, dinner, lunchAfterIndex, dinnerAfterIndex }>}
 */
export const getMealSuggestions = async (cityId, cityName = '', usedPlaceIds = [], orderedPlaces = []) => {
    const lunchAfterIndex = orderedPlaces.length > 1
        ? Math.floor(orderedPlaces.length / 2) - 1
        : 0;
    const dinnerAfterIndex = Math.max(0, orderedPlaces.length - 1);

    const empty = { lunch: null, dinner: null, lunchAfterIndex, dinnerAfterIndex };

    try {
        const center = getCityCenter(cityName);

        // Hem restoran hem kafe çek
        const [restResult, cafeResult] = await Promise.all([
            getCityPOIs(center.lat, center.lng, 'restaurant', 3000),
            getCityPOIs(center.lat, center.lng, 'cafe', 2000),
        ]);

        const allEateries = [
            ...(restResult.data || []),
            ...(cafeResult.data || []),
        ].filter(p => p.name && p.lat && p.lng);

        if (allEateries.length === 0) return empty;

        // Öğle: günün ortasındaki iki yer arasına en yakın
        let lunchPivotLat = center.lat;
        let lunchPivotLng = center.lng;
        if (orderedPlaces.length > 1) {
            const a = orderedPlaces[lunchAfterIndex];
            const b = orderedPlaces[lunchAfterIndex + 1];
            if (a?.lat && b?.lat) {
                lunchPivotLat = (a.lat + b.lat) / 2;
                lunchPivotLng = (a.lng + b.lng) / 2;
            }
        }

        const sortedForLunch = [...allEateries].sort((a, b) =>
            haversine(lunchPivotLat, lunchPivotLng, a.lat, a.lng) -
            haversine(lunchPivotLat, lunchPivotLng, b.lat, b.lng)
        );
        const lunch = sortedForLunch[0] ? {
            ...sortedForLunch[0],
            id: String(sortedForLunch[0].id),
            type: 'restaurant',
        } : null;

        // Akşam: son yere en yakın, öğleden farklı
        let dinnerPivotLat = center.lat;
        let dinnerPivotLng = center.lng;
        const lastPlace = orderedPlaces[orderedPlaces.length - 1];
        if (lastPlace?.lat) {
            dinnerPivotLat = lastPlace.lat;
            dinnerPivotLng = lastPlace.lng;
        }

        const sortedForDinner = [...allEateries]
            .filter(p => p.id !== sortedForLunch[0]?.id)
            .sort((a, b) =>
                haversine(dinnerPivotLat, dinnerPivotLng, a.lat, a.lng) -
                haversine(dinnerPivotLat, dinnerPivotLng, b.lat, b.lng)
            );
        const dinner = sortedForDinner[0] ? {
            ...sortedForDinner[0],
            id: String(sortedForDinner[0].id),
            type: 'restaurant',
        } : null;

        return { lunch, dinner, lunchAfterIndex, dinnerAfterIndex };
    } catch (err) {
        console.warn('getMealSuggestions error:', err.message);
        return empty;
    }
};
