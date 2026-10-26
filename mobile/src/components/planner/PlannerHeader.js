import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/layout';
import { createThemedStyles } from '../../utils/themedStyles';

const EASE = Easing.out(Easing.cubic);

/**
 * Sihirbaz başlığı: kapat butonu, adım başlığı ve dokunulabilir adım çizelgesi.
 *
 * Adımlar birbirine bağlı bir çizgi üzerinde durur; tamamlanan kısım dolar.
 * Herhangi bir adıma dokunmak `onStepPress(index)` çağırır — hangi adıma
 * gidilebileceğine ekran karar verir. Geçişler yay (spring) yerine kısa bir
 * zamanlama eğrisiyle yapılır; yay animasyonu adım değişiminde titreme yapıyordu.
 */
export default function PlannerHeader({ steps, stepIndex, topInset, onClose, onStepPress, title, eyebrow }) {
    const progress = useSharedValue(stepIndex / Math.max(steps.length - 1, 1));

    useEffect(() => {
        progress.value = withTiming(stepIndex / Math.max(steps.length - 1, 1), { duration: 320, easing: EASE });
    }, [stepIndex, steps.length, progress]);

    const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

    return (
        <View style={[styles.container, { paddingTop: topInset + SPACING.xs }]}>
            <View style={styles.topRow}>
                <Animated.View key={title} entering={FadeIn.duration(200)} style={styles.titleBlock}>
                    <Text style={styles.eyebrow}>{eyebrow}</Text>
                    <Text style={styles.title} numberOfLines={1}>{title}</Text>
                </Animated.View>
                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={onClose}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="Planlamadan çık"
                >
                    <Ionicons name="close" size={20} color={COLORS.textPrimary} />
                </TouchableOpacity>
            </View>

            <View style={styles.stepper}>
                {/* Noktaların merkezinden geçen çizgi */}
                <View style={[styles.rail, { left: `${50 / steps.length}%`, right: `${50 / steps.length}%` }]}>
                    <Animated.View style={[styles.railFill, fillStyle]} />
                </View>
                {steps.map((step, index) => (
                    <StepDot
                        key={step.key}
                        icon={step.icon}
                        label={step.label}
                        state={index < stepIndex ? 'done' : index === stepIndex ? 'active' : 'todo'}
                        onPress={() => onStepPress?.(index)}
                    />
                ))}
            </View>
        </View>
    );
}

function StepDot({ icon, label, state, onPress }) {
    const active = useSharedValue(state === 'active' ? 1 : 0);
    useEffect(() => {
        active.value = withTiming(state === 'active' ? 1 : 0, { duration: 220, easing: EASE });
    }, [state, active]);
    const ringStyle = useAnimatedStyle(() => ({
        opacity: active.value,
        transform: [{ scale: 0.7 + active.value * 0.3 }],
    }));

    return (
        <TouchableOpacity
            style={styles.dotWrap}
            onPress={onPress}
            activeOpacity={0.7}
            disabled={state === 'active'}
            accessibilityRole="button"
            accessibilityLabel={`${label} adımına git`}
            accessibilityState={{ selected: state === 'active' }}
        >
            <View style={styles.dotSlot}>
                <Animated.View style={[styles.dotRing, ringStyle]} />
                <View style={[styles.dot, state === 'done' && styles.dotDone, state === 'active' && styles.dotActive]}>
                    <Ionicons
                        name={state === 'done' ? 'checkmark' : icon}
                        size={state === 'done' ? 14 : 13}
                        color={state === 'todo' ? COLORS.textSecondary : '#fff'}
                    />
                </View>
            </View>
            <Text
                style={[styles.dotLabel, state === 'active' && styles.dotLabelActive, state === 'done' && styles.dotLabelDone]}
                numberOfLines={1}
            >
                {label}
            </Text>
        </TouchableOpacity>
    );
}

const DOT = 28;
const SLOT = 38;

const styles = createThemedStyles(() => ({
    container: {
        backgroundColor: COLORS.surface,
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, minHeight: 44 },
    closeButton: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: COLORS.surfaceAlt,
        alignItems: 'center', justifyContent: 'center',
    },
    titleBlock: { flex: 1 },
    eyebrow: { fontFamily: FONTS.bodyBold, fontSize: 10, letterSpacing: 1.2, color: COLORS.accentDark },
    title: { fontFamily: FONTS.heading, fontSize: FONT_SIZES.xl, color: COLORS.textPrimary, marginTop: 2 },

    stepper: { flexDirection: 'row', marginTop: SPACING.md },
    // Çizgi ilk ve son noktanın merkezleri arasında uzanır (sol/sağ: yarım sütun)
    rail: {
        position: 'absolute',
        top: SLOT / 2 - 1.5,
        height: 3,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.surfaceAlt,
        overflow: 'hidden',
    },
    railFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.full },

    dotWrap: { flex: 1, alignItems: 'center' },
    dotSlot: { width: SLOT, height: SLOT, alignItems: 'center', justifyContent: 'center' },
    dotRing: {
        position: 'absolute',
        width: SLOT, height: SLOT, borderRadius: SLOT / 2,
        backgroundColor: COLORS.primaryMuted,
    },
    dot: {
        width: DOT, height: DOT, borderRadius: DOT / 2,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: COLORS.surface,
        borderWidth: 1.5, borderColor: COLORS.border,
    },
    dotDone: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primaryLight },
    dotActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    dotLabel: { fontFamily: FONTS.body, fontSize: 10, color: COLORS.textSecondary, marginTop: 2 },
    dotLabelActive: { fontFamily: FONTS.bodyBold, color: COLORS.primary },
    dotLabelDone: { color: COLORS.textPrimary },
}));
