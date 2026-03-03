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
    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
    return { data, error };
};
