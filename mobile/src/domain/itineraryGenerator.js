/**
 * ItineraryGenerator – Temel iş mantığı (domain katmanı).
 *
 * Veritabanı veya API bağımlılığı yoktur; saf fonksiyonlar içerir.
 * Test edilebilir ve izole edilebilir.
 *
 * Algoritma:
 *   1. Coğrafi koordinatsız yerleri filtrele
 *   2. Nearest-neighbor heuristic ile rotayı optimize et
 *   3. MAX_HOURS_PER_DAY bütçesine göre günlere dağıt
 *   4. DB'ye eklenecek flat item listesini üret
 */

import { haversineDistance } from '../utils/haversine';

const MAX_HOURS_PER_DAY = 8;

/**
 * Nearest-neighbor algoritması ile en kısa sıralamayı yapar.
 * @param {Array} places – lat/lng zorunlu
 * @param {{ lat: number, lng: number }|null} startPoint
 */
const orderByNearestNeighbor = (places, startPoint = null) => {
    if (places.length <= 1) return [...places];

    const remaining = [...places];
    const ordered = [];
    let currentLat = startPoint?.lat ?? remaining[0].lat;
    let currentLng = startPoint?.lng ?? remaining[0].lng;

    while (remaining.length > 0) {
        let nearestIdx = 0;
        let nearestDist = Infinity;

        for (let i = 0; i < remaining.length; i++) {
            const dist = haversineDistance(currentLat, currentLng, remaining[i].lat, remaining[i].lng);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestIdx = i;
            }
        }

        const nearest = remaining.splice(nearestIdx, 1)[0];
        ordered.push({ ...nearest, distanceFromPrev: nearestDist });
        currentLat = nearest.lat;
        currentLng = nearest.lng;
    }

    return ordered;
};

/**
 * Optimize edilmiş bir gezi planı üretir.
 *
 * @param {Array} places – popularity_score'a göre sıralı (DB'den)
 * @param {number} days – gezi günü sayısı
 * @param {object} [options]
 * @param {{ lat: number, lng: number }|null} [options.startLocation]
 * @param {number} [options.maxHoursPerDay=8]
 * @returns {{
 *   plan: Array<{ day: number, places: Array, totalHours: number, totalDistance: number }>,
 *   totalHours: number,
 *   totalDistance: number,
 *   items: Array<{ place_id: number, day_number: number, order_index: number }>
 * }}
 */
export const generateItinerary = (places, days, options = {}) => {
    const { startLocation = null, maxHoursPerDay = MAX_HOURS_PER_DAY } = options;

    const validPlaces = places.filter((p) => p.lat != null && p.lng != null);

    if (validPlaces.length === 0 || days <= 0) {
        return {
            plan: Array.from({ length: days }, (_, i) => ({
                day: i + 1, places: [], totalHours: 0, totalDistance: 0,
            })),
            totalHours: 0,
            totalDistance: 0,
            items: [],
        };
    }

    const orderedPlaces = orderByNearestNeighbor(validPlaces, startLocation);

    const plan = Array.from({ length: days }, (_, i) => ({
        day: i + 1, places: [], totalHours: 0, totalDistance: 0,
    }));

    let currentDayIdx = 0;

    for (const place of orderedPlaces) {
        const duration = place.avg_duration || 1;
        const distance = place.distanceFromPrev || 0;

        if (
            plan[currentDayIdx].totalHours + duration > maxHoursPerDay &&
            currentDayIdx < days - 1
        ) {
            currentDayIdx++;
        }

        plan[currentDayIdx].places.push(place);
        plan[currentDayIdx].totalHours += duration;
        plan[currentDayIdx].totalDistance += distance;
    }

    const items = plan.flatMap((dayPlan) =>
        dayPlan.places.map((place, idx) => ({
            place_id: place.id,
            day_number: dayPlan.day,
            order_index: idx,
        }))
    );

    const totalHours = plan.reduce((sum, d) => sum + d.totalHours, 0);
    const totalDistance = plan.reduce((sum, d) => sum + d.totalDistance, 0);

    return { plan, totalHours, totalDistance: Math.round(totalDistance * 10) / 10, items };
};

/**
 * Bir gün için alternatif yer önerir.
 * @param {Array} allCityPlaces
 * @param {Array} usedPlaceIds
 * @param {string|null} preferCategory
 */
export const suggestAlternative = (allCityPlaces, usedPlaceIds, preferCategory = null) => {
    const available = allCityPlaces.filter((p) => !usedPlaceIds.includes(p.id));
    if (available.length === 0) return null;

    if (preferCategory) {
        const sameCat = available.filter((p) => p.category === preferCategory);
        if (sameCat.length > 0) {
            return sameCat.sort((a, b) => b.popularity_score - a.popularity_score)[0];
        }
    }

    return available.sort((a, b) => b.popularity_score - a.popularity_score)[0];
};
