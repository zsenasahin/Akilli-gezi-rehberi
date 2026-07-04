/**
 * geocodingService.js — Batch geocoding with caching for place coordinates
 *
 * Yer isimlerini koordinatlara çevirir (Nominatim API).
 * Sonuçları AsyncStorage'da cache'ler, tekrar tekrar istek atmaz.
 * Rate limiting (1 istek/saniye) uygular.
 */

import { cache, TTL } from './cacheService';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'SmartTravelGuideApp/1.0 (contact@smarttravelguide.app)';
const RATE_LIMIT_MS = 1100; // 1.1 saniye bekle

/**
 * Tek bir yer için geocoding yapar.
 * @param {string} placeName - Yer adı (ör: "Topkapı Sarayı")
 * @param {string} cityName - Şehir adı (ör: "İstanbul")
 * @returns {{ lat: number, lng: number } | null}
 */
async function geocodePlace(placeName, cityName) {
    try {
        const query = `${placeName}, ${cityName}, Türkiye`;
        const url = `${NOMINATIM_BASE}?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=tr`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept-Language': 'tr-TR',
            },
        });

        if (!response.ok) {
            console.warn(`[Geocoding] API hatası ${response.status}: ${placeName}`);
            return null;
        }

        const data = await response.json();
        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon),
            };
        }

        return null;
    } catch (error) {
        console.warn(`[Geocoding] Hata: ${placeName}`, error.message);
        return null;
    }
}

/**
 * Delay helper — rate limiting için.
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Bir şehirdeki tüm yerler için toplu geocoding yapar.
 * Cache'deki mevcut koordinatları kullanır, olmayanlar için API çağrısı yapar.
 *
 * @param {Array<{id: string, name: string, lat?: number, lng?: number}>} places
 * @param {string} cityName - Şehir adı
 * @param {{ lat: number, lng: number }} cityCenter - Şehir merkezi koordinatları (fallback)
 * @param {Function} [onProgress] - İlerleme callback'i (geocoded, total)
 * @returns {Promise<Array>} Koordinatları eklenmiş yer listesi
 */
export async function batchGeocodeForCity(places, cityName, cityCenter, onProgress) {
    const CACHE_KEY = `geocode_coords_v2_${cityName}`;

    // Cache'den koordinat haritasını oku
    let coordCache = (await cache.get(CACHE_KEY)) || {};
    let geocodedCount = 0;
    let apiCalls = 0;

    const result = [];

    for (let i = 0; i < places.length; i++) {
        const place = places[i];

        // Zaten koordinatı var
        if (place.lat && place.lng && !isNaN(place.lat) && !isNaN(place.lng)) {
            result.push(place);
            continue;
        }

        // Cache'de var
        const placeKey = place.id || place.name;
        if (coordCache[placeKey]) {
            result.push({
                ...place,
                lat: coordCache[placeKey].lat,
                lng: coordCache[placeKey].lng,
            });
            continue;
        }

        // API'den çözümle (rate limiting ile)
        if (apiCalls > 0) {
            await delay(RATE_LIMIT_MS);
        }

        const coords = await geocodePlace(place.name, cityName);
        apiCalls++;

        if (coords) {
            coordCache[placeKey] = coords;
            result.push({
                ...place,
                lat: coords.lat,
                lng: coords.lng,
            });
            geocodedCount++;
        } else {
            // Geocoding başarısız — şehir merkezi ile devam et (son çare)
            result.push({
                ...place,
                lat: cityCenter.lat,
                lng: cityCenter.lng,
                _geocodeFailed: true,
            });
        }

        onProgress?.(i + 1, places.length, geocodedCount);
    }

    // Güncellenmiş cache'i kaydet (30 gün)
    if (apiCalls > 0) {
        await cache.set(CACHE_KEY, coordCache, TTL.WEEK * 4);
        console.log(`[Geocoding] ${cityName}: ${apiCalls} API çağrısı, ${geocodedCount} başarılı`);
    }

    return result;
}

/**
 * Sadece koordinatı olmayan yerlerin sayısını döndürür.
 * Geocoding gerekip gerekmediğini kontrol etmek için.
 */
export function countMissingCoords(places) {
    return places.filter(p => !p.lat || !p.lng || isNaN(p.lat) || isNaN(p.lng)).length;
}

/**
 * Cache'deki geocode verilerini temizler (belirli bir şehir için).
 */
export async function clearGeocodeCacheForCity(cityName) {
    await cache.invalidate(`geocode_coords_v2_${cityName}`);
}
