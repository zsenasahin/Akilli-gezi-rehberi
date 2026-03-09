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
    const ALLOWED = ['full_name', 'travel_style', 'bio', 'avatar_url', 'phone', 'city'];
    Object.keys(updates).forEach(k => {
        if (ALLOWED.includes(k)) safeUpdates[k] = updates[k];
    });

    const { data, error } = await supabase
        .from('profiles')
        .update(safeUpdates)
        .eq('id', userId)
        .select()
        .single();
    return { data, error };
};
