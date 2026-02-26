/**
 * Basit animasyon yardımcıları — Expo Go ile %100 uyumlu.
 * react-native-reanimated Worklets yerine React Native Animated API kullanır.
 */
import { Animated, Easing } from 'react-native';
import { useRef, useEffect } from 'react';

/**
 * Fade-in + slide-up animasyonu hook'u.
 * @param {number} delay - Animasyon gecikmesi (ms)
 * @param {number} duration - Animasyon süresi (ms)
 * @returns {{ opacity: Animated.Value, translateY: Animated.Value, style: object }}
 */
export function useFadeInUp(delay = 0, duration = 500) {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration,
                delay,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration,
                delay,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return {
        opacity,
        translateY,
        style: { opacity, transform: [{ translateY }] },
    };
}

/**
 * Fade-in animasyonu hook'u.
 * @param {number} delay - Animasyon gecikmesi (ms)
 * @param {number} duration - Animasyon süresi (ms)
 * @returns {{ opacity: Animated.Value, style: object }}
 */
export function useFadeIn(delay = 0, duration = 400) {
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(opacity, {
            toValue: 1,
            duration,
            delay,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, []);

    return {
        opacity,
        style: { opacity },
    };
}

/**
 * Animated wrapper bileşen.
 * Reanimated Animated.View yerine standart Animated.View kullanır.
 */
export const AnimatedView = Animated.View;
