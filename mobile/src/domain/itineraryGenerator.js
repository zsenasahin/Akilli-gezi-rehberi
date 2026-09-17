/**
 * itineraryGenerator.js — Akıllı gezi planlama algoritması (v3 — Geliştirilmiş Rota)
 *
 * Gelişmiş özellikler:
 * - Duration-aware clustering (süreye duyarlı günlere ayırma)
 * - Gerçek koordinat bazlı TSP (2-Opt) rota optimizasyonu
 * - Kapanış saati duyarlı zaman çizelgesi
 * - Gerçek mesafe ve süre hesaplamaları (hardcoded değil)
 * - Güne sığmayan yerlerin otomatik yeniden dağıtımı
 */

import { balancePlacesIntoDays } from '../algorithms/clustering';
import { optimizeRoute } from '../algorithms/tsp';
import { generateTimeline } from '../algorithms/timeline';
import { haversineDistance } from '../algorithms/haversine';
import { estimateDuration, estimateClosingHour } from '../algorithms/smartDuration';

// ─── Yardımcı: Bütçe Hesaplayıcı ────────────────────────────────────────────────────
export const estimateTotalBudget = ({
    entryFees = 0,
    distanceKm = 0,
    days = 1,
    hasTransport = false,
    fuelPrice = 45,
    consumption = 8,
    restaurantPerDay = 300,
}) => {
    const transport = hasTransport
        ? Math.round(((distanceKm * consumption) / 100) * fuelPrice)
        : Math.round(distanceKm * 2);

    const food = restaurantPerDay * days;
    const total = entryFees + transport + food;

    return {
        entryFees: Math.round(entryFees),
        transport,
        food,
        total,
        breakdown: [
            { label: 'Giriş Ücretleri', amount: Math.round(entryFees), emoji: '🎫' },
            { label: 'Ulaşım', amount: transport, emoji: hasTransport ? '🚗' : '🚌' },
            { label: 'Yemek (tahmini)', amount: food, emoji: '🍽️' },
        ],
    };
};

/**
 * Geliştirilmiş gezi planı oluşturur. (v3 — Akıllı Rota)
 *
 * Akış:
 * 1. Verileri normalize et (koordinat, süre, kapanış saati)
 * 2. Günlük süre bütçesine göre yer sayısını ayarla
 * 3. Duration-aware K-Means ile günlere ayır
 * 4. Her gün için TSP (2-Opt) ile optimal rota oluştur
 * 5. Kapanış saati duyarlı zaman çizelgesi üret
 * 6. Güne sığmayan yerleri yeniden dağıt
 */
