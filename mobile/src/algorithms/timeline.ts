import { Coordinates, haversineDistance } from './haversine';
import { Place } from './clustering';
import { estimateLeg, TransportMode } from './travelProfiles';

export interface TimelineStop extends Place {
  arrivalTime: string; // HH:mm
  departureTime: string; // HH:mm
  isOverflow?: boolean; // Günlük sınırı aştı mı
  travelMinutesFromPrev?: number; // Önceki duraktan ulaşım süresi
  travelDistanceKmFromPrev?: number; // Önceki duraktan tahmini yol mesafesi
  travelModeFromPrev?: TransportMode; // Bu bacakta kullanılan ulaşım modu
}

export interface TimelineBreak {
  type: 'lunch';
  startTime: string;
  endTime: string;
  afterIndex: number; // Hangi duraktan sonra (-1: ilk duraktan önce)
}

export interface TimelineResult {
  stops: TimelineStop[];
  breaks: TimelineBreak[];
  overflowPlaces: Place[]; // Güne sığmayan yerler
  totalDurationMinutes: number; // Gerçek toplam süre (ulaşım dahil)
  totalDistanceKm: number; // Tahmini toplam yol mesafesi
  totalTravelMinutes: number; // Toplam yolda geçen süre
  endTime: string; // Son duraktan ayrılış saati
}

export interface TimelineOptions {
  startTime?: string;        // "HH:mm"
  dayEndHour?: number;       // Ondalıklı saat (18.5 = 18:30)
  transportMode?: TransportMode;
  startLocation?: Coordinates;
  returnToStart?: boolean;   // Günün sonunda başlangıç noktasına dönüş süresi eklensin mi
  lunchMinutes?: number;     // 0 → öğle arası yok
}

// Öğle arası penceresi: 12:30'dan sonra ilk uygun boşlukta verilir. 15:00'ten
// sonra ara vermek gerçekçi olmadığı için o saatten sonra atlanır.
const LUNCH_EARLIEST = 12 * 60 + 30;
const LUNCH_SOFT_START = 12 * 60;
const LUNCH_SOFT_END = 14 * 60;
const LUNCH_LATEST = 15 * 60;

/**
 * Sıralı rota için zaman çizelgesi üretir.
 * Günlük bitiş saatine, kapanış saatlerine, ulaşım moduna ve öğle arasına uyar.
 */
