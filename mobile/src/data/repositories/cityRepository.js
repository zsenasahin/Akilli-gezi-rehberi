import { supabase } from '../../config/supabase';

/**
 * CityRepository – `cities` tablosu okuma işlemleri.
 */

export const getCities = async () => {
    const { data, error } = await supabase
        .from('cities')
        .select('*')
        .order('name', { ascending: true });
    return { data, error };
};

export const getCityById = async (cityId) => {
    const { data, error } = await supabase
        .from('cities')
        .select('*')
        .eq('id', cityId)
        .single();
    return { data, error };
};
