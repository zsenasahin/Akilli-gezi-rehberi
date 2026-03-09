/**
 * SkeletonLoader — Titreşen yükleme iskelet bileşeni
 *
 * Tüm ekranlarda LoadingSpinner yerine kullanılır.
 * Pulseanimasyon: opacity 0.4 → 1 → 0.4 tekrar eder.
 *
 * Kullanım:
 *   <SkeletonLoader />                 → tek blok
 *   <SkeletonLoader width={120} height={16} radius={8} />
 *   <HomeScreenSkeleton />             → HomeScreen'e özel
 *   <DiscoverSkeleton />               → Keşfet'e özel
 *   <ItineraryDetailSkeleton />        → Detay sayfasına özel
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants/layout';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Temel titreyen blok ───────────────────────────────────────────────────
export const SkeletonLoader = ({
    width = '100%',
    height = 16,
    radius = BORDER_RADIUS.sm,
    style,
}) => {
    const anim = useRef(new Animated.Value(0.4)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(anim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(anim, {
                    toValue: 0.4,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, []);

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    borderRadius: radius,
                    backgroundColor: COLORS.surfaceWarm,
                    opacity: anim,
                },
                style,
            ]}
        />
    );
};

// ─── HomeScreen Skeleton ───────────────────────────────────────────────────
export const HomeScreenSkeleton = () => (
    <View style={styles.homeContainer}>
        {/* Hero */}
        <SkeletonLoader width="100%" height={SCREEN_W * 0.62} radius={0} />

        {/* Bölüm başlığı */}
        <View style={styles.section}>
            <SkeletonLoader width={160} height={22} radius={8} style={styles.mb8} />
            <SkeletonLoader width={240} height={14} radius={6} style={styles.mb16} />
            {/* 2x2 şehir kartı */}
            <View style={styles.row}>
                <SkeletonLoader width={(SCREEN_W - SPACING.lg * 2 - SPACING.sm) / 2} height={160} radius={BORDER_RADIUS.lg} />
                <SkeletonLoader width={(SCREEN_W - SPACING.lg * 2 - SPACING.sm) / 2} height={160} radius={BORDER_RADIUS.lg} />
            </View>
            <View style={[styles.row, { marginTop: SPACING.sm }]}>
                <SkeletonLoader width={(SCREEN_W - SPACING.lg * 2 - SPACING.sm) / 2} height={160} radius={BORDER_RADIUS.lg} />
                <SkeletonLoader width={(SCREEN_W - SPACING.lg * 2 - SPACING.sm) / 2} height={160} radius={BORDER_RADIUS.lg} />
            </View>
        </View>

        {/* Son planlar */}
        <View style={styles.section}>
            <SkeletonLoader width={140} height={20} radius={8} style={styles.mb16} />
            {[0, 1, 2].map(i => (
                <View key={i} style={[styles.listRow, styles.mb8]}>
                    <SkeletonLoader width={44} height={44} radius={12} />
                    <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                        <SkeletonLoader width="60%" height={14} radius={6} style={styles.mb6} />
                        <SkeletonLoader width="40%" height={12} radius={6} />
                    </View>
                    <SkeletonLoader width={32} height={32} radius={16} />
                </View>
            ))}
        </View>
    </View>
);

// ─── Keşfet / Discover Skeleton ───────────────────────────────────────────
const CARD_W = (SCREEN_W - SPACING.lg * 2 - SPACING.sm) / 2;

export const DiscoverSkeleton = () => (
    <View style={styles.discoverContainer}>
        {/* Header */}
        <View style={styles.discoverHeader}>
            <SkeletonLoader width={120} height={28} radius={8} style={styles.mb8} />
            <SkeletonLoader width={80} height={14} radius={6} />
        </View>

        {/* Search */}
        <SkeletonLoader
            width={SCREEN_W - SPACING.lg * 2}
            height={44}
            radius={BORDER_RADIUS.lg}
            style={{ alignSelf: 'center', marginVertical: SPACING.sm }}
        />

        {/* Chip'ler */}
        <View style={styles.chipsRow}>
            {[80, 90, 70, 85, 75].map((w, i) => (
                <SkeletonLoader key={i} width={w} height={36} radius={BORDER_RADIUS.full} />
            ))}
        </View>

        {/* Kartlar */}
        <View style={styles.discoverGrid}>
            {[0, 1, 2, 3, 4, 5].map(i => (
                <View key={i} style={{ width: CARD_W, marginBottom: SPACING.sm }}>
                    <SkeletonLoader width={CARD_W} height={CARD_W * 0.8} radius={0} style={{ borderTopLeftRadius: BORDER_RADIUS.lg, borderTopRightRadius: BORDER_RADIUS.lg }} />
                    <View style={[styles.cardBody]}>
                        <SkeletonLoader width="80%" height={14} radius={6} style={styles.mb6} />
                        <SkeletonLoader width="55%" height={12} radius={6} style={styles.mb6} />
                        <SkeletonLoader width="40%" height={12} radius={6} />
                    </View>
                </View>
            ))}
        </View>
    </View>
);

