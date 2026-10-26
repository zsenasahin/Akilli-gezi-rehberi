/**
 * itineraryGenerator.js — Akıllı gezi planlama algoritması (v4)
 *
 * Gelişmiş özellikler:
 * - Ulaşım moduna (yürüyüş / toplu taşıma / araç) göre gerçekçi bacak süreleri
 * - Gezi temposuna (sakin / dengeli / yoğun) göre gün saatleri ve durak sayısı
 * - Duration-aware clustering (süreye duyarlı günlere ayırma)
 * - Gerçek koordinat bazlı TSP (2-Opt) + kapanış saati duyarlı sıralama
 * - Öğle arası içeren zaman çizelgesi, kış aylarında erken kapanan açık hava yerleri
 * - Güne sığmayan yerlerin diğer günlere taşınması; sığmayanların raporlanması
 */

import { planDays } from './dayPlanner';
import { optimizeRoute } from '../algorithms/tsp';
import { generateTimeline, parseTimeToMinutes } from '../algorithms/timeline';
import { haversineDistance } from '../algorithms/haversine';
import { estimateDuration, estimateClosingHour, adjustClosingHourForSeason } from '../algorithms/smartDuration';
import { getTransportProfile, getPaceProfile, estimateLeg } from '../algorithms/travelProfiles';
import { addDays, parseLocalDate, toLocalISODate } from '../utils/dateUtils';

export const PLAN_VERSION = 2;

// ─── Yardımcı: Bütçe Hesaplayıcı ────────────────────────────────────────────────────
// Fiyatlar kabaca 2026 Türkiye ortalamalarıdır; ekranda "tahmini" olarak sunulur.
export const estimateTotalBudget = ({
    entryFees = 0,
    distanceKm = 0,
    days = 1,
    hasTransport = false,
    transportMode,
    transitLegs = 0,
    fuelPrice = 50,
    consumption = 8,
    transitFare = 30,
    restaurantPerDay = 600,
}) => {
    const mode = transportMode || (hasTransport ? 'driving' : 'transit');

    let transport;
    if (mode === 'driving') {
        transport = Math.round(((distanceKm * consumption) / 100) * fuelPrice);
    } else if (mode === 'walking') {
        // Yürüyüş planında yalnızca uzun bacaklar toplu taşıma ile hesaplanır.
        transport = transitLegs * transitFare;
    } else {
        transport = transitLegs > 0 ? transitLegs * transitFare : Math.round(distanceKm * 2);
    }

    const food = restaurantPerDay * days;
    const total = Math.round(entryFees) + transport + food;
    const transportEmoji = mode === 'driving' ? '🚗' : mode === 'walking' ? '🚶' : '🚌';

    return {
        entryFees: Math.round(entryFees),
        transport,
        food,
        total,
        breakdown: [
            { label: 'Giriş Ücretleri', amount: Math.round(entryFees), emoji: '🎫' },
            { label: mode === 'driving' ? 'Yakıt' : 'Ulaşım', amount: transport, emoji: transportEmoji },
            { label: 'Yemek (tahmini)', amount: food, emoji: '🍽️' },
        ],
    };
};

// ─── Normalizasyon ───────────────────────────────────────────────────────────

/**
 * Bir yeri motorun beklediği biçime getirir. İdempotenttir: kayıtlı bir plandaki
 * yer tekrar normalize edildiğinde hesaplanmış alanlar korunur.
 */
function normalizePlace(place, { fallbackLat, fallbackLng, month }) {
    const rawLat = place.latitude ?? place.lat;
    const rawLng = place.longitude ?? place.lng;
    // Kayıtlı planlarda koordinatsız yerler şehir merkezine yerleştirilmiş olabilir;
    // bu bilgi `has_coordinates: false` ile korunur.
    const hasCoords = place.has_coordinates !== false
        && rawLat != null && rawLng != null && !isNaN(rawLat) && !isNaN(rawLng);
    const name = place.name || '';

    // Süre: placeDataManager'dan gelen akıllı süre, yoksa tahmin et
    const durationMinutes = place.duration_minutes
        ?? Math.round((place.avg_duration ?? estimateDuration(name, place.category)) * 60);

    const baseClosingHour = place.base_closing_hour
        ?? place.closing_hour
        ?? estimateClosingHour(name, place.category);

    return {
        ...place,
        latitude: hasCoords ? Number(rawLat) : fallbackLat,
        longitude: hasCoords ? Number(rawLng) : fallbackLng,
        has_coordinates: hasCoords,
        duration_minutes: durationMinutes,
        base_closing_hour: baseClosingHour,
        closing_hour: adjustClosingHourForSeason(baseClosingHour, name, place.category, month),
        // Uzun açık-hava molaları öğleden sonra daha gerçekçidir. Timeline
        // bu bilgiyi kullanarak bu durağı erkenden tüketmek yerine güne
        // yerleştirir.
        preferred_start_hour: place.preferred_start_hour ?? (isLeisureStop(name) ? 14 : undefined),
    };
}

