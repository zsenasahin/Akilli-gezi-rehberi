import { supabase } from '../../config/supabase';

/**
 * AuthRepository – Supabase Auth CRUD işlemleri.
 * İş mantığı içermez; sadece Supabase API çağrıları.
 */

export const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { data, error };
};

export const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
};

export const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
};

export const getSession = async () => {
    const { data, error } = await supabase.auth.getSession();
    return { data, error };
};

export const onAuthStateChange = (callback) => {
    return supabase.auth.onAuthStateChange(callback);
};
