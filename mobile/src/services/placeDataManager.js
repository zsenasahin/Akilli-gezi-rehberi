/**
 * placeDataManager.js
 *
 * Overpass → Wikidata → Wikipedia → Wikimedia → Supabase cache
 *
 * Akış:
 *   1. Supabase cache kontrol (varsa anında dön)
 *   2. Overpass'tan şehrin tüm tourism/historic yerlerini çek
 *   3. Her yer için Wikidata'dan açıklama + fotoğraf çek
 *   4. Supabase'e kaydet (sonraki açılışta cache'den gelir)
 */

import { supabase } from '../config/supabase';
import { cache, TTL } from './cacheService';

// ─── Sabitler ────────────────────────────────────────────────────────────────

const OVERPASS_SERVERS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
];

const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
const TR_WIKI = 'https://tr.wikipedia.org/api/rest_v1/page/summary';
const EN_WIKI = 'https://en.wikipedia.org/api/rest_v1/page/summary';

const HEADERS = {
    Accept: 'application/json',
    'User-Agent': 'SmartTravelGuide/1.0',
};

// Overpass istekleri arasındaki bekleme (ms) — rate limit koruması
const RATE_LIMIT_MS = 1000;

// ─── Yardımcı ────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function cleanText(text) {
    if (!text) return '';
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .normalize('NFC')
        .trim();
}

function getCategoryFromTags(tags) {
    if (tags.tourism === 'museum') return 'müze';
    if (tags.tourism === 'attraction') return 'tarihi';
    if (tags.tourism === 'viewpoint') return 'doğa';
    if (tags.historic === 'castle') return 'tarihi';
    if (tags.historic === 'mosque' || tags.amenity === 'place_of_worship') return 'dini';
    if (tags.historic) return 'tarihi';
    if (tags.leisure === 'park' || tags.leisure === 'garden') return 'park';
    if (tags.natural) return 'doğa';
    return 'tarihi';
}

function getEmojiFromCategory(cat) {
    const map = {
        'müze': '🎨', 'tarihi': '🏛️', 'dini': '🕌',
        'doğa': '🌿', 'park': '🌳', 'eğlence': '🎭',
    };
    return map[cat] || '📍';
}

// ─── Overpass ────────────────────────────────────────────────────────────────

async function queryOverpass(query) {
    for (const server of OVERPASS_SERVERS) {
        try {
            const res = await fetch(server, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `data=${encodeURIComponent(query)}`,
                signal: AbortSignal.timeout(15000),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.elements?.length) return data.elements;
            }
        } catch { /* sonraki sunucuyu dene */ }
    }
    return [];
}

/**
 * Şehir merkezinden belirli yarıçapta tourism + historic yerleri çeker.
 */
async function fetchPlacesFromOverpass(lat, lng, radiusM = 8000) {
    const query = `
[out:json][timeout:25];
(
  node["tourism"~"attraction|museum|viewpoint|artwork|gallery|theme_park|zoo"](around:${radiusM},${lat},${lng});
  node["historic"~"castle|monument|ruins|mosque|church|synagogue|memorial|archaeological_site|building|fort"](around:${radiusM},${lat},${lng});
  node["amenity"="place_of_worship"]["name"](around:${radiusM},${lat},${lng});
  node["leisure"~"park|garden|nature_reserve"](around:${radiusM},${lat},${lng});
  way["tourism"~"attraction|museum"](around:${radiusM},${lat},${lng});
  way["historic"](around:${radiusM},${lat},${lng});
);
out center 60;
    `.trim();

    const elements = await queryOverpass(query);

    return elements
        .filter((el) => el.tags?.name)
        .map((el) => {
            const tags = el.tags || {};
            const category = getCategoryFromTags(tags);
            return {
                osm_id: String(el.id),
                name: cleanText(tags.name || tags['name:tr'] || ''),
                name_en: cleanText(tags['name:en'] || ''),
                lat: el.lat ?? el.center?.lat,
                lng: el.lon ?? el.center?.lon,
                category,
                emoji: getEmojiFromCategory(category),
                wikidata_id: tags.wikidata || null,
                wikipedia: tags.wikipedia || null,
                website: tags.website || tags['contact:website'] || '',
                phone: tags.phone || tags['contact:phone'] || '',
                opening_hours: tags.opening_hours || '',
                wheelchair: tags.wheelchair || '',
                address: [tags['addr:street'], tags['addr:housenumber']]
                    .filter(Boolean).join(' '),
            };
        })
        .filter((p) => p.lat && p.lng && p.name);
}

