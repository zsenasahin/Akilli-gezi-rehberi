import { supabase } from '../../config/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// OAuth callback'lerini tamamlamak için gerekli
WebBrowser.maybeCompleteAuthSession();

/**
 * Redirect URI — Expo Go ve production build için farklı davranır.
 * Expo Go: exp://127.0.0.1:8081 gibi bir URI üretir
 * Production: smarttravelguide://auth/callback
 *
 * Supabase Dashboard → Authentication → URL Configuration →
 * Redirect URLs'e her ikisini de ekle.
 */
const getRedirectUri = () => {
    return AuthSession.makeRedirectUri({
        scheme: 'smarttravelguide',
        path: 'auth/callback',
    });
};

// ─────────────────────────────────────────────────────────────
// Temel Auth İşlemleri
// ─────────────────────────────────────────────────────────────

export const signUp = async (email, password) => {
    const redirectUrl = getRedirectUri();
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: redirectUrl,
            // Email doğrulamasını devre dışı bırak (development için)
            data: {
                email_confirm: false
            }
        },
    });
    
    // Eğer email confirmation kapalıysa direkt session döner
    if (data?.session) {
        console.log('Kayıt başarılı, session oluşturuldu');
    }
    
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

export const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token ?? null;
};

export const refreshSession = async () => {
    const { data, error } = await supabase.auth.refreshSession();
    return { data, error };
};

export const resendVerificationEmail = async (email) => {
    const redirectUrl = getRedirectUri();
    const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: redirectUrl },
    });
    return { data, error };
};

export const sendPasswordReset = async (email) => {
    const redirectUrl = getRedirectUri();
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
    });
    return { data, error };
};

// ─────────────────────────────────────────────────────────────
// OAuth — PKCE Flow
// ─────────────────────────────────────────────────────────────

const handleOAuthResult = async (result) => {
    if (result.type === 'cancel' || result.type === 'dismiss') {
        return { data: null, error: { message: 'Giriş iptal edildi.' } };
    }

    if (result.type !== 'success') {
        return { data: null, error: { message: 'OAuth işlemi başarısız.' } };
    }

    const url = result.url;

    // PKCE: code → session
    try {
        const parsedUrl = new URL(url);
        const code = parsedUrl.searchParams?.get('code');
        if (code) {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            return { data, error };
        }
    } catch { /* devam */ }

    // Implicit flow fallback
    const hashPart = url.split('#')[1];
    if (hashPart) {
        const params = new URLSearchParams(hashPart);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken) {
            const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
            });
            return { data, error };
        }
    }

    return { data: null, error: { message: 'OAuth oturumu alınamadı.' } };
};

/**
 * Google ile giriş yap.
 *
 * Google Cloud Console → Authorized redirect URIs:
 *   https://hgyuzdgrmgsfemluccab.supabase.co/auth/v1/callback
 *
 * Supabase → Authentication → URL Configuration → Redirect URLs:
 *   smarttravelguide://auth/callback
 *   exp://127.0.0.1:8081   (Expo Go için — IP değişebilir, * da ekleyebilirsin)
 */
export const signInWithGoogle = async () => {
    try {
        const redirectUrl = getRedirectUri();
        console.log('[Google OAuth] redirectUrl:', redirectUrl);

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl,
                skipBrowserRedirect: true,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        });

        if (error || !data?.url) {
            return { data: null, error: error ?? { message: 'Google OAuth URL alınamadı.' } };
        }

        console.log('[Google OAuth] opening URL:', data.url);

        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl, {
            showInRecents: true,
            preferEphemeralSession: false,
        });

        console.log('[Google OAuth] result type:', result.type);

        return handleOAuthResult(result);
    } catch (err) {
        console.error('[Google OAuth] error:', err);
        return { data: null, error: { message: err.message || 'Google ile giriş başarısız.' } };
    }
};

export const signInWithApple = async () => {
    if (Platform.OS !== 'ios') {
        return { data: null, error: { message: "Apple ile giriş sadece iOS'ta desteklenir." } };
    }

    try {
        const redirectUrl = getRedirectUri();

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'apple',
            options: {
                redirectTo: redirectUrl,
                skipBrowserRedirect: true,
            },
        });

        if (error || !data?.url) {
            return { data: null, error: error ?? { message: 'Apple OAuth URL alınamadı.' } };
        }

        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl, {
            showInRecents: false,
        });

        return handleOAuthResult(result);
    } catch (err) {
        console.error('[Apple OAuth] error:', err);
        return { data: null, error: { message: err.message || 'Apple ile giriş başarısız.' } };
    }
};
