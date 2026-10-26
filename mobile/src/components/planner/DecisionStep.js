import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/layout';
import PressableScale from './PressableScale';
import { createThemedStyles } from '../../utils/themedStyles';

const CONFLICT_ICONS = {
    overloaded_area: 'layers-outline',
    far_merge: 'git-compare-outline',
    not_enough_days: 'calendar-outline',
    too_many_full_day: 'sunny-outline',
    closing_time: 'time-outline',
};

/**
 * Plan motorunun kendi başına karar vermemesi gereken durumlarda kullanıcıya
 * seçenek sunar (ör. "C, D, E birbirine yakın ama tek güne sığmıyor").
 * Her seçenek, girdiyi değiştirip motoru yeniden çalıştırır.
 */
export default function DecisionStep({ conflicts, canIntensify, canAddDay, onAccept, onIntensify, onAddDay, onDrop, busy }) {
    return (
        <View>
            <Text style={styles.title}>Birkaç konuda fikrin lazım</Text>
            <Text style={styles.subtitle}>
                Seçtiğin yerleri haritada inceledim. Aşağıdaki durumlarda en iyi plan senin tercihine bağlı.
            </Text>

            {conflicts.map((conflict, index) => (
                <Animated.View key={conflict.id} entering={FadeInDown.delay(index * 120).springify().damping(16)} style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={styles.iconBubble}>
                            <Ionicons name={CONFLICT_ICONS[conflict.type] || 'help-circle-outline'} size={18} color={COLORS.earthDark} />
                        </View>
                        <Text style={styles.cardTitle}>{conflict.title}</Text>
                    </View>
                    <Text style={styles.cardMessage}>{conflict.message}</Text>

                    <View style={styles.placeChips}>
                        {conflict.places.map(place => (
                            <View key={String(place.id)} style={styles.placeChip}>
                                <Text style={styles.placeChipText} numberOfLines={1}>{place.name}</Text>
                            </View>
                        ))}
                    </View>

                    {conflict.suggestedDrops?.length > 0 && (
                        <>
                            <Text style={styles.dropLabel}>Bir yeri çıkararak çöz:</Text>
                            <View style={styles.dropRow}>
                                {conflict.suggestedDrops.map(place => (
                                    <PressableScale key={String(place.id)} style={styles.dropChip} onPress={() => onDrop(place.id)} disabled={busy}>
                                        <Ionicons name="remove-circle-outline" size={14} color={COLORS.error} />
                                        <Text style={styles.dropChipText} numberOfLines={1}>{place.name}</Text>
                                    </PressableScale>
                                ))}
                            </View>
                        </>
                    )}
                </Animated.View>
            ))}

            <Animated.View entering={FadeInDown.delay(conflicts.length * 120 + 80)} style={styles.actions}>
                {canIntensify && (
                    <ActionButton
                        icon="flash-outline"
                        title="Tempoyu yoğun yap"
                        description="Günler 08:30–19:30 arası planlanır, daha çok yer sığar."
                        onPress={onIntensify}
                        disabled={busy}
                    />
                )}
                {canAddDay && (
                    <ActionButton
                        icon="add-circle-outline"
                        title="Geziye 1 gün ekle"
                        description="Bitiş tarihini bir gün uzatır, yerler daha rahat dağılır."
                        onPress={onAddDay}
                        disabled={busy}
                    />
                )}
                <ActionButton
                    icon="checkmark-done-outline"
                    title="Önerdiğin şekilde devam et"
                    description={conflicts.map(c => c.compromise).filter(Boolean).join(' ')}
                    onPress={onAccept}
                    disabled={busy}
                    primary
                />
            </Animated.View>
        </View>
    );
}

function ActionButton({ icon, title, description, onPress, disabled, primary }) {
    return (
        <PressableScale style={[styles.action, primary && styles.actionPrimary]} onPress={onPress} disabled={disabled} accessibilityRole="button">
            <View style={[styles.actionIcon, primary && styles.actionIconPrimary]}>
                <Ionicons name={icon} size={20} color={primary ? COLORS.primary : COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.actionTitle, primary && { color: '#fff' }]}>{title}</Text>
                {description ? <Text style={[styles.actionDescription, primary && { color: 'rgba(255,255,255,0.85)' }]}>{description}</Text> : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={primary ? '#fff' : COLORS.textLight} />
        </PressableScale>
    );
}

const styles = createThemedStyles(() => ({
    title: { fontFamily: FONTS.heading, fontSize: FONT_SIZES.xxl, color: COLORS.textPrimary, letterSpacing: -0.4 },
    subtitle: { fontFamily: FONTS.body, fontSize: FONT_SIZES.md, color: COLORS.textSecondary, lineHeight: 21, marginTop: SPACING.xs, marginBottom: SPACING.lg },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: SPACING.md,
        marginBottom: SPACING.md,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    iconBubble: {
        width: 34, height: 34, borderRadius: 17,
        backgroundColor: COLORS.earthLight,
        alignItems: 'center', justifyContent: 'center',
    },
    cardTitle: { flex: 1, fontFamily: FONTS.bodyBold, fontSize: FONT_SIZES.md, color: COLORS.textPrimary },
    cardMessage: { fontFamily: FONTS.body, fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, lineHeight: 19, marginTop: SPACING.sm },
    placeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: SPACING.sm },
    placeChip: { backgroundColor: COLORS.primaryMuted, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 10, paddingVertical: 4, maxWidth: '100%' },
    placeChipText: { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.xs, color: COLORS.primary },
    dropLabel: { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: SPACING.md },
    dropRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
    dropChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        borderWidth: 1, borderColor: 'rgba(181,82,59,0.35)',
        borderRadius: BORDER_RADIUS.full,
        paddingHorizontal: 10, paddingVertical: 5,
        maxWidth: '100%',
    },
    dropChipText: { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.xs, color: COLORS.error, flexShrink: 1 },
    actions: { gap: SPACING.sm, marginTop: SPACING.xs },
    action: {
        flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1, borderColor: COLORS.border,
        padding: SPACING.md,
    },
    actionPrimary: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    actionIcon: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: COLORS.primaryMuted,
        alignItems: 'center', justifyContent: 'center',
    },
    actionIconPrimary: { backgroundColor: COLORS.surface },
    actionTitle: { fontFamily: FONTS.bodyBold, fontSize: FONT_SIZES.md, color: COLORS.textPrimary },
    actionDescription: { fontFamily: FONTS.body, fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2, lineHeight: 16 },
}));