// ─── Wikidata ─────────────────────────────────────────────────────────────────

/**
 * Wikidata entity'sinden açıklama + Wikipedia bağlantısı + Wikimedia Commons kategori çeker.
 */
async function fetchWikidataInfo(wikidataId) {
    if (!wikidataId) return null;
    try {
        const url = `${WIKIDATA_API}?action=wbgetentities&ids=${wikidataId}&format=json&languages=tr|en&props=descriptions|sitelinks&origin=*`;
        const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
        if (!res.ok) return null;
        const data = await res.json();
        const entity = data.entities?.[wikidataId];
        if (!entity) return null;

        const description = entity.descriptions?.tr?.value || entity.descriptions?.en?.value || '';
        const trWiki = entity.sitelinks?.trwiki?.title || null;
        const enWiki = entity.sitelinks?.enwiki?.title || null;
        const commonsCategory = entity.sitelinks?.commonswiki?.title?.replace('Category:', '') || null;

        return { description: cleanText(description), trWiki, enWiki, commonsCategory };
    } catch {
        return null;
    }
}

// ─── Wikipedia ───────────────────────────────────────────────────────────────

async function fetchWikipediaPhoto(title, lang = 'tr') {
    if (!title) return null;
    try {
        const api = lang === 'tr' ? TR_WIKI : EN_WIKI;
        const res = await fetch(`${api}/${encodeURIComponent(title)}`, {
            headers: HEADERS,
            signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (data.type === 'disambiguation') return null;
        return {
            description: cleanText(data.extract || ''),
            imageUrl: data.originalimage?.source || data.thumbnail?.source || null,
        };
    } catch {
        return null;
    }
}

// ─── Wikimedia Commons ────────────────────────────────────────────────────────

async function fetchCommonsPhoto(placeName) {
    if (!placeName) return null;
    try {
        const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(placeName)}&gsrlimit=3&prop=imageinfo&iiprop=url&iiurlwidth=800&origin=*`;
        const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
        if (!res.ok) return null;
        const data = await res.json();
        const pages = Object.values(data.query?.pages || {});
        for (const page of pages) {
            const imgUrl = page.imageinfo?.[0]?.url;
            if (imgUrl && /\.(jpg|jpeg|png)$/i.test(imgUrl)) return imgUrl;
        }
    } catch { /* sessizce */ }
    return null;
}

// ─── Supabase Cache ───────────────────────────────────────────────────────────

async function savePlacesToSupabase(cityId, places) {
    if (!places.length) return;
    try {
        // Mevcut OSM ID'leri kontrol et — duplicate ekleme
        const osmIds = places.map((p) => p.osm_id).filter(Boolean);
        const { data: existing } = await supabase
            .from('places')
            .select('osm_id')
            .in('osm_id', osmIds);

        const existingIds = new Set((existing || []).map((e) => e.osm_id));
        const newPlaces = places.filter((p) => !existingIds.has(p.osm_id));

        if (!newPlaces.length) return;

        const rows = newPlaces.map((p) => ({
            city_id: cityId,
            osm_id: p.osm_id,
            name: p.name,
            category: p.category,
            lat: p.lat,
            lng: p.lng,
            image_url: p.imageUrl || null,
            short_description: p.description ? p.description.slice(0, 300) : null,
            website: p.website || null,
            phone: p.phone || null,
            opening_hours: p.opening_hours || null,
            popularity_score: 50,
            avg_duration: 1,
            entry_fee: 0,
            source: 'osm',
        }));

        await supabase.from('places').insert(rows);
    } catch { /* DB hatası sessizce geç */ }
}

// ─── Ana Manager ──────────────────────────────────────────────────────────────

/**
 * Bir şehrin tüm gezilecek yerlerini yükler.
 *
 * @param {object} city - { id, name, lat, lng }
 * @param {Function} [onProgress] - (step, current, total) => void
 * @returns {Promise<Array>} places dizisi
 */
export async function loadCityPlaces(city, onProgress) {
    const CACHE_KEY = `osm_places_${city.id}`;

    // 1. Cache kontrol — varsa anında dön
    const cached = await cache.get(CACHE_KEY);
    if (cached?.length) {
        onProgress?.('cache', 1, 1);
        return cached;
    }

    onProgress?.('Overpass\'tan yerler çekiliyor...', 0, 3);

    // 2. Overpass'tan yerleri çek
    const rawPlaces = await fetchPlacesFromOverpass(city.lat, city.lng);
    if (!rawPlaces.length) return [];

    onProgress?.('Açıklamalar ve fotoğraflar yükleniyor...', 1, 3);

    // 3. Her yer için Wikidata/Wikipedia/Commons bilgisi çek (sıralı — rate limit)
    const enriched = [];
    for (let i = 0; i < rawPlaces.length; i++) {
        const place = rawPlaces[i];
        let description = '';
        let imageUrl = null;

        try {
            // Wikidata ID varsa oradan başla
            if (place.wikidata_id) {
                const wdInfo = await fetchWikidataInfo(place.wikidata_id);
                if (wdInfo) {
                    description = wdInfo.description;
                    // Wikipedia'dan fotoğraf çek
                    const wikiTitle = wdInfo.trWiki || wdInfo.enWiki;
                    if (wikiTitle) {
                        const lang = wdInfo.trWiki ? 'tr' : 'en';
                        const wikiData = await fetchWikipediaPhoto(wikiTitle, lang);
                        if (wikiData) {
                            if (!description) description = wikiData.description;
                            imageUrl = wikiData.imageUrl;
                        }
                    }
                    // Fotoğraf hâlâ yoksa Commons dene
                    if (!imageUrl && wdInfo.commonsCategory) {
                        imageUrl = await fetchCommonsPhoto(wdInfo.commonsCategory);
                    }
                }
            }

            // Wikidata yoksa direkt Wikipedia ara
            if (!imageUrl || !description) {
                const wikiData = await fetchWikipediaPhoto(place.name, 'tr');
                if (wikiData) {
                    if (!description) description = wikiData.description;
                    if (!imageUrl) imageUrl = wikiData.imageUrl;
                }
            }

            // Hâlâ fotoğraf yoksa Commons'ta yer adıyla ara
            if (!imageUrl) {
                imageUrl = await fetchCommonsPhoto(place.name);
            }
        } catch { /* kısmi veriyle devam et */ }

        enriched.push({ ...place, description, imageUrl });

        // Rate limit — her 3 istekte bir bekle
        if (i % 3 === 2) await sleep(RATE_LIMIT_MS);
    }

    onProgress?.('Supabase\'e kaydediliyor...', 2, 3);

    // 4. Supabase'e kaydet (arka planda)
    savePlacesToSupabase(city.id, enriched).catch(() => {});

    // 5. Cache'e yaz (7 gün)
    await cache.set(CACHE_KEY, enriched, TTL.WEEK);

    onProgress?.('Tamamlandı', 3, 3);
    return enriched;
}

/**
 * Tek bir yerin detayını yükler (fotoğraf galerisi dahil).
 */
export async function loadPlaceDetail(place) {
    const CACHE_KEY = `place_detail_${place.osm_id || place.id}`;
    const cached = await cache.get(CACHE_KEY);
    if (cached) return cached;

    let detail = { ...place };

    try {
        if (place.wikidata_id) {
            const wdInfo = await fetchWikidataInfo(place.wikidata_id);
            if (wdInfo) {
                const wikiTitle = wdInfo.trWiki || wdInfo.enWiki;
                if (wikiTitle) {
                    const lang = wdInfo.trWiki ? 'tr' : 'en';
                    const wikiData = await fetchWikipediaPhoto(wikiTitle, lang);
                    if (wikiData) {
                        detail.description = detail.description || wikiData.description;
                        detail.imageUrl = detail.imageUrl || wikiData.imageUrl;
                    }
                }
            }
        }

        if (!detail.description || !detail.imageUrl) {
            const wikiData = await fetchWikipediaPhoto(place.name, 'tr');
            if (wikiData) {
                detail.description = detail.description || wikiData.description;
                detail.imageUrl = detail.imageUrl || wikiData.imageUrl;
            }
        }
    } catch { /* kısmi veriyle devam */ }

    await cache.set(CACHE_KEY, detail, TTL.WEEK);
    return detail;
}

/**
 * Şehrin cache'ini temizler ve yeniden yükler.
 */
export async function refreshCity(cityId) {
    await cache.invalidate(`osm_places_${cityId}`);
}
