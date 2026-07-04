// ═══════════════════════════════════════════════════════════════════
// SmartTravelGuide — Supabase Edge Function Algorithms (v3)
// Geliştirilmiş rota planlama: Duration-aware clustering, TSP 2-Opt,
// kapanış saati duyarlı timeline, gerçek mesafe hesabı
// ═══════════════════════════════════════════════════════════════════

export interface Coordinates {
  latitude: number;
  longitude: number;
}

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

export interface TimelineStop extends Place {
  arrivalTime: string;
  departureTime: string;
  isOverflow?: boolean;
  travelMinutesFromPrev?: number;
}

export interface TimelineResult {
  stops: TimelineStop[];
  overflowPlaces: Place[];
  totalDurationMinutes: number;
  totalDistanceKm: number;
  endTime: string;
}

// ============================
// 1. HAVERSINE DISTANCE
// ============================
export function haversineDistance(start: Coordinates, end: Coordinates): number {
  const toRadian = (angle: number) => (Math.PI / 180) * angle;
  const distance = (a: number, b: number) => (Math.PI / 180) * (a - b);
  const RADIUS_OF_EARTH_IN_KM = 6371;

  const dLat = distance(end.latitude, start.latitude);
  const dLon = distance(end.longitude, start.longitude);

  const lat1 = toRadian(start.latitude);
  const lat2 = toRadian(end.latitude);

  const a =
    Math.pow(Math.sin(dLat / 2), 2) +
    Math.pow(Math.sin(dLon / 2), 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.asin(Math.sqrt(a));

  return RADIUS_OF_EARTH_IN_KM * c;
}

// ============================
// 2. SMART DURATION ESTIMATION
// ============================
interface DurationRule {
  keywords: string[];
  hours: number;
  closingHour?: number;
}

const DURATION_RULES: DurationRule[] = [
  { keywords: ['antik kent', 'ören yeri', 'arkeolojik'],   hours: 3.0, closingHour: 19 },
  { keywords: ['açık hava müzesi'],                         hours: 3.0, closingHour: 17 },
  { keywords: ['milli park', 'millî park', 'tabiat parkı'], hours: 3.0, closingHour: 20 },
  { keywords: ['tema park', 'lunapark', 'akvaryum'],        hours: 3.0 },
  { keywords: ['saray'],                                    hours: 2.5, closingHour: 17 },
  { keywords: ['arkeoloji müzesi', 'ulusal müze'],          hours: 2.5, closingHour: 17 },
  { keywords: ['kale', 'hisar', 'kalesi'],                  hours: 2.0, closingHour: 19 },
  { keywords: ['kanyon', 'vadi'],                            hours: 2.0, closingHour: 19 },
  { keywords: ['plaj', 'sahil', 'kumsal'],                   hours: 2.5, closingHour: 20 },
  { keywords: ['göl', 'gölü'],                              hours: 2.0, closingHour: 20 },
  { keywords: ['ada', 'adası'],                              hours: 3.0 },
  { keywords: ['kapalıçarşı', 'çarşı', 'bazaar'],           hours: 2.0, closingHour: 19 },
  { keywords: ['müze', 'müzesi', 'galeri'],                  hours: 1.5, closingHour: 17 },
  { keywords: ['sarnıç', 'cistern'],                         hours: 1.0, closingHour: 18 },
  { keywords: ['kervansaray', 'medrese'],                     hours: 1.0, closingHour: 18 },
  { keywords: ['mağara', 'mağarası'],                        hours: 1.5, closingHour: 18 },
  { keywords: ['şelale', 'şelalesi'],                        hours: 1.5, closingHour: 19 },
  { keywords: ['hamam', 'hamamı'],                            hours: 1.5 },
  { keywords: ['höyük'],                                      hours: 1.0, closingHour: 18 },
  { keywords: ['kilise'],                                     hours: 1.0, closingHour: 17 },
  { keywords: ['cami', 'camii', 'camisi'],                   hours: 0.5, closingHour: 20 },
  { keywords: ['türbe', 'külliye', 'tekke'],                 hours: 0.5, closingHour: 18 },
  { keywords: ['park', 'bahçe', 'parkı'],                    hours: 1.0, closingHour: 20 },
  { keywords: ['kule', 'kulesi'],                             hours: 1.0, closingHour: 19 },
  { keywords: ['köşk'],                                       hours: 1.0, closingHour: 17 },
  { keywords: ['han', 'hanı'],                                hours: 0.75, closingHour: 18 },
  { keywords: ['köprü', 'köprüsü'],                          hours: 0.3 },
  { keywords: ['çeşme', 'çeşmesi'],                          hours: 0.25 },
  { keywords: ['anıt', 'heykel', 'abide'],                   hours: 0.3 },
  { keywords: ['saat kulesi'],                                hours: 0.25 },
  { keywords: ['meydan', 'meydanı'],                          hours: 0.3 },
];

function normalizeTR(str: string): string {
  return str.toLowerCase()
    .replace(/İ/g, 'i').replace(/I/g, 'ı').replace(/Ğ/g, 'ğ')
    .replace(/Ü/g, 'ü').replace(/Ş/g, 'ş').replace(/Ö/g, 'ö').replace(/Ç/g, 'ç');
}

export function estimateDuration(name: string, category?: string): number {
  const n = normalizeTR(name);
  for (const rule of DURATION_RULES) {
    for (const kw of rule.keywords) {
      if (n.includes(normalizeTR(kw))) return rule.hours;
    }
  }
  const defaults: Record<string, number> = {
    'müze': 1.5, 'tarihi': 1.5, 'dini': 0.5, 'doğa': 1.5,
    'park': 1.0, 'alışveriş': 1.5, 'restoran': 1.5, 'kafe': 0.75, 'eğlence': 2.0,
  };
  return (category ? defaults[category] : undefined) ?? 1.0;
}

export function estimateClosingHour(name: string, category?: string): number {
  const n = normalizeTR(name);
  for (const rule of DURATION_RULES) {
    if (!rule.closingHour) continue;
    for (const kw of rule.keywords) {
      if (n.includes(normalizeTR(kw))) return rule.closingHour;
    }
  }
  const defaults: Record<string, number> = {
    'müze': 17, 'tarihi': 19, 'dini': 20, 'doğa': 20, 'park': 20,
    'alışveriş': 22, 'restoran': 23, 'kafe': 22, 'eğlence': 23,
  };
  return (category ? defaults[category] : undefined) ?? 20;
}

// ============================
// 3. CLUSTERING (Duration-Aware K-Means)
// ============================
const DAY_START_HOUR = 9;
const DAY_END_HOUR = 20;
const MAX_DAY_MINUTES = (DAY_END_HOUR - DAY_START_HOUR) * 60;
const AVG_TRAVEL_MINUTES = 25;
const BALANCE_TOLERANCE = 0.25;
const MAX_REBALANCE_ITER = 50;

function clusterDuration(places: Place[]): number {
  if (places.length === 0) return 0;
  let total = places.reduce((s, p) => s + (p.duration_minutes || 60), 0);
  total += Math.max(0, places.length - 1) * AVG_TRAVEL_MINUTES;
  return total;
}

export function balancePlacesIntoDays(places: Place[], totalDays: number): DayCluster[] {
  if (places.length === 0) return [];
  if (totalDays <= 1) {
    return [{ dayIndex: 1, places: [...places], totalDurationMinutes: clusterDuration(places) }];
  }

  // Phase 1: K-Means init — Furthest First Traversal
  let centers: Coordinates[] = [places[0]];
  for (let i = 1; i < totalDays; i++) {
    let maxDist = -1;
    let furthest = places[0];
    for (const p of places) {
      if (centers.some(c => c.latitude === p.latitude && c.longitude === p.longitude)) continue;
      const minD = Math.min(...centers.map(c => haversineDistance(p, c)));
      if (minD > maxDist) { maxDist = minD; furthest = p; }
    }
    centers.push(furthest);
  }

  // Phase 1b: K-Means iterations
  let assignments = new Array(places.length).fill(-1);
  for (let iter = 0; iter < 20; iter++) {
    let changed = false;
    for (let i = 0; i < places.length; i++) {
      let best = -1, minD = Infinity;
      for (let c = 0; c < totalDays; c++) {
        const d = haversineDistance(places[i], centers[c]);
        if (d < minD) { minD = d; best = c; }
      }
      if (assignments[i] !== best) { assignments[i] = best; changed = true; }
    }
    if (!changed) break;
    for (let c = 0; c < totalDays; c++) {
      const ap = places.filter((_, i) => assignments[i] === c);
      if (ap.length > 0) {
        centers[c] = {
          latitude: ap.reduce((s, p) => s + p.latitude, 0) / ap.length,
          longitude: ap.reduce((s, p) => s + p.longitude, 0) / ap.length,
        };
      }
    }
  }

  let clusters: DayCluster[] = Array.from({ length: totalDays }, (_, i) => ({
    dayIndex: i + 1, places: [], totalDurationMinutes: 0,
  }));
  for (let i = 0; i < places.length; i++) {
    const c = assignments[i];
    if (c >= 0 && c < totalDays) clusters[c].places.push(places[i]);
  }
  for (const cl of clusters) cl.totalDurationMinutes = clusterDuration(cl.places);

  // Phase 2: Duration rebalancing
  for (let iter = 0; iter < MAX_REBALANCE_ITER; iter++) {
    const sorted = [...clusters].sort((a, b) => b.totalDurationMinutes - a.totalDurationMinutes);
    const heaviest = sorted[0];
    const lightest = sorted[sorted.length - 1];
    const ratio = heaviest.totalDurationMinutes / Math.max(lightest.totalDurationMinutes, 1);
    if (ratio <= 1 + BALANCE_TOLERANCE) break;
    const timeDiff = heaviest.totalDurationMinutes - lightest.totalDurationMinutes;
    const overBudget = heaviest.totalDurationMinutes > MAX_DAY_MINUTES;
    if (timeDiff < 30 && !overBudget) break;
    if (heaviest.places.length <= 1) break;

    const lightCenter: Coordinates = lightest.places.length > 0
      ? { latitude: lightest.places.reduce((s, p) => s + p.latitude, 0) / lightest.places.length,
          longitude: lightest.places.reduce((s, p) => s + p.longitude, 0) / lightest.places.length }
      : centers[lightest.dayIndex - 1];

    let bestIdx = -1, bestScore = -Infinity;
    for (let i = 0; i < heaviest.places.length; i++) {
      const p = heaviest.places[i];
      const dist = lightest.places.length === 0
        ? haversineDistance(p, { latitude: heaviest.places.reduce((s, x) => s + x.latitude, 0) / heaviest.places.length,
                                 longitude: heaviest.places.reduce((s, x) => s + x.longitude, 0) / heaviest.places.length })
        : haversineDistance(p, lightCenter);
      const prox = 1 / (dist + 0.1);
      const dur = (p.duration_minutes || 60) / MAX_DAY_MINUTES;
      const score = prox * 0.6 + dur * 0.4;
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    }
    if (bestIdx === -1) break;
    lightest.places.push(heaviest.places.splice(bestIdx, 1)[0]);
    heaviest.totalDurationMinutes = clusterDuration(heaviest.places);
    lightest.totalDurationMinutes = clusterDuration(lightest.places);
  }

  // Phase 3: Sort by closing hour within each day
  for (const cl of clusters) {
    cl.places.sort((a, b) => (a.closing_hour ?? DAY_END_HOUR) - (b.closing_hour ?? DAY_END_HOUR));
  }

  return clusters;
}

// ============================
// 4. ROUTING (TSP — Nearest Neighbor + 2-Opt)
// ============================
export function optimizeRoute(startLocation: Coordinates, places: Place[], returnToStart: boolean = false): Place[] {
  if (places.length === 0) return [];
  if (places.length === 1) return places;

  // Nearest Neighbor
  let unvisited = [...places];
  let currentLoc = startLocation;
  let route: Place[] = [];
  while (unvisited.length > 0) {
    let nearestIdx = -1, minD = Infinity;
    for (let i = 0; i < unvisited.length; i++) {
      const d = haversineDistance(currentLoc, unvisited[i]);
      if (d < minD) { minD = d; nearestIdx = i; }
    }
    route.push(unvisited[nearestIdx]);
    currentLoc = unvisited[nearestIdx];
    unvisited.splice(nearestIdx, 1);
  }

  // 2-Opt
  let improvement = true;
  while (improvement) {
    improvement = false;
    for (let i = 0; i < route.length - 1; i++) {
      for (let k = i + 1; k < route.length; k++) {
        const newRoute = [...route.slice(0, i), ...route.slice(i, k + 1).reverse(), ...route.slice(k + 1)];
        if (calcRouteDist(startLocation, newRoute, returnToStart) < calcRouteDist(startLocation, route, returnToStart)) {
          route = newRoute;
          improvement = true;
        }
      }
    }
  }
  return route;
}

function calcRouteDist(start: Coordinates, route: Place[], ret: boolean): number {
  let total = 0, loc = start;
  for (const p of route) { total += haversineDistance(loc, p); loc = p; }
  if (ret) total += haversineDistance(loc, start);
  return total;
}

// ============================
// 5. TIMELINE (Kapanış Saati Duyarlı)
// ============================
export function generateTimeline(
  route: Place[],
  startTime: string = "09:00",
  avgSpeedKmph: number = 15,
  dayEndHour: number = 20
): TimelineResult {
  if (route.length === 0) {
    return { stops: [], overflowPlaces: [], totalDurationMinutes: 0, totalDistanceKm: 0, endTime: startTime };
  }

  const dayEndMinutes = dayEndHour * 60;
  const stops: TimelineStop[] = [];
  const overflowPlaces: Place[] = [];
  let currentMinutes = parseTime(startTime);
  let totalDistKm = 0;
  const startMin = currentMinutes;

  for (let i = 0; i < route.length; i++) {
    const place = route[i];
    const duration = place.duration_minutes || 60;

    let travelMins = 0;
    if (i > 0) {
      const dist = haversineDistance(route[i - 1], place);
      totalDistKm += dist;
      travelMins = Math.max(Math.ceil((dist * 1.4 / avgSpeedKmph) * 60), 5);
      currentMinutes += travelMins;
    }

    const closingMin = (place.closing_hour ?? dayEndHour) * 60;
    const effectiveEnd = Math.min(dayEndMinutes, closingMin);

    if (currentMinutes >= effectiveEnd) {
      overflowPlaces.push(place);
      continue;
    }

    let actualDur = duration;
    if (currentMinutes + duration > effectiveEnd) {
      actualDur = Math.max(effectiveEnd - currentMinutes, 15);
    }

    stops.push({
      ...place,
      arrivalTime: minsToTime(currentMinutes),
      departureTime: minsToTime(currentMinutes + actualDur),
      isOverflow: false,
      travelMinutesFromPrev: i === 0 ? 0 : travelMins,
    });
    currentMinutes += actualDur;
  }

  return {
    stops,
    overflowPlaces,
    totalDurationMinutes: currentMinutes - startMin,
    totalDistanceKm: totalDistKm,
    endTime: minsToTime(currentMinutes),
  };
}

function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function minsToTime(m: number): string {
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
