import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../../constants/typography';
import { BORDER_RADIUS, SPACING } from '../../constants/layout';
import { formatDuration } from '../../utils/formatters';
import PlaceItem from './PlaceItem';

/**
 * Renders a single day within the itinerary plan.
 *
 * @param {object} dayPlan – { day: number, places: [], totalHours: number }
 */
const DayCard = ({ dayPlan }) => {
    return (
        <View style={styles.card}>
            {/* Day header */}
            <View style={styles.header}>
                <View style={styles.dayBadge}>
                    <Text style={styles.dayNumber}>{dayPlan.day}</Text>
                </View>
                <View>
                    <Text style={styles.dayTitle}>Gün {dayPlan.day}</Text>
                    <Text style={styles.dayMeta}>
                        {dayPlan.places.length} yer · {formatDuration(dayPlan.totalHours)}
                    </Text>
                </View>
            </View>

            {/* Places list */}
            <View style={styles.placesList}>
                {dayPlan.places.map((place, index) => (
                    <PlaceItem key={place.id} place={place} index={index} />
                ))}
                {dayPlan.places.length === 0 && (
                    <Text style={styles.emptyText}>Bu gün için yer bulunamadı.</Text>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,

        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    dayBadge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.sm,
    },
    dayNumber: {
        color: COLORS.textOnPrimary,
        fontSize: FONT_SIZES.lg,
        fontFamily: "Inter_700Bold",
    },
    dayTitle: {
        fontSize: FONT_SIZES.lg,
        fontFamily: "Inter_600SemiBold",
        color: COLORS.textPrimary,
    },
    dayMeta: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        marginTop: 1,
    },
    placesList: {
        marginTop: SPACING.sm,
    },
    emptyText: {
        color: COLORS.textLight,
        fontSize: FONT_SIZES.sm,
        textAlign: 'center',
        paddingVertical: SPACING.lg,
    },
});

export default DayCard;
