/**
 * itineraryGenerator.js — Geliştirilmiş akıllı gezi planlama algoritması v2
 *
 * Yenilikler v2:
 *  1. Kategori dengesi — her güne farklı kategorilerden yer dağıtımı
 *  2. Coğrafi clustering — yakın yerleri aynı güne koy
 *  3. Giriş ücreti bazlı bütçe hesabı
 *  4. Zirve/düşük saatlere göre öneri sıralaması (sabah müzeler, öğle yemek, akşam aktivite)
 *  5. İlk yer her günde konaklama noktasına en yakın olacak şekilde optimizasyon
 */

import { haversineDistance } from '../utils/haversine';

// ─── Sabitler ────────────────────────────────────────────────────────────────
const MAX_HOURS_PER_DAY = 7;    // 09:00 → 16:00 mantıklı seyahat penceresi
const TRAVEL_SPEED_KMH = 4;    // Yürüyüş ~ 4 km/s
const VISIT_BUFFER_H = 0.25; // Her ziyaret arası 15 dk buffer

// Kategorilerin günün hangi saat diliminde visitlanması tercih edilir
// (0=sabah, 1=öğle, 2=öğleden sonra, 3=akşam)
const CATEGORY_SLOT = {
    'tarihi': 0, museum: 0, 'müze': 0,
    'dini': 0,
    'doğa': 1, nature: 1,
    'park': 1,
    'restoran': 2, restaurant: 2, 'yemek': 2,
    'kafe': 2, cafe: 2,
    'alışveriş': 3, shopping: 3,
    'eğlence': 3, entertainment: 3,
    'gece': 3,
};

// ─── Yardımcı: Yürüyüş süresi ─────────────────────────────────────────────
const travelHours = (km) => km / TRAVEL_SPEED_KMH;

// ─── Yardımcı: Coğrafi merkez (centroid) ──────────────────────────────────
const centroid = (places) => {
    if (!places.length) return { lat: 0, lng: 0 };
    const lat = places.reduce((s, p) => s + p.lat, 0) / places.length;
    const lng = places.reduce((s, p) => s + p.lng, 0) / places.length;
    return { lat, lng };
};

// ─── K-Means Clustering ───────────────────────────────────────────────────
/**
 * Yerleri k coğrafi kümeye böler.
 * Her küme bir "günlük alan" temsil eder.
 */
const kMeansClusters = (places, k, maxIter = 20) => {
    if (places.length <= k) {
        return places.map((p, i) => ({ cluster: i, ...p }));
    }

    // Başlangıç merkezi: eşit aralıklı seç
    let centers = [];
    const step = Math.floor(places.length / k);
    for (let i = 0; i < k; i++) {
        centers.push({ lat: places[i * step].lat, lng: places[i * step].lng });
    }

    let assignments = new Array(places.length).fill(0);

    for (let iter = 0; iter < maxIter; iter++) {
        let changed = false;

        // Her yeri en yakın merkeze ata
        for (let i = 0; i < places.length; i++) {
            let minDist = Infinity, minK = 0;
            for (let j = 0; j < k; j++) {
                const d = haversineDistance(places[i].lat, places[i].lng, centers[j].lat, centers[j].lng);
                if (d < minDist) { minDist = d; minK = j; }
            }
            if (assignments[i] !== minK) { assignments[i] = minK; changed = true; }
        }

        if (!changed) break;

        // Merkezleri güncelle
        for (let j = 0; j < k; j++) {
            const clusterPlaces = places.filter((_, i) => assignments[i] === j);
            if (clusterPlaces.length > 0) {
                centers[j] = centroid(clusterPlaces);
            }
        }
    }

    return places.map((p, i) => ({ ...p, cluster: assignments[i] }));
};

// ─── Nearest Neighbor (tek grup içi sıralama) ─────────────────────────────
const nearestNeighborOrder = (places, start = null) => {
    if (places.length <= 1) return [...places];
    const remaining = [...places];
    const ordered = [];
    let curr = start || { lat: remaining[0].lat, lng: remaining[0].lng };

    while (remaining.length > 0) {
        let minIdx = 0, minDist = Infinity;
        for (let i = 0; i < remaining.length; i++) {
            const d = haversineDistance(curr.lat, curr.lng, remaining[i].lat, remaining[i].lng);
            if (d < minDist) { minDist = d; minIdx = i; }
        }
        const p = remaining.splice(minIdx, 1)[0];
        ordered.push({ ...p, _distFromPrev: minDist });
        curr = { lat: p.lat, lng: p.lng };
    }
    return ordered;
};

// ─── Kategori skoru: çeşitlilik için ──────────────────────────────────────
/**
 * Bir güne eklenmemiş kategorileri tercih eder.
 * Yüksek skor = bu yer bu günün kategorilerini çeşitlendirir.
 */
const diversityScore = (place, dayCategories) => {
    const cat = (place.category || '').toLowerCase();
    if (!dayCategories.has(cat)) return 1.0;  // Yeni kategori → üst prefer
    return 0.3;  // Zaten var → daha düşük öncelik
};

