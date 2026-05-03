import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemePreference } from '../../contexts/ThemeContext';
import { FONTS } from '../../constants/typography';
import { SPACING } from '../../constants/layout';

const ThemeSettingsScreen = ({ navigation }) => {
    const { theme, themes, themeKey, setThemeKey } = useThemePreference();

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.colors.surfaceSoft }]} onPress={() => navigation.goBack()} activeOpacity={0.82}>
                    <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
                </TouchableOpacity>
                <View>
                    <Text style={[styles.title, { color: theme.colors.text }]}>Tema değiştir</Text>
                    <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Tüm uygulamada kullanılacak açık veya koyu görünümü seç.</Text>
                </View>
            </View>

            <View style={styles.content}>
                {themes.map((item) => (
                    <TouchableOpacity
                        key={item.key}
                        style={[styles.themeRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                        onPress={() => setThemeKey(item.key)}
                        activeOpacity={0.82}
                    >
                        <View style={styles.swatches}>
                            <View style={[styles.swatch, { backgroundColor: item.colors.background }]} />
                            <View style={[styles.swatch, { backgroundColor: item.colors.surface }]} />
                            <View style={[styles.swatch, { backgroundColor: item.colors.primary }]} />
                        </View>
                        <Text style={[styles.label, { color: theme.colors.text }]}>{item.label}</Text>
                        {themeKey === item.key ? <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary} /> : <Ionicons name="ellipse-outline" size={22} color={theme.colors.textSecondary} />}
                    </TouchableOpacity>
                ))}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: SPACING.md, paddingTop: 10, paddingBottom: 12 },
    backBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
    title: { fontFamily: FONTS.heading, fontSize: 26 },
    subtitle: { marginTop: 3, fontFamily: FONTS.body, fontSize: 13 },
    content: { padding: SPACING.md, gap: 12 },
    themeRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 22, padding: 16 },
    swatches: { flexDirection: 'row', gap: 8, marginRight: 14 },
    swatch: { width: 22, height: 22, borderRadius: 11 },
    label: { flex: 1, fontFamily: FONTS.bodySemiBold, fontSize: 15 },
});

export default ThemeSettingsScreen;