// ─── Şehir Detay Skeleton ─────────────────────────────────────────────────
export const CityDetailSkeleton = () => (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        {/* Hero */}
        <SkeletonLoader width="100%" height={SCREEN_W * 0.65} radius={0} />
        {/* Açıklama */}
        <View style={styles.section}>
            <SkeletonLoader width="90%" height={13} radius={6} style={styles.mb6} />
            <SkeletonLoader width="80%" height={13} radius={6} style={styles.mb6} />
            <SkeletonLoader width="70%" height={13} radius={6} style={styles.mb16} />
        </View>
        {/* Quick actions */}
        <View style={[styles.row, { paddingHorizontal: SPACING.lg, gap: SPACING.sm, marginBottom: SPACING.md }]}>
            {[0, 1, 2, 3].map(i => (
                <SkeletonLoader key={i} width={72} height={72} radius={BORDER_RADIUS.lg} />
            ))}
        </View>
        {/* Category tabs */}
        <View style={[styles.chipsRow, { paddingHorizontal: SPACING.lg }]}>
            {[90, 110, 80, 100, 85].map((w, i) => (
                <SkeletonLoader key={i} width={w} height={36} radius={BORDER_RADIUS.full} />
            ))}
        </View>
        {/* Cards */}
        <View style={[styles.discoverGrid, { paddingHorizontal: SPACING.lg }]}>
            {[0, 1, 2, 3].map(i => (
                <View key={i} style={{ width: CARD_W, marginBottom: SPACING.sm }}>
                    <SkeletonLoader width={CARD_W} height={160} radius={BORDER_RADIUS.lg} />
                    <SkeletonLoader width="70%" height={13} radius={6} style={{ marginTop: 8, alignSelf: 'center' }} />
                </View>
            ))}
        </View>
    </View>
);

// ─── İtinerary Detail Skeleton ────────────────────────────────────────────
export const ItineraryDetailSkeleton = () => (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        {/* Header card */}
        <SkeletonLoader width="100%" height={160} radius={0} />
        <View style={{ padding: SPACING.md }}>
            {/* Günler */}
            {[0, 1].map(g => (
                <View key={g} style={[styles.dayCard]}>
                    <View style={[styles.listRow, styles.mb12]}>
                        <SkeletonLoader width={32} height={32} radius={16} />
                        <SkeletonLoader width={80} height={16} radius={8} style={{ marginLeft: SPACING.sm }} />
                        <View style={{ flex: 1 }} />
                        <SkeletonLoader width={90} height={12} radius={6} />
                    </View>
                    {[0, 1, 2].map(i => (
                        <View key={i} style={[styles.listRow, { paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.divider }]}>
                            <SkeletonLoader width={24} height={24} radius={4} />
                            <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                                <SkeletonLoader width="65%" height={13} radius={6} style={styles.mb6} />
                                <SkeletonLoader width="45%" height={11} radius={6} />
                            </View>
                            <SkeletonLoader width={20} height={20} radius={10} style={{ marginLeft: 8 }} />
                        </View>
                    ))}
                </View>
            ))}
        </View>
    </View>
);

// ─── Profil Skeleton ──────────────────────────────────────────────────────
export const ProfileSkeleton = () => (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        {/* Header gradient */}
        <SkeletonLoader width="100%" height={220} radius={0} />
        {/* Stats */}
        <View style={[styles.row, { margin: SPACING.lg, gap: SPACING.md }]}>
            <SkeletonLoader width="30%" height={70} radius={BORDER_RADIUS.lg} />
            <SkeletonLoader width="30%" height={70} radius={BORDER_RADIUS.lg} />
            <SkeletonLoader width="30%" height={70} radius={BORDER_RADIUS.lg} />
        </View>
        {/* Favoriler */}
        <View style={{ paddingHorizontal: SPACING.lg }}>
            <SkeletonLoader width={140} height={20} radius={8} style={styles.mb12} />
            <View style={styles.row}>
                <SkeletonLoader width={CARD_W} height={140} radius={BORDER_RADIUS.lg} />
                <SkeletonLoader width={CARD_W} height={140} radius={BORDER_RADIUS.lg} />
            </View>
        </View>
        {/* Planlar */}
        <View style={{ paddingHorizontal: SPACING.lg, marginTop: SPACING.md }}>
            <SkeletonLoader width={160} height={20} radius={8} style={styles.mb12} />
            {[0, 1, 2].map(i => (
                <View key={i} style={[styles.listRow, { marginBottom: SPACING.sm, backgroundColor: COLORS.surface, padding: SPACING.sm, borderRadius: BORDER_RADIUS.lg }]}>
                    <SkeletonLoader width={40} height={40} radius={12} />
                    <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                        <SkeletonLoader width="55%" height={13} radius={6} style={styles.mb6} />
                        <SkeletonLoader width="40%" height={11} radius={6} />
                    </View>
                </View>
            ))}
        </View>
    </View>
);

// ─── Styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    homeContainer: { flex: 1, backgroundColor: COLORS.background },
    discoverContainer: { flex: 1, backgroundColor: COLORS.background },
    discoverHeader: {
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.xxl + 8,
        paddingBottom: SPACING.xs,
        backgroundColor: COLORS.surface,
    },
    discoverGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.xs,
    },
    cardBody: {
        backgroundColor: COLORS.surface,
        padding: SPACING.sm,
        borderBottomLeftRadius: BORDER_RADIUS.lg,
        borderBottomRightRadius: BORDER_RADIUS.lg,
    },
    chipsRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.md,
        paddingTop: SPACING.xs,
    },
    section: {
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.lg,
        paddingBottom: SPACING.sm,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: SPACING.sm,
    },
    listRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dayCard: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
    },
    mb6: { marginBottom: 6 },
    mb8: { marginBottom: 8 },
    mb12: { marginBottom: 12 },
    mb16: { marginBottom: 16 },
});
