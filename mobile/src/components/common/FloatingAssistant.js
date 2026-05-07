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
import LottieView from 'lottie-react-native';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { BORDER_RADIUS, SPACING } from '../../constants/layout';
import { useAssistantContext } from '../../contexts/AssistantContext';

const FloatingAssistant = () => {
    const navigation = useNavigation();
    const { context } = useAssistantContext();
    const lottieRef = useRef(null);

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
                Animated.timing(floatAnim, { toValue: -7, duration: 2000, useNativeDriver: true }),
                Animated.timing(floatAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    // Nabız halka
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.2, duration: 1500, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    // Konuşma balonu: 1.5s sonra göster, 7s sonra kapat
    useEffect(() => {
        const show = setTimeout(() => {
            Animated.parallel([
                Animated.timing(bubbleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
                Animated.timing(bubbleTranslate, { toValue: 0, duration: 400, useNativeDriver: true }),
            ]).start();
        }, 1500);
        const hide = setTimeout(() => {
            Animated.parallel([
                Animated.timing(bubbleOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
                Animated.timing(bubbleTranslate, { toValue: 10, duration: 300, useNativeDriver: true }),
            ]).start(() => setShowBubble(false));
        }, 8500);
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
        return `Merhaba! 👋\nSana nasıl yardımcı\nolabilirim?`;
    };

    const handlePress = () => {
        // Zıplama animasyonu
        Animated.sequence([
            Animated.timing(jumpScale, { toValue: 1.15, duration: 100, useNativeDriver: true }),
            Animated.timing(jumpScale, { toValue: 1, duration: 100, useNativeDriver: true }),
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
                    <TouchableOpacity style={styles.button} onPress={handlePress} activeOpacity={0.9}>
                        <LottieView
                            ref={lottieRef}
                            source={require('../../../assets/animations/Headphone with blueberry cartoon.json')}
                            autoPlay
                            loop
                            style={styles.lottie}
                        />
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
        bottom: Platform.OS === 'ios' ? 84 : 74,
        right: SPACING.md,
        alignItems: 'flex-end',
        zIndex: 1000,
    },

    // Konuşma Balonu
    bubble: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        paddingHorizontal: SPACING.sm + 4,
        paddingVertical: SPACING.sm,
        marginBottom: SPACING.xs,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 6,
        borderWidth: 1,
        borderColor: COLORS.border,
        maxWidth: 160,
    },
    bubbleText: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs - 1,
        color: COLORS.textPrimary,
        lineHeight: 16,
        fontWeight: '500',
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
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: COLORS.primary + '15',
        bottom: -6, right: -6,
    },

    // Buton
    button: {
        width: 68, height: 68, borderRadius: 34,
        backgroundColor: '#fff',
        justifyContent: 'center', alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        overflow: 'hidden',
    },
    lottie: {
        width: '120%',
        height: '120%',
    },
    onlineBadge: {
        position: 'absolute', bottom: 8, right: 8,
        width: 12, height: 12, borderRadius: 6,
        backgroundColor: COLORS.success,
        borderWidth: 2, borderColor: '#fff',
        zIndex: 10,
    },
});

export default FloatingAssistant;

