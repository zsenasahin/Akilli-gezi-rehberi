import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../../constants/typography';
import { BORDER_RADIUS, SPACING } from '../../constants/layout';
import { CATEGORIES } from '../../constants/categories';

/**
 * Horizontal scrollable category filter chips.
 *
 * @param {string}   selected  – Currently selected category key
 * @param {function} onSelect  – Called with category key when tapped
 * @param {string[]} [availableCategories] – If provided, only show these + 'all'
 */
const CategoryFilter = ({ selected, onSelect, availableCategories }) => {
    const categories = availableCategories
        ? CATEGORIES.filter(
            (c) => c.key === 'all' || availableCategories.includes(c.key)
        )
        : CATEGORIES;

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.container}
        >
            {categories.map((category) => {
                const isActive = selected === category.key;

                return (
                    <TouchableOpacity
                        key={category.key}
                        style={[
                            styles.chip,
                            isActive && styles.chipActive,
                            isActive && { backgroundColor: category.color },
                        ]}
                        onPress={() => onSelect(category.key)}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={category.icon}
                            size={14}
                            color={isActive ? '#fff' : COLORS.textSecondary}
                        />
                        <Text
                            style={[
                                styles.chipText,
                                isActive && styles.chipTextActive,
                            ]}
                        >
                            {category.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        gap: SPACING.sm,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.surfaceAlt,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    chipActive: {
        borderColor: 'transparent',
    },
    chipText: {
        fontSize: FONT_SIZES.xs,
        fontFamily: "Inter_500Medium",
        color: COLORS.textSecondary,
    },
    chipTextActive: {
        color: '#fff',
        fontFamily: "Inter_600SemiBold",
    },
});

export default CategoryFilter;
