/**
 * cityPhotoService — Her şehir için Wikipedia'dan gerçek fotoğraf çeker ve cache'ler.
 * Şehir adıyla Wikipedia API'ye istek atar, ana fotoğrafı döndürür.
 */
import { cache, TTL } from './cacheService';

const TR_API = 'https://tr.wikipedia.org/api/rest_v1/page/summary';
const EN_API = 'https://en.wikipedia.org/api/rest_v1/page/summary';

// Şehir adı → Wikipedia arama terimi eşlemesi
// Bazı şehirlerin Wikipedia'daki adı farklı olabilir
const WIKI_SEARCH_TERMS = {
    'Nevşehir': 'Kapadokya',
    'Muğla': 'Bodrum',
    'Karabük': 'Safranbolu',
    'Şanlıurfa': 'Şanlıurfa',
    'Diyarbakır': 'Diyarbakır',
};

async function fetchWikiPhoto(searchTerm) {
    const encoded = encodeURIComponent(searchTerm);
    const headers = {
        Accept: 'application/json',
        'User-Agent': 'SmartTravelGuide/1.0',
    };

    // Önce Türkçe dene
    try {
        const res = await fetch(`${TR_API}/${encoded}`, { headers });
        if (res.ok) {
            const data = await res.json();
            if (data.type !== 'disambiguation') {
                const img = data.originalimage?.source || data.thumbnail?.source;
                if (img) return img;
            }
        }
    } catch { /* devam */ }

    // Türkçe bulamazsa İngilizce dene
    try {
        const res = await fetch(`${EN_API}/${encoded}`, { headers });
        if (res.ok) {
            const data = await res.json();
            if (data.type !== 'disambiguation') {
                const img = data.originalimage?.source || data.thumbnail?.source;
                if (img) return img;
            }
        }
    } catch { /* devam */ }

    return null;
}

/**
 * Bir şehir için Wikipedia fotoğrafını döndürür.
 * Cache'de varsa anında döner, yoksa çeker ve cache'ler.
 */
export async function getCityPhoto(cityName) {
    if (!cityName) return null;
    const CACHE_KEY = `city_photo_${cityName}`;

    const cached = await cache.get(CACHE_KEY);
    if (cached) return cached;

    const searchTerm = WIKI_SEARCH_TERMS[cityName] || cityName;
    const photoUrl = await fetchWikiPhoto(searchTerm);

    if (photoUrl) {
        await cache.set(CACHE_KEY, photoUrl, TTL.MONTH);
    }

    return photoUrl;
}

/**
 * Birden fazla şehir için fotoğrafları sıralı çeker (paralel değil).
 * ANR'ı önlemek için her istek arasında kısa bekleme var.
 * @param {Array} cities - { name, ... } dizisi
 * @returns {Object} { "İstanbul": "https://...", ... }
 */
export async function prefetchCityPhotos(cities) {
    const results = {};
    for (const city of cities) {
        try {
            const photo = await getCityPhoto(city.name);
            if (photo) results[city.name] = photo;
            // Her istek arasında 500ms bekle
            await new Promise(r => setTimeout(r, 500));
        } catch { /* devam */ }
    }
    return results;
}
