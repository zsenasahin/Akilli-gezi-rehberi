import { Coordinates, haversineDistance } from './haversine';

export interface Place extends Coordinates {
  id: string;
  name: string;
  duration_minutes?: number;
  closing_hour?: number;
}

export interface DayCluster {
  dayIndex: number;
  places: Place[];
  totalDurationMinutes: number;
}

// ─── Sabitler ─────────────────────────────────────────────────────────────────
const DAY_START_HOUR = 9;             // 09:00
const DAY_END_HOUR = 18;              // Günün kalanını yemek/dinlenme için bırak
const MAX_DAY_MINUTES = (DAY_END_HOUR - DAY_START_HOUR) * 60; // 540 dakika
const AVG_TRAVEL_MINUTES = 25;        // Yerler arası ortalama ulaşım süresi
const BALANCE_TOLERANCE = 0.25;       // ±%25 tolerans
const MAX_REBALANCE_ITER = 50;        // Maksimum dengeleme iterasyonu
// Süreyi eşitlemek uğruna aynı semtteki durakları farklı günlere dağıtmak,
// pratikte en pahalı hatadır. Bu değer kasıtlı olarak küçük tutulur: daha uzak
// bir durağın başka bir güne taşınması ancak o günün kümesine gerçekten yakınsa
// mümkündür.
const GEO_REBALANCE_SLACK = 1.35;

/**
 * Bir cluster'ın toplam ziyaret süresini hesaplar (ulaşım dahil).
 */
function clusterDuration(places: Place[]): number {
  if (places.length === 0) return 0;
  let total = 0;
  for (const p of places) {
    total += (p.duration_minutes || 60);
  }
  // Yerler arası tahmini ulaşım: (yer sayısı - 1) × ortalama
  total += Math.max(0, places.length - 1) * AVG_TRAVEL_MINUTES;
  return total;
}

/**
 * Bir cluster'daki en erken kapanış saatini döndürür (gündeki son yer kapanmadan bitirilmeli).
 */
function clusterEndLimit(places: Place[]): number {
  let earliest = DAY_END_HOUR * 60;
  for (const p of places) {
    if (p.closing_hour !== undefined && p.closing_hour > 0) {
      const closingMinutes = p.closing_hour * 60;
      // Kapanış saatinden önce ziyarete başlamış olmalı
      if (closingMinutes < earliest) {
        earliest = closingMinutes;
      }
    }
  }
  return earliest;
}

/**
 * Distributes places into N days considering:
 * 1. Geographical proximity (K-Means clustering)
 * 2. Duration balance (each day ≈ equal total visit time)
 * 3. Daily time budget (max ~11 hours with travel)
 * 4. Closing hours (museums close at 17:00, etc.)
 *
 * Algorithm:
 * Phase 1: K-Means to create geographically coherent clusters
 * Phase 2: Duration-aware rebalancing between overloaded and underloaded days
 */