function buildContext(options = {}) {
    const transport = getTransportProfile(options.transportMode);
    const pace = getPaceProfile(options.pace);
    const tripStart = parseLocalDate(options.startDate);
    const fallbackLat = options.cityLat ?? 41.0082;
    const fallbackLng = options.cityLng ?? 28.9784;
    const hasStartLocation = options.startLocation?.latitude != null;

    return {
        transport,
        pace,
        tripStart,
        month: tripStart ? tripStart.getMonth() : null,
        fallbackLat,
        fallbackLng,
        hasStartLocation,
        // Konaklama yoksa TSP için şehir merkezi referans alınır; ama ilk durağa
        // "şehir merkezinden" yolculuk süresi yazılmaz, çünkü kullanıcının
        // nereden geldiğini bilmiyoruz.
        routeOrigin: hasStartLocation ? options.startLocation : { latitude: fallbackLat, longitude: fallbackLng },
        timelineOrigin: hasStartLocation ? options.startLocation : undefined,
        returnToStart: hasStartLocation && (options.returnToHotel ?? true),
    };
}

function timelineOptions(ctx) {
    return {
        startTime: ctx.pace.startTime,
        dayEndHour: ctx.pace.dayEndHour,
        transportMode: ctx.transport.key,
        startLocation: ctx.timelineOrigin,
        returnToStart: ctx.returnToStart,
        lunchMinutes: ctx.pace.lunchMinutes,
    };
}

// ─── Gün planlama ────────────────────────────────────────────────────────────

const leisureLast = (route) => [...route].sort((a, b) =>
    Number(Boolean(a.preferred_start_hour)) - Number(Boolean(b.preferred_start_hour))
);

/** Zaman çizelgesi kalitesi: önce sığan durak sayısı, sonra toplam süre, sonra mesafe. */
function isBetterTimeline(candidate, best) {
    if (!best) return true;
    if (candidate.stops.length !== best.stops.length) return candidate.stops.length > best.stops.length;
    if (candidate.totalDurationMinutes !== best.totalDurationMinutes) {
        return candidate.totalDurationMinutes < best.totalDurationMinutes;
    }
    return candidate.totalDistanceKm < best.totalDistanceKm;
}

/**
 * Bir günün yerlerini sıralar ve zaman çizelgesini çıkarır.
 * TSP sırası tek başına kapanış saatlerini bilmez: 17:00'de kapanan müze
 * rotanın sonuna düşebilir. Bu yüzden birkaç aday sıra denenir ve en çok
 * durağı sığdıran / en kısa süren seçilir.
 */
function scheduleDay(places, ctx) {
    if (places.length === 0) {
        return { route: [], timeline: generateTimeline([], timelineOptions(ctx)), scheduled: [], overflow: [] };
    }

    // Günün tek durağı piknik/mesire ise öğleden sonrayı beklemenin anlamı yok;
    // o gün zaten bu durağa ayrılmıştır.
    if (places.length === 1 && places[0].preferred_start_hour) {
        places = [{ ...places[0], preferred_start_hour: undefined }];
    }

    const optimized = optimizeRoute(ctx.routeOrigin, places, ctx.returnToStart);
    const tspIndex = new Map(optimized.map((place, index) => [place, index]));
    const closingFirst = [...optimized].sort((a, b) =>
        (a.closing_hour ?? 24) - (b.closing_hour ?? 24) || tspIndex.get(a) - tspIndex.get(b)
    );

    const candidates = [leisureLast(optimized), leisureLast(closingFirst)];
    if (ctx.returnToStart) candidates.push(leisureLast([...optimized].reverse()));

    let best = null;
    let bestRoute = candidates[0];
    for (const route of candidates) {
        const timeline = generateTimeline(route, timelineOptions(ctx));
        if (isBetterTimeline(timeline, best)) {
            best = timeline;
            bestRoute = route;
        }
    }

    const overflowSet = new Set(best.overflowPlaces);
    return {
        route: bestRoute,
        timeline: best,
        scheduled: bestRoute.filter(place => !overflowSet.has(place)),
        overflow: best.overflowPlaces,
    };
}

