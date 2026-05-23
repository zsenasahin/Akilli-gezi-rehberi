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

/** Bellek içi önbellek (In-memory storage) — Async olmayan, anlık erişim için. */
const inMemoryCache = new Map();

/** Tek bir cache kaydını okur, süresi geçmişse null döner */
const get = async (key) => {
    if (!key) return null;
    try {
        // 1. Önce belleğe bak (L1 Cache) — En hızlısı
        if (inMemoryCache.has(key)) {
            const { data, expiresAt } = inMemoryCache.get(key);
            if (Date.now() < expiresAt) return data;
            inMemoryCache.delete(key);
        }

        // 2. Bellekte yoksa AsyncStorage'a bak (L2 Cache)
        const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
        if (!raw) return null;
        const { data, expiresAt } = JSON.parse(raw);
        if (Date.now() > expiresAt) return null;

        // 3. Bulunduysa belleğe de yaz (L1'e al)
        inMemoryCache.set(key, { data, expiresAt });
        return data;
    } catch {
        return null;
    }
};

const set = async (key, data, ttlMinutes = DEFAULT_TTL_MIN) => {
    if (!key) return;
    try {
        const expiresAt = Date.now() + ttlMinutes * 60 * 1000;
        const entry = {
            data,
            expiresAt,
            createdAt: Date.now(),
        };

        // 1. Belleğe yaz
        inMemoryCache.set(key, entry);

        // 2. Diske yaz
        await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
    } catch (error) {
        console.warn('Cache write failed:', error);
        // Eğer disk doluysa cache'i temizle (SQLite_Full error)
        if (error.message?.includes('full') || error.code === '13' || error.message?.includes('quota')) {
            console.log('Storage limit reached, clearing old cache...');
            await clear();
            // Tekrar dene (sadece bir kez)
            try {
                const expiresAt = Date.now() + ttlMinutes * 60 * 1000;
                const entry = { data, expiresAt, createdAt: Date.now() };
                await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
            } catch { }
        }
    }
};

/** Süresi geçmiş olsa bile son kayıtlı veriyi döndürür. Ağ hatalarında yedek olarak kullanılır. */
const getStale = async (key) => {
    if (!key) return null;
    try {
        if (inMemoryCache.has(key)) {
            return inMemoryCache.get(key).data ?? null;
        }

        const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
        if (!raw) return null;
        const entry = JSON.parse(raw);
        if (entry?.data !== undefined) {
            inMemoryCache.set(key, entry);
            return entry.data;
        }
        return null;
    } catch {
        return null;
    }
};

/** Belirli bir anahtarı temizle */
const invalidate = async (key) => {
    try {
        inMemoryCache.delete(key);
        await AsyncStorage.removeItem(CACHE_PREFIX + key);
    } catch { /* ignore */ }
};

/** sgr_cache_ ön eki olan tüm cache'i temizle */
const clear = async () => {
    try {
        inMemoryCache.clear();
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

export const cache = { get, getStale, set, invalidate, clear, fetch, getMeta };

// ─── TTL Sabitleri (okunabilirlik için) ───────────────────────────────────────
export const TTL = {
    SHORT: 5,         // 5 dakika  (hava durumu vb.)
    MEDIUM: 60,        // 1 saat    (POI, restoran)
    LONG: 24 * 60,   // 24 saat   (şehirler, yerler)
    WEEK: 7 * 24 * 60, // 1 hafta (nadiren değişen içerik)
};
