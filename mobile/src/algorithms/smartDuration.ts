/**
 * smartDuration.ts — Kategori ve anahtar kelime bazlı akıllı gezi süresi tahmini
 *
 * Yer adı ve kategorisine bakarak gerçekçi bir ziyaret süresi (saat cinsinden) döndürür.
 * Veri setinde `avg_duration` bilgisi yoksa veya sabit 1 ise bu fonksiyon devreye girer.
 */

// ─── Kapanış saati sabitleri (varsayılan) ─────────────────────────────────────
export const DEFAULT_CLOSING_HOURS: Record<string, number> = {
  'müze': 17,       // 17:00
  'tarihi': 19,     // 19:00 (ören yerleri genel)
  'dini': 20,       // 20:00 (camiler)
  'doğa': 20,       // 20:00 (gün batımına kadar)
  'park': 20,       // 20:00
  'alışveriş': 22,  // 22:00
  'restoran': 23,   // 23:00
  'kafe': 22,       // 22:00
  'eğlence': 23,    // 23:00
};

// ─── Keyword-based duration rules (saat cinsinden) ─────────────────────────────
// Önem sırasına göre — ilk eşleşen kazanır
interface DurationRule {
  keywords: string[];
  hours: number;
  closingHour?: number; // Opsiyonel: bu tür yer için kapanış saati
}

const DURATION_RULES: DurationRule[] = [
  // ─── Uzun ziyaretler (3+ saat) ─────────────────────────────
  { keywords: ['antik kent', 'ören yeri', 'arkeolojik'],   hours: 3.0, closingHour: 19 },
  { keywords: ['açık hava müzesi'],                         hours: 3.0, closingHour: 17 },
  { keywords: ['milli park', 'millî park', 'tabiat parkı'], hours: 3.0, closingHour: 20 },
  { keywords: ['tema park', 'lunapark', 'akvaryum', 'aqualand'], hours: 3.0 },

  // ─── Orta-uzun ziyaretler (2-3 saat) ───────────────────────
  { keywords: ['saray'], hours: 2.5, closingHour: 17 },
  { keywords: ['arkeoloji müzesi', 'ulusal müze', 'büyük müze'], hours: 2.5, closingHour: 17 },
  { keywords: ['kale', 'hisar', 'kalesi'],   hours: 2.0, closingHour: 19 },
  { keywords: ['kanyon', 'vadi'],             hours: 2.0, closingHour: 19 },
  { keywords: ['plaj', 'sahil', 'kumsal'],    hours: 2.5, closingHour: 20 },
  { keywords: ['göl', 'gölü'],               hours: 2.0, closingHour: 20 },
  { keywords: ['ada', 'adası'],               hours: 3.0 },
  { keywords: ['kapalıçarşı', 'çarşı', 'bazaar'], hours: 2.0, closingHour: 19 },

  // ─── Orta ziyaretler (1-2 saat) ────────────────────────────
  { keywords: ['müze', 'müzesi', 'galeri'],   hours: 1.5, closingHour: 17 },
  { keywords: ['sarnıç', 'cistern'],          hours: 1.0, closingHour: 18 },
  { keywords: ['kervansaray', 'medrese'],      hours: 1.0, closingHour: 18 },
  { keywords: ['mağara', 'mağarası'],         hours: 1.5, closingHour: 18 },
  { keywords: ['şelale', 'şelalesi'],         hours: 1.5, closingHour: 19 },
  { keywords: ['hamam', 'hamamı'],            hours: 1.5 },
  { keywords: ['höyük'],                       hours: 1.0, closingHour: 18 },
  { keywords: ['kilise'],                      hours: 1.0, closingHour: 17 },

  // ─── Kısa-orta ziyaretler (0.5-1 saat) ────────────────────
  { keywords: ['cami', 'camii', 'camisi'],    hours: 0.5, closingHour: 20 },
  { keywords: ['türbe', 'külliye', 'tekke'],  hours: 0.5, closingHour: 18 },
  { keywords: ['park', 'bahçe', 'parkı'],     hours: 1.0, closingHour: 20 },
  { keywords: ['kule', 'kulesi'],             hours: 1.0, closingHour: 19 },
  { keywords: ['köşk'],                       hours: 1.0, closingHour: 17 },
  { keywords: ['han', 'hanı'],                hours: 0.75, closingHour: 18 },

  // ─── Kısa ziyaretler (< 30 dk) ────────────────────────────
  { keywords: ['köprü', 'köprüsü'],           hours: 0.3 },
  { keywords: ['çeşme', 'çeşmesi'],           hours: 0.25 },
  { keywords: ['anıt', 'heykel', 'abide'],    hours: 0.3 },
  { keywords: ['saat kulesi'],                 hours: 0.25 },
  { keywords: ['meydan', 'meydanı'],           hours: 0.3 },
];

// Kategori bazlı varsayılan süreler (keyword eşleşmezse)
const CATEGORY_DEFAULT_HOURS: Record<string, number> = {
  'müze':      1.5,
  'tarihi':    1.5,
  'dini':      0.5,
  'doğa':      1.5,
  'park':      1.0,
  'alışveriş': 1.5,
  'restoran':  1.5,
  'kafe':      0.75,
  'eğlence':   2.0,
};

const GLOBAL_DEFAULT_HOURS = 1.0;

/**
 * Normalize Turkish characters for case-insensitive matching.
 */
function normalizeTR(str: string): string {
  return str
    .toLowerCase()
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı') // I → ı (Türkçe)
    .replace(/Ğ/g, 'ğ')
    .replace(/Ü/g, 'ü')
    .replace(/Ş/g, 'ş')
    .replace(/Ö/g, 'ö')
    .replace(/Ç/g, 'ç');
}

/**
 * Akıllı gezi süresi tahmini.
 *
 * @param name - Yer adı (ör: "Topkapı Sarayı")
 * @param category - Kategori (ör: "tarihi", "müze", "doğa")
 * @returns Tahmini ziyaret süresi (saat cinsinden, ondalıklı)
 */
export function estimateDuration(name: string, category?: string): number {
  const normalizedName = normalizeTR(name);

  // Keyword eşleştirmesi (ilk eşleşen kazanır)
  for (const rule of DURATION_RULES) {
    for (const keyword of rule.keywords) {
      if (normalizedName.includes(normalizeTR(keyword))) {
        return rule.hours;
      }
    }
  }

  // Kategori bazlı varsayılan
  if (category) {
    return CATEGORY_DEFAULT_HOURS[category] ?? GLOBAL_DEFAULT_HOURS;
  }

  return GLOBAL_DEFAULT_HOURS;
}

/**
 * Yer için tahmini kapanış saatini döndürür.
 *
 * @param name - Yer adı
 * @param category - Kategori
 * @returns Kapanış saati (24 saat formatında, ör: 17 = 17:00). null ise bilinmiyor.
 */
export function estimateClosingHour(name: string, category?: string): number {
  const normalizedName = normalizeTR(name);

  // Keyword eşleştirmesi
  for (const rule of DURATION_RULES) {
    if (rule.closingHour === undefined) continue;
    for (const keyword of rule.keywords) {
      if (normalizedName.includes(normalizeTR(keyword))) {
        return rule.closingHour;
      }
    }
  }

  // Kategori bazlı
  if (category) {
    return DEFAULT_CLOSING_HOURS[category] ?? 20;
  }

  return 20; // Varsayılan: akşam 20:00
}
