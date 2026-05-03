import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/colors';

const STORAGE_KEY = 'smarttravelguide.theme';

const THEMES = {
    light: {
        key: 'light',
        label: 'Açık',
        colors: {
            background: '#F5F6F1',
            surface: '#FFFFFF',
            surfaceSoft: '#F7FAF8',
            border: '#E6ECE7',
            text: '#13231C',
            textSecondary: '#66746E',
            primary: '#2F6050',
            pill: '#EAF2EC',
            tabBarBackground: '#FFFFFF',
            tabBarBorder: '#E6ECE7',
        },
    },
    dark: {
        key: 'dark',
        label: 'Koyu',
        colors: {
            background: '#0D1412',
            surface: '#17211E',
            surfaceSoft: '#20302B',
            border: '#31443D',
            text: '#F4FAF7',
            textSecondary: '#B4C8BF',
            primary: '#8ED6B8',
            pill: 'rgba(142, 214, 184, 0.14)',
            tabBarBackground: '#141E1B',
            tabBarBorder: '#2A3A35',
        },
    },
};

const syncGlobalColors = (theme) => {
    COLORS.background = theme.colors.background;
    COLORS.surface = theme.colors.surface;
    COLORS.surfaceAlt = theme.colors.surfaceSoft;
    COLORS.surfaceWarm = theme.colors.surfaceSoft;
    COLORS.border = theme.colors.border;
    COLORS.divider = theme.colors.border;
    COLORS.textPrimary = theme.colors.text;
    COLORS.textSecondary = theme.colors.textSecondary;
    COLORS.textLight = theme.colors.textSecondary;
    COLORS.primary = theme.colors.primary;
    COLORS.primaryDark = theme.colors.primary;
    COLORS.primaryMuted = theme.colors.pill;
    COLORS.tabBarBackground = theme.colors.tabBarBackground;
    COLORS.tabBarBorder = theme.colors.tabBarBorder;
    COLORS.overlay = theme.key === 'dark' ? 'rgba(0, 0, 0, 0.68)' : 'rgba(15, 26, 22, 0.55)';
    COLORS.gradients.heroOverlay = theme.key === 'dark'
        ? ['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.44)', 'rgba(0,0,0,0.88)']
        : ['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.8)'];
};

const ThemeContext = createContext({
    theme: THEMES.light,
    themeKey: 'light',
    setThemeKey: () => {},
    themes: Object.values(THEMES),
});

export const ThemeProvider = ({ children }) => {
    const [themeKey, setThemeKeyState] = useState('light');

    useEffect(() => {
        const loadTheme = async () => {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored && THEMES[stored]) {
                setThemeKeyState(stored);
            }
        };
        loadTheme();
    }, []);

    useEffect(() => {
        syncGlobalColors(THEMES[themeKey] || THEMES.light);
    }, [themeKey]);

    const setThemeKey = async (key) => {
        if (!THEMES[key]) return;
        setThemeKeyState(key);
        await AsyncStorage.setItem(STORAGE_KEY, key);
    };

    const value = useMemo(() => ({
        theme: THEMES[themeKey] || THEMES.light,
        themeKey,
        setThemeKey,
        themes: Object.values(THEMES),
    }), [themeKey]);

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useThemePreference = () => useContext(ThemeContext);
