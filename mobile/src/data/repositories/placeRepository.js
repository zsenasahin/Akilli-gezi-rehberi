import { supabase } from '../../config/supabase';
import { getCityCenter } from '../../constants/cities';
import { getCityPOIs, getFoodPOIs } from '../api/overpassApi';
import localCuisine from '../turkiye_mutfak.json';

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

// ─── Yemek / tatlı önerisi puanlaması ────────────────────────────────────────
// Eski sürüm şehir merkezine en yakın ilk restoranı seçiyordu; burger zinciri
// ya da isimsiz büfe de "öğle yemeği" olabiliyordu. Şimdi her gün kendi
// duraklarının çevresinden aday toplanır ve yerel mutfak, bilgi doluluğu ve
// mesafeye göre puanlanır; zincirler ve fast food geri plana itilir.

const CHAIN_RE = /mc ?donald|burger king|kfc|popeyes|starbucks|domino|pizza hut|little caesars|subway|sbarro|arby|carl'?s jr|wendy|papa john|caribou|gloria jean|espressolab|kahve dünyası|tavuk dünyası|usta dönerci|bereket döner|komagene/i;
const LOCAL_CUISINE_RE = /turkish|kebab|regional|local|ottoman|anatolian|kofte|köfte|pide|lahmacun|meze|fish|seafood|balik|balık|grill|ocakbasi|ocakbaşı|home|ev_yemekleri|soup|corba|çorba|manti|mantı|kokorec/i;
const FAST_RE = /burger|pizza|chicken|sandwich|hot_dog|fried|wrap|doner|döner/i;
const DESSERT_RE = /dessert|ice_cream|pastry|cake|baklava|kunefe|künefe|turkish_delight|chocolate|waffle|coffee_shop|turkish_coffee|tea|bakery/i;
const DESSERT_NAME_RE = /baklava|künefe|kunefe|tatlı|tatli|pastane|pasta(ne|cı)|lokum|dondurma|muhallebi|helva|şekerci|sekerci|kahve|çay bahçesi|cay bahcesi|gelato|maraş|sütlaç|kazandibi|katmer/i;

const SLOT_RADIUS_KM = { lunch: 0.9, dinner: 1.2, dessert: 0.8 };

function poiTags(poi) {
    return poi.tags || {};
}

function infoScore(poi) {
    const t = poiTags(poi);
    let score = 0;
    if (poi.openingHours || t.opening_hours) score += 1;
    if (poi.phone || poi.website || t.phone || t.website || t['contact:instagram']) score += 1;
    if (poi.address || t['addr:street']) score += 0.5;
    if (t.wikidata || t.wikipedia || t.tourism) score += 2; // bilinen/turistik işletme
    return score;
}

function scoreMeal(poi, distKm, slot) {
    const t = poiTags(poi);
    const cuisine = `${t.cuisine || ''} ${poi.cuisine || ''}`.toLowerCase();
    const name = poi.name || '';
    let score = infoScore(poi);
    if (CHAIN_RE.test(name) || t.brand) score -= 6;
    if (poi.category === 'fast_food') score -= 3;
    if (FAST_RE.test(cuisine)) score -= 2;
    if (LOCAL_CUISINE_RE.test(cuisine) || LOCAL_CUISINE_RE.test(name)) score += 3;
    if (poi.category === 'restaurant') score += 1.5;
    if (poi.category === 'cafe' || poi.category === 'ice_cream' || poi.category === 'pastry' || poi.category === 'confectionery') score -= 4;
    if (slot === 'dinner' && /fish|seafood|meyhane|meze|ocakbas/i.test(cuisine + name)) score += 1;
    return score - distKm * 2.5;
}

