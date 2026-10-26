import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useThemePreference } from '../../contexts/ThemeContext';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/layout';
import PressableScale from '../../components/planner/PressableScale';
import { createThemedStyles } from '../../utils/themedStyles';

const PREVIEW = {
    system: [['#FFFFFF', '#4F6342'], ['#0E110F', '#7E9C67']],
    light: [['#FFFFFF', '#4F6342']],
    dark: [['#0E110F', '#7E9C67']],
};

const ThemeSettingsScreen = ({ navigation }) => {
    const { themes, preference, setThemeKey } = useThemePreference();

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.82} accessibilityLabel="Geri">
                    <Ionicons name="chevron-back" size={20} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>Görünüm</Text>
                    <Text style={styles.subtitle}>Uygulamanın açık veya koyu temada görünmesini seç.</Text>
                </View>
            </View>

            <View style={styles.content}>
                {themes.map((item, index) => {
                    const active = preference === item.key;
                    return (
                        <Animated.View key={item.key} entering={FadeInDown.delay(index * 70)}>
                            <PressableScale
                                style={[styles.themeRow, active && styles.themeRowActive]}
                                onPress={() => setThemeKey(item.key)}
                                accessibilityRole="radio"
                                accessibilityState={{ selected: active }}
                            >
                                <View style={styles.preview}>
                                    {PREVIEW[item.key].map(([bg, accent], i) => (
                                        <View key={i} style={[styles.previewHalf, { backgroundColor: bg }]}>
                                            <View style={[styles.previewBar, { backgroundColor: accent }]} />
                                        </View>
                                    ))}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={styles.labelRow}>
                                        <Ionicons name={item.icon} size={16} color={COLORS.primary} />
                                        <Text style={styles.label}>{item.label}</Text>
                                    </View>
                                    <Text style={styles.description}>{item.description}</Text>
                                </View>
                                <Ionicons
                                    name={active ? 'checkmark-circle' : 'ellipse-outline'}
                                    size={24}
                                    color={active ? COLORS.primary : COLORS.textLight}
                                />
                            </PressableScale>
                        </Animated.View>
                    );
                })}
            </View>
        </SafeAreaView>
    );
};

const styles = createThemedStyles(() => ({
    safeArea: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: SPACING.md, paddingTop: 10, paddingBottom: 12 },
    backBtn: {
        width: 42, height: 42, borderRadius: 21,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: COLORS.surfaceAlt,
    },
    title: { fontFamily: FONTS.heading, fontSize: 26, color: COLORS.textPrimary },
    subtitle: { marginTop: 3, fontFamily: FONTS.body, fontSize: 13, color: COLORS.textSecondary },
    content: { padding: SPACING.md, gap: 12 },
    themeRow: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: COLORS.surface,
        borderWidth: 1.5, borderColor: COLORS.border,
        borderRadius: BORDER_RADIUS.xl, padding: 14,
    },
    themeRowActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryMuted },
    preview: {
        width: 56, height: 56, borderRadius: 14, overflow: 'hidden',
        flexDirection: 'row', borderWidth: 1, borderColor: COLORS.border,
    },
    previewHalf: { flex: 1, justifyContent: 'flex-end', padding: 6 },
    previewBar: { height: 6, borderRadius: 3 },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    label: { fontFamily: FONTS.bodyBold, fontSize: FONT_SIZES.md + 1, color: COLORS.textPrimary },
    description: { fontFamily: FONTS.body, fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },
}));

export default ThemeSettingsScreen;