export function generateTimeline(route: Place[], options: TimelineOptions = {}): TimelineResult {
  const {
    startTime = '09:00',
    dayEndHour = 20,
    transportMode = 'transit',
    startLocation,
    returnToStart = false,
    lunchMinutes = 60,
  } = options;

  if (route.length === 0) {
    return {
      stops: [], breaks: [], overflowPlaces: [], totalDurationMinutes: 0,
      totalDistanceKm: 0, totalTravelMinutes: 0, endTime: startTime,
    };
  }

  const dayEndMinutes = Math.round(dayEndHour * 60);
  const stops: TimelineStop[] = [];
  const breaks: TimelineBreak[] = [];
  const overflowPlaces: Place[] = [];
  const startMinutes = parseTimeToMinutes(startTime);
  let currentMinutes = startMinutes;
  let totalDistanceKm = 0;
  let totalTravelMinutes = 0;
  let lunchTaken = lunchMinutes <= 0;
  let previousLocation: Coordinates | undefined = startLocation;

  const takeLunchIfDue = (nextVisitMinutes: number) => {
    if (lunchTaken || currentMinutes > LUNCH_LATEST) return;
    const lunchWindowOpen = currentMinutes >= LUNCH_EARLIEST;
    // Uzun bir ziyaret öğle saatini tamamen kapatacaksa önce yemek molası verilir.
    const nextVisitBlocksLunch = currentMinutes >= LUNCH_SOFT_START
      && currentMinutes + nextVisitMinutes > LUNCH_SOFT_END;
    if (!lunchWindowOpen && !nextVisitBlocksLunch) return;

    breaks.push({
      type: 'lunch',
      startTime: minutesToTime(currentMinutes),
      endTime: minutesToTime(currentMinutes + lunchMinutes),
      afterIndex: stops.length - 1,
    });
    currentMinutes += lunchMinutes;
    lunchTaken = true;
  };

  for (const place of route) {
    const duration = place.duration_minutes || 60;

    // Ulaşım (ilk durak için konaklama/başlangıç konumundan)
    let travelMins = 0;
    let travelDistKm = 0;
    let travelMode: TransportMode | undefined;
    if (previousLocation) {
      const leg = estimateLeg(haversineDistance(previousLocation, place), transportMode);
      travelMins = leg.minutes;
      travelDistKm = leg.roadDistanceKm;
      travelMode = leg.mode;
    }

    const minutesBeforeThisStop = currentMinutes;
    const lunchCountBefore = breaks.length;
    takeLunchIfDue(travelMins + duration);

    // Piknik/mesire gibi uzun açık-hava duraklarını sabahın ilk saatine
    // sıkıştırma. Bekleme, günün toplam süresine dürüstçe dahil edilir.
    let arrivalMinutes = currentMinutes + travelMins;
    const preferredStartHour = (place as any).preferred_start_hour;
    if (preferredStartHour && arrivalMinutes < preferredStartHour * 60) {
      arrivalMinutes = preferredStartHour * 60;
    }

    const closingHour = (place as any).closing_hour;
    const effectiveEndLimit = closingHour > 0
      ? Math.min(dayEndMinutes, Math.round(closingHour * 60))
      : dayEndMinutes;

    // Kapanışa kadar anlamlı bir ziyaret süresi kalmıyorsa durak bugüne sığmaz.
    // 3 saatlik bir antik kenti kapanıştan 15 dk önce "ziyaret edilmiş" saymak
    // planı kağıt üzerinde mümkün ama gerçekte işe yaramaz hâle getirir.
    const minimumUsefulVisit = Math.min(duration, Math.max(30, Math.round(duration * 0.5)));
    if (arrivalMinutes + minimumUsefulVisit > effectiveEndLimit) {
      overflowPlaces.push(place);
      // Bu durak için verilen öğle arası geri alınır; sıradaki durakta yeniden değerlendirilir.
      if (breaks.length > lunchCountBefore) {
        breaks.pop();
        lunchTaken = false;
      }
      currentMinutes = minutesBeforeThisStop;
      continue;
    }

    const actualDuration = Math.min(duration, effectiveEndLimit - arrivalMinutes);
    currentMinutes = arrivalMinutes + actualDuration;
    totalDistanceKm += travelDistKm;
    totalTravelMinutes += travelMins;
    previousLocation = place;

    stops.push({
      ...place,
      arrivalTime: minutesToTime(arrivalMinutes),
      departureTime: minutesToTime(currentMinutes),
      isOverflow: false,
      travelMinutesFromPrev: travelMins,
      travelDistanceKmFromPrev: Math.round(travelDistKm * 10) / 10,
      travelModeFromPrev: travelMode,
    });
  }

  // Günün ortasında hiç uygun boşluk olmadıysa ve gün 12:30'u geçtiyse son
  // duraktan sonra yemek molası önerilir (gün sonu hesabına eklenmez).
  if (!lunchTaken && stops.length > 0 && currentMinutes >= LUNCH_EARLIEST && currentMinutes <= LUNCH_LATEST) {
    breaks.push({
      type: 'lunch',
      startTime: minutesToTime(currentMinutes),
      endTime: minutesToTime(currentMinutes + lunchMinutes),
      afterIndex: stops.length - 1,
    });
  }

  if (returnToStart && startLocation && stops.length > 0) {
    const back = estimateLeg(haversineDistance(stops[stops.length - 1], startLocation), transportMode);
    totalDistanceKm += back.roadDistanceKm;
    totalTravelMinutes += back.minutes;
  }

  return {
    stops,
    breaks,
    overflowPlaces,
    totalDurationMinutes: currentMinutes - startMinutes,
    totalDistanceKm,
    totalTravelMinutes,
    endTime: minutesToTime(currentMinutes),
  };
}

export function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours * 60) + (minutes || 0);
}

export function minutesToTime(totalMinutes: number): string {
  const rounded = Math.round(totalMinutes);
  const hours = Math.floor(rounded / 60) % 24;
  const minutes = rounded % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
