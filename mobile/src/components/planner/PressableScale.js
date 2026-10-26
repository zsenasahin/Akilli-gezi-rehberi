import React from 'react';
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Basıldığında hafifçe küçülen, bırakınca yaylı şekilde geri gelen dokunma alanı.
 * Kartlar ve butonlar için ortak dokunma hissi sağlar.
 */
export default function PressableScale({ children, style, scaleTo = 0.96, disabled, ...rest }) {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

    return (
        <AnimatedPressable
            {...rest}
            disabled={disabled}
            onPressIn={(event) => { scale.value = withSpring(scaleTo, { damping: 15, stiffness: 300 }); rest.onPressIn?.(event); }}
            onPressOut={(event) => { scale.value = withSpring(1, { damping: 12, stiffness: 200 }); rest.onPressOut?.(event); }}
            style={[style, animatedStyle, disabled && { opacity: 0.6 }]}
        >
            {children}
        </AnimatedPressable>
    );
}
