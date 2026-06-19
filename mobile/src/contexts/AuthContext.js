import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Alert, AppState } from 'react-native';
import { onAuthStateChange, getSession, refreshSession } from '../data/repositories/authRepository';
import { supabase } from '../config/supabase';

const AuthContext = createContext({
    session: null,
    user: null,
    isLoading: true,
});

export const AuthProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const appState = useRef(AppState.currentState);

    useEffect(() => {
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

        const { data: listener } = onAuthStateChange((event, newSession) => {
            setSession(newSession);

            if (event === 'TOKEN_REFRESHED') {
                console.log('JWT token yenilendi');
            }

            if (event === 'SIGNED_OUT') {
                setSession(null);
            }
        });

        const appStateSubscription = AppState.addEventListener('change', async (nextState) => {
            if (
                appState.current.match(/inactive|background/) &&
                nextState === 'active'
            ) {
                const { data } = await getSession();
                if (data?.session) {
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
 * Oturum yoksa uyarı gösterir. Ana uygulama auth duvarı ile korunduğu için
 * normalde tetiklenmez; oturum süresi dolması gibi edge case için bırakıldı.
 */
export const useRequireAuth = () => {
    const { session } = useAuth();

    return useCallback((message = 'Bu özelliği kullanmak için giriş yapmalısınız.') => {
        if (session) return true;

        Alert.alert('Oturum gerekli', message, [{ text: 'Tamam', style: 'default' }]);
        return false;
    }, [session]);
};
