import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { onAuthStateChange, getSession } from '../data/repositories/authRepository';
import { supabase } from '../config/supabase';

/**
 * AuthContext provides the current user session and loading state
 * to the entire component tree.
 */
const AuthContext = createContext({
    session: null,
    user: null,
    isLoading: true,
});

export const AuthProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // 1. Check for an existing session on app launch
        const initSession = async () => {
            try {
                const { data, error } = await getSession();
                if (error) {
                    // Geçersiz refresh token — eski oturumu temizle
                    console.warn('Session hatası, oturum temizleniyor:', error.message);
                    await supabase.auth.signOut();
                    setSession(null);
                } else {
                    setSession(data?.session ?? null);
                }
            } catch (err) {
                console.warn('Session kontrol hatası:', err);
                setSession(null);
            }
            setIsLoading(false);
        };

        initSession();

        // 2. Listen for changes (login, logout, token refresh)
        const { data: listener } = onAuthStateChange((_event, newSession) => {
            setSession(newSession);
        });

        // Cleanup subscription on unmount
        return () => {
            listener?.subscription?.unsubscribe();
        };
    }, []);

    const value = {
        session,
        user: session?.user ?? null,
        isLoading,
        isGuest: !session,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook – provides quick access to auth state.
 * Usage: const { user, session, isLoading, isGuest } = useAuth();
 */
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

/**
 * useRequireAuth – Korumalı işlemler öncesinde çağrılır.
 * Kullanıcı giriş yapmadıysa Alert gösterir ve false döner.
 * Giriş yapılmışsa true döner, işlem devam edebilir.
 *
 * Usage:
 *   const requireAuth = useRequireAuth(navigation);
 *   const handleFavorite = () => { if (!requireAuth()) return; ... };
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
                    onPress: () => {
                        if (navigation) {
                            navigation.navigate('AuthModal');
                        }
                    },
                },
            ],
        );
        return false;
    }, [isGuest, navigation]);
};
