import { supabase } from '../config/supabase';

/**
 * Authentication service – all Supabase Auth operations.
 * Keeps auth logic separate from UI components.
 */

/**
 * Register a new user with email and password.
 * @param {string} email
 * @param {string} password
 * @returns {{ data, error }}
 */
export const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });
    return { data, error };
};

/**
 * Log in an existing user.
 * @param {string} email
 * @param {string} password
 * @returns {{ data, error }}
 */
export const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    return { data, error };
};

/**
 * Log out the current user.
 * @returns {{ error }}
 */
export const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
};

/**
 * Get the currently authenticated session.
 * @returns {{ data: { session }, error }}
 */
export const getSession = async () => {
    const { data, error } = await supabase.auth.getSession();
    return { data, error };
};

/**
 * Listen for auth state changes (login, logout, token refresh).
 * @param {function} callback – receives (event, session)
 * @returns {{ data: { subscription } }}
 */
export const onAuthStateChange = (callback) => {
    return supabase.auth.onAuthStateChange(callback);
};
