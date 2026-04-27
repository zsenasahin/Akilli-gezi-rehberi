import { supabase } from '../config/supabase';

/**
 * cityVisitService — Supabase `city_visits` tablosu CRUD işlemleri.
 *
 * Tablo şeması:
 *   id         uuid PRIMARY KEY
 *   user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE
 *   city_id    integer NOT NULL
 *   status     text CHECK (status IN ('visited', 'wishlist'))
 *   created_at timestamptz DEFAULT now()
 *   UNIQUE(user_id, city_id)
 */

/**
 * Kullanıcının tüm ziyaret kayıtlarını döndürür.
 * @param {string} userId
 * @returns {Promise<{ data: Array, error: any }>}
 */
export const getCityVisits = async (userId) => {
    if (!userId) return { data: [], error: null };
    const { data, error } = await supabase
        .from('city_visits')
        .select('*, cities(id, name, region)')
        .eq('user_id', userId);
    // cities join'den city_name'i düzleştir
    const normalized = (data || []).map(v => ({
        ...v,
        city_name: v.cities?.name || null,
        city_region: v.cities?.region || null,
    }));
    return { data: normalized, error };
};

/**
 * Tek şehir için ziyaret durumunu döndürür.
 * @param {string} userId
 * @param {number} cityId
 * @returns {Promise<{ status: 'visited'|'wishlist'|null, error: any }>}
 */
export const getCityVisitStatus = async (userId, cityId) => {
    if (!userId || !cityId) return { status: null, error: null };
    const { data, error } = await supabase
        .from('city_visits')
        .select('status')
        .eq('user_id', userId)
        .eq('city_id', cityId)
        .maybeSingle();
    return { status: data?.status ?? null, error };
};

/**
 * Ziyaret durumunu toggle eder.
 * - Aynı status ile çağrılırsa kaydı siler (toggle off → null)
 * - Farklı status ile çağrılırsa upsert yapar
 * @param {string} userId
 * @param {number} cityId
 * @param {'visited'|'wishlist'} newStatus
 * @returns {Promise<{ status: 'visited'|'wishlist'|null, error: any }>}
 */
export const toggleCityVisit = async (userId, cityId, newStatus) => {
    if (!userId || !cityId) return { status: null, error: new Error('userId ve cityId gerekli') };

    // Mevcut durumu kontrol et
    const { status: currentStatus, error: fetchError } = await getCityVisitStatus(userId, cityId);
    if (fetchError) return { status: null, error: fetchError };

    // Aynı status → toggle off (sil)
    if (currentStatus === newStatus) {
        const { error } = await supabase
            .from('city_visits')
            .delete()
            .eq('user_id', userId)
            .eq('city_id', cityId);
        return { status: null, error };
    }

    // Farklı status → upsert
    const { error } = await supabase
        .from('city_visits')
        .upsert(
            [{ user_id: userId, city_id: cityId, status: newStatus }],
            { onConflict: 'user_id,city_id' }
        );
    return { status: error ? null : newStatus, error };
};

/**
 * Kullanıcının ziyaret istatistiklerini döndürür.
 * @param {string} userId
 * @returns {Promise<{ visitedCount: number, wishlistCount: number, error: any }>}
 */
export const getCityVisitStats = async (userId) => {
    if (!userId) return { visitedCount: 0, wishlistCount: 0, error: null };
    try {
        const { data, error } = await supabase
            .from('city_visits')
            .select('status')
            .eq('user_id', userId);
        if (error) return { visitedCount: 0, wishlistCount: 0, error };
        const visitedCount = (data || []).filter(r => r.status === 'visited').length;
        const wishlistCount = (data || []).filter(r => r.status === 'wishlist').length;
        return { visitedCount, wishlistCount, error: null };
    } catch (e) {
        return { visitedCount: 0, wishlistCount: 0, error: e };
    }
};
