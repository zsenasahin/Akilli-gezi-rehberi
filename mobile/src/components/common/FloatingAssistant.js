import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { BORDER_RADIUS, SPACING } from '../../constants/layout';
import { useAssistantContext } from '../../contexts/AssistantContext';

const FloatingAssistant = () => {
    const navigation = useNavigation();
    const { context } = useAssistantContext();

    const floatAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const pressAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, {
                    toValue: -5,
                    duration: 2200,
                    useNativeDriver: true,
                }),
                Animated.timing(floatAnim, {
                    toValue: 0,
                    duration: 2200,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [floatAnim]);

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.08,
                    duration: 1600,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1600,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [pulseAnim]);

    const handlePress = () => {
        Animated.sequence([
            Animated.timing(pressAnim, { toValue: 0.95, duration: 80, useNativeDriver: true }),
            Animated.timing(pressAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
        ]).start();

        navigation.navigate('TravelAssistant', { context });
    };

    const label = context?.city ? `${context.city} asistanı` : 'Gezi asistanı';

    return (
        <View style={styles.container} pointerEvents="box-none">
            <Animated.View
                pointerEvents="none"
                style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]}
            />

            <Animated.View
                style={{
                    transform: [{ translateY: floatAnim }, { scale: pressAnim }],
                }}
            >
                <TouchableOpacity style={styles.button} onPress={handlePress} activeOpacity={0.9}>
                    <LinearGradient colors={COLORS.gradients.primary} style={styles.iconWrap}>
                        <Ionicons name="chatbubble-ellipses" size={16} color="#fff" />
                    </LinearGradient>
                    <View style={styles.labelWrap}>
                        <Text style={styles.label}>Asistan</Text>
                        <Text style={styles.subLabel} numberOfLines={1}>
                            {label}
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 86 : 76,
        right: SPACING.md,
        zIndex: 1000,
    },
    pulseRing: {
        position: 'absolute',
        top: 6,
        left: 12,
        right: 12,
        bottom: 6,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.primary + '10',
    },
    button: {
        minWidth: 164,
        height: 56,
        paddingHorizontal: 12,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        shadowColor: '#10211A',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.12,
        shadowRadius: 18,
        elevation: 6,
    },
    iconWrap: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    labelWrap: {
        flex: 1,
    },
    label: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
        fontWeight: '700',
    },
    subLabel: {
        marginTop: 1,
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
    },
});

export default FloatingAssistant;
