import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/colors';
import { bumpThemeVersion } from '../utils/themedStyles';

const STORAGE_KEY = 'smarttravelguide.theme';

/**
 * Tema paletleri. `tokens` doğrudan global COLORS nesnesine yazılır; ekranlar
 * `createThemedStyles` ile tanımlandığı için tema değişince yeni renkleri alır.
 * `colors` ise bileşenlerin satır içi kullandığı kısa adlardır (geriye dönük uyum).
 */
const PALETTES = {
    light: {
        background: '#FFFFFF',
        surface: '#FFFFFF',
        surfaceAlt: '#F4F5F2',
        surfaceWarm: '#EEF0EB',
        border: '#E6E8E3',
        divider: '#EFF1EC',
        textPrimary: '#1B1F1C',
        textSecondary: '#5E655F',
        textLight: '#959B95',
        textOnPrimary: '#FFFFFF',
        primary: '#4F6342',
        primaryDark: '#3A4A31',
        primaryLight: '#A0B08A',
        primaryMuted: 'rgba(79, 99, 66, 0.10)',
        accent: '#A8976A',
        accentLight: '#F2EEE3',
        accentDark: '#7E6F48',
        earth: '#8B6B4E',
        earthLight: '#F4EDE5',
        earthDark: '#5E4634',
        success: '#5B7A4A',
        error: '#B5523B',
        warning: '#B8893A',
        info: '#5A7D8C',
        tabBarBackground: '#FFFFFF',
        tabBarBorder: '#ECEEE9',
        overlay: 'rgba(17, 21, 18, 0.55)',
        overlayLight: 'rgba(17, 21, 18, 0.3)',
        gradients: {
            primary: ['#5A7049', '#34442C'],
            brand: ['#76895F', '#3F5035'],
            accent: ['#D2C59E', '#857650'],
            earth: ['#CDB399', '#5E4634'],
            success: ['#76895F', '#3F5035'],
            heroOverlay: ['rgba(12,16,13,0.05)', 'rgba(12,16,13,0.30)', 'rgba(12,16,13,0.85)'],
            cardOverlay: ['rgba(12,16,13,0.05)', 'rgba(12,16,13,0.78)'],
        },
        gradient: {
            hero: ['transparent', 'rgba(12,16,13,0.7)', 'rgba(12,16,13,0.95)'],
            card: ['rgba(12,16,13,0.10)', 'rgba(12,16,13,0.78)'],
            primary: ['#5A7049', '#34442C'],
            accent: ['#D2C59E', '#857650'],
        },
    },
    dark: {
        background: '#0E110F',
        surface: '#171B18',
        surfaceAlt: '#1F2420',
        surfaceWarm: '#252B26',
        border: '#2A302B',
        divider: '#222723',
        textPrimary: '#EEF1EC',
        textSecondary: '#A6ADA6',
        textLight: '#767D76',
        textOnPrimary: '#FFFFFF',
        // Beyaz yazının dolu butonlarda okunabilir kalması için orta tonda yeşil
        primary: '#7E9C67',
        primaryDark: '#9DB88A',
        primaryLight: '#C5D6B4',
        primaryMuted: 'rgba(126, 156, 103, 0.16)',
        accent: '#C9B988',
        accentLight: 'rgba(201, 185, 136, 0.14)',
        accentDark: '#D8CBA3',
        earth: '#C8A27F',
        earthLight: 'rgba(200, 162, 127, 0.14)',
        earthDark: '#DDBC9C',
        success: '#8FB078',
        error: '#D9785F',
        warning: '#D6A657',
        info: '#86A9B7',
        tabBarBackground: '#131714',
        tabBarBorder: '#232824',
        overlay: 'rgba(0, 0, 0, 0.68)',
        overlayLight: 'rgba(0, 0, 0, 0.4)',
        gradients: {
            primary: ['#7E9C67', '#4C6440'],
            brand: ['#8AA674', '#4C6440'],
            accent: ['#C9B988', '#7E6F48'],
            earth: ['#C8A27F', '#6E5240'],
            success: ['#8AA674', '#4C6440'],
            heroOverlay: ['rgba(5,7,6,0.10)', 'rgba(5,7,6,0.45)', 'rgba(5,7,6,0.92)'],
            cardOverlay: ['rgba(5,7,6,0.10)', 'rgba(5,7,6,0.82)'],
        },
        gradient: {
            hero: ['transparent', 'rgba(5,7,6,0.75)', 'rgba(5,7,6,0.96)'],
            card: ['rgba(5,7,6,0.15)', 'rgba(5,7,6,0.82)'],
            primary: ['#7E9C67', '#4C6440'],
            accent: ['#C9B988', '#7E6F48'],
        },
    },
};

