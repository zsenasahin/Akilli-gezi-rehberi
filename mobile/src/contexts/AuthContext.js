import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Alert, AppState } from 'react-native';
import { onAuthStateChange, getSession, refreshSession, signOut } from '../data/repositories/authRepository';
import { supabase } from '../config/supabase';

const AuthContext = createContext({
    session: null,
    user: null,
    isLoading: true,
    isGuest: true,
});

export const AuthProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const appState = useRef(AppState.currentState);

    useEffect(() => {
        // 1. Uygulama açılışında mevcut session'ı kontrol et
        const initSession = async () => {
            try {
                const { data, error } = await getSession();
                if (error) {
                    console.warn('Session hatası, temizleniyor:', error.message);
                    await supabase.auth.signOut();
                    setSession(null);
                } else {
                    setSession(data?.session ?? null);
                }
            } catch (err) {
                console.warn('Session kontrol hatası:', err);
                setSession(null);
            } finally {
                setIsLoading(false);
            }
        };

        initSession();

        // 2. Auth state değişikliklerini dinle (login, logout, token refresh)
        const { data: listener } = onAuthStateChange((event, newSession) => {
            setSession(newSession);

            // TOKEN_REFRESHED: yeni JWT alındı, loglayabiliriz
            if (event === 'TOKEN_REFRESHED') {
                console.log('JWT token yenilendi');
            }

            // SIGNED_OUT: tüm state'i temizle
            if (event === 'SIGNED_OUT') {
                setSession(null);
            }
        });

        // 3. Uygulama arka plandan öne gelince token'ı yenile
        // (Uzun süre arka planda kalan uygulamalarda token expire olabilir)
        const appStateSubscription = AppState.addEventListener('change', async (nextState) => {
            if (
                appState.current.match(/inactive|background/) &&
                nextState === 'active'
            ) {
                const { data } = await getSession();
                if (data?.session) {
                    // Token 5 dakikadan az kaldıysa yenile
                    const expiresAt = data.session.expires_at;
                    const now = Math.floor(Date.now() / 1000);
                    if (expiresAt && expiresAt - now < 300) {
                        await refreshSession();
                    }
                }
            }
            appState.current = nextState;
        });

        return () => {
            listener?.subscription?.unsubscribe();
            appStateSubscription?.remove();
        };
    }, []);

    const value = {
        session,
        user: session?.user ?? null,
        isLoading,
        isGuest: !session,
        // JWT access token'ı direkt almak için
        accessToken: session?.access_token ?? null,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

/**
 * Korumalı işlemler için — kullanıcı giriş yapmadıysa Alert gösterir.
 */
export const useRequireAuth = (navigation) => {
    const { isGuest } = useAuth();

    return useCallback((message = 'Bu özelliği kullanmak için giriş yapmalısınız.') => {
        if (!isGuest) return true;

        Alert.alert(
            'Giriş Gerekli',
            message,
            [
                { text: 'Vazgeç', style: 'cancel' },
                {
                    text: 'Giriş Yap',
                    onPress: () => navigation?.navigate('AuthModal'),
                },
            ],
        );
        return false;
    }, [isGuest, navigation]);
};