// ─── Ana Algoritma ──────────────────────────────────────────────────────────
/**
 * Geliştirilmiş gezi planı oluşturur.
 *
 * @param {Array}  places          – Şehrin tüm yerleri (lat/lng zorunlu)
 * @param {number} days            – Gezi günü sayısı
 * @param {object} options
 * @param {{ lat, lng }} [options.startLocation]  – Konaklama koordinatı
 * @param {number} [options.maxHoursPerDay]        – Günlük max saat (default 7)
 * @param {boolean} [options.balanceCategories]    – Kategori dengesi (default true)
 * @returns {{ plan, totalHours, totalDistance, totalBudget, items, stats }}
 */
export const generateItinerary = (places, days, options = {}) => {
    console.log('🚀 generateItinerary başladı:', { placesCount: places.length, days });
    
    const {
        startLocation = null,
        maxHoursPerDay = MAX_HOURS_PER_DAY,
        balanceCategories = true,
    } = options;

    // Koordinatsız yerleri filtrele
    const validPlaces = places.filter(p => p.lat != null && p.lng != null);
    console.log('✅ Geçerli yerler:', validPlaces.length);

    if (validPlaces.length === 0 || days <= 0) {
        console.log('⚠️ Geçersiz parametreler, boş sonuç dönüyor');
        return emptyResult(days);
    }

    // Kaç yer kullanılacak: günlük ortalama 3-5 yer
    const targetPerDay = Math.min(5, Math.max(2, Math.ceil(validPlaces.length / days)));
    const maxPlaces = Math.min(validPlaces.length, days * targetPerDay);
    const effectiveDays = Math.min(days, validPlaces.length);

    // Popülerlik skoru yoksa varsayılan uygula
    const scored = validPlaces.map(p => ({
        ...p,
        popularity_score: p.popularity_score ?? 50,
        avg_duration: p.avg_duration ?? 1,
        entry_fee: p.entry_fee ?? 0,
    }));

    // En yüksek popülerliği seç (quota'ya göre)
    const topPlaces = [...scored]
        .sort((a, b) => b.popularity_score - a.popularity_score)
        .slice(0, maxPlaces);

    // ── Coğrafi kümeleme: k = gün sayısı ──────────────────────────────────
    console.log('🗺️ Kümeleme başlıyor:', { topPlacesCount: topPlaces.length, effectiveDays });
    const clustered = kMeansClusters(topPlaces, effectiveDays);
    console.log('✅ Kümeleme tamamlandı');

    // Kümeleri gruplara ayır
    const clusterGroups = {};
    for (let i = 0; i < effectiveDays; i++) clusterGroups[i] = [];
    clustered.forEach(p => {
        if (clusterGroups[p.cluster] !== undefined) {
            clusterGroups[p.cluster].push(p);
        }
    });

    // Boş kalan kümelere yeniden dağıt (k-means dengesizliği)
    const nonEmpty = Object.values(clusterGroups).filter(g => g.length > 0);
    if (nonEmpty.length < effectiveDays) {
        // Tüm yerleri tekrar dengeli dağıt
        const allSorted = [...topPlaces].sort((a, b) => b.popularity_score - a.popularity_score);
        for (let i = 0; i < effectiveDays; i++) clusterGroups[i] = [];
        allSorted.forEach((p, i) => clusterGroups[i % effectiveDays].push(p));
    }

    // ── Her günü optimize et ──────────────────────────────────────────────
    const plan = [];
    let dayNum = 1;

    for (let ci = 0; ci < effectiveDays; ci++) {
        const candidates = clusterGroups[ci];
        if (candidates.length === 0) {
            plan.push({ day: dayNum++, places: [], totalHours: 0, totalDistance: 0, budget: 0 });
            continue;
        }

        // Kategori dengeli seçim
        let selected = [];
        const dayCategories = new Set();

        if (balanceCategories) {
            // Önce kategori çeşitliliği sağla
            const byCategory = {};
            candidates.forEach(p => {
                const cat = (p.category || 'diğer').toLowerCase();
                if (!byCategory[cat]) byCategory[cat] = [];
                byCategory[cat].push(p);
            });

            // Her kategoriden en popüleri al
            Object.values(byCategory).forEach(catPlaces => {
                const best = catPlaces.sort((a, b) => b.popularity_score - a.popularity_score)[0];
                selected.push(best);
            });

            // Kota dolmadıysa popülerlik sırasına göre tamamla
            const usedIds = new Set(selected.map(p => p.id));
            const remaining = candidates.filter(p => !usedIds.has(p.id));
            const remaining_sorted = remaining.sort((a, b) => b.popularity_score - a.popularity_score);

            let budget = 0;
            for (const p of selected) {
                budget += (p.avg_duration ?? 1) + VISIT_BUFFER_H;
                dayCategories.add((p.category || '').toLowerCase());
            }
            for (const p of remaining_sorted) {
                if (budget >= maxHoursPerDay) break;
                budget += (p.avg_duration ?? 1) + VISIT_BUFFER_H;
                if (budget <= maxHoursPerDay + 1) selected.push(p);
            }
        } else {
            selected = [...candidates].sort((a, b) => b.popularity_score - a.popularity_score);
        }

        // Nearest-neighbor ile o günün rotasını optimize et
        const start = startLocation;
        const ordered = nearestNeighborOrder(selected, start);

        // Günlük süre ve bütçe hesapla
        let dayHours = 0, dayDist = 0, dayBudget = 0;
        const fittedPlaces = [];
        for (const p of ordered) {
            const travel = travelHours(p._distFromPrev ?? 0);
            const visit = (p.avg_duration ?? 1) + VISIT_BUFFER_H;
            if (dayHours + travel + visit > maxHoursPerDay + 1 && fittedPlaces.length > 0) break;
            dayHours += travel + visit;
            dayDist += p._distFromPrev ?? 0;
            dayBudget += p.entry_fee ?? 0;
            fittedPlaces.push(p);
        }

        plan.push({
            day: dayNum++,
            places: fittedPlaces,
            totalHours: Math.round(dayHours * 10) / 10,
            totalDistance: Math.round(dayDist * 100) / 100,
            budget: dayBudget,
        });
    }

    // Kalan günler için boş gün ekle
    while (plan.length < days) {
        plan.push({ day: plan.length + 1, places: [], totalHours: 0, totalDistance: 0, budget: 0 });
    }

    // items (DB formatı)
    const items = plan.flatMap(dayPlan =>
        dayPlan.places.map((p, idx) => ({
            place_id: p.id,
            day_number: dayPlan.day,
            order_index: idx,
        }))
    );

    const totalHours = plan.reduce((s, d) => s + d.totalHours, 0);
    const totalDistance = plan.reduce((s, d) => s + d.totalDistance, 0);
    const totalBudget = plan.reduce((s, d) => s + d.budget, 0);

    // İstatistikler
    const stats = {
        totalPlaces: items.length,
        avgPlacesPerDay: Math.round((items.length / Math.max(days, 1)) * 10) / 10,
        uniqueCategories: [...new Set(plan.flatMap(d => d.places.map(p => p.category)).filter(Boolean))],
        totalBudget,
        totalDistance: Math.round(totalDistance * 10) / 10,
    };

    console.log('✅ Plan oluşturuldu:', { totalPlaces: items.length, totalHours, totalBudget });
    return { plan, totalHours: Math.round(totalHours * 10) / 10, totalDistance: stats.totalDistance, totalBudget, items, stats };
};

