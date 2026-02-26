import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../../constants/typography';
import { BORDER_RADIUS, SPACING } from '../../constants/layout';

/**
 * Sorting dropdown/selector for the Discover screen.
 *
 * @param {string}   selected – Current sort key
 * @param {function} onSelect – Called with new sort key
 */

const SORT_OPTIONS = [
    { key: 'popularity', label: 'Popülerlik', icon: 'trending-up-outline' },
    { key: 'name', label: 'İsim (A-Z)', icon: 'text-outline' },
    { key: 'fee_asc', label: 'Ücret (Düşük)', icon: 'arrow-up-outline' },
    { key: 'fee_desc', label: 'Ücret (Yüksek)', icon: 'arrow-down-outline' },
];

const SortSelector = ({ selected, onSelect }) => {
    return (
        <View style={styles.container}>
            {SORT_OPTIONS.map((option) => {
                const isActive = selected === option.key;

                return (
                    <TouchableOpacity
                        key={option.key}
                        style={[styles.option, isActive && styles.optionActive]}
                        onPress={() => onSelect(option.key)}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={option.icon}
                            size={14}
                            color={isActive ? COLORS.primary : COLORS.textLight}
                        />
                        <Text style={[styles.label, isActive && styles.labelActive]}>
                            {option.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.md,
        gap: SPACING.sm,
        marginBottom: SPACING.sm,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: BORDER_RADIUS.sm,
        backgroundColor: COLORS.surfaceAlt,
    },
    optionActive: {
        backgroundColor: COLORS.primary + '15',
        borderWidth: 1,
        borderColor: COLORS.primary + '30',
    },
    label: {
        fontSize: 11,
        color: COLORS.textLight,
        fontFamily: "Inter_500Medium",
    },
    labelActive: {
        color: COLORS.primary,
        fontFamily: "Inter_600SemiBold",
    },
});

export default SortSelector;
