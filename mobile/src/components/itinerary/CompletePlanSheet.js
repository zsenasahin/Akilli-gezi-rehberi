import React, { useEffect, useState } from 'react';
import { View, Text, Modal, Pressable, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import Animated, {
    FadeIn, FadeInDown, ZoomIn, useAnimatedStyle, useSharedValue, withTiming, Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/layout';
import SmartImage from '../common/SmartImage';
import PressableScale from '../planner/PressableScale';
import { createThemedStyles } from '../../utils/themedStyles';

/**
 * "Planı Tamamla" alt paneli — sistem Alert'inin yerine geçer.
 *
 * Üç aşaması vardır: onay (gezi özeti + ilerleme) → kaydediliyor → başarı.
 * `onConfirm` bir Promise döndürür; `{ error }` dönerse panel onay aşamasında
 * kalır ve hatayı gösterir.
 */
export default function CompletePlanSheet({
    visible, cityName, imageUri, fallbackUri, days, progress, distanceKm,
    onConfirm, onClose, onDone,
}) {
    const insets = useSafeAreaInsets();
    const [phase, setPhase] = useState('confirm'); // confirm | saving | success
    const [error, setError] = useState(null);

    useEffect(() => {
        if (visible) { setPhase('confirm'); setError(null); }
    }, [visible]);

    const handleConfirm = async () => {
        setError(null);
        setPhase('saving');
        const result = await onConfirm?.();
        if (result?.error) {
            setError('Plan güncellenemedi. Bağlantını kontrol edip tekrar dene.');
            setPhase('confirm');
            return;
        }
        setPhase('success');
    };

    const closable = phase !== 'saving';
    const remaining = Math.max(0, (progress?.total || 0) - (progress?.completed || 0));

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => closable && onClose?.()}>
            <View style={styles.root}>
                <Pressable style={styles.backdrop} onPress={() => closable && (phase === 'success' ? onDone?.() : onClose?.())} />

                <Animated.View entering={FadeInDown.duration(280)} style={[styles.sheet, { paddingBottom: insets.bottom + SPACING.md }]}>
                    <View style={styles.handle} />

                    {phase === 'success' ? (
                        <SuccessView cityName={cityName} days={days} progress={progress} onDone={onDone} onClose={onClose} />
                    ) : (
                        <>
                            {/* Şehir kapağı */}
                            <View style={styles.cover}>
                                <SmartImage uri={imageUri} fallbackUri={fallbackUri} style={styles.coverImage} contentFit="cover" />
                                <LinearGradient colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.7)']} style={styles.coverShade} />
                                <View style={styles.coverText}>
                                    <Text style={styles.coverEyebrow}>GEZİYİ TAMAMLA</Text>
                                    <Text style={styles.coverTitle} numberOfLines={1}>{cityName || 'Gezi planın'}</Text>
                                </View>
                            </View>

                            <Text style={styles.lead}>
                                Planı tamamlandı olarak işaretlediğinde şehir koleksiyonuna eklenir ve rozet ilerlemen güncellenir.
                            </Text>

                            {/* Özet */}
                            <View style={styles.statsRow}>
                                <Stat icon="calendar-outline" value={days || 1} label="gün" />
                                <Stat icon="location-outline" value={progress?.total || 0} label="durak" />
                                <Stat icon="navigate-outline" value={Math.round(distanceKm || 0)} label="km" />
                            </View>

                            <ProgressBar completed={progress?.completed || 0} total={progress?.total || 0} />

                            {remaining > 0 ? (
                                <View style={styles.note}>
                                    <Ionicons name="information-circle-outline" size={16} color={COLORS.accentDark} />
                                    <Text style={styles.noteText}>
                                        {remaining} durak henüz işaretlenmedi. Yine de planı tamamlayabilirsin.
                                    </Text>
                                </View>
                            ) : null}

                            {error ? (
                                <Animated.View entering={FadeIn.duration(200)} style={[styles.note, styles.noteError]}>
                                    <Ionicons name="alert-circle-outline" size={16} color={COLORS.error} />
                                    <Text style={[styles.noteText, { color: COLORS.error }]}>{error}</Text>
                                </Animated.View>
                            ) : null}

                            <View style={styles.actions}>
                                <TouchableOpacity style={styles.secondaryBtn} onPress={onClose} disabled={!closable} activeOpacity={0.8}>
                                    <Text style={styles.secondaryText}>Vazgeç</Text>
                                </TouchableOpacity>
                                <PressableScale style={styles.primaryWrap} onPress={handleConfirm} disabled={phase === 'saving'}>
                                    <LinearGradient colors={COLORS.gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
                                        {phase === 'saving' ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <>
                                                <Ionicons name="checkmark-done" size={18} color="#fff" />
                                                <Text style={styles.primaryText}>Planı Tamamla</Text>
                                            </>
                                        )}
                                    </LinearGradient>
                                </PressableScale>
                            </View>
                        </>
                    )}
                </Animated.View>
            </View>
        </Modal>
    );
}

