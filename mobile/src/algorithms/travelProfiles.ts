/**
 * travelProfiles.ts — Ulaşım modu ve gezi temposu profilleri
 *
 * Ücretli rota API'si kullanmadan gerçekçi süre tahmini için her ulaşım
 * modunun ortalama hızı, kuş uçuşu → gerçek yol katsayısı ve sabit bekleme
 * süresi (park etme, durak bekleme) burada tanımlanır.
 */

export type TransportMode = 'walking' | 'transit' | 'driving';
export type TripPace = 'relaxed' | 'balanced' | 'intense';

export interface TransportProfile {
  key: TransportMode;
  label: string;
  description: string;
  icon: string;           // Ionicons adı
  speedKmph: number;      // Şehir içi ortalama hız
  roadFactor: number;     // Kuş uçuşu mesafeyi gerçek yola çeviren katsayı
  overheadMinutes: number; // Park etme / durak bekleme gibi sabit süre
  minLegMinutes: number;  // En kısa bacak süresi
  googleMode: 'walking' | 'transit' | 'driving';
}

export interface PaceProfile {
  key: TripPace;
  label: string;
  description: string;
  icon: string;
  startTime: string;      // "HH:mm"
  dayEndHour: number;     // Ondalıklı saat (18.5 = 18:30)
  maxStopsPerDay: number;
  lunchMinutes: number;
}

export const TRANSPORT_PROFILES: Record<TransportMode, TransportProfile> = {
  walking: {
    key: 'walking',
    label: 'Yürüyerek',
    description: 'Uzun mesafelerde toplu taşıma önerilir',
    icon: 'walk-outline',
    speedKmph: 4.5,
    roadFactor: 1.3,
    overheadMinutes: 0,
    minLegMinutes: 3,
    googleMode: 'walking',
  },
  transit: {
    key: 'transit',
    label: 'Toplu taşıma',
    description: 'Otobüs, tramvay, metro, dolmuş',
    icon: 'bus-outline',
    speedKmph: 18,
    roadFactor: 1.4,
    overheadMinutes: 10,
    minLegMinutes: 8,
    googleMode: 'transit',
  },
  driving: {
    key: 'driving',
    label: 'Araçla',
    description: 'Kendi aracınız veya kiralık araç',
    icon: 'car-outline',
    speedKmph: 25,
    roadFactor: 1.4,
    overheadMinutes: 8,
    minLegMinutes: 5,
    googleMode: 'driving',
  },
};

export const PACE_PROFILES: Record<TripPace, PaceProfile> = {
  relaxed: {
    key: 'relaxed',
    label: 'Sakin',
    description: 'Günde 3 durak, geç başlangıç',
    icon: 'cafe-outline',
    startTime: '10:00',
    dayEndHour: 18,
    maxStopsPerDay: 3,
    lunchMinutes: 75,
  },
  balanced: {
    key: 'balanced',
    label: 'Dengeli',
    description: 'Günde 4 durak, rahat tempo',
    icon: 'walk-outline',
    startTime: '09:00',
    dayEndHour: 18.5,
    maxStopsPerDay: 4,
    lunchMinutes: 60,
  },
  intense: {
    key: 'intense',
    label: 'Yoğun',
    description: 'Günde 6 durağa kadar, erken başlangıç',
    icon: 'flash-outline',
    startTime: '08:30',
    dayEndHour: 19.5,
    maxStopsPerDay: 6,
    lunchMinutes: 45,
  },
};

// Yürüyerek gezen biri bu mesafeden uzun bir bacakta pratikte taksi/toplu
// taşımaya biner. Bacağı toplu taşıma ile hesaplamak, 6 km'lik "yürüyüşü"
// 80 dakikalık bir plan maddesine çevirmekten daha dürüsttür.
const MAX_WALKING_LEG_KM = 2.5;
const MIN_RIDE_LEG_KM = 0.5;

export function getTransportProfile(mode?: string | null): TransportProfile {
  return TRANSPORT_PROFILES[(mode as TransportMode)] ?? TRANSPORT_PROFILES.transit;
}

export function getPaceProfile(pace?: string | null): PaceProfile {
  return PACE_PROFILES[(pace as TripPace)] ?? PACE_PROFILES.balanced;
}

export interface LegEstimate {
  minutes: number;
  roadDistanceKm: number;
  mode: TransportMode;
}

/**
 * İki durak arasındaki bacağın süresini seçilen ulaşım moduna göre tahmin eder.
 * @param straightDistanceKm - Haversine (kuş uçuşu) mesafe
 */
export function estimateLeg(straightDistanceKm: number, mode?: string | null): LegEstimate {
  let profile = getTransportProfile(mode);
  if (profile.key === 'walking' && straightDistanceKm > MAX_WALKING_LEG_KM) {
    profile = TRANSPORT_PROFILES.transit;
  } else if (profile.key !== 'walking' && straightDistanceKm < MIN_RIDE_LEG_KM) {
    // Birkaç yüz metre için araca binilmez veya durak beklenmez.
    profile = TRANSPORT_PROFILES.walking;
  }

  const roadDistanceKm = straightDistanceKm * profile.roadFactor;
  const movingMinutes = (roadDistanceKm / profile.speedKmph) * 60;
  const minutes = Math.max(Math.ceil(movingMinutes + profile.overheadMinutes), profile.minLegMinutes);

  return { minutes, roadDistanceKm, mode: profile.key };
}
