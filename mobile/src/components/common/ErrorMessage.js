import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../../constants/colors';
import { FONT_SIZES } from '../../constants/typography';
import { BORDER_RADIUS, SPACING } from '../../constants/layout';

/**
 * Inline error banner with optional retry action.
 * @param {string}   message – Error message
 * @param {function} onRetry – Optional retry callback
 */
const ErrorMessage = ({ message, onRetry }) => (
    <View style={styles.container}>
        <Text style={styles.text}>⚠️ {message}</Text>
        {onRetry && (
            <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
                <Text style={styles.retryText}>Tekrar Dene</Text>
            </TouchableOpacity>
        )}
    </View>
);

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FEF2F2', // light red tint
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        marginVertical: SPACING.sm,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.error,
    },
    text: {
        color: COLORS.error,
        fontSize: FONT_SIZES.sm,
        fontFamily: 'Inter_400Regular',
    },
    retryButton: {
        marginTop: SPACING.sm,
        alignSelf: 'flex-start',
    },
    retryText: {
        color: COLORS.primary,
        fontSize: FONT_SIZES.sm,
        fontFamily: 'Inter_600SemiBold',
    },
});

export default ErrorMessage;
