/**
 * Plan motoru için hızlı doğrulama testleri.
 *
 * Çalıştırma:  npm run test:planner
 *
 * Algoritmalar React'tan bağımsız saf fonksiyonlar olduğu için Node üzerinde
 * doğrudan çalıştırılabilir. TS/ESM dönüşümü için devDependency olan
 * `sucrase` kullanılır.
 */
require('sucrase/register');

const test = require('node:test');
const assert = require('node:assert/strict');

const { generateItinerary, rescheduleDay, getTripMeta, estimateTotalBudget } = require('../src/domain/itineraryGenerator');
const { generateTimeline } = require('../src/algorithms/timeline');
const { estimateDuration, estimateClosingHour, adjustClosingHourForSeason } = require('../src/algorithms/smartDuration');
const { estimateLeg } = require('../src/algorithms/travelProfiles');
const { optimizeRoute, calculateTotalDistance } = require('../src/algorithms/tsp');

// İstanbul tarihi yarımada + Beyoğlu civarı örnek veri
const ISTANBUL = [
    { id: 1, name: 'Topkapı Sarayı', category: 'tarihi', lat: 41.0115, lng: 28.9834, popularity_score: 99 },
    { id: 2, name: 'Ayasofya Camii', category: 'dini', lat: 41.0086, lng: 28.9802, popularity_score: 98 },
    { id: 3, name: 'Yerebatan Sarnıcı', category: 'tarihi', lat: 41.0084, lng: 28.9779, popularity_score: 95 },
    { id: 4, name: 'İstanbul Arkeoloji Müzesi', category: 'müze', lat: 41.0117, lng: 28.9813, popularity_score: 90 },
    { id: 5, name: 'Galata Kulesi', category: 'tarihi', lat: 41.0256, lng: 28.9741, popularity_score: 94 },
    { id: 6, name: 'Dolmabahçe Sarayı', category: 'tarihi', lat: 41.0391, lng: 29.0001, popularity_score: 93 },
    { id: 7, name: 'Kapalıçarşı', category: 'alışveriş', lat: 41.0107, lng: 28.9681, popularity_score: 92 },
    { id: 8, name: 'Süleymaniye Camii', category: 'dini', lat: 41.0162, lng: 28.9639, popularity_score: 91 },
    { id: 9, name: 'Rumeli Hisarı', category: 'tarihi', lat: 41.0848, lng: 29.0566, popularity_score: 85 },
    { id: 10, name: 'Starbucks Taksim', category: 'kafe', lat: 41.0369, lng: 28.9850, popularity_score: 99 },
];
const HOTEL = { latitude: 41.0082, longitude: 28.9784 };

const toMinutes = (time) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

test('smartDuration: Türkçe büyük harf ve kelime başı eşleşme', () => {
    assert.equal(estimateDuration('İSTANBUL ARKEOLOJİ MÜZESİ', 'müze'), 2.5);
    assert.equal(estimateDuration('Yerebatan Sarnıcı', 'tarihi'), 1.0);
    // "han" kuralı "Cihangir" içinde tetiklenmemeli → kategori varsayılanı
    assert.equal(estimateDuration('Cihangir Parkı', 'park'), 1.0);
    assert.equal(estimateDuration('Adana Merkez', 'tarihi'), 1.5);
    // "saat kulesi" genel "kule" kuralından önce eşleşmeli
    assert.equal(estimateDuration('İzmir Saat Kulesi', 'tarihi'), 0.25);
    assert.equal(estimateClosingHour('Topkapı Sarayı', 'tarihi'), 17);
});

test('smartDuration: kışın açık hava yerleri erken kapanır', () => {
    assert.equal(adjustClosingHourForSeason(19, 'Efes Antik Kenti', 'tarihi', 11), 17.5);
    assert.equal(adjustClosingHourForSeason(19, 'Efes Antik Kenti', 'tarihi', 6), 19);
    assert.equal(adjustClosingHourForSeason(17, 'Topkapı Sarayı', 'tarihi', 11), 17);
});

test('travelProfiles: mod bazlı bacak süreleri', () => {
    const walk = estimateLeg(1, 'walking');
    const drive = estimateLeg(1, 'driving');
    assert.equal(walk.mode, 'walking');
    assert.ok(walk.minutes > drive.minutes, 'yürüyüş araçtan uzun sürmeli');
    // Uzun yürüyüş bacağı toplu taşımaya döner
    assert.equal(estimateLeg(6, 'walking').mode, 'transit');
    // Çok kısa bacakta araca binilmez
    assert.equal(estimateLeg(0.2, 'driving').mode, 'walking');
});

