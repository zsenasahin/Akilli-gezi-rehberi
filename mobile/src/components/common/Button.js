import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS } from '../../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../../constants/typography';
import { BORDER_RADIUS, SPACING } from '../../constants/layout';

/**
 * Reusable button component with primary/secondary/outline variants.
 *
 * @param {string}   title     – Button label
 * @param {function} onPress   – Press handler
 * @param {string}   variant   – 'primary' | 'secondary' | 'outline'
 * @param {boolean}  loading   – Shows a spinner instead of text
 * @param {boolean}  disabled  – Disables the button
 * @param {object}   style     – Additional custom styles
 */
const Button = ({
    title,
    onPress,
    variant = 'primary',
    loading = false,
    disabled = false,
    style,
}) => {
    const isDisabled = disabled || loading;

    return (
        <TouchableOpacity
            style={[
                styles.base,
                styles[variant],
                isDisabled && styles.disabled,
                style,
            ]}
            onPress={onPress}
            disabled={isDisabled}
            activeOpacity={0.8}
        >
            {loading ? (
                <ActivityIndicator
                    color={variant === 'outline' ? COLORS.primary : COLORS.textOnPrimary}
                />
            ) : (
                <Text style={[styles.text, styles[`${variant}Text`]]}>
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    base: {
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        borderRadius: BORDER_RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 50,
    },
    primary: {
        backgroundColor: COLORS.primary,
    },
    secondary: {
        backgroundColor: COLORS.accent,
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: COLORS.primary,
    },
    disabled: {
        opacity: 0.5,
    },
    text: {
        fontSize: FONT_SIZES.md,
        fontFamily: 'Inter_600SemiBold',
    },
    primaryText: {
        color: COLORS.textOnPrimary,
    },
    secondaryText: {
        color: COLORS.textOnPrimary,
    },
    outlineText: {
        color: COLORS.primary,
    },
});

export default Button;
