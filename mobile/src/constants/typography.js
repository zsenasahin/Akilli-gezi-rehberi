/**
 * Typography scale for consistent text sizing.
 * Using Playfair Display for headings & Inter for body,
 * matching the v0 travel app UI.
 */

// Font families – these are loaded via expo-google-fonts
export const FONTS = {
    heading: 'PlayfairDisplay_700Bold',
    headingMedium: 'PlayfairDisplay_500Medium',
    body: 'Inter_400Regular',
    bodyMedium: 'Inter_500Medium',
    bodySemiBold: 'Inter_600SemiBold',
    bodyBold: 'Inter_700Bold',
};

export const FONT_SIZES = {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 22,
    xxl: 28,
    hero: 36,
    display: 44,
};

export const FONT_WEIGHTS = {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
};

export const LINE_HEIGHTS = {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
};
