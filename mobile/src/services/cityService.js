import { supabase } from '../config/supabase';

/**
 * City service – read operations for the `cities` table.
 */

/**
 * Fetch all available cities, ordered by name.
 */
export const getCities = async () => {
    const { data, error } = await supabase
        .from('cities')
        .select('*')
        .order('name', { ascending: true });

    return { data, error };
};

/**
 * Fetch a single city by ID.
 * @param {number} cityId
 */
export const getCityById = async (cityId) => {
    const { data, error } = await supabase
        .from('cities')
        .select('*')
        .eq('id', cityId)
        .single();

    return { data, error };
};
