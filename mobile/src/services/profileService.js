import { supabase } from '../config/supabase';

/**
 * Profile service – CRUD operations for the `profiles` table.
 */

/**
 * Create a new profile row for the authenticated user.
 * Called after successful registration.
 * @param {{ id: string, full_name: string, travel_style: string }} profile
 */
export const createProfile = async ({ id, full_name, travel_style }) => {
    const { data, error } = await supabase
        .from('profiles')
        .insert([{ id, full_name, travel_style }])
        .select()
        .single();

    return { data, error };
};

/**
 * Fetch the profile of the given user.
 * @param {string} userId
 */
export const getProfile = async (userId) => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    return { data, error };
};

/**
 * Update the profile of the given user.
 * @param {string} userId
 * @param {{ full_name?: string, travel_style?: string }} updates
 */
export const updateProfile = async (userId, updates) => {
    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

    return { data, error };
};
