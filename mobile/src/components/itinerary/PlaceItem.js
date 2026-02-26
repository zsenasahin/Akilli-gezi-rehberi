import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../../constants/typography';
import { BORDER_RADIUS, SPACING } from '../../constants/layout';
import { formatCurrency, formatDuration } from '../../utils/formatters';

/**
 * A single place item within an itinerary day card.
 *
 * @param {object} place – Place row from database
 * @param {number} index – Order index for numbering
 */

// Map categories to icons
const CATEGORY_ICONS = {
    historical: 'time-outline',
    nature: 'leaf-outline',
    museum: 'business-outline',
    food: 'restaurant-outline',
    shopping: 'cart-outline',
    beach: 'sunny-outline',
    religious: 'moon-outline',
};

const PlaceItem = ({ place, index }) => {
    const iconName = CATEGORY_ICONS[place.category] || 'location-outline';

    return (
        <View style={styles.container}>
            <View style={styles.indexBadge}>
                <Text style={styles.indexText}>{index + 1}</Text>
            </View>

            <View style={styles.content}>
                <View style={styles.header}>
                    <Ionicons name={iconName} size={16} color={COLORS.primary} />
                    <Text style={styles.name}>{place.name}</Text>
                </View>

                <View style={styles.meta}>
                    <Text style={styles.metaText}>
                        🕐 {formatDuration(place.avg_duration)}
                    </Text>
                    <Text style={styles.metaText}>
                        💰 {formatCurrency(place.entry_fee)}
                    </Text>
                    <Text style={styles.categoryBadge}>{place.category}</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.divider,
    },
    indexBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.sm,
        marginTop: 2,
    },
    indexText: {
        fontSize: FONT_SIZES.xs,
        fontFamily: "Inter_700Bold",
        color: COLORS.primaryDark,
    },
    content: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    name: {
        fontSize: FONT_SIZES.md,
        fontFamily: "Inter_500Medium",
        color: COLORS.textPrimary,
        flex: 1,
    },
    meta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 12,
    },
    metaText: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
    },
    categoryBadge: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.primary,
        backgroundColor: COLORS.primaryLight + '30', // 30% opacity
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: BORDER_RADIUS.sm,
        overflow: 'hidden',
        textTransform: 'capitalize',
    },
});

export default PlaceItem;
