import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChange, getSession } from '../services/authService';

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
            const { data } = await getSession();
            setSession(data?.session ?? null);
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
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook – provides quick access to auth state.
 * Usage: const { user, session, isLoading } = useAuth();
 */
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
