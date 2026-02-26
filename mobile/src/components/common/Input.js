import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';
import { FONT_SIZES } from '../../constants/typography';
import { BORDER_RADIUS, SPACING } from '../../constants/layout';

/**
 * Reusable text input with a floating-style label.
 *
 * @param {string}   label        – Field label
 * @param {string}   value        – Controlled value
 * @param {function} onChangeText – Change handler
 * @param {string}   placeholder  – Placeholder text
 * @param {string}   error        – Error message to display
 * @param {boolean}  secureTextEntry – Obscure text (passwords)
 * @param {string}   keyboardType – Keyboard type
 * @param {object}   style        – Additional styles for the container
 */
const Input = ({
    label,
    value,
    onChangeText,
    placeholder,
    error,
    secureTextEntry = false,
    keyboardType = 'default',
    style,
    ...rest
}) => {
    return (
        <View style={[styles.container, style]}>
            {label && <Text style={styles.label}>{label}</Text>}
            <TextInput
                style={[styles.input, error && styles.inputError]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={COLORS.textLight}
                secureTextEntry={secureTextEntry}
                keyboardType={keyboardType}
                autoCapitalize="none"
                {...rest}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: SPACING.md,
    },
    label: {
        fontFamily: 'Inter_500Medium',
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xs,
    },
    input: {
        fontFamily: 'Inter_400Regular',
        backgroundColor: COLORS.surfaceAlt,
        borderRadius: BORDER_RADIUS.lg,
        paddingHorizontal: SPACING.md,
        paddingVertical: 14,
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        borderWidth: 1.5,
        borderColor: COLORS.border,
    },
    inputError: {
        borderColor: COLORS.error,
    },
    errorText: {
        color: COLORS.error,
        fontSize: FONT_SIZES.xs,
        marginTop: SPACING.xs,
    },
});

export default Input;