export function balancePlacesIntoDays(places: Place[], totalDays: number): DayCluster[] {
  if (places.length === 0) return [];
  if (totalDays <= 1) {
    return [{
      dayIndex: 1,
      places: [...places],
      totalDurationMinutes: clusterDuration(places),
    }];
  }

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 1: K-Means Geographical Clustering
  // ═══════════════════════════════════════════════════════════════════

  // 1a. Initialize centers using Furthest First Traversal
  let centers: Coordinates[] = [];
  centers.push(places[0]);

  for (let i = 1; i < totalDays; i++) {
    let maxDist = -1;
    let furthestPlace = places[0];

    for (const place of places) {
      if (centers.some(c => c.latitude === place.latitude && c.longitude === place.longitude)) continue;

      let minCenterDist = Infinity;
      for (const center of centers) {
        const d = haversineDistance(place, center);
        if (d < minCenterDist) minCenterDist = d;
      }

      if (minCenterDist > maxDist) {
        maxDist = minCenterDist;
        furthestPlace = place;
      }
    }
    centers.push(furthestPlace);
  }

  // 1b. K-Means iterations
  const MAX_KMEANS_ITER = 20;
  let assignments = new Array(places.length).fill(-1);

  for (let iter = 0; iter < MAX_KMEANS_ITER; iter++) {
    let changed = false;

    // Assign each place to the closest center
    for (let i = 0; i < places.length; i++) {
      let closestCenterIdx = -1;
      let minDistance = Infinity;

      for (let c = 0; c < totalDays; c++) {
        const dist = haversineDistance(places[i], centers[c]);
        if (dist < minDistance) {
          minDistance = dist;
          closestCenterIdx = c;
        }
      }

      if (assignments[i] !== closestCenterIdx) {
        assignments[i] = closestCenterIdx;
        changed = true;
      }
    }

    if (!changed) break;

    // Recalculate centers
    for (let c = 0; c < totalDays; c++) {
      const assignedPlaces = places.filter((_, idx) => assignments[idx] === c);
      if (assignedPlaces.length > 0) {
        const avgLat = assignedPlaces.reduce((sum, p) => sum + p.latitude, 0) / assignedPlaces.length;
        const avgLng = assignedPlaces.reduce((sum, p) => sum + p.longitude, 0) / assignedPlaces.length;
        centers[c] = { latitude: avgLat, longitude: avgLng };
      }
    }
  }

  // Build initial clusters
  let clusters: DayCluster[] = Array.from({ length: totalDays }, (_, i) => ({
    dayIndex: i + 1,
    places: [],
    totalDurationMinutes: 0,
  }));

  for (let i = 0; i < places.length; i++) {
    const cIdx = assignments[i];
    if (cIdx >= 0 && cIdx < totalDays) {
      clusters[cIdx].places.push(places[i]);
    }
  }

  // Update durations
  for (const cluster of clusters) {
    cluster.totalDurationMinutes = clusterDuration(cluster.places);
  }

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 2: Duration-Aware Rebalancing
  // ═══════════════════════════════════════════════════════════════════

  const targetDuration = places.reduce((sum, p) => sum + (p.duration_minutes || 60), 0) / totalDays
    + (Math.ceil(places.length / totalDays) - 1) * AVG_TRAVEL_MINUTES;

  for (let iter = 0; iter < MAX_REBALANCE_ITER; iter++) {
    // Günleri süreye göre sırala
    const sorted = [...clusters].sort((a, b) => b.totalDurationMinutes - a.totalDurationMinutes);
    const heaviest = sorted[0];
    const lightest = sorted[sorted.length - 1];

    // Dengelenmiş mi kontrol et
    const ratio = heaviest.totalDurationMinutes / Math.max(lightest.totalDurationMinutes, 1);
    if (ratio <= 1 + BALANCE_TOLERANCE) break;

    // Ayrıca günlük bütçeyi aşıp aşmadığını kontrol et
    const overBudget = heaviest.totalDurationMinutes > MAX_DAY_MINUTES;
    const timeDiff = heaviest.totalDurationMinutes - lightest.totalDurationMinutes;
    if (timeDiff < 30 && !overBudget) break; // 30 dakikadan az fark varsa bırak

    // En ağır cluster'dan, en hafif cluster'ın merkezine en yakın yeri bul.
    // Ancak sadece süre dengesi için coğrafi kümeyi parçalama. Örneğin aynı
    // sahildeki üç durak bir gün olarak kalmalı; tek başına uzaktaki iki durak
    // diğer günleri oluşturmalıdır.
    if (heaviest.places.length <= 1) break; // Tek yer varsa taşıyamayız

    const lightCenter: Coordinates = {
      latitude: lightest.places.reduce((s, p) => s + p.latitude, 0) / Math.max(lightest.places.length, 1),
      longitude: lightest.places.reduce((s, p) => s + p.longitude, 0) / Math.max(lightest.places.length, 1),
    };

    // Eğer hafif cluster boşsa, ağır cluster'ın en uzak elemanını al
    let bestMoveIdx = -1;
    let bestScore = -Infinity;

    for (let i = 0; i < heaviest.places.length; i++) {
      const place = heaviest.places[i];
      const placeDuration = (place.duration_minutes || 60) + AVG_TRAVEL_MINUTES;

      // Taşıma skoru: süre katkısı × mesafe yakınlığı
      let distToLight: number;
      if (lightest.places.length === 0) {
        // Boş cluster'a taşıyoruz — ağır cluster merkezinden en uzak olanı seç
        const heavyCenter: Coordinates = {
          latitude: heaviest.places.reduce((s, p) => s + p.latitude, 0) / heaviest.places.length,
          longitude: heaviest.places.reduce((s, p) => s + p.longitude, 0) / heaviest.places.length,
        };
        distToLight = haversineDistance(place, heavyCenter); // Merkezden uzak = iyi
      } else {
        distToLight = haversineDistance(place, lightCenter);
      }

      const remainingInHeavy = heaviest.places.filter((_, index) => index !== i);
      const nearestInHeavy = remainingInHeavy.length
        ? Math.min(...remainingInHeavy.map(other => haversineDistance(place, other)))
        : Infinity;
      // Boş gün oluştururken yalnızca kümenin uçtaki gerçek outlier'ı taşınır.
      // Dolu bir güne taşımada ise aday, hedef güne kendi mevcut komşularından
      // belirgin biçimde daha uzak olmamalıdır.
      const geographicallyCompatible = lightest.places.length === 0
        ? distToLight >= nearestInHeavy
        : distToLight <= nearestInHeavy * GEO_REBALANCE_SLACK;
      if (!geographicallyCompatible) continue;

      // Yakın yerler ve büyük süreler daha iyi adaylar
      const proximityScore = 1 / (distToLight + 0.1);
      const durationScore = placeDuration / MAX_DAY_MINUTES;
      const score = proximityScore * 0.6 + durationScore * 0.4;

      // Taşıma sonrası ağır cluster hala en az 1 yere sahip olmalı
      if (score > bestScore) {
        bestScore = score;
        bestMoveIdx = i;
      }
    }

    if (bestMoveIdx === -1) break;

    // Taşı
    const movedPlace = heaviest.places.splice(bestMoveIdx, 1)[0];
    lightest.places.push(movedPlace);

    // Süreleri güncelle
    heaviest.totalDurationMinutes = clusterDuration(heaviest.places);
    lightest.totalDurationMinutes = clusterDuration(lightest.places);
  }

  // Coğrafi kümeler bazen tek bir semtteki durakların neredeyse tamamını aynı
  // güne atar (ör. 8 / 1 / 1). Kullanıcı üç gün seçtiğinde bu, rota kısa olsa
  // bile kullanılabilir bir plan değildir. Manuel seçilen duraklar günler
  // arasında mümkün olduğunca eşit sayıda dağıtılmalıdır; rota sırası daha
  // sonra her gün için TSP ile tekrar optimize edilir.
  rebalanceStopCounts(clusters);

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 3: Sort Places Within Each Day by Closing Hour
  // ═══════════════════════════════════════════════════════════════════
  // Kapanış saati erken olan yerler günün başına alınır

  for (const cluster of clusters) {
    cluster.places.sort((a, b) => {
      const closingA = a.closing_hour ?? DAY_END_HOUR;
      const closingB = b.closing_hour ?? DAY_END_HOUR;
      // Erken kapanan yerler önce ziyaret edilir
      return closingA - closingB;
    });
  }

  return clusters;
}