function centroid(places) {
    if (!places.length) return null;
    return {
        latitude: places.reduce((sum, p) => sum + p.latitude, 0) / places.length,
        longitude: places.reduce((sum, p) => sum + p.longitude, 0) / places.length,
    };
}

/**
 * Günlerden taşan durakları, coğrafi olarak en yakın ve kapasitesi olan güne
 * yerleştirmeye çalışır. Yerleşemeyenler döndürülür.
 */
function redistributeOverflow(dayResults, ctx) {
    const leftovers = [];
    const pending = dayResults.flatMap(day => day.overflow.map(place => ({ place, fromDay: day.dayIndex })));
    dayResults.forEach(day => { day.overflow = []; });

    for (const { place, fromDay } of pending) {
        const ranked = dayResults
            .filter(day => day.scheduled.length < ctx.pace.maxStopsPerDay + 1)
            .map(day => {
                const center = centroid(day.scheduled);
                const distance = center ? haversineDistance(center, place) : 0;
                return { day, distance };
            })
            .sort((a, b) => a.distance - b.distance);

        let placed = false;
        for (const { day } of ranked) {
            // Kendi gününe geri koymak, sıra değişikliğiyle sığabiliyorsa da denenir.
            const trial = scheduleDay([...day.scheduled, place], ctx);
            if (trial.scheduled.length === day.scheduled.length + 1) {
                Object.assign(day, trial, { overflow: [] });
                placed = true;
                break;
            }
        }
        if (!placed) leftovers.push({ place, fromDay });
    }

    return leftovers;
}

function toUiStop(stop) {
    return {
        ...stop,
        lat: stop.has_coordinates === false ? null : stop.latitude,
        lng: stop.has_coordinates === false ? null : stop.longitude,
        _travelMinutes: stop.travelMinutesFromPrev || 0,
    };
}

function buildDayPlan(dayNumber, dayResult, ctx) {
    const { timeline } = dayResult;
    const date = ctx.tripStart ? toLocalISODate(addDays(ctx.tripStart, dayNumber - 1)) : null;
    const transitLegs = timeline.stops.filter(stop => stop.travelModeFromPrev === 'transit').length;

    return {
        day: dayNumber,
        date,
        places: timeline.stops.map(toUiStop),
        breaks: timeline.breaks,
        totalHours: Math.round((timeline.totalDurationMinutes / 60) * 10) / 10,
        totalDistance: Math.round(timeline.totalDistanceKm * 10) / 10,
        totalTravelMinutes: timeline.totalTravelMinutes,
        transitLegs,
        budget: timeline.stops.reduce((sum, p) => sum + (p.entry_fee ?? 0), 0),
        startTime: timeline.stops[0]?.arrivalTime ?? ctx.pace.startTime,
        endTime: timeline.endTime,
        transportMode: ctx.transport.key,
        pace: ctx.pace.key,
    };
}

const summarizePlace = (place, reason) => ({
    id: place.id,
    name: place.name,
    category: place.category,
    reason,
});

/**
 * Geliştirilmiş gezi planı oluşturur.
 *
 * Akış:
 * 1. Verileri normalize et (koordinat, süre, mevsime göre kapanış saati)
 * 2. Tempoya göre durak sayısını ve günlük süre bütçesini ayarla
 * 3. Duration-aware K-Means ile günlere ayır
 * 4. Her gün için TSP + kapanış saati duyarlı aday sıralar → en iyi zaman çizelgesi
 * 5. Güne sığmayan yerleri diğer günlere dağıt, kalanları raporla
 *
 * @param {Array} places
 * @param {number} days
 * @param {{
 *   cityLat?: number, cityLng?: number,
 *   startLocation?: { latitude: number, longitude: number },
 *   returnToHotel?: boolean,
 *   selectionMode?: 'auto' | 'manual',
 *   transportMode?: 'walking' | 'transit' | 'driving',
 *   pace?: 'relaxed' | 'balanced' | 'intense',
 *   startDate?: string,
 * }} options
 */
