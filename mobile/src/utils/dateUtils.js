/**
 * dateUtils.js — Yerel saat dilimine göre tarih yardımcıları.
 *
 * `new Date('2026-10-23')` UTC gece yarısı olarak yorumlanır ve
 * `toISOString()` UTC tarih döndürür. Türkiye (UTC+3) için bu, gece 00:00–03:00
 * arasında "bugün"ün dün görünmesine yol açar. Plan tarihleri bu yüzden her
 * zaman yerel bileşenlerle üretilir.
 */

export const TR_MONTHS = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];
export const TR_DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

const pad = (value) => String(value).padStart(2, '0');

/** Date → "YYYY-MM-DD" (yerel) */
export const toLocalISODate = (date = new Date()) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** "YYYY-MM-DD" → yerel gece yarısı Date. Geçersizse null. */
export const parseLocalDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
    if (!match) return null;
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};

export const addDays = (date, amount) => {
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    next.setDate(next.getDate() + amount);
    return next;
};

/** İki "YYYY-MM-DD" arasındaki gün sayısı (iki uç dahil). */
export const countDaysInclusive = (start, end) => {
    const startDate = parseLocalDate(start);
    const endDate = parseLocalDate(end || start);
    if (!startDate || !endDate) return 0;
    return Math.round((endDate - startDate) / 86400000) + 1;
};

/** "23 Ekim" */
export const formatDayMonth = (value) => {
    const date = parseLocalDate(value);
    return date ? `${date.getDate()} ${TR_MONTHS[date.getMonth()]}` : '';
};

/** "23 Ekim Cuma" */
export const formatDayMonthWeekday = (value) => {
    const date = parseLocalDate(value);
    return date ? `${date.getDate()} ${TR_MONTHS[date.getMonth()]} ${TR_DAYS[date.getDay()]}` : '';
};
