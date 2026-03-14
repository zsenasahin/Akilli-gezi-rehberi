import { supabase } from '../../config/supabase';
import { cache, TTL } from '../../services/cacheService';

/**
 * CityRepository – `cities` tablosu okuma işlemleri.
 * Tüm GET işlemleri cache katmanı üzerinden geçer (offline destek).
 */

export const getCities = async (forceRefresh = false) => {
    const CACHE_KEY = 'cities_all';
    if (!forceRefresh) {
        const cached = await cache.get(CACHE_KEY);
        if (cached) return { data: cached, error: null, fromCache: true };
    }
    const { data, error } = await supabase
        .from('cities')
        .select('*')
        .order('name', { ascending: true });
    if (data) await cache.set(CACHE_KEY, data, TTL.LONG);
    return { data, error, fromCache: false };
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
