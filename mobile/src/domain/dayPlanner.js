/**
 * dayPlanner.js — Yerleri günlere dağıtan, bölge farkındalıklı planlayıcı.
 *
 * K-Means "k" kümesini zorla üretir; bu da birbirine yakın iki yeri farklı
 * günlere, birbirinden uzak iki yeri aynı güne koyabilir. Bu planlayıcı bunun
 * yerine insanın plan yaparken düşündüğü sırayı izler:
 *
 *  1. Tüm günü alan duraklar (piknik, mesire, milli park…) kendi günlerini alır.
 *  2. Kalan duraklar, ulaşım moduna göre yürünebilir / kısa yolculuk
 *     yarıçapındaki "bölgelere" ayrılır (yakın yerler aynı gruba düşer).
 *  3. Bir güne sığmayan bölge, rota sırasına göre parçalara bölünür.
 *  4. Boş gün varsa ağır günler ikiye bölünerek gezi rahatlatılır; gün
 *     yetmiyorsa en yakın ve süresi uyan parçalar birleştirilir.
 *  5. Mantıklı bir birleştirme yoksa (uzak bölgeleri aynı güne koymak,
 *     yakın bir bölgeyi zorla bölmek gibi) bir "karar noktası" (conflict)
 *     üretilir; kullanıcıya seçenek sunulur. Plan yine de en iyi tahminle
 *     oluşturulur, böylece kullanıcı "böyle kabul et" diyebilir.
 */

import { haversineDistance } from '../algorithms/haversine';
import { optimizeRoute } from '../algorithms/tsp';
import { estimateLeg } from '../algorithms/travelProfiles';

// 4 saat ve üzeri duraklar günün büyük kısmını kaplar.
export const FULL_DAY_MINUTES = 240;

// Aynı "bölge" sayılacak en büyük merkez uzaklığı (km). Yürüyüşte birkaç
// sokak, araçla ise ilçe ölçeği.
const GROUP_RADIUS_KM = { walking: 1.2, transit: 3.5, driving: 8 };

// Bir günü "ağır" sayma eşiği: boş gün varsa böyle günler ikiye bölünür.
const HEAVY_DAY_RATIO = 0.7;

// Tahmini süre ile gerçek zaman çizelgesi arasında pay bırakır.
const CAPACITY_SAFETY = 0.95;

// Tam gün durağın gününe eklenebilecek en uzun ek parça.
const SMALL_ADDON_MINUTES = 90;

const centroidOf = (places) => ({
    latitude: places.reduce((s, p) => s + p.latitude, 0) / places.length,
    longitude: places.reduce((s, p) => s + p.longitude, 0) / places.length,
});

const isFullDayStop = (place) =>
    place.duration_minutes >= FULL_DAY_MINUTES || Boolean(place.preferred_start_hour);

/** Bir grup yerin ziyaret + aradaki yol süresi tahmini (dakika). */
export function estimateGroupMinutes(places, transportMode) {
    if (!places.length) return 0;
    const visit = places.reduce((s, p) => s + p.duration_minutes, 0);
    if (places.length === 1) return visit + estimateLeg(1.5, transportMode).minutes;
    const center = centroidOf(places);
    const ordered = optimizeRoute(center, places, false);
    let travel = estimateLeg(1.5, transportMode).minutes; // konaklamadan ilk durağa
    for (let i = 1; i < ordered.length; i++) {
        travel += estimateLeg(haversineDistance(ordered[i - 1], ordered[i]), transportMode).minutes;
    }
    return visit + travel;
}

function makeChunk(places, ctx, extra = {}) {
    return {
        places,
        minutes: estimateGroupMinutes(places, ctx.transportMode),
        center: centroidOf(places),
        locked: false,
        ...extra,
    };
}

/** Merkezleri yakın olan yerleri birleştirir (centroid bağlantılı hiyerarşik kümeleme). */
function groupByProximity(places, radiusKm) {
    let groups = places.map(place => ({ places: [place], center: { latitude: place.latitude, longitude: place.longitude } }));
    for (;;) {
        let best = null;
        for (let i = 0; i < groups.length; i++) {
            for (let j = i + 1; j < groups.length; j++) {
                const distance = haversineDistance(groups[i].center, groups[j].center);
                if (distance <= radiusKm && (!best || distance < best.distance)) best = { i, j, distance };
            }
        }
        if (!best) return groups;
        const merged = [...groups[best.i].places, ...groups[best.j].places];
        groups = groups.filter((_, index) => index !== best.i && index !== best.j);
        groups.push({ places: merged, center: centroidOf(merged) });
    }
}

