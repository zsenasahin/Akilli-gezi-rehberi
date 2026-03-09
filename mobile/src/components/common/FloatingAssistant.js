/**
 * FloatingAssistant — Uygulama genelindeki AI Asistan Kedi Butonu
 *
 * Vodafone / SuperOnline tarzı "rehber" konsepti.
 * - Tüm tab ekranlarında sağ altta görünür
 * - Tıklanınca TravelAssistant ekranına açılır
 * - Pulse animasyonu + kedi karakteri
 * - İlk girişte küçük bir "bubble" gösterir
 */
import React, { useRef, useEffect, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { BORDER_RADIUS, SPACING } from '../../constants/layout';

const FloatingAssistant = ({ navigation, context = {} }) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const floatAnim = useRef(new Animated.Value(0)).current;
    const bubbleOpacity = useRef(new Animated.Value(0)).current;
    const bubbleTranslate = useRef(new Animated.Value(10)).current;
    const [showBubble, setShowBubble] = useState(true);

    // Sürekli yüzen animasyon (yukarı-aşağı)
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, {
                    toValue: -8,
                    duration: 1800,
                    useNativeDriver: true,
                }),
                Animated.timing(floatAnim, {
                    toValue: 0,
                    duration: 1800,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    // Pulse ring animasyonu
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.25,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    // Bubble'ı 3 saniye sonra gizle
    useEffect(() => {
        // Bir süre bekleyip bubble'ı göster
        const showTimer = setTimeout(() => {
            Animated.parallel([
                Animated.timing(bubbleOpacity, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.timing(bubbleTranslate, {
                    toValue: 0,
                    duration: 400,
                    useNativeDriver: true,
                }),
            ]).start();
        }, 1200);

        // 5 saniye sonra gizle
        const hideTimer = setTimeout(() => {
            Animated.parallel([
                Animated.timing(bubbleOpacity, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(bubbleTranslate, {
                    toValue: 10,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start(() => setShowBubble(false));
        }, 6000);

        return () => {
            clearTimeout(showTimer);
            clearTimeout(hideTimer);
        };
    }, []);

    const handlePress = () => {
        navigation.navigate('TravelAssistant', { context });
    };

    return (
        <View style={styles.container} pointerEvents="box-none">
            {/* Konuşma balonu */}
            {showBubble && (
                <Animated.View
                    style={[
                        styles.bubble,
                        {
                            opacity: bubbleOpacity,
                            transform: [{ translateY: bubbleTranslate }],
                        },
                    ]}
                    pointerEvents="none"
                >
                    <Text style={styles.bubbleText}>
                        Merhaba! 🐾{'\n'}Sana nasıl yardımcı{'\n'}olabilirim?
                    </Text>
                    <View style={styles.bubbleTail} />
                </Animated.View>
            )}

            {/* Pulse ring */}
            <Animated.View
                style={[
                    styles.pulseRing,
                    { transform: [{ scale: pulseAnim }] },
                ]}
                pointerEvents="none"
            />

            {/* Ana buton */}
            <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
                <TouchableOpacity
                    style={styles.button}
                    onPress={handlePress}
                    activeOpacity={0.85}
                >
                    <Text style={styles.catEmoji}>🐱</Text>
                    <View style={styles.onlineBadge} />
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 94 : 86,
        right: SPACING.md,
        alignItems: 'flex-end',
        zIndex: 999,
    },

    // ─── Konuşma Balonu ───
    bubble: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        paddingHorizontal: SPACING.sm + 2,
        paddingVertical: SPACING.sm,
        marginBottom: SPACING.xs,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 6,
        borderWidth: 1,
        borderColor: COLORS.border,
        maxWidth: 160,
    },
    bubbleText: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textPrimary,
        lineHeight: 18,
    },
    bubbleTail: {
        position: 'absolute',
        bottom: -8,
        right: 20,
        width: 0,
        height: 0,
        borderLeftWidth: 7,
        borderRightWidth: 7,
        borderTopWidth: 8,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: COLORS.surface,
    },

    // ─── Pulse Ring ───
    pulseRing: {
        position: 'absolute',
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.primary + '20',
        top: -3,
        right: -3,
    },

    // ─── Ana Buton ───
    button: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
        borderWidth: 2,
        borderColor: COLORS.primaryMuted,
    },
    catEmoji: {
        fontSize: 28,
    },
    onlineBadge: {
        position: 'absolute',
        bottom: 3,
        right: 3,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: COLORS.success,
        borderWidth: 2,
        borderColor: '#fff',
    },
});

export default FloatingAssistant;
