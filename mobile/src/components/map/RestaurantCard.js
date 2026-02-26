import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONT_SIZES } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/layout';

/**
 * Restoran kartı — Overpass API'den gelen restoran verilerini gösterir.
 */
const RestaurantCard = ({ restaurant }) => (
    <View style={styles.card}>
        <View style={styles.iconContainer}>
            <Text style={styles.icon}>🍽️</Text>
        </View>
        <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>{restaurant.name || 'İsimsiz Restoran'}</Text>
            {restaurant.cuisine && (
                <Text style={styles.cuisine} numberOfLines={1}>
                    <Ionicons name="restaurant-outline" size={11} color={COLORS.textSecondary} />
                    {' '}{restaurant.cuisine}
                </Text>
            )}
            {restaurant.distance && (
                <Text style={styles.distance}>
                    📏 {restaurant.distance < 1000 ? `${restaurant.distance}m` : `${(restaurant.distance / 1000).toFixed(1)}km`}
                </Text>
            )}
        </View>
        <Ionicons name="navigate-outline" size={18} color={COLORS.primary} />
    </View>
);

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.sm,
        marginBottom: SPACING.xs,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#FEF3C7',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.sm,
    },
    icon: { fontSize: 20 },
    info: { flex: 1 },
    name: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
    },
    cuisine: {
        fontFamily: 'Inter_400Regular',
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    distance: {
        fontFamily: 'Inter_400Regular',
        fontSize: FONT_SIZES.xs,
        color: COLORS.textLight,
        marginTop: 2,
    },
});

export default RestaurantCard;