/** Grubu rota sırasına göre, her parça kapasiteye sığacak şekilde böler. */
function splitByCapacity(places, capacity, ctx) {
    const ordered = optimizeRoute(centroidOf(places), places, false);
    const chunks = [];
    let current = [];
    for (const place of ordered) {
        const candidate = [...current, place];
        if (current.length && estimateGroupMinutes(candidate, ctx.transportMode) > capacity) {
            chunks.push(current);
            current = [place];
        } else {
            current = candidate;
        }
    }
    if (current.length) chunks.push(current);
    return chunks;
}

/** Grubu rota sırasında süreye göre ikiye böler (rahatlatma amaçlı). */
function splitInHalf(places, ctx) {
    const ordered = optimizeRoute(centroidOf(places), places, false);
    const total = ordered.reduce((s, p) => s + p.duration_minutes, 0);
    let running = 0;
    let cut = 1;
    for (let i = 0; i < ordered.length - 1; i++) {
        running += ordered[i].duration_minutes;
        cut = i + 1;
        if (running >= total / 2) break;
    }
    return [ordered.slice(0, cut), ordered.slice(cut)].filter(part => part.length);
}

const placeRef = (place) => ({ id: place.id, name: place.name });

/**
 * @returns {{ days: Array<Array>, conflicts: Array }}
 *   days: her gün için yer listesi (sıralama henüz yapılmamış)
 */
