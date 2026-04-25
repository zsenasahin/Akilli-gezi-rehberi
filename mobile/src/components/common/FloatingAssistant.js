/**
 * FloatingAssistant — Uygulama genelindeki AI Kedi Asistan Butonu 🐱
 *
 * - Tüm ekranlarda sağ alt köşede görünür (tab bar'ın üstünde)
 * - AssistantContext'ten mevcut ekranın bağlamını okur
 * - Gezi planındayken planı da bilir, şehirdeyken şehri de
 * - Pulse + yüzme animasyonu, açılışta konuşma balonu
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
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { BORDER_RADIUS, SPACING } from '../../constants/layout';
import { useAssistantContext } from '../../contexts/AssistantContext';
// import CatMascot from './CatMascot'; // Geçici olarak kapalı - development build gerekiyor

const FloatingAssistant = () => {
    const navigation = useNavigation();
    const { context } = useAssistantContext();

    const pulseAnim = useRef(new Animated.Value(1)).current;
    const floatAnim = useRef(new Animated.Value(0)).current;
    const bubbleOpacity = useRef(new Animated.Value(0)).current;
    const bubbleTranslate = useRef(new Animated.Value(10)).current;
    const jumpScale = useRef(new Animated.Value(1)).current;
    const [showBubble, setShowBubble] = useState(true);

    // Sürekli yüzme — yukarı/aşağı
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, { toValue: -7, duration: 1800, useNativeDriver: true }),
                Animated.timing(floatAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    // Nabız halka
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.28, duration: 1100, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1100, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    // Konuşma balonu: 1.2s sonra göster, 6s sonra kapat
    useEffect(() => {
        const show = setTimeout(() => {
            Animated.parallel([
                Animated.timing(bubbleOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
                Animated.timing(bubbleTranslate, { toValue: 0, duration: 350, useNativeDriver: true }),
            ]).start();
        }, 1200);
        const hide = setTimeout(() => {
            Animated.parallel([
                Animated.timing(bubbleOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
                Animated.timing(bubbleTranslate, { toValue: 10, duration: 250, useNativeDriver: true }),
            ]).start(() => setShowBubble(false));
        }, 6000);
        return () => { clearTimeout(show); clearTimeout(hide); };
    }, []);

    // Bağlam bazlı baloncuk metni
    const getBubbleText = () => {
        if (context?.screen === 'itinerary' && context?.city) {
            return `${context.city} gezin\nhakkında soru sor! 🗺️`;
        }
        if (context?.screen === 'city' && context?.city) {
            return `${context.city} hakkında\nne merak ediyorsun? 🏙️`;
        }
        return `Merhaba! 🐾\nNasıl yardımcı\nolabilirim?`;
    };

    const handlePress = () => {
        // Zıplama animasyonu
        Animated.sequence([
            Animated.timing(jumpScale, { toValue: 1.25, duration: 80, useNativeDriver: true }),
            Animated.timing(jumpScale, { toValue: 1, duration: 80, useNativeDriver: true }),
        ]).start();
        navigation.navigate('TravelAssistant', { context });
    };

    return (
        <View style={styles.container} pointerEvents="box-none">
            {/* Konuşma balonu */}
            {showBubble && (
                <Animated.View
                    style={[
                        styles.bubble,
                        { opacity: bubbleOpacity, transform: [{ translateY: bubbleTranslate }] },
                    ]}
                    pointerEvents="none"
                >
                    <Text style={styles.bubbleText}>{getBubbleText()}</Text>
                    <View style={styles.bubbleTail} />
                </Animated.View>
            )}

            {/* Nabız halka */}
            <Animated.View
                style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]}
                pointerEvents="none"
            />

            {/* Ana buton */}
            <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
                <Animated.View style={{ transform: [{ scale: jumpScale }] }}>
                    <TouchableOpacity style={styles.button} onPress={handlePress} activeOpacity={0.85}>
                        <Text style={styles.catEmoji}>🐱</Text>
                        <View style={styles.onlineBadge} />
                    </TouchableOpacity>
                </Animated.View>
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

    // Konuşma Balonu
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
        bottom: -8, right: 20,
        width: 0, height: 0,
        borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 8,
        borderLeftColor: 'transparent', borderRightColor: 'transparent',
        borderTopColor: COLORS.surface,
    },

    // Nabız
    pulseRing: {
        position: 'absolute',
        width: 76, height: 76, borderRadius: 38,
        backgroundColor: COLORS.primary + '1A',
        top: -4, right: -4,
    },

    // Buton
    button: {
        width: 68, height: 68, borderRadius: 34,
        backgroundColor: '#fff',
        justifyContent: 'center', alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.28,
        shadowRadius: 14,
        elevation: 8,
        borderWidth: 2,
        borderColor: COLORS.primaryMuted,
    },
    catEmoji: { fontSize: 28 },
    onlineBadge: {
        position: 'absolute', bottom: 3, right: 3,
        width: 12, height: 12, borderRadius: 6,
        backgroundColor: COLORS.success,
        borderWidth: 2, borderColor: '#fff',
    },
});

export default FloatingAssistant;
