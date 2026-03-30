/**
 * Single source of truth for app colors.
 * Keep all screens/components on this palette for consistent UI.
 */
const PALETTE = {
    brand: {
        300: '#22D3EE',
        500: '#0891B2',
        600: '#0E7490',
        700: '#0C6378',
    },
    accent: {
        300: '#5EEAD4',
        500: '#14B8A6',
        600: '#0D9488',
    },
    neutral: {
        0: '#FFFFFF',
        25: '#FBF9F7',
        50: '#F5F0EB',
        100: '#EFE8E0',
        200: '#E8E0D8',
    },
    text: {
        900: '#1B2838',
        700: '#5A6B7D',
        500: '#94A3B8',
        onDark: '#F8FAFC',
        onBrand: '#FFFFFF',
    },
    semantic: {
        success: '#22C55E',
        error: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6',
    },
};

export const COLORS = {
    // Backward-compatible keys
    primary: PALETTE.brand[500],
    primaryLight: PALETTE.brand[300],
    primaryDark: PALETTE.brand[600],
    primaryMuted: 'rgba(8, 145, 178, 0.12)',
    accent: PALETTE.accent[500],
    accentLight: PALETTE.accent[300],
    accentDark: PALETTE.accent[600],
    background: PALETTE.neutral[25],
    surface: PALETTE.neutral[0],
    surfaceAlt: PALETTE.neutral[50],
    surfaceWarm: PALETTE.neutral[100],
    textPrimary: PALETTE.text[900],
    textSecondary: PALETTE.text[700],
    textLight: PALETTE.text[500],
    textOnPrimary: PALETTE.text.onBrand,
    textOnDark: PALETTE.text.onDark,
    success: PALETTE.semantic.success,
    error: PALETTE.semantic.error,
    warning: PALETTE.semantic.warning,
    info: PALETTE.semantic.info,
    border: PALETTE.neutral[200],
    divider: '#F1ECE6',
    overlay: 'rgba(27, 40, 56, 0.55)',
    overlayLight: 'rgba(27, 40, 56, 0.3)',

    // Explicit design tokens for new UI work
    palette: PALETTE,
    gradients: {
        brand: [PALETTE.brand[500], PALETTE.brand[600], PALETTE.accent[500]],
        primary: [PALETTE.brand[500], PALETTE.brand[600]],
        accent: [PALETTE.accent[500], PALETTE.accent[600]],
        heroOverlay: ['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.85)'],
        cardOverlay: ['transparent', 'rgba(0,0,0,0.6)'],
    },

    // Keep old gradient key for compatibility
    gradient: {
        hero: ['transparent', 'rgba(27, 40, 56, 0.7)', 'rgba(27, 40, 56, 0.95)'],
        card: ['transparent', 'rgba(27, 40, 56, 0.6)'],
        primary: [PALETTE.brand[500], PALETTE.brand[600]],
        accent: [PALETTE.accent[500], PALETTE.accent[600]],
    },

    tabBarBackground: PALETTE.neutral[0],
    tabBarBorder: PALETTE.neutral[200],
};
