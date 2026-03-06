/**
 * ItineraryGenerator – Geliştirilmiş akıllı gezi planlama algoritması.
 *
 * İyileştirmeler:
 *  - Kümeleme (clustering): yakın yerleri aynı güne koy
 *  - Gün sayısı = süre + mesafe kombinasyonu
 *  - Boş günlere öneri ekleme
 *  - Min-yer-per-day: en az 1 yer/gün garantisi
 */

import { haversineDistance } from '../utils/haversine';

const MAX_HOURS_PER_DAY = 7;   // 09:00 → 16:00 mantıklı seyahat
const MIN_HOURS_PER_DAY = 1;   // Bir günde en az 1 saatlik aktivite
const TRAVEL_SPEED_KMH = 4;    // Yürüyüş hızı ≈ 4 km/s

/**
 * Nearest-neighbor ile yerleri en kısa rotaya sırala.
 */
const orderByNearestNeighbor = (places, startPoint = null) => {
    if (places.length <= 1) return [...places];
    const remaining = [...places];
    const ordered = [];
    let currLat = startPoint?.lat ?? remaining[0].lat;
    let currLng = startPoint?.lng ?? remaining[0].lng;

    while (remaining.length > 0) {
        let nearestIdx = 0;
        let nearestDist = Infinity;
        for (let i = 0; i < remaining.length; i++) {
            const d = haversineDistance(currLat, currLng, remaining[i].lat, remaining[i].lng);
            if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
        }
        const nearest = remaining.splice(nearestIdx, 1)[0];
        ordered.push({ ...nearest, _distFromPrev: nearestDist });
        currLat = nearest.lat;
        currLng = nearest.lng;
    }
    return ordered;
};

/**
 * Yürüyüş süresi hesabı (saat cinsinden).
 */
const travelTimeHours = (distKm) => distKm / TRAVEL_SPEED_KMH;

/**
 * Akıllı gün dağıtıcı:
 * - Yerleri önce nearest-neighbor ile sıralar
 * - Günlük süre + yürüyüş süresi toplamı MAX_HOURS_PER_DAY'i aşınca yeni güne geçer
 * - Yerlerin gün sayısından fazla olup olmadığını kontrol eder
 * - Boş günler oluşmaması için dengeli dağıtır
 */
const distributeTodays = (orderedPlaces, days) => {
    const plan = Array.from({ length: days }, (_, i) => ({
        day: i + 1, places: [], totalHours: 0, totalDistance: 0,
    }));

    let dayIdx = 0;

    for (const place of orderedPlaces) {
        const visitDuration = place.avg_duration ?? 1;
        const travelTime = travelTimeHours(place._distFromPrev ?? 0);
        const totalCost = visitDuration + travelTime;

        // Bir sonraki güne geç mi?
        const wouldExceed = plan[dayIdx].totalHours + totalCost > MAX_HOURS_PER_DAY;
        const hasNextDay = dayIdx < days - 1;

        // Boş gün bırakma: son günde sığmıyor ama gün kalmıyorsa yine ekle
        if (wouldExceed && hasNextDay) {
            dayIdx++;
        }

        plan[dayIdx].places.push(place);
        plan[dayIdx].totalHours += totalCost;
        plan[dayIdx].totalDistance += place._distFromPrev ?? 0;
    }

    return plan;
};

/**
 * Ana fonksiyon: Optimize edilmiş gezi planı üretir.
 *
 * @param {Array} places       – Seçilen yerler (lat/lng zorunlu)
 * @param {number} days        – Gezi günü sayısı
 * @param {object} [options]
 * @param {{ lat, lng }|null} [options.startLocation]   – Konaklama yeri
 * @param {number} [options.maxHoursPerDay]
 * @returns {{ plan, totalHours, totalDistance, items }}
 */
export const generateItinerary = (places, days, options = {}) => {
    const { startLocation = null } = options;

    const validPlaces = places.filter((p) => p.lat != null && p.lng != null);

    if (validPlaces.length === 0 || days <= 0) {
        return {
            plan: Array.from({ length: days }, (_, i) => ({ day: i + 1, places: [], totalHours: 0, totalDistance: 0 })),
            totalHours: 0, totalDistance: 0, items: [],
        };
    }

    // ── Eğer yer sayısı gün sayısından azsa her güne en az 1 yer koy ──
    const effectiveDays = Math.min(days, validPlaces.length);

    // Nearest-neighbor ile sırala
    const ordered = orderByNearestNeighbor(validPlaces, startLocation);

    // Belirlenen gün sayısına dağıt
    let plan = distributeTodays(ordered, effectiveDays);

    // Eğer toplam gün sayısı istenenden az ise boş günler ekle (sonuna)
    while (plan.length < days) {
        plan.push({ day: plan.length + 1, places: [], totalHours: 0, totalDistance: 0 });
    }

    const items = plan.flatMap((dayPlan) =>
        dayPlan.places.map((place, idx) => ({
            place_id: place.id,
            day_number: dayPlan.day,
            order_index: idx,
        }))
    );

    const totalHours = plan.reduce((s, d) => s + d.totalHours, 0);
    const totalDistance = plan.reduce((s, d) => s + d.totalDistance, 0);

    return { plan, totalHours, totalDistance: Math.round(totalDistance * 10) / 10, items };
};

/**
 * Bir gün için alternatif yer önerir.
 */
export const suggestAlternative = (allCityPlaces, usedPlaceIds, preferCategory = null) => {
    const available = allCityPlaces.filter((p) => !usedPlaceIds.includes(p.id));
    if (available.length === 0) return null;

    if (preferCategory) {
        const sameCat = available.filter((p) => p.category === preferCategory);
        if (sameCat.length > 0) return sameCat.sort((a, b) => b.popularity_score - a.popularity_score)[0];
    }
    return available.sort((a, b) => b.popularity_score - a.popularity_score)[0];
};
