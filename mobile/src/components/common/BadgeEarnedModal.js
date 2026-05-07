import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { BORDER_RADIUS, SPACING } from '../../constants/layout';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

const BadgeEarnedModal = ({ badge, visible, onClose, onAction }) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            scaleAnim.setValue(0);
            opacityAnim.setValue(0);
        }
    }, [visible]);

    if (!visible || !badge) return null;

    return (
        <View style={styles.overlay}>
            <Animated.View style={[styles.container, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
                <BlurView intensity={90} tint="light" style={styles.blur}>
                    <View style={[styles.medalRing, { backgroundColor: badge.ring }]}>
                        <View style={[styles.medalCore, { backgroundColor: badge.color }]}>
                            <Ionicons name={badge.icon} size={48} color="#fff" />
                        </View>
                    </View>

                    <Text style={styles.congrats}>TEBRİKLER! 🎉</Text>
                    <Text style={styles.title}>Yeni Rozet Kazandın!</Text>
                    <Text style={styles.badgeName}>{badge.label}</Text>
                    <Text style={styles.description}>{badge.description}</Text>

                    <TouchableOpacity style={styles.actionBtn} onPress={onAction}>
                        <Text style={styles.actionBtnText}>Rozetlerimi Gör</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <Text style={styles.closeBtnText}>Kapat</Text>
                    </TouchableOpacity>
                </BlurView>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10000,
    },
    container: {
        width: width * 0.85,
        borderRadius: 32,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.7)',
    },
    blur: {
        padding: SPACING.xl,
        alignItems: 'center',
    },
    medalRing: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.lg,
    },
    medalCore: {
        width: 90,
        height: 90,
        borderRadius: 45,
        alignItems: 'center',
        justifyContent: 'center',
    },
    congrats: {
        fontFamily: FONTS.heading,
        fontSize: 14,
        color: COLORS.primary,
        letterSpacing: 2,
        marginBottom: 8,
    },
    title: {
        fontFamily: FONTS.heading,
        fontSize: 22,
        color: COLORS.textPrimary,
        textAlign: 'center',
        marginBottom: 4,
    },
    badgeName: {
        fontFamily: FONTS.heading,
        fontSize: 28,
        color: COLORS.textPrimary,
        textAlign: 'center',
        marginBottom: 12,
    },
    description: {
        fontFamily: FONTS.body,
        fontSize: 15,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: SPACING.xl,
    },
    actionBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: BORDER_RADIUS.full,
        width: '100%',
        alignItems: 'center',
        marginBottom: 12,
    },
    actionBtnText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: 16,
        color: '#fff',
    },
    closeBtn: {
        paddingVertical: 10,
    },
    closeBtnText: {
        fontFamily: FONTS.bodyMedium,
        fontSize: 14,
        color: COLORS.textSecondary,
    },
});

export default BadgeEarnedModal;