export const generateItinerary = (places, days, options = {}) => {
    console.log('🚀 generateItinerary (v3) başladı:', { days, placesCount: places.length });

    const fallbackLat = options.cityLat ?? 41.0082;
    const fallbackLng = options.cityLng ?? 28.9784;

    // ═══════════════════════════════════════════════════════════════════
    // 1. VERİ NORMALIZASYONU
    // ═══════════════════════════════════════════════════════════════════

    const formattedPlaces = places.map(p => {
        // Koordinat: gerçek varsa kullan, yoksa şehir merkezi (rastgele DEĞİL)
        const lat = (p.lat != null && !isNaN(p.lat)) ? p.lat : fallbackLat;
        const lng = (p.lng != null && !isNaN(p.lng)) ? p.lng : fallbackLng;

        // Süre: placeDataManager'dan gelen akıllı süre, yoksa tahmin et
        const avgDuration = p.avg_duration ?? estimateDuration(p.name || '', p.category);
        const durationMinutes = Math.round(avgDuration * 60);

        // Kapanış saati
        const closingHour = p.closing_hour ?? estimateClosingHour(p.name || '', p.category);

        return {
            ...p,
            latitude: lat,
            longitude: lng,
            duration_minutes: durationMinutes,
            closing_hour: closingHour,
        };
    });

    if (formattedPlaces.length === 0 || days <= 0) {
        return emptyResult(days);
    }

    // Bir rota, şehirdeki bütün noktaların listesi değildir. Özellikle otomatik
    // seçimde her güne en fazla dört gerçek ziyaret durağı koyuyoruz. Kafe ve
    // restoranlar rota durağı olarak kullanılmaz; bunlar daha sonra ayrı öğün
    // önerisi akışında ele alınmalıdır. Böylece Starbucks gibi bir kafe "akşam
    // yemeği" olarak görünmez ve plan gerçekten uygulanabilir kalır.
    const selectionMode = options.selectionMode || 'manual';
    const tripPlaces = selectRealisticTripPlaces(formattedPlaces, days, selectionMode);

    if (tripPlaces.length === 0) {
        return emptyResult(days);
    }

    // ═══════════════════════════════════════════════════════════════════
    // 2. GÜNLÜK KAPASİTE HESABI VE FİLTRELEME
    // ═══════════════════════════════════════════════════════════════════

    // Günlük net gezi bütçesi: 09:00-20:00 = 660 dakika
    // Yerler arası ortalama ulaşım: ~25 dk
    const DAY_BUDGET_MINUTES = 540; // ziyaret + şehir içi ulaşım; öğün/dinlenme payı hariç
    const AVG_TRAVEL_MINUTES = 25;

    // Toplam süreye bakarak kaç yer sığacağını hesapla
    const totalPlaceDuration = formattedPlaces.reduce((s, p) => s + p.duration_minutes, 0);
    const totalAvailableMinutes = days * DAY_BUDGET_MINUTES;

    let placesToCluster = tripPlaces;

    if (totalPlaceDuration > totalAvailableMinutes) {
        // Süre bütçesine sığmıyor — en popüler yerleri seç
        // Sığacak kadar yer seçmek için süre bazlı greedy seçim
        const sorted = [...tripPlaces]
            .sort((a, b) => (b.popularity_score ?? 50) - (a.popularity_score ?? 50));

        let usedMinutes = 0;
        placesToCluster = [];

        for (const place of sorted) {
            const placeTotal = place.duration_minutes + AVG_TRAVEL_MINUTES;
            if (usedMinutes + placeTotal <= totalAvailableMinutes) {
                placesToCluster.push(place);
                usedMinutes += placeTotal;
            }
        }

        console.log(`⏱ Süre bütçesine göre ${placesToCluster.length}/${tripPlaces.length} yer seçildi`);
    }

    // ═══════════════════════════════════════════════════════════════════
    // 3. CLUSTERING + TSP + TIMELINE
    // ═══════════════════════════════════════════════════════════════════

    const startLocation = options.startLocation ?? { latitude: fallbackLat, longitude: fallbackLng };

    // 3a. Duration-aware K-Means Clustering
    const dayClusters = balancePlacesIntoDays(placesToCluster, days);

    const plan = [];
    let grandTotalDistance = 0;
    let grandTotalDuration = 0;
    let grandTotalBudget = 0;
    const allOverflowPlaces = [];

    // 3b. Her gün için rota ve zaman çizelgesi
    for (const cluster of dayClusters) {
        if (cluster.places.length === 0) {
            plan.push({
                day: cluster.dayIndex,
                places: [],
                totalHours: 0,
                totalDistance: 0,
                budget: 0,
                endTime: '09:00',
            });
            continue;
        }

        // TSP ile optimal rota
        const optimized = optimizeRoute(startLocation, cluster.places, options.returnToHotel ?? false);

        // Zaman çizelgesi (kapanış saati + günlük sınır duyarlı)
        // 18:30 sonrası boş kalır: ulaşımlar, dinlenme ve öğünler için doğal
        // bir pay bırakılır. Bu, günü kağıt üzerinde mümkün ama gerçekte
        // yetişmeyen bir program olmaktan çıkarır.
        const timelineResult = generateTimeline(optimized, "09:00", 15, 18.5);

        // Bütçe
        let dayBudget = 0;
        optimized.forEach(p => dayBudget += (p.entry_fee ?? 0));

        // Güne sığmayan yerler
        if (timelineResult.overflowPlaces.length > 0) {
            allOverflowPlaces.push(...timelineResult.overflowPlaces);
            console.log(`⚠️ Gün ${cluster.dayIndex}: ${timelineResult.overflowPlaces.length} yer sığmadı`);
        }

        // UI formatı
        const uiPlaces = timelineResult.stops.map(p => ({
            ...p,
            lat: p.latitude,
            lng: p.longitude,
            _travelMinutes: p.travelMinutesFromPrev || 0,
        }));

        const dayHours = Math.round((timelineResult.totalDurationMinutes / 60) * 10) / 10;
        const dayDistKm = Math.round(timelineResult.totalDistanceKm * 10) / 10;

        plan.push({
            day: cluster.dayIndex,
            places: uiPlaces,
            totalHours: dayHours,
            totalDistance: dayDistKm,
            budget: dayBudget,
            endTime: timelineResult.endTime,
        });

        grandTotalDistance += timelineResult.totalDistanceKm;
        grandTotalDuration += timelineResult.totalDurationMinutes;
        grandTotalBudget += dayBudget;
    }

    // Taşan durakları gün sonuna zorla eklemiyoruz. Önceki davranış, günün
    // kapasitesini aşmasına rağmen tüm seçilen yerleri plana sokuyordu.
    if (allOverflowPlaces.length > 0) {
        console.log(`⏱ ${allOverflowPlaces.length} durak zaman sınırı nedeniyle sonraki plana bırakıldı`);
    }

    // ═══════════════════════════════════════════════════════════════════
    // 5. SONUÇ
    // ═══════════════════════════════════════════════════════════════════

    // DB formatı (items)
    const items = plan.flatMap(dayPlan =>
        dayPlan.places
            .filter(p => p.id != null && !isNaN(Number(p.id)))
            .map((p, idx) => ({
                place_id: Number(p.id),
                day_number: dayPlan.day,
                order_index: idx,
            }))
    );

    const totalHours = Math.round((grandTotalDuration / 60) * 10) / 10;
    const totalDistanceRound = Math.round(grandTotalDistance * 10) / 10;

    const stats = {
        totalPlaces: plan.reduce((s, d) => s + d.places.length, 0),
        avgPlacesPerDay: Math.round((plan.reduce((s, d) => s + d.places.length, 0) / Math.max(days, 1)) * 10) / 10,
        uniqueCategories: [...new Set(plan.flatMap(d => d.places.map(p => p.category)).filter(Boolean))],
        totalBudget: grandTotalBudget,
        totalDistance: totalDistanceRound,
        totalHours,
        dayBreakdown: plan.map(d => ({
            day: d.day,
            placeCount: d.places.length,
            hours: d.totalHours,
            distanceKm: d.totalDistance,
            endTime: d.endTime,
        })),
    };

    console.log('✅ Plan oluşturuldu (v3):', JSON.stringify(stats.dayBreakdown));
    return { plan, totalHours, totalDistance: totalDistanceRound, totalBudget: grandTotalBudget, items, stats };
};