function SuccessView({ cityName, days, progress, onDone, onClose }) {
    return (
        <View style={styles.success}>
            <Animated.View entering={ZoomIn.duration(360)} style={styles.successBadgeOuter}>
                <LinearGradient colors={COLORS.gradients.primary} style={styles.successBadge}>
                    <Ionicons name="checkmark" size={40} color="#fff" />
                </LinearGradient>
            </Animated.View>
            <Animated.Text entering={FadeInDown.delay(120).duration(260)} style={styles.successTitle}>
                Tebrikler!
            </Animated.Text>
            <Animated.Text entering={FadeInDown.delay(180).duration(260)} style={styles.successText}>
                {cityName ? `${cityName} gezini` : 'Gezini'} tamamladın. {days || 1} günde {progress?.completed || 0}/{progress?.total || 0} durak gezdin.
            </Animated.Text>
            <Animated.View entering={FadeInDown.delay(240).duration(260)} style={styles.actions}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={onClose} activeOpacity={0.8}>
                    <Text style={styles.secondaryText}>Planda kal</Text>
                </TouchableOpacity>
                <PressableScale style={styles.primaryWrap} onPress={onDone}>
                    <LinearGradient colors={COLORS.gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
                        <Text style={styles.primaryText}>Planlarıma Dön</Text>
                        <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </LinearGradient>
                </PressableScale>
            </Animated.View>
        </View>
    );
}

function Stat({ icon, value, label }) {
    return (
        <View style={styles.stat}>
            <View style={styles.statIcon}>
                <Ionicons name={icon} size={16} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

function ProgressBar({ completed, total }) {
    const ratio = total > 0 ? completed / total : 0;
    const width = useSharedValue(0);
    useEffect(() => {
        width.value = withTiming(ratio, { duration: 600, easing: Easing.out(Easing.cubic) });
    }, [ratio, width]);
    const fill = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));

    return (
        <View style={styles.progress}>
            <View style={styles.progressHead}>
                <Text style={styles.progressLabel}>Ziyaret edilen duraklar</Text>
                <Text style={styles.progressValue}>{completed}/{total}</Text>
            </View>
            <View style={styles.progressTrack}>
                <Animated.View style={[styles.progressFill, fill]} />
            </View>
        </View>
    );
}

const styles = createThemedStyles(() => ({
    root: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(15, 20, 14, 0.55)' },
    sheet: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.sm,
    },
    handle: {
        alignSelf: 'center',
        width: 40, height: 4, borderRadius: 2,
        backgroundColor: COLORS.border,
        marginBottom: SPACING.md,
    },

    cover: { height: 140, borderRadius: BORDER_RADIUS.xl, overflow: 'hidden', backgroundColor: COLORS.surfaceAlt },
    coverImage: { ...StyleSheet.absoluteFill },
    coverShade: { ...StyleSheet.absoluteFill },
    coverText: { position: 'absolute', left: SPACING.md, right: SPACING.md, bottom: SPACING.md },
    coverEyebrow: { fontFamily: FONTS.bodyBold, fontSize: 10, letterSpacing: 1.4, color: 'rgba(255,255,255,0.8)' },
    coverTitle: { fontFamily: FONTS.heading, fontSize: FONT_SIZES.xxl, color: '#fff', marginTop: 2 },

    lead: {
        fontFamily: FONTS.body, fontSize: FONT_SIZES.md, lineHeight: 21,
        color: COLORS.textSecondary, marginTop: SPACING.md,
    },

    statsRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
    stat: {
        flex: 1, alignItems: 'center', paddingVertical: SPACING.sm + 2,
        borderRadius: BORDER_RADIUS.lg, backgroundColor: COLORS.surfaceAlt,
    },
    statIcon: {
        width: 30, height: 30, borderRadius: 15,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: COLORS.primaryMuted, marginBottom: 4,
    },
    statValue: { fontFamily: FONTS.bodyBold, fontSize: FONT_SIZES.xl, color: COLORS.textPrimary },
    statLabel: { fontFamily: FONTS.body, fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },

    progress: { marginTop: SPACING.md },
    progressHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    progressLabel: { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
    progressValue: { fontFamily: FONTS.bodyBold, fontSize: FONT_SIZES.sm, color: COLORS.primary },
    progressTrack: { height: 8, borderRadius: 4, backgroundColor: COLORS.surfaceAlt, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 4, backgroundColor: COLORS.primary },

    note: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 6,
        marginTop: SPACING.md, padding: SPACING.sm + 2,
        borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.accentLight,
    },
    noteError: { backgroundColor: 'rgba(181, 82, 59, 0.1)' },
    noteText: { flex: 1, fontFamily: FONTS.body, fontSize: FONT_SIZES.sm, lineHeight: 18, color: COLORS.accentDark },

    actions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg, alignSelf: 'stretch' },
    secondaryBtn: {
        height: 52, paddingHorizontal: SPACING.lg, borderRadius: 26,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border,
    },
    secondaryText: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.md, color: COLORS.textPrimary },
    primaryWrap: { flex: 1, borderRadius: 26, overflow: 'hidden' },
    primaryBtn: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    primaryText: { fontFamily: FONTS.bodyBold, fontSize: FONT_SIZES.md, color: '#fff' },

    success: { alignItems: 'center', paddingTop: SPACING.md },
    successBadgeOuter: {
        width: 104, height: 104, borderRadius: 52,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: COLORS.primaryMuted,
    },
    successBadge: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
    successTitle: { fontFamily: FONTS.heading, fontSize: FONT_SIZES.xxl, color: COLORS.textPrimary, marginTop: SPACING.md },
    successText: {
        fontFamily: FONTS.body, fontSize: FONT_SIZES.md, lineHeight: 21,
        color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.xs, paddingHorizontal: SPACING.md,
    },
}));
