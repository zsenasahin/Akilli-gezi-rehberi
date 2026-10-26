/**
 * Single source of truth for app colors.
 *
 * Doğadan ilham alan, gözü yormayan toprak tonları:
 *  - brand   : koyu orman / zeytin yeşili (ana renk #4F6342)
 *  - khaki   : haki, vurgu ve rozetler için
 *  - earth   : yumuşak kahverengi, ikincil vurgu
 *  - neutral : beyaz zeminler, nötr gri metinler
 *
 * Bu değerler açık temanın varsayılanıdır; çalışma zamanında ThemeContext
 * seçilen temanın paletini (açık/koyu) bu nesneye yazar.
 */
const PALETTE = {
    brand: {
        50:  '#F2F4EE',
        100: '#E3E8DA',
        200: '#C6D0B5',
        300: '#A0B08A',
        400: '#76895F',
        500: '#4F6342',  // ANA RENK — koyu zeytin/orman yeşili
        600: '#3F5035',
        700: '#303D29',
        800: '#222B1D',
        900: '#151B12',
    },
    khaki: {
        100: '#EFEADB',
        300: '#D2C59E',
        500: '#B3A274',
        700: '#857650',
    },
    earth: {
        100: '#F0E6DA',
        300: '#CDB399',
        500: '#8B6B4E',
        700: '#5E4634',
    },
    neutral: {
        0:   '#FFFFFF',  // kart yüzeyi ve zemin (beyaz)
        25:  '#FFFFFF',
        50:  '#F4F5F2',
        100: '#EEF0EB',
        200: '#E6E8E3',
        400: '#959B95',
        600: '#5E655F',
        800: '#33392F',
        900: '#1B1F1C',
    },

    semantic: {
        success: '#5B7A4A',
        error:   '#B5523B',   // terracotta
        warning: '#B8893A',   // hardal
        info:    '#5A7D8C',   // puslu mavi-yeşil
    },
};

export const COLORS = {
    // ── Primary ───────────────────────────────────────────────────────────
    primary:      PALETTE.brand[500],   // #4F6342
    primaryLight: PALETTE.brand[300],   // #7DC8B0
    primaryDark:  PALETTE.brand[600],   // #2F6050
    primaryMuted: 'rgba(79, 99, 66, 0.12)',

    // ── Accent (lighter teal) ─────────────────────────────────────────────
    accent:      PALETTE.khaki[500],
    accentLight: PALETTE.khaki[100],
    accentDark:  PALETTE.khaki[700],
    earth:       PALETTE.earth[500],
    earthLight:  PALETTE.earth[100],
    earthDark:   PALETTE.earth[700],

    // ── Backgrounds & Surfaces ────────────────────────────────────────────
    background:  PALETTE.neutral[25],
    surface:     PALETTE.neutral[0],
    surfaceAlt:  PALETTE.neutral[50],
    surfaceWarm: PALETTE.neutral[100],

    // ── Text ──────────────────────────────────────────────────────────────
    textPrimary:   PALETTE.neutral[900],
    textSecondary: PALETTE.neutral[600],
    textLight:     PALETTE.neutral[400],
    textOnPrimary: '#FFFFFF',
    textOnDark:    PALETTE.neutral[25],

    // ── Semantic ──────────────────────────────────────────────────────────
    success: PALETTE.semantic.success,
    error:   PALETTE.semantic.error,
    warning: PALETTE.semantic.warning,
    info:    PALETTE.semantic.info,

    // ── Borders & Dividers ────────────────────────────────────────────────
    border:  PALETTE.neutral[200],
    divider: PALETTE.neutral[100],

    // ── Overlays ──────────────────────────────────────────────────────────
    overlay:      'rgba(21, 27, 18, 0.55)',
    overlayLight: 'rgba(21, 27, 18, 0.3)',

    // ── Tab Bar ───────────────────────────────────────────────────────────
    tabBarBackground: PALETTE.neutral[0],
    tabBarBorder:     PALETTE.neutral[100],

    // ── Raw palette ───────────────────────────────────────────────────────
    palette: PALETTE,

    // ── Gradients ─────────────────────────────────────────────────────────
    gradients: {
        brand:       [PALETTE.brand[400], PALETTE.brand[600]],
        primary:     [PALETTE.brand[500], PALETTE.brand[700]],
        accent:      [PALETTE.khaki[300], PALETTE.khaki[700]],
        earth:       [PALETTE.earth[300], PALETTE.earth[700]],
        success:     [PALETTE.brand[400], PALETTE.brand[600]],
        heroOverlay: ['rgba(21,27,18,0.10)', 'rgba(21,27,18,0.30)', 'rgba(21,27,18,0.82)'],
        cardOverlay: ['transparent', 'rgba(21,27,18,0.6)'],
    },

    // ── Legacy gradient key ───────────────────────────────────────────────
    gradient: {
        hero:    ['transparent', 'rgba(21,27,18,0.7)', 'rgba(21,27,18,0.95)'],
        card:    ['transparent', 'rgba(21,27,18,0.6)'],
        primary: [PALETTE.brand[500], PALETTE.brand[700]],
        accent:  [PALETTE.khaki[300], PALETTE.khaki[700]],
    },
};