test('tsp: 2-Opt rota, en yakın komşudan uzun olamaz ve tüm yerleri içerir', () => {
    const places = ISTANBUL.slice(0, 9).map(p => ({ ...p, latitude: p.lat, longitude: p.lng }));
    const route = optimizeRoute(HOTEL, places, true);
    assert.equal(route.length, places.length);
    assert.deepEqual(new Set(route.map(p => p.id)), new Set(places.map(p => p.id)));
    const shuffled = [...places].reverse();
    assert.ok(calculateTotalDistance(HOTEL, route, true) <= calculateTotalDistance(HOTEL, shuffled, true) + 1e-9);
});

test('timeline: öğle arası verilir ve kapanış saatine uyulur', () => {
    const route = [
        { id: 'a', name: 'A', latitude: 41.0, longitude: 29.0, duration_minutes: 150, closing_hour: 19 },
        { id: 'b', name: 'B', latitude: 41.005, longitude: 29.0, duration_minutes: 120, closing_hour: 19 },
        { id: 'c', name: 'C Müzesi', latitude: 41.01, longitude: 29.0, duration_minutes: 90, closing_hour: 17 },
    ];
    const result = generateTimeline(route, { startTime: '09:00', dayEndHour: 18.5, transportMode: 'walking', lunchMinutes: 60 });
    assert.equal(result.breaks.length, 1, 'bir öğle arası olmalı');
    const lunchStart = toMinutes(result.breaks[0].startTime);
    assert.ok(lunchStart >= 12 * 60 && lunchStart <= 15 * 60);
    for (const stop of result.stops) {
        if (stop.closing_hour) assert.ok(toMinutes(stop.departureTime) <= stop.closing_hour * 60);
    }
});

test('timeline: kapanışa yetişmeyen uzun ziyaret taşar (15 dk ile geçiştirilmez)', () => {
    const route = [
        { id: 'a', name: 'A', latitude: 41.0, longitude: 29.0, duration_minutes: 420, closing_hour: 20 },
        { id: 'b', name: 'B Antik Kenti', latitude: 41.002, longitude: 29.0, duration_minutes: 180, closing_hour: 17 },
    ];
    const result = generateTimeline(route, { startTime: '09:00', dayEndHour: 18.5, lunchMinutes: 0 });
    assert.equal(result.stops.length, 1);
    assert.equal(result.overflowPlaces[0].id, 'b');
});

test('generateItinerary: otomatik mod, tempo ve yeme-içme filtresi', () => {
    const result = generateItinerary(ISTANBUL, 2, {
        startLocation: HOTEL,
        selectionMode: 'auto',
        transportMode: 'transit',
        pace: 'relaxed',
        startDate: '2026-10-23',
    });
    assert.equal(result.plan.length, 2);
    for (const day of result.plan) {
        assert.ok(day.places.length <= 3, 'sakin tempoda gün başı en fazla 3 durak');
        assert.ok(day.places.every(p => p.name !== 'Starbucks Taksim'), 'kafe rota durağı olmamalı');
        assert.ok(day.places.every(p => p.arrivalTime && p.departureTime));
    }
    assert.equal(result.plan[0].date, '2026-10-23');
    assert.equal(result.plan[1].date, '2026-10-24');
    const meta = getTripMeta(result.plan);
    assert.equal(meta.transportMode, 'transit');
    assert.equal(meta.pace, 'relaxed');
});

test('generateItinerary: manuel seçilen yerler sessizce kaybolmaz', () => {
    const selected = ISTANBUL.slice(0, 9);
    const result = generateItinerary(selected, 1, {
        startLocation: HOTEL,
        selectionMode: 'manual',
        transportMode: 'walking',
        pace: 'balanced',
        startDate: '2026-10-23',
    });
    const scheduledIds = result.plan.flatMap(d => d.places.map(p => p.id));
    const unscheduledIds = result.unscheduled.map(p => p.id);
    assert.equal(scheduledIds.length + unscheduledIds.length, selected.length,
        'her seçilen yer ya planda ya da "sığmadı" listesinde olmalı');
    assert.equal(new Set([...scheduledIds, ...unscheduledIds]).size, selected.length);
});

