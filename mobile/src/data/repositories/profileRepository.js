import { supabase } from '../../config/supabase';

/**
 * ProfileRepository – `profiles` tablosu CRUD işlemleri.
 */

export const createProfile = async ({ id, full_name, travel_style }) => {
    const { data, error } = await supabase
        .from('profiles')
        .insert([{ id, full_name, travel_style }])
        .select()
        .single();
    return { data, error };
};

export const getProfile = async (userId) => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    return { data, error };
};

export const updateProfile = async (userId, updates) => {
    // Sadece bilinen sütunları filtrele — DB'de olmayan sütunlar hata verebilir
    const safeUpdates = {};
    const ALLOWED = ['full_name', 'travel_style', 'bio', 'avatar_url', 'cover_url', 'phone', 'city'];
    Object.keys(updates).forEach(k => {
        if (ALLOWED.includes(k)) safeUpdates[k] = updates[k];
    });

    // Geçerli alan yoksa mevcut profili döndür; boş update çağrısı DB hatası üretmesin
    if (Object.keys(safeUpdates).length === 0) {
        return getProfile(userId);
    }

    // Kolon yok hatasında (schema cache) ilgili alanı düşürüp tekrar dene.
    // Böylece farklı ortamlardaki profiles şemasıyla uyumlu çalışır.
    let payload = { ...safeUpdates };

    for (let attempt = 0; attempt < 4; attempt += 1) {
        const { data, error } = await supabase
            .from('profiles')
            .upsert([{ id: userId, ...payload }], { onConflict: 'id' })
            .select()
            .single();

        if (!error) return { data, error: null };

        const msg = error?.message || '';
        const missingColumnMatch =
            msg.match(/Could not find the '([^']+)' column of 'profiles'/i) ||
            msg.match(/column "([^"]+)" of relation "profiles" does not exist/i);

        if (!missingColumnMatch) {
            return { data: null, error };
        }

        const missingColumn = missingColumnMatch[1];
        if (!Object.prototype.hasOwnProperty.call(payload, missingColumn)) {
            return { data: null, error };
        }

        delete payload[missingColumn];

        if (Object.keys(payload).length === 0) {
            return getProfile(userId);
        }
    }

    return { data: null, error: new Error('Profil güncelleme başarısız oldu.') };
};
