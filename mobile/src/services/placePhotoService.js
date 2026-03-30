/**
 * placePhotoService.js — Gerçek yer fotoğrafları servisi
 *
 * Tamamen ücretsiz, API key gerektirmez:
 *   1. Wikipedia REST API → thumbnail + originalimage
 *   2. Wikimedia Commons API → Yüksek kaliteli görseller
 *   3. Curated fallback → placeImages.js sabitleri
 *
 * Sonuçlar AsyncStorage'a cache'lenir (7 gün TTL).
 */

import { cache, TTL } from './cacheService';
import { getPlaceImage } from '../constants/placeImages';

const TR_WIKI = 'https://tr.wikipedia.org/api/rest_v1';
const EN_WIKI = 'https://en.wikipedia.org/api/rest_v1';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';

const FETCH_HEADERS = {
    Accept: 'application/json',
    'User-Agent': 'SmartTravelGuide/1.0 (educational-app)',
};

// ─── Wikipedia'dan fotoğraf çek ───────────────────────────────────────────
async function fetchWikipediaPhoto(placeName) {
    const encoded = encodeURIComponent(placeName);

    // Önce Türkçe Wikipedia dene
    const urls = [
        `${TR_WIKI}/page/summary/${encoded}`,
        `${EN_WIKI}/page/summary/${encoded}`,
    ];

    for (const url of urls) {
        try {
            const res = await fetch(url, { headers: FETCH_HEADERS });
            if (!res.ok) continue;
            const data = await res.json();
            if (data.type === 'disambiguation' || data.type === 'no-extract') continue;

            // Orijinal büyük resmi tercih et, yoksa thumbnail
            const imgUrl = data.originalimage?.source || data.thumbnail?.source;
            if (imgUrl && imgUrl.startsWith('http')) {
                return {
                    imageUrl: imgUrl,
                    description: data.extract || '',
                    source: 'wikipedia',
                };
            }
        } catch {
            continue;
        }
    }
    return null;
}

// ─── Wikimedia Commons'tan fotoğraf çek ───────────────────────────────────
async function fetchCommonsPhoto(placeName) {
    try {
        const searchUrl = `${COMMONS_API}?action=query&format=json&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(placeName + ' Turkey')}&gsrlimit=3&prop=imageinfo&iiprop=url&iiurlwidth=800&origin=*`;

        const res = await fetch(searchUrl, { headers: FETCH_HEADERS });
        if (!res.ok) return null;

        const data = await res.json();
        const pages = data.query?.pages;
        if (!pages) return null;

        // İlk geçerli resmi al
        const pageValues = Object.values(pages);
        for (const page of pageValues) {
            const url = page.imageinfo?.[0]?.url;
            if (url && (url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.png'))) {
                return { imageUrl: url, source: 'commons' };
            }
        }
    } catch {
        return null;
    }
    return null;
}

// ─── Ana fonksiyon: yer için en iyi fotoğrafı getir ─────────────────────
/**
 * Bir gezilecek yer için gerçek fotoğraf URL'si döndürür.
 * Cache'de varsa anında döner (7 gün TTL).
 *
 * @param {string} placeName - Türkçe yer adı (örn: "Mevlana Müzesi")
 * @param {string|null} dbImageUrl - Supabase DB'den gelen image_url (varsa öncelikli)
 * @param {string|null} category - Yer kategorisi (fallback için)
 * @returns {Promise<{imageUrl: string, description?: string, source: string}>}
 */
export async function getPlacePhoto(placeName, dbImageUrl, category) {
    // 1. DB'de URL varsa onu kullan (en güvenilir)
    if (dbImageUrl && dbImageUrl.startsWith('http')) {
        return { imageUrl: dbImageUrl, source: 'db' };
    }

    // 2. Cache kontrol
    const cacheKey = `place_photo_${placeName?.toLowerCase().replace(/\s+/g, '_')}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    // 3. Wikipedia'dan çekmeye çalış (en iyi kaynak)
    const wikiResult = await fetchWikipediaPhoto(placeName);
    if (wikiResult?.imageUrl) {
        await cache.set(cacheKey, wikiResult, TTL.WEEK);
        return wikiResult;
    }

    // 4. Wikimedia Commons dene
    const commonsResult = await fetchCommonsPhoto(placeName);
    if (commonsResult?.imageUrl) {
        const result = { ...commonsResult, description: '' };
        await cache.set(cacheKey, result, TTL.WEEK);
        return result;
    }

    // 5. Curated fallback (placeImages.js sabitleri)
    const fallbackUrl = getPlaceImage(placeName, null, category);
    const fallback = { imageUrl: fallbackUrl, source: 'fallback' };
    await cache.set(cacheKey, fallback, TTL.LONG);
    return fallback;
}

/**
 * Birden fazla yer için fotoğrafları paralel olarak çeker.
 * @param {Array<{name: string, image_url?: string, category?: string}>} places
 * @returns {Promise<Object>} { "Mevlana Müzesi": { imageUrl, source }, ... }
 */
export async function getBatchPlacePhotos(places) {
    const results = {};
    await Promise.allSettled(
        places.map(async (place) => {
            const result = await getPlacePhoto(place.name, place.image_url, place.category);
            if (result) results[place.name] = result;
        })
    );
    return results;
}

/**
 * Şehir fotoğrafı için Wikipedia kullan
 * @param {string} cityName 
 * @returns {Promise<string|null>}
 */
export async function getCityPhoto(cityName) {
    const cacheKey = `city_photo_${cityName?.toLowerCase()}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const result = await fetchWikipediaPhoto(cityName);
    if (result?.imageUrl) {
        await cache.set(cacheKey, result.imageUrl, TTL.WEEK);
        return result.imageUrl;
    }
    return null;
}
