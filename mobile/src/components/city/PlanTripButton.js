import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    Easing, FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/layout';
import PressableScale from '../planner/PressableScale';
import { createThemedStyles } from '../../utils/themedStyles';

/**
 * Şehir ekranının altında yüzen "Gezi Planla" butonu.
 * Aşağıdan yaylı giriş yapar; birkaç saniyede bir üzerinden ışık geçer ve
 * ikon hafifçe nefes alır — dikkat çeker ama göz yormaz.
 */
export default function PlanTripButton({ cityName, onPress }) {
    const shine = useSharedValue(-1);
    const pulse = useSharedValue(1);

    useEffect(() => {
        shine.value = withRepeat(
            withDelay(2600, withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) })),
            -1,
            false,
        );
        pulse.value = withRepeat(
            withSequence(withTiming(1.08, { duration: 900 }), withTiming(1, { duration: 900 })),
            -1,
            false,
        );
    }, [shine, pulse]);

    const shineStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: shine.value * 320 }, { rotate: '18deg' }],
    }));
    const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

    return (
        <Animated.View entering={FadeInDown.delay(350).springify().damping(16)} style={styles.wrapper} pointerEvents="box-none">
            <PressableScale onPress={onPress} style={styles.shadow} accessibilityRole="button" accessibilityLabel={`${cityName} için gezi planla`}>
                <LinearGradient colors={COLORS.gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
                    <Animated.View style={[styles.shine, shineStyle]} pointerEvents="none">
                        <LinearGradient
                            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']}
                            start={{ x: 0, y: 0.5 }}
                            end={{ x: 1, y: 0.5 }}
                            style={StyleSheet.absoluteFill}
                        />
                    </Animated.View>
                    <Animated.View style={[styles.iconCircle, iconStyle]}>
                        <Ionicons name="navigate" size={20} color={COLORS.primary} />
                    </Animated.View>
                    <View style={styles.texts}>
                        <Text style={styles.title} numberOfLines={1}>{cityName} gezini planla</Text>
                        <Text style={styles.subtitle} numberOfLines={1}>Gün gün rota, saatler ve öğle arası hazır</Text>
                    </View>
                    <View style={styles.arrow}>
                        <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </View>
                </LinearGradient>
            </PressableScale>
        </Animated.View>
    );
}

const styles = createThemedStyles(() => ({
    wrapper: { position: 'absolute', left: SPACING.md, right: SPACING.md, bottom: SPACING.md },
    shadow: {
        borderRadius: BORDER_RADIUS.full,
        shadowColor: '#0B0F0C',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.28,
        shadowRadius: 18,
        elevation: 10,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm + 2,
        borderRadius: BORDER_RADIUS.full,
        paddingVertical: 10,
        paddingLeft: 10,
        paddingRight: 12,
        overflow: 'hidden',
    },
    shine: { position: 'absolute', top: -20, bottom: -20, left: -120, width: 90 },
    iconCircle: {
        width: 42, height: 42, borderRadius: 21,
        backgroundColor: '#FFFFFF',
        alignItems: 'center', justifyContent: 'center',
    },
    texts: { flex: 1 },
    title: { fontFamily: FONTS.bodyBold, fontSize: FONT_SIZES.md + 1, color: '#fff' },
    subtitle: { fontFamily: FONTS.body, fontSize: FONT_SIZES.xs, color: 'rgba(255,255,255,0.82)', marginTop: 1 },
    arrow: {
        width: 34, height: 34, borderRadius: 17,
        backgroundColor: 'rgba(255,255,255,0.16)',
        alignItems: 'center', justifyContent: 'center',
    },
}));
