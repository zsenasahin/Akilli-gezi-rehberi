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
    Platform,
} from 'react-native';
import SmartImage from '../../components/common/SmartImage';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SCREEN } from '../../constants/layout';
import { getCityImages } from '../../constants/cityImages';
import { useAuth, useRequireAuth } from '../../contexts/AuthContext';
import { getCities } from '../../services/cityService';
import { getProfile } from '../../services/profileService';
import { getItinerariesByUser } from '../../services/itineraryService';
import { HomeScreenSkeleton } from '../../components/common/SkeletonLoader';
import ErrorMessage from '../../components/common/ErrorMessage';

const SCREEN_WIDTH = Dimensions.get('window').width;
const HERO_HEIGHT = SCREEN.height * 0.58;

const HERO_IMAGE = 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1200&h=900&fit=crop&q=85';

const HomeScreen = ({ navigation }) => {
    const { user, isGuest } = useAuth();
    const requireAuth = useRequireAuth(navigation);
    const [profile, setProfile] = useState(null);
    const [cities, setCities] = useState([]);
    const [recentItineraries, setRecentItineraries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    // Scroll animasyonu – parallax için
    const scrollY = useRef(new Animated.Value(0)).current;

    // Kart animasyonları
    const cityCardAnim = useRef(new Animated.Value(0)).current;
    const contentAnim = useRef(new Animated.Value(0)).current;

    const fetchData = useCallback(async () => {
        setError(null);
        try {
            const citiesResult = await getCities();
            if (citiesResult.data) setCities(citiesResult.data);

            if (!isGuest) {
                const [profileResult, itinResult] = await Promise.all([
                    getProfile(user.id),
                    getItinerariesByUser(user.id),
                ]);
                if (profileResult.data) setProfile(profileResult.data);
                if (itinResult.data) setRecentItineraries(itinResult.data.slice(0, 3));
            } else {
                setProfile(null);
                setRecentItineraries([]);
            }
        } catch (err) {
            setError('Veriler yüklenirken hata oluştu.');
        }
        setLoading(false);
        setRefreshing(false);
    }, [user, isGuest]);

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [fetchData])
    );

    // İçerik girişi animasyonu
    useEffect(() => {
        Animated.parallel([
            Animated.timing(cityCardAnim, {
                toValue: 1,
                duration: 700,
                delay: 200,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(contentAnim, {
                toValue: 1,
                duration: 600,
                delay: 100,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handleCityPress = (city) => {
        navigation.navigate('CityDetail', { city });
    };

    const openDiscoverTab = () => {
        // Navigate to the Discover tab. React Navigation resolves nested
        // navigators automatically: this targets the Tab navigator's
        // "Discover" route and then its initial "DiscoverMain" screen.
        navigation.navigate('Discover', { screen: 'DiscoverMain' });
    };

    if (loading) return <HomeScreenSkeleton />;

    const ongoingCount = recentItineraries.filter((i) => i.status === 'ongoing').length;

    // Parallax: hero resmi biraz daha yavaş kayar
    const heroParallax = scrollY.interpolate({
        inputRange: [0, HERO_HEIGHT],
        outputRange: [0, -HERO_HEIGHT * 0.25],
        extrapolate: 'clamp',
    });

    return (
        <View style={styles.root}>
            {/* ═══ HERO — STICKY ARKAPLAN (sadece resim) ═══ */}
            <View style={styles.heroSection}>
                <Animated.View
                    style={[
                        StyleSheet.absoluteFillObject,
                        { transform: [{ translateY: heroParallax }] },
                    ]}
                >
                    <SmartImage
                        uri={HERO_IMAGE}
                        style={styles.heroImage}
                        contentFit="cover"
                        transition={600}
                    />
                    <LinearGradient
                        colors={COLORS.gradients.heroOverlay}
                        style={StyleSheet.absoluteFillObject}
                    />
                </Animated.View>
            </View>

            {/* ═══ SCROLLABLE İÇERİK ═══ */}
            <Animated.ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
                scrollEventThrottle={16}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); fetchData(); }}
                        tintColor={COLORS.primary}
                        progressViewOffset={HERO_HEIGHT}
                    />
                }
            >
                {/* Hero içeriği — ScrollView içinde, dokunulabilir */}
                <View style={styles.heroContent}>
                    <View style={styles.heroBadge}>
                        <Ionicons name="location" size={14} color="#fff" />
                        <Text style={styles.heroBadgeText}>Akıllı Gezi Rehberi</Text>
                    </View>
                    <Text style={styles.heroTitle}>
                        Türkiye'nin{'\n'}en güzel{'\n'}şehirleri
                    </Text>
                    <Text style={styles.heroSubtitle}>
                        Akıllı rotalar oluştur, hayalindeki seyahati planla
                    </Text>
                    <TouchableOpacity
                        style={styles.heroCTA}
                        onPress={openDiscoverTab}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="compass" size={16} color="#fff" />
                        <Text style={styles.heroCTAText}>Şehirleri Keşfet</Text>
                        <Ionicons name="arrow-forward" size={16} color="#fff" />
                    </TouchableOpacity>
                </View>
                {/* İçerik kartı — beyaz yüzey üstünde */}
                <View style={styles.contentCard}>
                    {error && <ErrorMessage message={error} onRetry={fetchData} />}

                    {/* Misafir Banner */}
                    {isGuest && (
                        <TouchableOpacity
                            style={styles.guestBanner}
                            onPress={() => navigation.navigate('AuthModal')}
                            activeOpacity={0.88}
                        >
                            <View style={styles.guestBannerLeft}>
                                <View style={styles.guestBannerIcon}>
                                    <Ionicons name="person-circle-outline" size={22} color={COLORS.primary} />
                                </View>
                                <View>
                                    <Text style={styles.guestBannerTitle}>Giriş Yap veya Kaydol</Text>
                                    <Text style={styles.guestBannerSub}>Planlar, favoriler ve daha fazlası</Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
                        </TouchableOpacity>
                    )}

                    {/* Aktif Plan Banner */}
                    {ongoingCount > 0 && (
                        <TouchableOpacity
                            style={styles.activePlanBanner}
                            onPress={() => navigation.navigate('Saved')}
                            activeOpacity={0.88}
                        >
                            <LinearGradient
                                colors={COLORS.gradients.brand}
                                style={styles.bannerGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <View style={styles.bannerIconContainer}>
                                    <Ionicons name="map" size={20} color="#fff" />
                                </View>
                                <View style={styles.bannerTextContainer}>
                                    <Text style={styles.bannerLabel}>AKTİF PLAN</Text>
                                    <Text style={styles.bannerTitle}>
                                        {ongoingCount} gezi planın seni bekliyor!
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.8)" />
                            </LinearGradient>
                        </TouchableOpacity>
                    )}

                    {/* Popüler Şehirler */}
                    <Animated.View style={[styles.section, {
                        opacity: cityCardAnim,
                        transform: [{ translateY: cityCardAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }]
                    }]}>
                        <View style={styles.sectionHeaderRow}>
                            <View>
                                <Text style={styles.sectionTitle}>Popüler Şehirler</Text>
                                <Text style={styles.sectionSubtitle}>Bir şehre dokun, içini keşfet</Text>
                            </View>
                            <TouchableOpacity
                                onPress={openDiscoverTab}
                                style={styles.seeAllBtn}
                            >
                                <Text style={styles.seeAllText}>Tümü</Text>
                                <Ionicons name="arrow-forward" size={12} color={COLORS.primary} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.cityGrid}>
                            {cities.map((city, index) => {
                                const images = getCityImages(city.name, city.region);
                                return (
                                    <CityCard
                                        key={city.id}
                                        city={city}
                                        images={images}
                                        index={index}
                                        onPress={() => handleCityPress(city)}
                                        onPlanPress={() => {
                                            if (!requireAuth('Gezi planı oluşturmak için giriş yapmalısınız.')) return;
                                            navigation.navigate('CreateItinerary', { preselectedCity: city });
                                        }}
                                    />
                                );
                            })}
                        </View>
                    </Animated.View>

                    {/* Son Planlar */}
                    {recentItineraries.length > 0 && (
                        <Animated.View style={[styles.section, {
                            opacity: contentAnim,
                            transform: [{ translateY: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }]
                        }]}>
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
                                    <Ionicons name="arrow-forward" size={12} color={COLORS.primary} />
                                </TouchableOpacity>
                            </View>
                            {recentItineraries.map((itin) => {
                                const imgs = getCityImages(itin.cities?.name, itin.cities?.region);
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
                                            <Text style={styles.recentCity}>{itin.cities?.name}</Text>
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
                </View>
            </Animated.ScrollView>
        </View>
    );
};

// ─── City Card — memoized ─────────────────────────────────────────────────
const CityCard = React.memo(({ city, images, index, onPress, onPlanPress }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, speed: 30 }).start();
    };
    const handlePressOut = () => {
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20 }).start();
    };

    return (
        <Animated.View style={[styles.cityCard, { transform: [{ scale: scaleAnim }] }]}>
            <TouchableOpacity
                style={StyleSheet.absoluteFill}
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={1}
            >
                <SmartImage
                    uri={images.card}
                    fallbackUri="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&h=300&fit=crop&q=80"
                    style={styles.cityCardImage}
                    contentFit="cover"
                    transition={500}
                />
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.82)']}
                    style={styles.cityCardGradient}
                />
                <View style={styles.cityCardContent}>
                    <Text style={styles.cityCardName}>{city.name}</Text>
                    <Text style={styles.cityCardRegion}>{city.region}</Text>
                </View>
                <TouchableOpacity
                    style={styles.cityPlanBtn}
                    onPress={onPlanPress}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="add" size={14} color="#fff" />
                </TouchableOpacity>
            </TouchableOpacity>
        </Animated.View>
    );
});

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    // ─── HERO ───
    heroSection: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: HERO_HEIGHT,
        overflow: 'hidden',
    },
    heroImage: {
        width: '100%',
        height: HERO_HEIGHT + 60, // erken kesilmesin
    },
    heroContent: {
        height: HERO_HEIGHT,
        justifyContent: 'flex-end',
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.xl + 8,
    },
    heroBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(255,255,255,0.18)',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: BORDER_RADIUS.full,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.25)',
    },
    heroBadgeText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.xs,
        color: '#fff',
        letterSpacing: 0.5,
    },
    heroTitle: {
        fontFamily: FONTS.heading,
        fontSize: 40,
        color: '#fff',
        lineHeight: 48,
        marginBottom: SPACING.sm,
        letterSpacing: -1,
    },
    heroSubtitle: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.sm,
        color: 'rgba(255,255,255,0.82)',
        lineHeight: 20,
        marginBottom: SPACING.md,
    },
    heroCTA: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: COLORS.primaryDark,
        paddingVertical: 12,
        paddingHorizontal: 22,
        borderRadius: BORDER_RADIUS.lg,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    heroCTAText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.sm,
        color: '#fff',
    },

    // ─── SCROLLVIEW ───
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        paddingBottom: SPACING.xxl + 40,
    },

    // ─── İÇERİK KARTI ───
    contentCard: {
        backgroundColor: COLORS.background,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingTop: SPACING.lg,
        minHeight: SCREEN.height * 0.6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 8,
    },

    // ─── GUEST BANNER ───
    guestBanner: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginHorizontal: SPACING.lg, marginBottom: SPACING.md,
        backgroundColor: COLORS.primaryMuted,
        borderRadius: BORDER_RADIUS.lg,
        paddingHorizontal: SPACING.md, paddingVertical: 12,
        borderWidth: 1, borderColor: COLORS.primary + '25',
    },
    guestBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    guestBannerIcon: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: COLORS.surface,
        justifyContent: 'center', alignItems: 'center',
    },
    guestBannerTitle: {
        fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.sm,
        color: COLORS.primary,
    },
    guestBannerSub: {
        fontFamily: FONTS.body, fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary, marginTop: 1,
    },

    // ─── ACTIVE PLAN BANNER ───
    activePlanBanner: {
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.md,
        borderRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 5,
    },
    bannerGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        gap: SPACING.sm,
    },
    bannerIconContainer: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', alignItems: 'center',
    },
    bannerTextContainer: { flex: 1 },
    bannerLabel: {
        fontFamily: FONTS.bodySemiBold, fontSize: 9,
        color: 'rgba(255,255,255,0.75)', letterSpacing: 1.5, marginBottom: 2,
    },
    bannerTitle: {
        fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.md, color: '#fff',
    },

    // ─── SECTIONS ───
    section: {
        paddingHorizontal: SPACING.lg,
        marginBottom: SPACING.lg,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: SPACING.sm + 2,
    },
    sectionTitle: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.xl,
        color: COLORS.textPrimary,
        letterSpacing: -0.5,
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
        gap: 3,
        backgroundColor: COLORS.primaryMuted,
        paddingHorizontal: 10,
        paddingVertical: 5,
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
        height: 165,
        borderRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 5,
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
        padding: SPACING.sm + 2,
    },
    cityCardName: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.md,
        color: '#fff',
        letterSpacing: -0.3,
    },
    cityCardRegion: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: 'rgba(255,255,255,0.78)',
        marginTop: 1,
    },
    cityPlanBtn: {
        position: 'absolute',
        top: SPACING.xs + 2,
        right: SPACING.xs + 2,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(8,145,178,0.88)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
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
        width: 30,
        height: 30,
        borderRadius: 15,
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
