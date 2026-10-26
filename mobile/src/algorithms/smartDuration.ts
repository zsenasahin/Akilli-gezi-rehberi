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
  // Piknik ve mesire alanları "bir durak daha" değildir: ulaşım, yerleşme ve
  // gün batımına kadar kalma davranışı yüzünden yarım günlük planlanırlar.
  { keywords: ['piknik', 'mesire', 'mesire yeri', 'rekreasyon alanı'], hours: 4.5, closingHour: 21 },
  { keywords: ['kamp alanı', 'kamping'], hours: 4.0, closingHour: 21 },
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
  { keywords: ['adası', 'adaları', 'adalar'], hours: 3.0 },
  { keywords: ['kapalıçarşı', 'çarşı', 'bazaar'], hours: 2.0, closingHour: 19 },

  // ─── Orta ziyaretler (1-2 saat) ────────────────────────────
  { keywords: ['müze', 'müzesi', 'galeri'],   hours: 1.5, closingHour: 17 },
  { keywords: ['sarnıç', 'sarnıcı', 'cistern'], hours: 1.0, closingHour: 18 },
  { keywords: ['kervansaray', 'medrese'],      hours: 1.0, closingHour: 18 },
  { keywords: ['mağara', 'mağarası'],         hours: 1.5, closingHour: 18 },
  { keywords: ['şelale', 'şelalesi'],         hours: 1.5, closingHour: 19 },
  { keywords: ['hamam', 'hamamı'],            hours: 1.5 },
  { keywords: ['höyük'],                       hours: 1.0, closingHour: 18 },
  { keywords: ['kilise'],                      hours: 1.0, closingHour: 17 },

  // ─── Kısa-orta ziyaretler (0.5-1 saat) ────────────────────
  // "Saat kulesi" genel "kule" kuralından önce gelmeli; ilk eşleşen kazanır.
  { keywords: ['saat kulesi'],                 hours: 0.25 },
  { keywords: ['cami', 'camii', 'camisi'],    hours: 0.5, closingHour: 20 },
  { keywords: ['türbe', 'külliye', 'tekke'],  hours: 0.5, closingHour: 18 },
  { keywords: ['park', 'bahçe', 'parkı'],     hours: 1.0, closingHour: 20 },
  { keywords: ['kule', 'kulesi', 'kızkulesi'], hours: 1.0, closingHour: 19 },
  { keywords: ['köşk'],                       hours: 1.0, closingHour: 17 },
  { keywords: ['han', 'hanı'],                hours: 0.75, closingHour: 18 },

  // ─── Kısa ziyaretler (< 30 dk) ────────────────────────────
  { keywords: ['köprü', 'köprüsü'],           hours: 0.3 },
  { keywords: ['çeşme', 'çeşmesi'],           hours: 0.25 },
  { keywords: ['anıt', 'heykel', 'abide'],    hours: 0.3 },
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
 * Türkçe karakterleri koruyarak küçük harfe çevirir.
 * `toLowerCase()` "İ" harfini "i̇" (i + birleşik nokta) yaptığı ve "I" harfini
 * "ı" yerine "i" yaptığı için dönüşüm, küçültmeden ÖNCE yapılmalıdır.
 * Noktalama boşluğa çevrilir ki kelime başı eşleştirme çalışsın.
 */
function normalizeTR(str: string): string {
  return String(str || '')
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLowerCase()
    .replace(/[^a-zçğıöşüâîû0-9]+/g, ' ')
    .trim();
}

/**
 * Anahtar kelime, yer adındaki bir kelimenin başında geçmelidir.
 * "kale" → "Rumeli Kalesi" eşleşir; "han" → "Cihangir" eşleşmez.
 */
function matchesKeyword(normalizedName: string, keyword: string): boolean {
  return (' ' + normalizedName).includes(' ' + normalizeTR(keyword));
}

function findRule(name: string, predicate: (rule: DurationRule) => boolean = () => true): DurationRule | undefined {
  const normalizedName = normalizeTR(name);
  return DURATION_RULES.find(rule =>
    predicate(rule) && rule.keywords.some(keyword => matchesKeyword(normalizedName, keyword))
  );
}

/**
 * Akıllı gezi süresi tahmini.
 *
 * @param name - Yer adı (ör: "Topkapı Sarayı")
 * @param category - Kategori (ör: "tarihi", "müze", "doğa")
 * @returns Tahmini ziyaret süresi (saat cinsinden, ondalıklı)
 */
export function estimateDuration(name: string, category?: string): number {
  const rule = findRule(name);
  if (rule) return rule.hours;

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
 * @returns Kapanış saati (24 saat formatında, ör: 17 = 17:00).
 */
export function estimateClosingHour(name: string, category?: string): number {
  const rule = findRule(name, candidate => candidate.closingHour !== undefined);
  if (rule?.closingHour !== undefined) return rule.closingHour;

  // Kategori bazlı
  if (category) {
    return DEFAULT_CLOSING_HOURS[category] ?? 20;
  }

  return 20; // Varsayılan: akşam 20:00
}

// Açık hava yerleri (ören yerleri, doğa alanları) kış aylarında gün ışığına
// bağlı olarak erken kapanır. Bakanlık ören yerlerinde kış tarifesi ~17:30'dur.
const OUTDOOR_KEYWORDS = [
  'antik kent', 'ören yeri', 'arkeolojik', 'milli park', 'millî park', 'tabiat parkı',
  'şelale', 'şelalesi', 'plaj', 'sahil', 'kumsal', 'göl', 'gölü', 'mesire', 'piknik',
  'kanyon', 'kanyonu', 'vadi', 'vadisi', 'kale', 'kalesi', 'hisar', 'höyük',
];
const WINTER_MONTHS = new Set([10, 11, 0, 1]); // Kasım, Aralık, Ocak, Şubat (0 tabanlı)
const WINTER_OUTDOOR_CLOSING = 17.5;

export function isOutdoorPlace(name: string, category?: string): boolean {
  if (category === 'doğa' || category === 'park') return true;
  const normalizedName = normalizeTR(name);
  return OUTDOOR_KEYWORDS.some(keyword => matchesKeyword(normalizedName, keyword));
}

/**
 * Mevsime göre kapanış saatini düzeltir.
 * @param month - 0 tabanlı ay (Date#getMonth)
 */
export function adjustClosingHourForSeason(closingHour: number, name: string, category: string | undefined, month?: number | null): number {
  if (month == null || !WINTER_MONTHS.has(month)) return closingHour;
  if (!isOutdoorPlace(name, category)) return closingHour;
  return Math.min(closingHour, WINTER_OUTDOOR_CLOSING);
}