test('generateItinerary: yakın yerler aynı günde ve her gün kapanış saatlerine uygun', () => {
    const result = generateItinerary(ISTANBUL.slice(0, 9), 3, {
        startLocation: HOTEL,
        selectionMode: 'manual',
        transportMode: 'driving',
        pace: 'balanced',
        startDate: '2026-12-10',
        acceptCompromise: true,
    });
    const dayOf = (id) => result.plan.find(d => d.places.some(p => p.id === id))?.day;
    // Ayasofya, Yerebatan ve Topkapı birkaç yüz metre arayla: aynı gün
    assert.equal(dayOf(2), dayOf(3));
    assert.equal(dayOf(1), dayOf(2));
    for (const day of result.plan) {
        for (const stop of day.places) {
            assert.ok(toMinutes(stop.departureTime) <= stop.closing_hour * 60, `${stop.name} kapanıştan sonra bitiyor`);
        }
    }
});

// Kullanıcı senaryosu: A-B yakın, C-D-E başka bölgede ve bir güne sığmıyor, F piknik.
const SCENARIO = [
    { id: 'a', name: 'A Müzesi', category: 'müze', lat: 40.1830, lng: 29.0610, avg_duration: 1.5 },
    { id: 'b', name: 'B Camii', category: 'dini', lat: 40.1845, lng: 29.0640, avg_duration: 0.5 },
    { id: 'c', name: 'C Kalesi', category: 'tarihi', lat: 40.2100, lng: 29.1700, avg_duration: 2.5 },
    { id: 'd', name: 'D Saray', category: 'tarihi', lat: 40.2120, lng: 29.1740, avg_duration: 3 },
    { id: 'e', name: 'E Antik Kenti', category: 'tarihi', lat: 40.2080, lng: 29.1760, avg_duration: 3 },
    { id: 'f', name: 'F Piknik Alanı', category: 'doğa', lat: 40.1000, lng: 29.1200 },
];
const SCENARIO_OPTIONS = {
    startLocation: { latitude: 40.1880, longitude: 29.0600 },
    selectionMode: 'manual', transportMode: 'driving', startDate: '2026-10-23',
};

test('dayPlanner: piknik kendi gününde, yakın yerler birlikte, sığmayan bölge için soru sorulur', () => {
    const result = generateItinerary(SCENARIO, 3, SCENARIO_OPTIONS);
    const dayOf = (id) => result.plan.find(d => d.places.some(p => p.id === id))?.day;
    const picnicDay = result.plan.find(d => d.places.some(p => p.id === 'f'));
    assert.equal(picnicDay.places.length, 1, 'piknik günü başka durak almamalı');
    assert.equal(dayOf('a'), dayOf('b'), 'A ve B aynı gün');
    assert.ok(result.conflicts.some(c => c.type === 'overloaded_area'
        && ['c', 'd', 'e'].every(id => c.places.some(p => p.id === id))), 'C-D-E için karar noktası');
    assert.equal(result.unscheduled.length, 0);
});

test('dayPlanner: yoğun tempoda C-D-E tek güne sığar ve soru kalmaz', () => {
    const result = generateItinerary(SCENARIO, 3, { ...SCENARIO_OPTIONS, pace: 'intense' });
    const dayOf = (id) => result.plan.find(d => d.places.some(p => p.id === id))?.day;
    assert.equal(dayOf('c'), dayOf('d'));
    assert.equal(dayOf('d'), dayOf('e'));
    assert.equal(result.conflicts.length, 0);
});

test('dayPlanner: gün yetmezse sığmayan yerler raporlanır', () => {
    const result = generateItinerary(SCENARIO, 1, SCENARIO_OPTIONS);
    assert.ok(result.conflicts.length > 0);
    const placed = result.plan.flatMap(d => d.places.map(p => p.id));
    assert.equal(placed.length + result.unscheduled.length, SCENARIO.length);
});

test('rescheduleDay: kullanıcının sırasını korur, saatleri yeniden hesaplar', () => {
    const result = generateItinerary(ISTANBUL.slice(0, 6), 1, {
        startLocation: HOTEL, selectionMode: 'manual', transportMode: 'transit', startDate: '2026-10-23',
    });
    const day = result.plan[0];
    const withoutFirst = day.places.slice(1);
    const updated = rescheduleDay(withoutFirst, 1, {
        startLocation: HOTEL, transportMode: 'transit', pace: 'balanced', startDate: '2026-10-23',
    });
    assert.deepEqual(updated.places.map(p => p.id), withoutFirst.map(p => p.id));
    assert.equal(updated.date, '2026-10-23');
    assert.ok(updated.places[0].arrivalTime);
});

test('estimateTotalBudget: ulaşım moduna göre', () => {
    const driving = estimateTotalBudget({ distanceKm: 100, days: 1, transportMode: 'driving' });
    const walking = estimateTotalBudget({ distanceKm: 100, days: 1, transportMode: 'walking', transitLegs: 2 });
    assert.equal(driving.transport, 400);
    assert.equal(walking.transport, 60);
});
