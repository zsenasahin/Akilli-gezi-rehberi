import { supabase } from '../../config/supabase';
import { getCityCenter } from '../../constants/cities';
import { getCityPOIs } from '../api/overpassApi';
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
 * @param {number} [dayIndex] - Plan içindeki sıfırdan başlayan gün indeksi
 * @returns {Promise<{ lunch, dinner, lunchAfterIndex, dinnerAfterIndex }>}
 */
export const getMealSuggestions = async (cityId, cityName = '', usedPlaceIds = [], orderedPlaces = [], dayIndex = 0) => {
    const lunchAfterIndex = orderedPlaces.length > 1
        ? Math.floor(orderedPlaces.length / 2) - 1
        : 0;
    const dinnerAfterIndex = Math.max(0, orderedPlaces.length - 1);

    const breakAfterIndex = orderedPlaces.length > 2 ? 0 : lunchAfterIndex;
    const empty = { lunch: null, dinner: null, localBreak: null, lunchAfterIndex, dinnerAfterIndex, breakAfterIndex };

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

        // Aynı şehirdeki çok günlük planlarda aynı yöresel lezzeti her güne
        // yazmak yerine, öne çıkan lezzetleri gün sırasına göre döndürüyoruz.
        const localSpecialty = pickLocalSpecialty(cityName, dayIndex);

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

        // Yöresel tatlı/içecek için, rotanın başındaki durağa yakın gerçek bir
        // kafe öner. Veri seti işletmenin o ürünü kesin sattığını söylemediği
        // için bunu "mola önerisi" olarak sunuyoruz; yanlış vaat etmiyoruz.
        const firstPlace = orderedPlaces[0];
        const cafeCandidates = allEateries.filter(p => p.category === 'cafe' || p.type === 'cafe');
        const localBreakPool = cafeCandidates.length ? cafeCandidates : allEateries;
        const nearestLocalBreak = localSpecialty && localBreakPool.length
            ? [...localBreakPool].sort((a, b) =>
                haversine(firstPlace?.lat ?? center.lat, firstPlace?.lng ?? center.lng, a.lat, a.lng)
                - haversine(firstPlace?.lat ?? center.lat, firstPlace?.lng ?? center.lng, b.lat, b.lng)
            )[0]
            : null;
        const localBreak = nearestLocalBreak ? {
            ...nearestLocalBreak,
            id: String(nearestLocalBreak.id),
            type: 'cafe',
            localSpecialty,
            categoryLabel: `${localSpecialty} molası`,
            cuisine: `Yöresel öneri: ${localSpecialty}`,
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

    // Öncelik listesinden sonra tatlı/içecek ve diğer yerel lezzetleri ekle.
    // Set, aynı yemeğin döngüde ikinci kez görünmesini engeller.
    const snacks = dishes
        .filter(item => /dondurma|tatlı|helva|şerbet|kahve|lokum|reçel/.test(String(item.Baslik).toLocaleLowerCase('tr-TR')))
        .map(item => item.Baslik?.trim());
    const candidates = [...new Set([...featured, ...snacks, ...dishes.map(item => item.Baslik?.trim())].filter(Boolean))];

    return candidates[Math.abs(dayIndex) % candidates.length] || null;
}
