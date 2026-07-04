import { Place } from './clustering';

export interface TimelineStop extends Place {
  arrivalTime: string; // HH:mm
  departureTime: string; // HH:mm
  isOverflow?: boolean; // Günlük sınırı aştı mı
  travelMinutesFromPrev?: number; // Önceki duraktan ulaşım süresi
}

export interface TimelineResult {
  stops: TimelineStop[];
  overflowPlaces: Place[]; // Güne sığmayan yerler
  totalDurationMinutes: number; // Gerçek toplam süre (ulaşım dahil)
  totalDistanceKm: number; // Gerçek toplam mesafe
  endTime: string; // Son duraktan ayrılış saati
}

// We need haversine to calculate travel time between stops
const { haversineDistance } = require('./haversine');

/**
 * Generates a time schedule based on the ordered route.
 * Respects daily time limits and closing hours.
 *
 * @param route - Ordered array of places
 * @param startTime - Start time string in "HH:mm" format (e.g. "09:00")
 * @param avgSpeedKmph - Average speed in km/h to calculate travel times
 * @param dayEndHour - Latest hour the day should end (e.g. 20 for 20:00)
 * @returns TimelineResult with stops, overflow info, and real statistics
 */
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
  let currentMinutes = parseTimeToMinutes(startTime);
  let totalDistanceKm = 0;
  const startMinutes = currentMinutes;

  for (let i = 0; i < route.length; i++) {
    const place = route[i];
    const duration = place.duration_minutes || 60;

    // Ulaşım süresi hesapla
    let travelMins = 0;
    let travelDistKm = 0;
    if (i > 0) {
      const prevPlace = route[i - 1];
      travelDistKm = haversineDistance(prevPlace, place);
      totalDistanceKm += travelDistKm;
      // Şehir içi mesafeyi 1.4x ile çarp (kuş uçuşu → gerçek yol oranı)
      const realDistKm = travelDistKm * 1.4;
      travelMins = Math.ceil((realDistKm / avgSpeedKmph) * 60);
      // Minimum 5 dakika ulaşım
      travelMins = Math.max(travelMins, 5);
      currentMinutes += travelMins;
    }

    // Kapanış saati kontrolü
    const closingHour = (place as any).closing_hour;
    let effectiveEndLimit = dayEndMinutes;
    if (closingHour !== undefined && closingHour > 0) {
      effectiveEndLimit = Math.min(dayEndMinutes, closingHour * 60);
    }

    // Ziyaretin bitiş saati
    const visitEndMinutes = currentMinutes + duration;

    // Güne sığıyor mu kontrol et
    // Eğer ziyaretin BAŞLANGIÇ saati kapanışı geçiyorsa → overflow
    if (currentMinutes >= effectiveEndLimit) {
      overflowPlaces.push(place);
      continue;
    }

    // Eğer ziyaret kapanış saatinden sonra bitecekse ama başlangıcı uygunsa,
    // süreyi kısalt (yer kapanana kadar kal)
    let actualDuration = duration;
    if (visitEndMinutes > effectiveEndLimit) {
      actualDuration = Math.max(effectiveEndLimit - currentMinutes, 15); // Minimum 15 dk
    }

    const arrivalTime = minutesToTime(currentMinutes);
    currentMinutes += actualDuration;
    const departureTime = minutesToTime(currentMinutes);

    stops.push({
      ...place,
      arrivalTime,
      departureTime,
      isOverflow: false,
      travelMinutesFromPrev: i === 0 ? 0 : travelMins,
    });
  }

  const totalDurationMinutes = currentMinutes - startMinutes;
  const endTime = minutesToTime(currentMinutes);

  return {
    stops,
    overflowPlaces,
    totalDurationMinutes,
    totalDistanceKm,
    endTime,
  };
}

function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours * 60) + minutes;
}

function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
