import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/layout';
import { getTurizmAktiviteleri } from '../../services/turizmAktiviteService';
import SmartImage from '../common/SmartImage';
import PressableScale from '../planner/PressableScale';
import { createThemedStyles } from '../../utils/themedStyles';

/** Şehirde yapılabilecek turizm aktiviteleri (kayak, kamp, rafting…). */
export default function CityActivities({ cityName }) {
    const activities = useMemo(() => getTurizmAktiviteleri({ cityName }), [cityName]);
    if (!activities.length) return null;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="compass-outline" size={18} color={COLORS.primary} />
                <Text style={styles.title}>Bu şehirde yapılacaklar</Text>
                <Text style={styles.count}>{activities.length}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                {activities.map(activity => (
                    <PressableScale
                        key={activity.id}
                        style={styles.card}
                        onPress={() => activity.url && WebBrowser.openBrowserAsync(activity.url)}
                        accessibilityRole="button"
                        accessibilityLabel={`${activity.title}, ${activity.type}`}
                    >
                        <SmartImage thumbnail uri={activity.imageUrl} style={StyleSheet.absoluteFill} contentFit="cover" />
                        <LinearGradient colors={COLORS.gradients.cardOverlay} style={StyleSheet.absoluteFill} />
                        <View style={styles.badge}><Text style={styles.badgeText} numberOfLines={1}>{activity.type}</Text></View>
                        <Text style={styles.cardTitle} numberOfLines={2}>{activity.title}</Text>
                    </PressableScale>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = createThemedStyles(() => ({
    container: { marginBottom: SPACING.md },
    header: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: SPACING.md, marginBottom: SPACING.sm },
    title: { flex: 1, fontFamily: FONTS.bodyBold, fontSize: FONT_SIZES.md, color: COLORS.textPrimary },
    count: { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
    row: { paddingHorizontal: SPACING.md, gap: SPACING.sm },
    card: { width: 170, height: 120, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', backgroundColor: COLORS.surfaceAlt, justifyContent: 'flex-end' },
    badge: {
        position: 'absolute', top: 8, left: 8, maxWidth: 150,
        backgroundColor: 'rgba(255,253,248,0.9)', borderRadius: BORDER_RADIUS.full,
        paddingHorizontal: 8, paddingVertical: 3,
    },
    badgeText: { fontFamily: FONTS.bodySemiBold, fontSize: 10, color: COLORS.primary },
    cardTitle: { fontFamily: FONTS.bodyBold, fontSize: FONT_SIZES.sm, color: '#fff', padding: SPACING.sm },
}));
