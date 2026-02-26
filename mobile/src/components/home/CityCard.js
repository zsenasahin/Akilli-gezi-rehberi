import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../../constants/typography';
import { BORDER_RADIUS, SPACING } from '../../constants/layout';

/**
 * City selection card for the home screen.
 *
 * @param {object}   city     – { id, name, region }
 * @param {function} onPress  – Called with city when tapped
 */

// Map cities to emoji icons for MVP (replace with images later)
const CITY_ICONS = {
    istanbul: '🕌',
    konya: '🌾',
    antalya: '🏖️',
};

const CityCard = ({ city, onPress }) => {
    const icon = CITY_ICONS[city.name?.toLowerCase()] || '🏙️';

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={() => onPress(city)}
            activeOpacity={0.85}
        >
            <Text style={styles.emoji}>{icon}</Text>
            <View style={styles.info}>
                <Text style={styles.name}>{city.name}</Text>
                <Text style={styles.region}>{city.region}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.sm,

        // Shadow (iOS)
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        // Shadow (Android)
        elevation: 2,
    },
    emoji: {
        fontSize: 36,
        marginRight: SPACING.md,
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: FONT_SIZES.lg,
        fontFamily: "Inter_600SemiBold",
        color: COLORS.textPrimary,
    },
    region: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
});

export default CityCard;
