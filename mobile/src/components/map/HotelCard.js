import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/layout';

/**
 * Otel öneri kartı — Overpass API'den gelen otel verilerini gösterir.
 */
const HotelCard = ({ hotel, onSelect, selected }) => (
    <TouchableOpacity
        style={[styles.card, selected && styles.cardSelected]}
        onPress={() => onSelect(hotel)}
        activeOpacity={0.8}
    >
        <View style={styles.iconContainer}>
            <Text style={styles.icon}>🏨</Text>
        </View>
        <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>{hotel.name || 'İsimsiz Otel'}</Text>
            {hotel.stars > 0 && (
                <Text style={styles.stars}>{'⭐'.repeat(Math.min(hotel.stars, 5))}</Text>
            )}
            {hotel.address && (
                <Text style={styles.address} numberOfLines={1}>{hotel.address}</Text>
            )}
            {hotel.distance && (
                <Text style={styles.distance}>
                    <Ionicons name="location-outline" size={11} color={COLORS.textSecondary} />
                    {' '}{hotel.distance < 1000 ? `${hotel.distance}m` : `${(hotel.distance / 1000).toFixed(1)}km`}
                </Text>
            )}
        </View>
        {selected && (
            <View style={styles.checkContainer}>
                <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
            </View>
        )}
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.sm,
        marginBottom: SPACING.xs,
        borderWidth: 2,
        borderColor: 'transparent',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    cardSelected: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryMuted,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: COLORS.primaryMuted,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.sm,
    },
    icon: { fontSize: 22 },
    info: { flex: 1 },
    name: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
    },
    stars: { fontSize: 10, marginTop: 2 },
    address: {
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
    checkContainer: {
        marginLeft: SPACING.xs,
    },
});

export default HotelCard;