export const generateItinerary = (places, days, options = {}) => {
    const ctx = buildContext(options);
    const selectionMode = options.selectionMode || 'manual';

    if (!places?.length || days <= 0) {
        return emptyResult(days, ctx, selectionMode);
    }

    // ═══════════════════════════════════════════════════════════════════
    // 1. VERİ NORMALIZASYONU
    // ═══════════════════════════════════════════════════════════════════
    const formattedPlaces = places.map(place => normalizePlace(place, ctx));

    // Bir rota, şehirdeki bütün noktaların listesi değildir. Otomatik seçimde
    // tempoya göre gün başına en fazla 3–6 gerçek ziyaret durağı koyuyoruz.
    // Kafe ve restoranlar rota durağı olarak kullanılmaz; öğün önerileri ayrı
    // akışta (getMealSuggestions) ele alınır.
    const tripPlaces = selectRealisticTripPlaces(formattedPlaces, days, selectionMode, ctx.pace.maxStopsPerDay);
    if (tripPlaces.length === 0) {
        return emptyResult(days, ctx, selectionMode);
    }

    // ═══════════════════════════════════════════════════════════════════
    // 2. GÜNLÜK KAPASİTE
    // ═══════════════════════════════════════════════════════════════════
    const dayBudgetMinutes = Math.round(ctx.pace.dayEndHour * 60)
        - parseTimeToMinutes(ctx.pace.startTime)
        - ctx.pace.lunchMinutes;
    const unscheduled = [];
    let placesToPlan = tripPlaces;

    // Otomatik modda kullanıcı yer seçmediği için soru sormak yerine en popüler
    // yerler süre bütçesine sığacak kadar seçilir.
    if (selectionMode === 'auto') {
        const avgTravelMinutes = estimateLeg(1.5, ctx.transport.key).minutes;
        const totalAvailableMinutes = days * dayBudgetMinutes;
        let usedMinutes = 0;
        placesToPlan = [];
        for (const place of [...tripPlaces].sort((a, b) => (b.popularity_score ?? 50) - (a.popularity_score ?? 50))) {
            const placeTotal = place.duration_minutes + avgTravelMinutes;
            if (usedMinutes + placeTotal <= totalAvailableMinutes) {
                placesToPlan.push(place);
                usedMinutes += placeTotal;
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 3. BÖLGE FARKINDALIKLI GÜN DAĞITIMI (domain/dayPlanner.js)
    // ═══════════════════════════════════════════════════════════════════
    const distribution = planDays(placesToPlan, days, {
        capacityMinutes: dayBudgetMinutes,
        transportMode: ctx.transport.key,
        routeOrigin: ctx.routeOrigin,
        acceptCompromise: selectionMode === 'auto' || Boolean(options.acceptCompromise),
    });
    unscheduled.push(...distribution.overflow.map(place => summarizePlace(place, 'days')));

    const dayResults = distribution.days.map((dayPlaces, index) => ({
        dayIndex: index + 1,
        ...scheduleDay(dayPlaces, ctx),
    }));

    // ═══════════════════════════════════════════════════════════════════
    // 4. KAPANIŞ SAATİ NEDENİYLE TAŞAN DURAKLAR
    // ═══════════════════════════════════════════════════════════════════
    const leftovers = redistributeOverflow(dayResults, ctx);
    unscheduled.push(...leftovers.map(({ place }) => summarizePlace(place, 'overflow')));

    const conflicts = [...distribution.conflicts];
    if (leftovers.length && selectionMode === 'manual' && !options.acceptCompromise) {
        conflicts.push({
            id: 'closing-time',
            type: 'closing_time',
            title: 'Kapanış saatine yetişilemeyen yerler var',
            message: `${leftovers.map(({ place }) => place.name).join(', ')} kapanmadan önce ziyaret edilemiyor.`,
            places: leftovers.map(({ place }) => ({ id: place.id, name: place.name })),
            suggestedDrops: leftovers.map(({ place }) => ({ id: place.id, name: place.name })),
            compromise: 'Bu yerler plana eklenmez, ayrıca listelenir.',
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // 5. SONUÇ
    // ═══════════════════════════════════════════════════════════════════
    const plan = dayResults.map(result => buildDayPlan(result.dayIndex, result, ctx));
    plan[0].tripMeta = buildTripMeta(ctx, selectionMode, options, unscheduled);

    return { ...buildResult(plan, days, unscheduled), conflicts };
};

/**
 * Kayıtlı bir planın tek gününü verilen sırayla yeniden zamanlar.
 * Plan detay ekranında durak silme / değiştirme sonrası saatler güncel kalsın
 * diye kullanılır. Kullanıcının sırasına dokunulmaz; güne sığmayan duraklar
 * silinmez, `isOverflow: true` ile işaretlenip sona eklenir.
 *
 * @param {Array} places - Günün sıralı yerleri
 * @param {number} dayNumber
 * @param {object} options - generateItinerary ile aynı seçenekler
 */
export const rescheduleDay = (places, dayNumber, options = {}) => {
    const ctx = buildContext(options);
    const normalized = places.map(place => normalizePlace(place, ctx));
    const timeline = generateTimeline(normalized, timelineOptions(ctx));
    const dayPlan = buildDayPlan(dayNumber, { timeline }, ctx);
    const overflowStops = timeline.overflowPlaces.map(place => ({
        ...toUiStop(place),
        isOverflow: true,
        arrivalTime: null,
        departureTime: null,
    }));
    return { ...dayPlan, places: [...dayPlan.places, ...overflowStops] };
};

/** Plan dizisinden gezi seviyesindeki meta bilgiyi okur (eski planlarda null). */
export const getTripMeta = (plan) => (Array.isArray(plan) ? plan.find(day => day?.tripMeta)?.tripMeta : null) || null;

function buildTripMeta(ctx, selectionMode, options, unscheduled) {
    return {
        version: PLAN_VERSION,
        transportMode: ctx.transport.key,
        pace: ctx.pace.key,
        selectionMode,
        startDate: ctx.tripStart ? toLocalISODate(ctx.tripStart) : null,
        cityLat: ctx.fallbackLat,
        cityLng: ctx.fallbackLng,
        startLocation: ctx.hasStartLocation ? options.startLocation : null,
        unscheduled,
    };
}

function buildResult(plan, days, unscheduled) {
    // DB formatı (items) — yalnızca Supabase'teki (sayısal ID'li) yerler
    const items = plan.flatMap(dayPlan =>
        dayPlan.places
            .filter(p => p.id != null && !isNaN(Number(p.id)))
            .map((p, idx) => ({
                place_id: Number(p.id),
                day_number: dayPlan.day,
                order_index: idx,
            }))
    );

    const totalPlaces = plan.reduce((s, d) => s + d.places.length, 0);
    const totalHours = Math.round(plan.reduce((s, d) => s + d.totalHours, 0) * 10) / 10;
    const totalDistance = Math.round(plan.reduce((s, d) => s + d.totalDistance, 0) * 10) / 10;
    const totalBudget = plan.reduce((s, d) => s + d.budget, 0);

    const stats = {
        totalPlaces,
        avgPlacesPerDay: Math.round((totalPlaces / Math.max(days, 1)) * 10) / 10,
        uniqueCategories: [...new Set(plan.flatMap(d => d.places.map(p => p.category)).filter(Boolean))],
        totalBudget,
        totalDistance,
        totalHours,
        transitLegs: plan.reduce((s, d) => s + (d.transitLegs || 0), 0),
        unscheduledCount: unscheduled.length,
        dayBreakdown: plan.map(d => ({
            day: d.day,
            date: d.date,
            placeCount: d.places.length,
            hours: d.totalHours,
            distanceKm: d.totalDistance,
            endTime: d.endTime,
        })),
    };

    return { plan, totalHours, totalDistance, totalBudget, items, stats, unscheduled };
}

function isLeisureStop(name) {
    const normalized = String(name).toLocaleLowerCase('tr-TR');
    return /piknik|mesire|mesire yeri|rekreasyon alanı|kamp alanı|kamping/.test(normalized);
}

function selectRealisticTripPlaces(places, days, selectionMode, maxStopsPerDay = 4) {
    const maxStops = Math.max(days * maxStopsPerDay, days);
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
    // Manuel seçimde kullanıcının seçtiği yerler sayıyla kırpılmaz; sığmayanlar
    // zaman çizelgesi aşamasında raporlanır.
    if (selectionMode === 'manual') return pool;

    const categoryUse = new Map();
    const ranked = [...pool].sort((a, b) => {
        const popularity = (b.popularity_score ?? 50) - (a.popularity_score ?? 50);
        if (popularity !== 0) return popularity;
        return (a.duration_minutes ?? 60) - (b.duration_minutes ?? 60);
    });
    const chosen = [];
    const perCategoryLimit = Math.max(2, Math.ceil(maxStops / 3));

    // Aynı tip küçük noktalarla tekdüze bir günü doldurmak yerine kategori
    // çeşitliliğini korur; ikinci turda gerekirse kalan yüksek puanlı yerleri ekler.
    for (const place of ranked) {
        const category = normalized(place.category) || 'diğer';
        if ((categoryUse.get(category) || 0) >= perCategoryLimit) continue;
        chosen.push(place);
        categoryUse.set(category, (categoryUse.get(category) || 0) + 1);
        if (chosen.length === maxStops) return chosen;
    }
    for (const place of ranked) {
        if (chosen.includes(place)) continue;
        chosen.push(place);
        if (chosen.length === maxStops) break;
    }
    return chosen;
}

const emptyResult = (days, ctx, selectionMode = 'manual') => {
    const plan = Array.from({ length: Math.max(days, 1) }, (_, i) => ({
        day: i + 1,
        date: ctx?.tripStart ? toLocalISODate(addDays(ctx.tripStart, i)) : null,
        places: [],
        breaks: [],
        totalHours: 0,
        totalDistance: 0,
        budget: 0,
    }));
    if (ctx) plan[0].tripMeta = buildTripMeta(ctx, selectionMode, {}, []);
    return {
        plan,
        totalHours: 0, totalDistance: 0, totalBudget: 0, items: [], unscheduled: [], conflicts: [],
        stats: { totalPlaces: 0, avgPlacesPerDay: 0, uniqueCategories: [], totalBudget: 0, totalDistance: 0, unscheduledCount: 0 },
    };
};

/**
 * Mevcut bir yer yerine alternatif önerir.
 * Kategori uyumu ve mesafe yakınlığına göre en iyi adayı seçer.
 */
export const suggestAlternative = (allPlaces, usedPlaceIds, category, lat, lng) => {
    if (!allPlaces?.length) return null;

    const used = new Set(usedPlaceIds.map(String));
    const candidates = allPlaces.filter(p => !used.has(String(p.id)));

    if (candidates.length === 0) return null;

    // Aynı kategoriden tercih et, yoksa hepsine bak
    const sameCategory = candidates.filter(p => p.category === category);
    const pool = sameCategory.length > 0 ? sameCategory : candidates;

    // Konum varsa en yakını seç; çok uzaktaki (>15 km) aynı kategori yerine
    // yakındaki farklı kategoriden bir yer daha kullanışlıdır.
    if (lat && lng) {
        const ref = { latitude: lat, longitude: lng };
        const byDistance = (list) => list
            .filter(p => p.lat && p.lng)
            .map(p => ({ ...p, _dist: haversineDistance(ref, { latitude: p.lat, longitude: p.lng }) }))
            .sort((a, b) => a._dist - b._dist);

        const scored = byDistance(pool);
        if (scored.length > 0 && scored[0]._dist <= 15) return scored[0];
        const nearbyAny = byDistance(candidates);
        if (nearbyAny.length > 0 && nearbyAny[0]._dist <= 15) return nearbyAny[0];
        if (scored.length > 0) return scored[0];
    }

    // Konum yoksa popülerliğe göre
    return [...pool].sort((a, b) => (b.popularity_score ?? 50) - (a.popularity_score ?? 50))[0] || null;
};

