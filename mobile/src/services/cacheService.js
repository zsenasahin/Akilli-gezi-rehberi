/**
 * cacheService.js — AsyncStorage tabanlı offline veri önbelleği
 *
 * Kullanım:
 *   await cache.set('cities', data, 24 * 60)   // 24 saat canlı
 *   const data = await cache.get('cities')      // null döner süresi geldiyse
 *   await cache.invalidate('cities')            // zorla temizle
 *
 * TTL: dakika cinsinden
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'sgr_cache_';
const DEFAULT_TTL_MIN = 60; // 1 saat

/** Tek bir cache kaydını okur, süresi geçmişse null döner */
const get = async (key) => {
    try {
        const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
        if (!raw) return null;
        const { data, expiresAt } = JSON.parse(raw);
        if (Date.now() > expiresAt) {
            // Süresi dolmuş — arka planda sil
            AsyncStorage.removeItem(CACHE_PREFIX + key).catch(() => { });
            return null;
        }
        return data;
    } catch {
        return null;
    }
};

/** Veriyi cache'e yaz, ttlMinutes dakika sonra geçersiz say */
const set = async (key, data, ttlMinutes = DEFAULT_TTL_MIN) => {
    try {
        const entry = {
            data,
            expiresAt: Date.now() + ttlMinutes * 60 * 1000,
            createdAt: Date.now(),
        };
        await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
    } catch {
        // Storage dolu olabilir, sessizce geç
    }
};

/** Belirli bir anahtarı temizle */
const invalidate = async (key) => {
    try {
        await AsyncStorage.removeItem(CACHE_PREFIX + key);
    } catch { /* ignore */ }
};

/** sgr_cache_ ön eki olan tüm cache'i temizle */
const clear = async () => {
    try {
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
        if (cacheKeys.length > 0) await AsyncStorage.multiRemove(cacheKeys);
    } catch { /* ignore */ }
};

/**
 * Cache-or-fetch wrapper:
 * Cache'de varsa döner, yoksa fetchFn çağırır, sonucu cache'e yazar.
 *
 * @param {string} key
 * @param {() => Promise<any>} fetchFn
 * @param {number} [ttlMinutes]
 * @returns {Promise<any>}
 */
const fetch = async (key, fetchFn, ttlMinutes = DEFAULT_TTL_MIN) => {
    const cached = await get(key);
    if (cached !== null) return cached;
    const data = await fetchFn();
    if (data !== null && data !== undefined) {
        await set(key, data, ttlMinutes);
    }
    return data;
};

/** Cache meta bilgisi (oluşturulma zamanı, sona erme zamanı) */
const getMeta = async (key) => {
    try {
        const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
        if (!raw) return null;
        const { expiresAt, createdAt } = JSON.parse(raw);
        return {
            createdAt: new Date(createdAt).toLocaleString('tr-TR'),
            expiresAt: new Date(expiresAt).toLocaleString('tr-TR'),
            isExpired: Date.now() > expiresAt,
            remainingMin: Math.max(0, Math.round((expiresAt - Date.now()) / 60000)),
        };
    } catch {
        return null;
    }
};

export const cache = { get, set, invalidate, clear, fetch, getMeta };

// ─── TTL Sabitleri (okunabilirlik için) ───────────────────────────────────────
export const TTL = {
    SHORT: 5,         // 5 dakika  (hava durumu vb.)
    MEDIUM: 60,        // 1 saat    (POI, restoran)
    LONG: 24 * 60,   // 24 saat   (şehirler, yerler)
    WEEK: 7 * 24 * 60, // 1 hafta (nadiren değişen içerik)
};