function rebalanceStopCounts(clusters: DayCluster[]): void {
  const totalStops = clusters.reduce((total, cluster) => total + cluster.places.length, 0);
  if (totalStops < clusters.length) return;

  // n durak, d gün => günler arasındaki sayı farkı en fazla bir olmalı.
  const maxPerDay = Math.ceil(totalStops / clusters.length);
  const minPerDay = Math.floor(totalStops / clusters.length);

  for (let iteration = 0; iteration < totalStops; iteration++) {
    const source = [...clusters].sort((a, b) => b.places.length - a.places.length)[0];
    const target = [...clusters].sort((a, b) => a.places.length - b.places.length)[0];
    if (!source || !target || source.places.length <= maxPerDay || target.places.length >= minPerDay) break;

    const sourceCenter: Coordinates = {
      latitude: source.places.reduce((sum, place) => sum + place.latitude, 0) / source.places.length,
      longitude: source.places.reduce((sum, place) => sum + place.longitude, 0) / source.places.length,
    };
    const targetCenter: Coordinates | null = target.places.length
      ? {
        latitude: target.places.reduce((sum, place) => sum + place.latitude, 0) / target.places.length,
        longitude: target.places.reduce((sum, place) => sum + place.longitude, 0) / target.places.length,
      }
      : null;

    // Kaynak kümenin dış sınırındaki ve mümkünse hedef kümeye daha yakın olan
    // durağı taşı. Böylece sayısal denge için gereksiz rota zigzagı azaltılır.
    let moveIndex = 0;
    let bestScore = -Infinity;
    source.places.forEach((place, index) => {
      const distanceFromSource = haversineDistance(place, sourceCenter);
      const distanceToTarget = targetCenter ? haversineDistance(place, targetCenter) : 0;
      const score = distanceFromSource - distanceToTarget * 0.35;
      if (score > bestScore) {
        bestScore = score;
        moveIndex = index;
      }
    });

    target.places.push(source.places.splice(moveIndex, 1)[0]);
    source.totalDurationMinutes = clusterDuration(source.places);
    target.totalDurationMinutes = clusterDuration(target.places);
  }
}
