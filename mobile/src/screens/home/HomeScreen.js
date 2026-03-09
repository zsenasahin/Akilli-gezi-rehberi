import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Dimensions,
    Animated,
    Easing,
} from 'react-native';
import SmartImage from '../../components/common/SmartImage';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SCREEN } from '../../constants/layout';
import { getCityImages } from '../../constants/cityImages';
import { useAuth } from '../../contexts/AuthContext';
import { getCities } from '../../services/cityService';
import { getProfile } from '../../services/profileService';
import { getItinerariesByUser } from '../../services/itineraryService';
import { HomeScreenSkeleton } from '../../components/common/SkeletonLoader';
import ErrorMessage from '../../components/common/ErrorMessage';

const SCREEN_WIDTH = Dimensions.get('window').width;

const HERO_IMAGE = 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=900&h=700&fit=crop&q=80';

// Simple fade-in animation hook
const useFadeIn = (delay = 0) => {
    const anim = useRef(new Animated.Value(0)).current;
    const slide = useRef(new Animated.Value(24)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(anim, {
                toValue: 1, duration: 600, delay,
                easing: Easing.out(Easing.cubic), useNativeDriver: true,
            }),
            Animated.timing(slide, {
                toValue: 0, duration: 600, delay,
                easing: Easing.out(Easing.cubic), useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return { opacity: anim, transform: [{ translateY: slide }] };
};

const HomeScreen = ({ navigation }) => {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [cities, setCities] = useState([]);
    const [recentItineraries, setRecentItineraries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setError(null);

        try {
            const [profileResult, citiesResult, itinResult] = await Promise.all([
                getProfile(user.id),
                getCities(),
                getItinerariesByUser(user.id),
            ]);

            if (profileResult.data) setProfile(profileResult.data);
            if (citiesResult.data) setCities(citiesResult.data);
            if (itinResult.data) setRecentItineraries(itinResult.data.slice(0, 3));
        } catch (err) {
            setError('Veriler yüklenirken hata oluştu.');
        }

        setLoading(false);
        setRefreshing(false);
    }, [user]);

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [fetchData])
    );

    // Animations — MUST be called before any early return (React hooks rule)
    const heroAnim = useFadeIn(100);
    const whyAnim = useFadeIn(300);
    const bannerAnim = useFadeIn(500);
    const cityAnim = useFadeIn(600);
    const recentAnim = useFadeIn(800);

    const handleCityPress = (city) => {
        navigation.navigate('CityDetail', { city });
    };

    if (loading) return <HomeScreenSkeleton />;

    const ongoingCount = recentItineraries.filter((i) => i.status === 'ongoing').length;

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => {
                        setRefreshing(true);
                        fetchData();
                    }}
                    tintColor={COLORS.primary}
                />
            }
        >
            {/* ═══ HERO SECTION ═══ */}
            <View style={styles.heroSection}>
                <SmartImage
                    uri={HERO_IMAGE}
                    style={styles.heroImage}
                    contentFit="cover"
                    transition={500}
                />
                <LinearGradient
                    colors={COLORS.gradient.hero}
                    style={styles.heroGradient}
                />
                <Animated.View style={[styles.heroContent, heroAnim]}>
                    <View style={styles.heroBadge}>
                        <Ionicons name="location" size={18} color="#fff" />
                        <Text style={styles.heroBadgeText}>Akıllı Gezi Rehberi</Text>
                    </View>
                    <Text style={styles.heroTitle}>
                        Türkiye'nin en güzel{'\n'}şehirlerini keşfet
                    </Text>
                    <Text style={styles.heroSubtitle}>
                        Akıllı rotalar oluştur ve hayalindeki seyahati planla.
                    </Text>
                    <TouchableOpacity
                        style={styles.heroCTA}
                        onPress={() => navigation.navigate('Discover')}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="compass" size={18} color="#fff" />
                        <Text style={styles.heroCTAText}>Şehirleri Keşfet</Text>
                        <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </TouchableOpacity>
                </Animated.View>
            </View>

            {error && <ErrorMessage message={error} onRetry={fetchData} />}

            {/* ═══ ACTIVE PLAN BANNER ═══ */}
            {ongoingCount > 0 && (
                <Animated.View style={bannerAnim}>
                    <TouchableOpacity
                        style={styles.activePlanBanner}
                        onPress={() => navigation.navigate('Saved')}
                        activeOpacity={0.88}
                    >
                        <LinearGradient
                            colors={['#0891B2', '#0E7490', '#14B8A6']}
                            style={styles.bannerGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <View style={styles.bannerIconContainer}>
                                <Ionicons name="map" size={22} color="#fff" />
                            </View>
                            <View style={styles.bannerTextContainer}>
                                <Text style={styles.bannerLabel}>AKTİF PLAN</Text>
                                <Text style={styles.bannerTitle}>
                                    {ongoingCount} gezi planın seni bekliyor!
                                </Text>
                                <Text style={styles.bannerSubtitle}>
                                    Devam etmek için dokun →
                                </Text>
                            </View>
                            <View style={styles.bannerChevron}>
                                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            )}

            {/* ═══ CITY SELECTION ═══ */}
            <Animated.View style={[styles.section, cityAnim]}>
                <View style={styles.sectionHeaderRow}>
                    <View>
                        <Text style={styles.sectionTitle}>Popüler Şehirler</Text>
                        <Text style={styles.sectionSubtitle}>Bir şehre dokun, içini keşfet</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Discover')}
                        style={styles.seeAllBtn}
                    >
                        <Text style={styles.seeAllText}>Tümü</Text>
                        <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>
                <View style={styles.cityGrid}>
                    {cities.map((city) => {
                        const images = getCityImages(city.name);
                        return (
                            <TouchableOpacity
                                key={city.id}
                                style={styles.cityCard}
                                onPress={() => handleCityPress(city)}
                                activeOpacity={0.88}
                            >
                                <SmartImage
                                    uri={images.card}
                                    fallbackUri="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&h=300&fit=crop&q=80"
                                    style={styles.cityCardImage}
                                    contentFit="cover"
                                    transition={400}
                                />
                                <LinearGradient
                                    colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.85)']}
                                    style={styles.cityCardGradient}
                                />
                                <View style={styles.cityCardContent}>
                                    <Text style={styles.cityCardName}>{city.name}</Text>
                                    <Text style={styles.cityCardRegion}>{city.region}</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.cityMapButton}
                                    onPress={() => navigation.navigate('CreateItinerary', { preselectedCity: city })}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Ionicons name="add" size={16} color="#fff" />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </Animated.View>

            {/* ═══ RECENT PLANS ═══ */}
            {recentItineraries.length > 0 && (
                <Animated.View style={[styles.section, recentAnim]}>
                    <View style={styles.sectionHeaderRow}>
                        <View>
                            <Text style={styles.sectionTitle}>Son Planlarım</Text>
                            <Text style={styles.sectionSubtitle}>{recentItineraries.length} plan</Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Saved')}
                            style={styles.seeAllBtn}
                        >
                            <Text style={styles.seeAllText}>Tümü</Text>
                            <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
                        </TouchableOpacity>
                    </View>
                    {recentItineraries.map((itin) => {
                        const imgs = getCityImages(itin.cities?.name);
                        const isCompleted = itin.status === 'completed';
                        return (
                            <TouchableOpacity
                                key={itin.id}
                                style={styles.recentCard}
                                onPress={() =>
                                    navigation.navigate('ItineraryDetail', { itineraryId: itin.id })
                                }
                                activeOpacity={0.88}
                            >
                                <View style={styles.recentThumb}>
                                    <SmartImage
                                        uri={imgs.card}
                                        fallbackUri="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&h=300&fit=crop&q=80"
                                        style={StyleSheet.absoluteFill}
                                        contentFit="cover"
                                        transition={300}
                                    />
                                    <LinearGradient
                                        colors={['transparent', 'rgba(0,0,0,0.5)']}
                                        style={StyleSheet.absoluteFill}
                                    />
                                </View>
                                <View style={styles.recentInfo}>
                                    <Text style={styles.recentCity}>
                                        {itin.cities?.name}
                                    </Text>
                                    <Text style={styles.recentMeta}>
                                        {itin.days} gün · {itin.itinerary_items?.length || 0} yer
                                    </Text>
                                </View>
                                <View style={[styles.recentStatus, isCompleted && styles.recentStatusCompleted]}>
                                    <Ionicons
                                        name={isCompleted ? 'checkmark' : 'time-outline'}
                                        size={14}
                                        color={isCompleted ? COLORS.success : COLORS.primary}
                                    />
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </Animated.View>
            )}
        </ScrollView>
    );
};


const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    contentContainer: { paddingBottom: SPACING.xxl },

    // ─── HERO ───
    heroSection: {
        height: SCREEN.height * 0.55,
        position: 'relative',
    },
    heroImage: {
        ...StyleSheet.absoluteFillObject,
    },
    heroGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    heroContent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: SPACING.lg,
        paddingBottom: SPACING.xl,
    },
    heroBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignSelf: 'flex-start',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: BORDER_RADIUS.full,
        marginBottom: SPACING.sm,
    },
    heroBadgeText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.sm,
        color: '#fff',
    },
    heroTitle: {
        fontFamily: FONTS.heading,
        fontSize: FONT_SIZES.hero,
        color: '#fff',
        lineHeight: 44,
        marginBottom: SPACING.sm,
    },
    heroSubtitle: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.md,
        color: 'rgba(255,255,255,0.85)',
        lineHeight: 22,
        marginBottom: SPACING.md,
    },
    heroCTA: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: COLORS.accent,
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: BORDER_RADIUS.lg,
        alignSelf: 'flex-start',
    },
    heroCTAText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.md,
        color: '#fff',
    },

    // ─── WHY SECTION ───
    whySection: {
        padding: SPACING.lg,
    },
    featureGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    featureCard: {
        width: (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.sm) / 2,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    featureIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: COLORS.primaryMuted,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    featureTitle: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    featureDesc: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
    },

    // ─── BANNER ───
    activePlanBanner: {
        marginHorizontal: SPACING.lg,
        marginTop: SPACING.lg,
        borderRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
        marginBottom: SPACING.md,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 6,
    },
    bannerGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        gap: SPACING.sm,
    },
    bannerIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 13,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    bannerTextContainer: { flex: 1 },
    bannerLabel: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: 9,
        color: 'rgba(255,255,255,0.7)',
        letterSpacing: 1.5,
        marginBottom: 2,
    },
    bannerTitle: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.md,
        color: '#fff',
    },
    bannerSubtitle: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    bannerChevron: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 10,
        padding: 6,
    },

    // ─── SECTIONS ───
    section: {
        paddingHorizontal: SPACING.lg,
        marginBottom: SPACING.lg,
        marginTop: SPACING.md,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: SPACING.sm,
    },
    sectionTitle: {
        fontFamily: FONTS.heading,
        fontSize: FONT_SIZES.xl,
        color: COLORS.textPrimary,
        letterSpacing: -0.3,
        marginBottom: 2,
    },
    sectionSubtitle: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
    },
    seeAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.primaryMuted,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: BORDER_RADIUS.full,
    },
    seeAllText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.xs,
        color: COLORS.primary,
    },

    // ─── CITY GRID ───
    cityGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    cityCard: {
        width: (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.sm) / 2,
        height: 160,
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
        position: 'relative',
    },
    cityCardImage: {
        ...StyleSheet.absoluteFillObject,
    },
    cityCardGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    cityCardContent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: SPACING.sm,
    },
    cityCardName: {
        fontFamily: FONTS.heading,
        fontSize: FONT_SIZES.lg,
        color: '#fff',
    },
    cityCardRegion: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: 'rgba(255,255,255,0.8)',
    },
    cityMapButton: {
        position: 'absolute',
        top: SPACING.xs,
        right: SPACING.xs,
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(8,145,178,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // ─── RECENT PLANS ───
    recentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        marginBottom: SPACING.xs + 2,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    recentThumb: {
        width: 64,
        height: 64,
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
    },
    recentIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: COLORS.primaryMuted,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.sm,
        marginLeft: SPACING.sm,
    },
    recentInfo: {
        flex: 1,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.sm,
    },
    recentCity: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
        letterSpacing: -0.1,
    },
    recentMeta: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    recentStatus: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.primaryMuted,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.sm,
    },
    recentStatusCompleted: {
        backgroundColor: COLORS.success + '20',
    },
});

export default HomeScreen;
