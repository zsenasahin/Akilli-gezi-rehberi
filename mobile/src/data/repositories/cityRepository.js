import { supabase } from '../../config/supabase';
import { cache, TTL } from '../../services/cacheService';
import { normalizeImageUrl } from '../../utils/imageUrl';

/**
 * CityRepository – `cities` tablosu okuma işlemleri.
 * Tüm GET işlemleri cache katmanı üzerinden geçer (offline destek).
 */

export const getCities = async (forceRefresh = false) => {
    const CACHE_KEY = 'cities_all';
    const cached = !forceRefresh ? await cache.get(CACHE_KEY) : null;

    const { data, error } = await supabase
        .from('cities')
        .select('*')
        .order('name', { ascending: true });

    if (!error && data) {
        const normalized = data.map(city => ({
            ...city,
            image_url: normalizeImageUrl(city.image_url),
            hero_image_url: normalizeImageUrl(city.hero_image_url || city.image_url),
        }));
        await cache.set(CACHE_KEY, normalized, TTL.LONG);
        return { data: normalized, error: null, fromCache: false };
    }

    // Ağ hatası varsa cache ile devam et (offline/fallback).
    if (cached?.length) {
        return { data: cached, error: null, fromCache: true };
    }

    return { data: data || [], error, fromCache: false };
};

export const getCityById = async (cityId) => {
    const CACHE_KEY = `city_${cityId}`;
    const cached = await cache.get(CACHE_KEY);
    if (cached) return { data: cached, error: null };
    const { data, error } = await supabase
        .from('cities')
        .select('*')
        .eq('id', cityId)
        .single();
    if (data) await cache.set(CACHE_KEY, data, TTL.LONG);
    return { data, error };
};