function selectRealisticTripPlaces(places, days, selectionMode) {
    const maxStops = Math.max(days * 4, days);
    const normalized = (value = '') => String(value).toLocaleLowerCase('tr-TR');
    const isMealVenue = (place) => {
        const category = normalized(place.category);
        const name = normalized(place.name);
        return ['restoran', 'restaurant', 'kafe', 'cafe', 'coffee', 'fast_food', 'fast food'].includes(category)
            || /starbucks|coffee|kahve|cafe|kafe|burger|pizza|döner|doner|restaurant|restoran/.test(name);
    };

    const visitable = places.filter(place => !isMealVenue(place));
    // Bir şehirde yalnızca yeme-içme verisi varsa boş plan döndürmek yerine
    // en popüler birkaç sonucu koruyoruz; normal şehir verisinde bunlar rota
    // dışındadır.
    const pool = visitable.length > 0 ? visitable : places;
    if (selectionMode === 'manual' && pool.length <= maxStops) return pool;

    const categoryUse = new Map();
    const ranked = [...pool].sort((a, b) => {
        const popularity = (b.popularity_score ?? 50) - (a.popularity_score ?? 50);
        if (popularity !== 0) return popularity;
        return (a.duration_minutes ?? 60) - (b.duration_minutes ?? 60);
    });
    const chosen = [];

    // Aynı tip küçük noktalarla tekdüze bir günü doldurmak yerine kategori
    // çeşitliliğini korur; ikinci turda gerekirse kalan yüksek puanlı yerleri ekler.
    for (const place of ranked) {
        const category = normalized(place.category) || 'diğer';
        if ((categoryUse.get(category) || 0) >= 2) continue;
        chosen.push(place);
        categoryUse.set(category, (categoryUse.get(category) || 0) + 1);
        if (chosen.length === maxStops) return chosen;
    }
    for (const place of ranked) {
        if (chosen.some(item => item.id === place.id)) continue;
        chosen.push(place);
        if (chosen.length === maxStops) break;
    }
    return chosen;
}

const emptyResult = (days) => ({
    plan: Array.from({ length: days }, (_, i) => ({ day: i + 1, places: [], totalHours: 0, totalDistance: 0, budget: 0 })),
    totalHours: 0, totalDistance: 0, totalBudget: 0, items: [], stats: { totalPlaces: 0, avgPlacesPerDay: 0, uniqueCategories: [], totalBudget: 0, totalDistance: 0 },
});

/**
 * Mevcut bir yer yerine alternatif önerir.
 * Kategori uyumu ve mesafe yakınlığına göre en iyi adayı seçer.
 */
export const suggestAlternative = (allPlaces, usedPlaceIds, category, lat, lng) => {
    if (!allPlaces?.length) return null;

    const candidates = allPlaces.filter(p =>
        !usedPlaceIds.includes(p.id) &&
        !usedPlaceIds.includes(String(p.id))
    );

    if (candidates.length === 0) return null;

    // Aynı kategoriden tercih et, yoksa hepsine bak
    const sameCategory = candidates.filter(p => p.category === category);
    const pool = sameCategory.length > 0 ? sameCategory : candidates;

    // Konum varsa en yakını seç
    if (lat && lng) {
        const ref = { latitude: lat, longitude: lng };
        const scored = pool
            .filter(p => p.lat && p.lng)
            .map(p => ({
                ...p,
                _dist: haversineDistance(ref, { latitude: p.lat, longitude: p.lng }),
            }))
            .sort((a, b) => a._dist - b._dist);

        if (scored.length > 0) return scored[0];
    }

    // Konum yoksa popülerliğe göre
    return pool.sort((a, b) => (b.popularity_score ?? 50) - (a.popularity_score ?? 50))[0] || null;
};
