/**
 * Centralized color palette for the Smart Travel Guide app.
 * Inspired by the v0 "Akıllı Gezi Rehberi" design:
 *   Ocean blue primary, teal accents, warm sand backgrounds.
 */
export const COLORS = {
    // Primary brand colors (ocean blue → teal)
    primary: '#0891B2',        // Ocean blue – exploration
    primaryLight: '#22D3EE',
    primaryDark: '#0E7490',
    primaryMuted: 'rgba(8, 145, 178, 0.12)',

    // Accent / CTA colors (teal)
    accent: '#14B8A6',         // Teal – main CTA
    accentLight: '#5EEAD4',
    accentDark: '#0D9488',

    // Backgrounds (warm sand tones)
    background: '#FBF9F7',     // Warm cream
    surface: '#FFFFFF',
    surfaceAlt: '#F5F0EB',     // Light sand
    surfaceWarm: '#EFE8E0',    // Warm sand

    // Text
    textPrimary: '#1B2838',    // Deep navy
    textSecondary: '#5A6B7D',
    textLight: '#94A3B8',
    textOnPrimary: '#FFFFFF',
    textOnDark: '#F8FAFC',

    // Semantic
    success: '#22C55E',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',

    // Borders & dividers
    border: '#E8E0D8',
    divider: '#F1ECE6',

    // Overlay & gradient
    overlay: 'rgba(27, 40, 56, 0.55)',
    overlayLight: 'rgba(27, 40, 56, 0.3)',
    gradient: {
        hero: ['transparent', 'rgba(27, 40, 56, 0.7)', 'rgba(27, 40, 56, 0.95)'],
        card: ['transparent', 'rgba(27, 40, 56, 0.6)'],
        primary: ['#0891B2', '#0E7490'],
        accent: ['#14B8A6', '#0D9488'],
    },

    // Tab bar
    tabBarBackground: '#FFFFFF',
    tabBarBorder: '#E8E0D8',
};