function scoreDessert(poi, distKm) {
    const t = poiTags(poi);
    const cuisine = `${t.cuisine || ''} ${poi.cuisine || ''}`.toLowerCase();
    const name = poi.name || '';
    // Restoranlar ve fast food mola önerisi olmaz; mutfak etiketinde "coffee_shop"
    // geçen kebapçılar tatlıcı sanılıyordu.
    if (!['pastry', 'confectionery', 'ice_cream', 'cafe'].includes(poi.category)) return -Infinity;
    const isDessertPlace = poi.category !== 'cafe' || DESSERT_RE.test(cuisine) || DESSERT_NAME_RE.test(name);
    let score = infoScore(poi) + (isDessertPlace ? 4 : 0);
    if (/nargile|nargile|hookah|shisha|bar|pub/i.test(name) || t.amenity === 'hookah_lounge' || /hookah|shisha/i.test(cuisine)) score -= 6;
    if (CHAIN_RE.test(name) || t.brand) score -= 5;
    return score - distKm * 3;
}

function pickBest(pois, pivot, slot, excluded) {
    const maxKm = SLOT_RADIUS_KM[slot];
    let best = null;
    let bestScore = -Infinity;
    for (const poi of pois) {
        const key = String(poi.id);
        if (excluded.has(key) || excluded.has(`name:${poi.name}`)) continue;
        const distKm = haversine(pivot.lat, pivot.lng, poi.lat, poi.lng);
        if (distKm > maxKm) continue;
        const score = slot === 'dessert' ? scoreDessert(poi, distKm) : scoreMeal(poi, distKm, slot);
        if (score > bestScore) { bestScore = score; best = { ...poi, distanceKm: Math.round(distKm * 10) / 10 }; }
    }
    // Çok zayıf adaylar (ör. tek seçenek uzak bir fast food) önerilmez
    const floor = slot === 'dessert' ? 1 : -1.5;
    return best && bestScore >= floor ? best : null;
}

function midpoint(a, b) {
    if (a?.lat && b?.lat) return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
    if (a?.lat) return { lat: a.lat, lng: a.lng };
    return null;
}

/**
 * Belirli bir gün için öğle yemeği, tatlı/kahve molası ve akşam yemeği önerir.
 *
 * - Öğle: öğle arasının iki yanındaki durakların orta noktası çevresinde
 * - Tatlı: öğleden sonraki ilk durağın çevresinde (pastane/tatlıcı/dondurmacı)
 * - Akşam: günün son durağının çevresinde
 *
 * @param {number} cityId
 * @param {string} cityName
 * @param {string[]} usedPlaceIds - Önerilmemesi gereken yer kimlikleri
 * @param {Array} [orderedPlaces] - Günün sıralı yerleri
 * @param {number} [dayIndex] - Plan içindeki sıfırdan başlayan gün indeksi
 * @param {Set<string>} [excluded] - Önceki günlerde önerilen işletmeler (paylaşılır, güncellenir)
 * @returns {Promise<{ lunch, dinner, localBreak, lunchAfterIndex, dinnerAfterIndex, breakAfterIndex }>}
 */