export function planDays(places, days, ctx) {
    const { capacityMinutes, transportMode, acceptCompromise } = ctx;
    const capacity = capacityMinutes * CAPACITY_SAFETY;
    const radius = GROUP_RADIUS_KM[transportMode] ?? GROUP_RADIUS_KM.transit;
    const conflicts = [];

    if (!places.length || days <= 0) return { days: Array.from({ length: Math.max(days, 0) }, () => []), conflicts };

    // ── 1. Tüm günü alan duraklar ─────────────────────────────────────────
    const fullDayStops = places.filter(isFullDayStop).sort((a, b) => (b.popularity_score ?? 50) - (a.popularity_score ?? 50));
    const regular = places.filter(place => !isFullDayStop(place));

    const lockedChunks = fullDayStops.slice(0, days).map(place => makeChunk([place], ctx, { locked: true }));
    const extraFullDay = fullDayStops.slice(days);
    if (extraFullDay.length) {
        conflicts.push({
            id: 'too-many-full-day',
            type: 'too_many_full_day',
            title: 'Tam gün süren yerler gün sayısını aşıyor',
            message: `${fullDayStops.map(p => p.name).join(', ')} her biri neredeyse bütün bir gün sürüyor; ${days} günlük plana hepsi sığmıyor.`,
            places: fullDayStops.map(placeRef),
            suggestedDrops: extraFullDay.map(placeRef),
            compromise: 'Fazla olanlar diğer günlere sığdığı kadar eklenir.',
        });
    }

    // ── 2. Bölgeler ve kapasiteye göre parçalar ───────────────────────────
    const groups = groupByProximity([...regular, ...extraFullDay], radius);
    let chunks = [];
    for (const group of groups) {
        const minutes = estimateGroupMinutes(group.places, transportMode);
        if (minutes <= capacity || group.places.length === 1) {
            chunks.push(makeChunk(group.places, ctx));
        } else {
            const parts = splitByCapacity(group.places, capacity, ctx);
            const groupId = parts.map(part => part.map(p => p.id).join('-')).join('|');
            parts.forEach(part => chunks.push(makeChunk(part, ctx, { splitFrom: groupId, groupPlaces: group.places })));
        }
    }

    let freeDays = days - lockedChunks.length;

    // ── 3a. Gün fazlaysa ağır günleri rahatlat ───────────────────────────
    while (chunks.length < freeDays) {
        const heavy = chunks
            .filter(chunk => chunk.places.length > 1 && chunk.minutes > capacity * HEAVY_DAY_RATIO)
            .sort((a, b) => b.minutes - a.minutes)[0];
        if (!heavy) break;
        chunks = chunks.filter(chunk => chunk !== heavy);
        splitInHalf(heavy.places, ctx).forEach(part => chunks.push(makeChunk(part, ctx)));
    }

    // ── 3b. Gün yetmiyorsa en uyumlu parçaları birleştir ─────────────────
    // Kilitli (tam gün) günler de, yakınsa ve süre elveriyorsa küçük parça alabilir.
    let pool = [...lockedChunks, ...chunks];
    const farMerges = [];
    while (pool.length > days) {
        let best = null;
        for (let i = 0; i < pool.length; i++) {
            for (let j = i + 1; j < pool.length; j++) {
                const a = pool[i];
                const b = pool[j];
                if (a.locked && b.locked) continue;
                const combined = estimateGroupMinutes([...a.places, ...b.places], transportMode);
                if (combined > capacity) continue;
                const distance = haversineDistance(a.center, b.center);
                const isFar = distance > radius * 2;
                // Tam gün süren durağın gününe yalnızca çok yakın ve kısa (≤ 1,5 sa)
                // bir parça eklenebilir; o gün piknik/doğa günü olarak kalmalı.
                if (a.locked || b.locked) {
                    const other = a.locked ? b : a;
                    if (distance > radius || other.minutes > SMALL_ADDON_MINUTES) continue;
                }
                const score = distance + (isFar ? 1000 : 0);
                if (!best || score < best.score) best = { i, j, distance, isFar, combined };
            }
        }
        if (!best) break;
        const a = pool[best.i];
        const b = pool[best.j];
        if (best.isFar) farMerges.push({ a, b, distance: best.distance });
        const merged = makeChunk([...a.places, ...b.places], ctx, { locked: a.locked || b.locked });
        pool = pool.filter((_, index) => index !== best.i && index !== best.j);
        pool.push(merged);
    }

    // ── 4. Karar noktaları ────────────────────────────────────────────────
    // Bölünmek zorunda kalan yakın bölgeler
    const splitGroups = new Map();
    chunks.forEach(chunk => {
        if (chunk.splitFrom && !splitGroups.has(chunk.splitFrom)) splitGroups.set(chunk.splitFrom, chunk.groupPlaces);
    });
    splitGroups.forEach((groupPlaces) => {
        const totalHours = Math.round((estimateGroupMinutes(groupPlaces, transportMode) / 60) * 10) / 10;
        conflicts.push({
            id: `split-${groupPlaces.map(p => p.id).join('-')}`,
            type: 'overloaded_area',
            title: 'Yakın yerler tek güne sığmıyor',
            message: `${groupPlaces.map(p => p.name).join(', ')} birbirine yakın ama toplam ~${totalHours} saat sürüyor; bir güne sığmıyor.`,
            places: groupPlaces.map(placeRef),
            suggestedDrops: [...groupPlaces].sort((a, b) => (a.popularity_score ?? 50) - (b.popularity_score ?? 50)).slice(0, 2).map(placeRef),
            compromise: 'Bu bölge iki ayrı güne bölünür.',
        });
    });

    // Uzak bölgeleri aynı güne koymak zorunda kalındı
    farMerges.forEach(({ a, b, distance }) => {
        conflicts.push({
            id: `far-${[...a.places, ...b.places].map(p => p.id).join('-')}`,
            type: 'far_merge',
            title: 'Birbirine uzak yerler aynı güne düşüyor',
            message: `${a.places.map(p => p.name).join(', ')} ile ${b.places.map(p => p.name).join(', ')} arasında ~${Math.round(distance)} km var. Gün sayısı yetmediği için aynı gün planlanıyor.`,
            places: [...a.places, ...b.places].map(placeRef),
            suggestedDrops: [...a.places, ...b.places].sort((x, y) => (x.popularity_score ?? 50) - (y.popularity_score ?? 50)).slice(0, 2).map(placeRef),
            compromise: 'Aynı gün iki bölge arasında yolculuk yapılır.',
        });
    });

    // Hiçbir şekilde birleştirilemeyen fazla parçalar
    let overflowChunks = [];
    if (pool.length > days) {
        pool.sort((a, b) => b.places.reduce((s, p) => s + (p.popularity_score ?? 50), 0)
            - a.places.reduce((s, p) => s + (p.popularity_score ?? 50), 0));
        overflowChunks = pool.slice(days);
        pool = pool.slice(0, days);
        const overflowPlaces = overflowChunks.flatMap(chunk => chunk.places);
        conflicts.push({
            id: 'not-enough-days',
            type: 'not_enough_days',
            title: 'Seçilen yerler gün sayısına sığmıyor',
            message: `${overflowPlaces.map(p => p.name).join(', ')} için ${days} günde yer kalmıyor.`,
            places: overflowPlaces.map(placeRef),
            suggestedDrops: overflowPlaces.map(placeRef),
            compromise: 'Sığmayan yerler plana eklenmez, ayrıca listelenir.',
        });
    }

    // ── 5. Günleri sırala: konaklamaya yakın bölge ilk gün ───────────────
    const origin = ctx.routeOrigin;
    pool.sort((a, b) => haversineDistance(origin, a.center) - haversineDistance(origin, b.center));
    const dayLists = Array.from({ length: days }, (_, index) => pool[index]?.places || []);

    return {
        days: dayLists,
        conflicts: acceptCompromise ? [] : conflicts,
        compromises: conflicts,
        overflow: overflowChunks.flatMap(chunk => chunk.places),
    };
}