const toThemeObject = (key) => {
    const p = PALETTES[key];
    return {
        key,
        isDark: key === 'dark',
        colors: {
            background: p.background,
            surface: p.surface,
            surfaceSoft: p.surfaceAlt,
            border: p.border,
            text: p.textPrimary,
            textSecondary: p.textSecondary,
            textLight: p.textLight,
            primary: p.primary,
            pill: p.primaryMuted,
            tabBarBackground: p.tabBarBackground,
            tabBarBorder: p.tabBarBorder,
        },
    };
};

export const THEME_OPTIONS = [
    { key: 'system', label: 'Sistem', description: 'Telefonun ayarını takip eder', icon: 'phone-portrait-outline' },
    { key: 'light', label: 'Açık', description: 'Beyaz, ferah görünüm', icon: 'sunny-outline' },
    { key: 'dark', label: 'Koyu', description: 'Gece kullanımında göz yormaz', icon: 'moon-outline' },
];

/** Paleti global COLORS'a yazar ve temalı stillerin yeniden üretilmesini sağlar. */
const applyPalette = (key) => {
    const palette = PALETTES[key];
    Object.entries(palette).forEach(([token, value]) => {
        if (token === 'gradients' || token === 'gradient') {
            COLORS[token] = { ...COLORS[token], ...value };
        } else {
            COLORS[token] = value;
        }
    });
    bumpThemeVersion();
};

// İlk karede doğru renkler olsun diye açık tema modül yüklenirken uygulanır.
applyPalette('light');

const ThemeContext = createContext({
    theme: toThemeObject('light'),
    themeKey: 'light',
    preference: 'system',
    setThemeKey: () => {},
    themes: THEME_OPTIONS,
});

export const ThemeProvider = ({ children }) => {
    const systemScheme = useColorScheme();
    const [preference, setPreference] = useState('system');
    const [ready, setReady] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY)
            .then(stored => {
                if (stored && THEME_OPTIONS.some(option => option.key === stored)) setPreference(stored);
            })
            .catch(() => {})
            .finally(() => setReady(true));
    }, []);

    const resolvedKey = preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

    // Renkler render sırasında, çocuklar çizilmeden önce uygulanır (efektte
    // uygulamak ilk karede eski renklerin görünmesine yol açıyordu).
    const appliedRef = React.useRef(null);
    if (appliedRef.current !== resolvedKey) {
        applyPalette(resolvedKey);
        appliedRef.current = resolvedKey;
    }

    const setThemeKey = async (key) => {
        if (!THEME_OPTIONS.some(option => option.key === key)) return;
        setPreference(key);
        try { await AsyncStorage.setItem(STORAGE_KEY, key); } catch { /* tercih kaydedilemese de tema uygulanır */ }
    };

    const value = useMemo(() => ({
        theme: toThemeObject(resolvedKey),
        themeKey: resolvedKey,
        preference,
        setThemeKey,
        themes: THEME_OPTIONS,
    }), [resolvedKey, preference]);

    if (!ready) return null;

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useThemePreference = () => useContext(ThemeContext);