export const getMealSuggestions = async (cityId, cityName = '', usedPlaceIds = [], orderedPlaces = [], dayIndex = 0, excluded = new Set()) => {
    const lunchAfterIndex = orderedPlaces.length > 1
        ? Math.floor(orderedPlaces.length / 2) - 1
        : 0;
    const dinnerAfterIndex = Math.max(0, orderedPlaces.length - 1);
    const breakAfterIndex = Math.min(lunchAfterIndex + 1, dinnerAfterIndex);
    const empty = { lunch: null, dinner: null, localBreak: null, lunchAfterIndex, dinnerAfterIndex, breakAfterIndex };

    try {
        const center = getCityCenter(cityName);
        const located = orderedPlaces.filter(p => p?.lat && p?.lng);
        const lunchPivot = midpoint(orderedPlaces[lunchAfterIndex], orderedPlaces[lunchAfterIndex + 1])
            || located[0] || center;
        const dessertPivot = midpoint(orderedPlaces[breakAfterIndex], null) || lunchPivot;
        const dinnerPivot = midpoint(orderedPlaces[dinnerAfterIndex], null) || located[located.length - 1] || center;

        // Yakın pivotlar aynı sorguyu paylaşır (getFoodPOIs önbelleği ~200 m ızgaralı)
        const [lunchPool, dessertPool, dinnerPool] = await Promise.all([
            getFoodPOIs(lunchPivot.lat, lunchPivot.lng, 900),
            getFoodPOIs(dessertPivot.lat, dessertPivot.lng, 900),
            getFoodPOIs(dinnerPivot.lat, dinnerPivot.lng, 1200),
        ]).then(results => results.map(r => r.data || []));

        const blocked = new Set([...excluded, ...usedPlaceIds.map(String)]);
        const take = (poi) => {
            if (!poi) return null;
            blocked.add(String(poi.id));
            blocked.add(`name:${poi.name}`);
            excluded.add(String(poi.id));
            excluded.add(`name:${poi.name}`);
            return poi;
        };

        const lunchPick = take(pickBest(lunchPool, lunchPivot, 'lunch', blocked));
        const dessertPick = take(pickBest(dessertPool, dessertPivot, 'dessert', blocked));
        const dinnerPick = take(pickBest(dinnerPool, dinnerPivot, 'dinner', blocked));

        const asMeal = (poi) => poi && ({ ...poi, id: String(poi.id), type: 'restaurant' });
        const lunch = asMeal(lunchPick);
        const dinner = asMeal(dinnerPick);

        // Şehrin yöresel tatlısı/içeceği yalnızca bir "deneyebilirsin" ipucu olarak
        // gösterilir; işletmenin onu sattığı iddia edilmez.
        const localSpecialty = pickLocalSpecialty(cityName, dayIndex);
        const localBreak = dessertPick ? {
            ...dessertPick,
            id: String(dessertPick.id),
            type: 'cafe',
            localSpecialty,
            categoryLabel: 'Tatlı & kahve molası',
            cuisine: localSpecialty ? `Şehrin lezzeti: ${localSpecialty}` : dessertPick.cuisine,
        } : null;

        return { lunch, dinner, localBreak, lunchAfterIndex, dinnerAfterIndex, breakAfterIndex };
    } catch (err) {
        console.warn('getMealSuggestions error:', err.message);
        return empty;
    }
};

// Kültür Portalı listesinin sırası popülerlik sırası değil. Bu nedenle, doğrulanmış
// öne çıkanlar varsa önce onlar kullanılır; kalan şehirlerde veri kümesindeki
// farklı yemekler sırayla seçilir.
const CITY_FEATURED_SPECIALTIES = {
    Muğla: ['Çökertme Kebabı', 'Muğla Köftesi', 'Samsı', 'Kabaki Pesteli'],
};

function normalizeSpecialtyName(value) {
    return String(value || '')
        .toLocaleLowerCase('tr-TR')
        .replace(/[^a-zçğıöşü0-9]/g, '');
}

function pickLocalSpecialty(cityName, dayIndex = 0) {
    const normalized = String(cityName).toLocaleLowerCase('tr-TR');
    const key = Object.keys(localCuisine).find(name => name.toLocaleLowerCase('tr-TR') === normalized);
    const dishes = key ? localCuisine[key]?.yemekler || [] : [];
    if (!dishes.length) return null;

    const byNormalizedName = new Map(
        dishes.map(item => [normalizeSpecialtyName(item.Baslik), item.Baslik?.trim()])
    );
    const featured = (CITY_FEATURED_SPECIALTIES[key] || [])
        .map(name => byNormalizedName.get(normalizeSpecialtyName(name)))
        .filter(Boolean);

    // Mola kartında yalnızca tatlı/içecek önerilir; ana yemekler (kebap vb.)
    // "tatlı molası" altında anlamsız duruyordu.
    const SWEET_RE = /dondurma|tatlı|tatlısı|helva|şerbet|kahve|lokum|reçel|baklava|künefe|kadayıf|muhallebi|sütlaç|kazandibi|lokma|revani|aşure|pestil|köme|şekerleme|hoşaf|ayran|boza|salep|çay/;
    const sweets = dishes
        .map(item => item.Baslik?.trim())
        .filter(name => name && SWEET_RE.test(name.toLocaleLowerCase('tr-TR')));
    const featuredSweets = featured.filter(name => SWEET_RE.test(name.toLocaleLowerCase('tr-TR')));
    const candidates = [...new Set([...featuredSweets, ...sweets])];
    if (!candidates.length) return null;
    return candidates[Math.abs(dayIndex) % candidates.length] || null;
}
