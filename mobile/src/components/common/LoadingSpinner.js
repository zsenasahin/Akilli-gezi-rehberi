import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { COLORS } from '../../constants/colors';
import { FONT_SIZES } from '../../constants/typography';

/**
 * Full-screen loading spinner with optional message.
 * @param {string} message – Optional loading message
 */
const LoadingSpinner = ({ message = 'Yükleniyor...' }) => (
    <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        {message && <Text style={styles.text}>{message}</Text>}
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    text: {
        marginTop: 12,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        fontFamily: 'Inter_400Regular',
    },
});

export default LoadingSpinner;
