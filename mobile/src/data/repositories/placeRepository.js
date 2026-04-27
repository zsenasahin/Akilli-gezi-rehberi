import { supabase } from '../../config/supabase';
import { cache, TTL } from '../../services/cacheService';
import { loadCityPlaces } from '../../services/placeDataManager';
import { getCityCenter } from '../../constants/cities';

/**
 * PlaceRepository – gezilecek yer işlemleri.
 *
 * Yerler artık Supabase'de tutulmuyor; Overpass (OSM) + Wikidata/Wikipedia'dan
 * çekilip AsyncStorage'da cache'leniyor (placeDataManager).
 *
 * Bu dosyada sadece:
 *  - itinerary_items içindeki place_id'ye göre tek yer okuma (Supabase join için)
 *  - Yemek önerileri (Overpass cache'inden)
 */

/**
 * Tek bir yeri Supabase'den çeker (itinerary detay ekranı için).
 * places tablosu artık sadece itinerary'ye bağlı yerler için kullanılıyor.
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
 * Şehrin tüm gezilecek yerlerini Overpass'tan çeker (cache'li).
 * Eski Supabase tabanlı getPlacesByCity'nin yerini alır.
 */
export const getPlacesByCity = async (cityId, cityName = '') => {
    const center = getCityCenter(cityName);
    const data = await loadCityPlaces({ id: cityId, name: cityName, lat: center.lat, lng: center.lng });
    return { data: data || [], error: null };
};

/**
 * Belirli bir şehir ve gün için öğle + akşam yemeği önerileri üretir.
 * loadCityPlaces cache'ini kullanır — Supabase çağrısı yapmaz.
 *
 * @param {number} cityId
 * @param {string} cityName - Şehir adı (Overpass için gerekli)
 * @param {string[]} usedPlaceIds - O günün itinerary_items'ındaki place_id'ler
 * @returns {Promise<{ lunch: object|null, dinner: object|null }>}
 */
export const getMealSuggestions = async (cityId, cityName = '', usedPlaceIds = []) => {
    try {
        const center = getCityCenter(cityName);
        const allPlaces = await loadCityPlaces({ id: cityId, name: cityName, lat: center.lat, lng: center.lng });
        if (!allPlaces || allPlaces.length === 0) return { lunch: null, dinner: null };

        const usedSet = new Set(usedPlaceIds.map(String));
        const candidates = allPlaces
            .filter(p =>
                (p.category === 'restoran' || p.category === 'kafe') &&
                !usedSet.has(String(p.osm_id))
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
