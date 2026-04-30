/**
 * Single source of truth for app colors.
 *
 * Ana renk: oklch(43.2% 0.095 166.913) ≈ #3D7A62
 * Koyu pastel yeşil-teal tonu. Tüm skala bu renkten türetildi.
 *
 * Acil durumlarda nötr (siyah/gri/beyaz) kullanılabilir.
 */
const PALETTE = {
    brand: {
        50:  '#EEF7F3',  // çok açık mint
        100: '#D4EDE3',  // açık mint
        200: '#A9DBCA',  // pastel yeşil
        300: '#7DC8B0',  // orta pastel
        400: '#55B596',  // canlı pastel
        500: '#3D7A62',  // ANA RENK — oklch(43.2% 0.095 166.913)
        600: '#2F6050',  // koyu
        700: '#22473C',  // daha koyu
        800: '#163028',  // çok koyu
        900: '#0B1E19',  // neredeyse siyah
    },
    neutral: {
        0:   '#FFFFFF',
        25:  '#F8FAF9',  // hafif yeşilimsi beyaz
        50:  '#F1F5F3',
        100: '#E2EAE6',
        200: '#C8D6CE',
        400: '#8FA89E',
        600: '#4A6259',
        800: '#1E2E28',
        900: '#0F1A16',
    },
    semantic: {
        success: '#3D7A62',   // marka rengi
        error:   '#C0392B',   // koyu kırmızı (pastel uyumlu)
        warning: '#B7791F',   // koyu amber
        info:    '#2563EB',   // mavi
    },
};

export const COLORS = {
    // ── Primary ───────────────────────────────────────────────────────────
    primary:      PALETTE.brand[500],   // #3D7A62
    primaryLight: PALETTE.brand[300],   // #7DC8B0
    primaryDark:  PALETTE.brand[600],   // #2F6050
    primaryMuted: 'rgba(61, 122, 98, 0.12)',

    // ── Accent (lighter teal) ─────────────────────────────────────────────
    accent:      PALETTE.brand[400],
    accentLight: PALETTE.brand[200],
    accentDark:  PALETTE.brand[600],

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
    overlay:      'rgba(15, 26, 22, 0.55)',
    overlayLight: 'rgba(15, 26, 22, 0.3)',

    // ── Tab Bar ───────────────────────────────────────────────────────────
    tabBarBackground: PALETTE.neutral[0],
    tabBarBorder:     PALETTE.neutral[100],

    // ── Raw palette ───────────────────────────────────────────────────────
    palette: PALETTE,

    // ── Gradients ─────────────────────────────────────────────────────────
    gradients: {
        brand:       [PALETTE.brand[400], PALETTE.brand[600]],
        primary:     [PALETTE.brand[500], PALETTE.brand[700]],
        accent:      [PALETTE.brand[300], PALETTE.brand[500]],
        success:     [PALETTE.brand[400], PALETTE.brand[600]],
        heroOverlay: ['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.8)'],
        cardOverlay: ['transparent', 'rgba(0,0,0,0.55)'],
    },

    // ── Legacy gradient key ───────────────────────────────────────────────
    gradient: {
        hero:    ['transparent', 'rgba(15,26,22,0.7)', 'rgba(15,26,22,0.95)'],
        card:    ['transparent', 'rgba(15,26,22,0.6)'],
        primary: [PALETTE.brand[500], PALETTE.brand[700]],
        accent:  [PALETTE.brand[300], PALETTE.brand[500]],
    },
};
