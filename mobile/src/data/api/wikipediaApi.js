import { cache, TTL } from '../../services/cacheService';

/**
 * WikipediaApi – Wikipedia REST API istemcisi.
 * Tamamen ücretsiz, API key gerektirmez.
 *
 * Kullanım:
 *   const info = await getPlaceSummary('Ayasofya');
 *   // → { title, description, imageUrl, fullImageUrl }
 */

const TR_API = 'https://tr.wikipedia.org/api/rest_v1';
const EN_API = 'https://en.wikipedia.org/api/rest_v1';

async function fetchSummary(url) {
    if (!url || typeof url !== 'string') return null;
    try {
        const res = await fetch(url, {
            headers: {
                Accept: 'application/json',
                'User-Agent': 'SmartTravelGuide/1.0 (React Native App)',
            },
        });

        if (!res.ok) return null;

        const data = await res.json();
        if (data.type === 'disambiguation') return null;

        return {
            title: data.title || '',
            description: data.extract || '',
            imageUrl: data.thumbnail?.source || null,
            fullImageUrl: data.originalimage?.source || null,
        };
    } catch {
        return null;
    }
}


/**
 * Bir yer için Wikipedia özeti getirir.
 * Önce Türkçe Wikipedia dener, bulamazsa İngilizce'ye düşer.
 * Sonuçları cache'ler.
 */
export async function getPlaceSummary(placeName) {
    if (!placeName) return null;

    const CACHE_KEY = `wiki_${placeName.replace(/\s+/g, '_')}`;
    const cached = await cache.get(CACHE_KEY);
    if (cached) return cached;

    const encoded = encodeURIComponent(placeName);
    const trResult = await fetchSummary(`${TR_API}/page/summary/${encoded}`);
    
    let result = trResult;
    if (!result) {
        result = await fetchSummary(`${EN_API}/page/summary/${encoded}`);
    }

    if (result) {
        await cache.set(CACHE_KEY, result, TTL.WEEK);
    }

    return result;
}

/**
 * Birden fazla yer için Wikipedia bilgisi getirir (paralel).
 *
 * @param {string[]} placeNames
 * @returns {Object} { "Ayasofya": { title, description, imageUrl }, ... }
 */
export async function getBatchSummaries(placeNames) {
    const results = {};
    await Promise.allSettled(
        placeNames.map(async (name) => {
            const info = await getPlaceSummary(name);
            if (info) results[name] = info;
        })
    );
    return results;
}