const emptyResult = (days) => ({
    plan: Array.from({ length: days }, (_, i) => ({ day: i + 1, places: [], totalHours: 0, totalDistance: 0, budget: 0 })),
    totalHours: 0, totalDistance: 0, totalBudget: 0, items: [], stats: { totalPlaces: 0, avgPlacesPerDay: 0, uniqueCategories: [], totalBudget: 0, totalDistance: 0 },
});

// ─── Bütçe Hesaplayıcı ────────────────────────────────────────────────────
/**
 * Tam gezi bütçesi tahmini.
 *
 * @param {object} params
 * @param {number} params.entryFees        – Toplam giriş ücretleri (₺)
 * @param {number} params.distanceKm       – Toplam mesafe (km)
 * @param {number} params.days             – Gün sayısı
 * @param {boolean} params.hasTransport    – Özel araç var mı?
 * @param {number} [params.fuelPrice]      – Yakıt fiyatı (₺/L)
 * @param {number} [params.consumption]    – Tüketim (L/100km)
 * @param {number} [params.restaurantPerDay] – Günlük yemek tahmini (₺)
 * @returns {{ entryFees, transport, food, total, breakdown }}
 */
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
        : Math.round(distanceKm * 2); // toplu taşıma tahmini (₺/km ≈ 2)

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

// ─── Alternatif Yer Öner ──────────────────────────────────────────────────
/**
 * Mevcut planda olmayan, aynı kategoriden en popüler yeri önerir.
 * Mesafe bilgisi varsa yakın olanı tercih eder.
 */
export const suggestAlternative = (allCityPlaces, usedPlaceIds, preferCategory = null, nearLat = null, nearLng = null) => {
    const available = allCityPlaces.filter(p => !usedPlaceIds.includes(p.id));
    if (available.length === 0) return null;

    let pool = preferCategory
        ? available.filter(p => p.category === preferCategory)
        : available;

    if (pool.length === 0) pool = available;

    // Mesafe bilgisi varsa yakını tercih et
    if (nearLat && nearLng) {
        return pool
            .map(p => ({ ...p, _dist: haversineDistance(nearLat, nearLng, p.lat, p.lng) }))
            .sort((a, b) => {
                // Karma skor: popülerlik + yakınlık
                const scoreA = (a.popularity_score ?? 50) - a._dist * 5;
                const scoreB = (b.popularity_score ?? 50) - b._dist * 5;
                return scoreB - scoreA;
            })[0];
    }

    return pool.sort((a, b) => (b.popularity_score ?? 0) - (a.popularity_score ?? 0))[0];
};
