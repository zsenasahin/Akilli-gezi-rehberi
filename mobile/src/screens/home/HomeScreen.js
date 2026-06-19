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
import { getCityImages } from '../../services/cityImageService';
import { useAuth } from '../../contexts/AuthContext';
import { getCities } from '../../services/cityService';
import { getProfile } from '../../services/profileService';
import { HomeScreenSkeleton } from '../../components/common/SkeletonLoader';
import ErrorMessage from '../../components/common/ErrorMessage';
import { useThemePreference } from '../../contexts/ThemeContext';

import { getEtkinlikler } from '../../services/etkinlikService';
import { getTurizmAktiviteleri } from '../../services/turizmAktiviteService';

const SCREEN_WIDTH = Dimensions.get('window').width;
const HERO_HEIGHT = SCREEN.height * 0.48;
const CITY_CARD_WIDTH = (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.sm) / 2;

const HERO_IMAGE = 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1200&h=900&fit=crop&q=85';

const HomeScreen = ({ navigation }) => {
    const { user } = useAuth();
    const { theme } = useThemePreference();
    const [profile, setProfile] = useState(null);
    const [cities, setCities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [etkinlikler, setEtkinlikler] = useState([]);
    const [etkinliklerLoading, setEtkinliklerLoading] = useState(true);
    const turizmAktiviteleri = getTurizmAktiviteleri().slice(0, 6);

    // Scroll animasyonu – parallax için
    const scrollY = useRef(new Animated.Value(0)).current;
    const scrollViewRef = useRef(null);

    // Kart animasyonları
    const cityCardAnim = useRef(new Animated.Value(0)).current;
    const contentAnim = useRef(new Animated.Value(0)).current;

    const fetchData = useCallback(async () => {
        setError(null);
        try {
            const citiesResult = await getCities();
            if (citiesResult.data) setCities(citiesResult.data);

            if (user?.id) {
                const profileResult = await getProfile(user.id);
                if (profileResult.data) setProfile(profileResult.data);
            }

            // Etkinlikleri çek (misafir dahil herkes görebilir)
            getEtkinlikler({ sayi: 5 }).then(({ data }) => {
                if (data?.length) setEtkinlikler(data);
                setEtkinliklerLoading(false);
            });
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

    if (loading) return <HomeScreenSkeleton />;

    // Türkiye'nin en popüler turistik şehirleri — sıralı
    const POPULAR_CITY_NAMES = ['İstanbul', 'Antalya', 'İzmir', 'Muğla'];
    const popularCities = POPULAR_CITY_NAMES
        .map(name => cities.find(c => c.name === name))
        .filter(Boolean)
        .concat(cities.filter(c => !POPULAR_CITY_NAMES.includes(c.name)))
        .slice(0, 4);

    // Parallax: hero resmi biraz daha yavaş kayar
    const heroParallax = scrollY.interpolate({
        inputRange: [0, HERO_HEIGHT],
        outputRange: [0, -HERO_HEIGHT * 0.25],
        extrapolate: 'clamp',
    });

    return (
        <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
            {/* ═══ HERO — STICKY ARKAPLAN ═══ */}
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
                ref={scrollViewRef}
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
                {/* Hero içeriği */}
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
                    {/* ── Hero CTA ── */}
                    <TouchableOpacity
                        style={styles.heroCta}
                        onPress={() => navigation.navigate('CreateItinerary', {})}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="map-outline" size={16} color="#fff" />
                        <Text style={styles.heroCtaText}>Gezi Planla</Text>
                        <Ionicons name="arrow-forward" size={14} color="rgba(255,255,255,0.8)" />
                    </TouchableOpacity>
                </View>

                {/* İçerik kartı — beyaz yüzey */}
                <View style={[styles.contentCard, { backgroundColor: theme.colors.background }]}>
                    {error && <ErrorMessage message={error} onRetry={fetchData} />}

                    {/* ═══ POPÜLER ŞEHİRLER ═══ */}
                    <Animated.View style={[styles.section, {
                        opacity: cityCardAnim,
                        transform: [{ translateY: cityCardAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }]
                    }]}>
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionTitle}>Popüler Şehirler</Text>
                            <TouchableOpacity
                                style={styles.seeAllBtn}
                                onPress={() => navigation.navigate('AllCities', { cities })}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.seeAllText}>Hepsini Görüntüle</Text>
                                <Ionicons name="arrow-forward" size={12} color={COLORS.primary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.cityGrid}>
                            {popularCities.map((city, index) => {
                                const images = getCityImages(city.name, city.region);
                                return (
                                    <CityCard
                                        key={city.id}
                                        city={city}
                                        images={images}
                                        index={index}
                                        onPress={() => handleCityPress(city)}
                                        onPlanPress={() =>
                                            navigation.navigate('CreateItinerary', { preselectedCity: city })
                                        }
                                    />
                                );
                            })}
                        </View>
                    </Animated.View>

                    {/* ═══ ETKİNLİKLER ═══ */}
                    <Animated.View style={[styles.section, {
                        opacity: contentAnim,
                        transform: [{ translateY: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }]
                    }]}>
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionTitle}>Etkinlikler</Text>
                            <TouchableOpacity
                                style={styles.seeAllBtn}
                                onPress={() => navigation.navigate('Etkinlikler')}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.seeAllText}>Tümünü Gör</Text>
                                <Ionicons name="arrow-forward" size={12} color={COLORS.primary} />
                            </TouchableOpacity>
                        </View>

                        {etkinliklerLoading ? (
                            // Skeleton
                            [0, 1, 2].map(i => (
                                <View key={i} style={[styles.etkinlikCard, { opacity: 0.5 }]}>
                                    <View style={[styles.etkinlikDateBox, { backgroundColor: COLORS.border }]} />
                                    <View style={{ flex: 1, gap: 6 }}>
                                        <View style={{ height: 14, width: '70%', backgroundColor: COLORS.border, borderRadius: 6 }} />
                                        <View style={{ height: 11, width: '40%', backgroundColor: COLORS.border, borderRadius: 6 }} />
                                    </View>
                                </View>
                            ))
                        ) : etkinlikler.length === 0 ? (
                            <TouchableOpacity
                                style={styles.etkinlikAllBtn}
                                onPress={() => navigation.navigate('Etkinlikler')}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
                                <Text style={styles.etkinlikAllText}>Etkinlikleri Keşfet</Text>
                                <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
                            </TouchableOpacity>
                        ) : (
                            <>
                                {etkinlikler.slice(0, 3).map((etkinlik, idx) => (
                                    <EtkinlikCard
                                        key={idx}
                                        etkinlik={etkinlik}
                                        onPress={() => navigation.navigate('Etkinlikler')}
                                    />
                                ))}
                            </>
                        )}
                    </Animated.View>

                    {/* ═══ TURİZM AKTİVİTELERİ ═══ */}
                    <Animated.View style={[styles.section, {
                        opacity: contentAnim,
                        transform: [{ translateY: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }]
                    }]}>
                        <View style={styles.sectionHeaderRow}>
                            <View>
                                <Text style={styles.sectionTitle}>Turizm Aktiviteleri</Text>
                                <Text style={styles.sectionMiniSub}>Kültür Portalı rotalarından seçmeler</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.seeAllBtn}
                                onPress={() => navigation.navigate('Etkinlikler', { focus: 'turizm' })}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.seeAllText}>Tümünü Gör</Text>
                                <Ionicons name="arrow-forward" size={12} color={COLORS.primary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activityRail}>
                            {turizmAktiviteleri.map((activity) => (
                                <TurizmActivityCard
                                    key={activity.id}
                                    activity={activity}
                                    onPress={() => navigation.navigate('Etkinlikler', { focus: 'turizm', selectedActivity: activity.id })}
                                />
                            ))}
                        </ScrollView>
                    </Animated.View>

                </View>
            </Animated.ScrollView>
        </View>
    );
};

// ─── Etkinlik Card ──────────────────────────────────────────────────────────
const TUR_COLORS = {
    'Sergi': { bg: '#EDE9FE', text: '#7C3AED' },
    'Konser': { bg: '#FEF3C7', text: '#D97706' },
    'Tiyatro': { bg: '#FCE7F3', text: '#DB2777' },
    'Festival': { bg: '#D1FAE5', text: '#059669' },
    'Yarışma': { bg: '#DBEAFE', text: '#2563EB' },
};

const EtkinlikCard = React.memo(({ etkinlik, onPress }) => {
    const turStyle = TUR_COLORS[etkinlik.tur] || { bg: '#F3F4F6', text: '#374151' };
    return (
        <TouchableOpacity style={styles.etkinlikCard} onPress={onPress} activeOpacity={0.85}>
            <View style={styles.etkinlikDateBox}>
                <Text style={styles.etkinlikDay}>{etkinlik.gun}</Text>
                <Text style={styles.etkinlikMonth}>{etkinlik.ay}</Text>
            </View>
            <View style={styles.etkinlikInfo}>
                <Text style={styles.etkinlikTitle} numberOfLines={2}>{etkinlik.baslik}</Text>
                <View style={styles.etkinlikMeta}>
                    <Ionicons name="location-outline" size={11} color={COLORS.textSecondary} />
                    <Text style={styles.etkinlikIl}>{etkinlik.il}</Text>
                </View>
            </View>
            <View style={[styles.etkinlikTurBadge, { backgroundColor: turStyle.bg }]}>
                <Text style={[styles.etkinlikTurText, { color: turStyle.text }]}>{etkinlik.tur}</Text>
            </View>
        </TouchableOpacity>
    );
});

const TurizmActivityCard = React.memo(({ activity, onPress }) => (
    <TouchableOpacity style={styles.activityCard} onPress={onPress} activeOpacity={0.86}>
        <SmartImage uri={activity.imageUrl} style={styles.activityImage} contentFit="cover" transition={350} />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.72)']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.activityTypeBadge}>
            <Text style={styles.activityTypeText}>{activity.type}</Text>
        </View>
        <View style={styles.activityContent}>
            <Text style={styles.activityTitle} numberOfLines={2}>{activity.title}</Text>
            <View style={styles.activityMeta}>
                <Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.82)" />
                <Text style={styles.activityCity}>{activity.city}</Text>
            </View>
        </View>
    </TouchableOpacity>
));

// ─── City Card — Grid kartı ─────────────────────────────────────────────────
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
                    colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.85)']}
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
        height: HERO_HEIGHT + 60,
    },
    heroContent: {
        height: HERO_HEIGHT,
        justifyContent: 'flex-start',
        paddingHorizontal: SPACING.lg,
        paddingTop: Platform.OS === 'ios' ? 80 : 60,
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
        fontFamily: FONTS.display,
        fontSize: FONT_SIZES.display,
        color: '#fff',
        lineHeight: 50,
        marginBottom: SPACING.md,
        letterSpacing: -1.5,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 8,
    },
    heroSubtitle: {
        fontFamily: FONTS.bodyMedium,
        fontSize: FONT_SIZES.md,
        color: 'rgba(255,255,255,0.9)',
        lineHeight: 24,
        maxWidth: '85%',
    },
    heroCta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        alignSelf: 'flex-start',
        marginTop: SPACING.lg,
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: BORDER_RADIUS.full,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 6,
    },
    heroCtaText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.sm,
        color: '#fff',
        letterSpacing: 0.3,
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
    },

    // ─── GUEST BANNER ───
    guestBanner: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginHorizontal: SPACING.md, marginBottom: SPACING.md,
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

    // ─── SECTIONS ───
    section: {
        paddingHorizontal: SPACING.md,
        marginBottom: SPACING.lg,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    sectionTitle: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.xl,
        color: COLORS.textPrimary,
        letterSpacing: -0.5,
    },
    sectionSubtitle: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        marginLeft: SPACING.sm,
    },
    sectionMiniSub: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        marginTop: 2,
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

    // ─── ŞEHİR GRID ───
    cityGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
        justifyContent: 'space-between',
    },
    cityCard: {
        width: CITY_CARD_WIDTH,
        height: 160,
        borderRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 4,
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
        backgroundColor: 'rgba(61, 122, 98, 0.88)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },

    // ─── ETKİNLİKLER ───
    etkinlikCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.sm + 2,
        marginBottom: SPACING.xs + 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    },
    etkinlikDateBox: {
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: COLORS.primaryMuted,
        justifyContent: 'center', alignItems: 'center',
        marginRight: SPACING.sm,
    },
    etkinlikDay: {
        fontFamily: FONTS.bodySemiBold, fontSize: 16,
        color: COLORS.primary, lineHeight: 20,
    },
    etkinlikMonth: {
        fontFamily: FONTS.body, fontSize: 10,
        color: COLORS.primary, textTransform: 'uppercase',
    },
    etkinlikInfo: { flex: 1, marginRight: SPACING.xs },
    etkinlikTitle: {
        fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary, letterSpacing: -0.1,
    },
    etkinlikMeta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
    etkinlikIl: { fontFamily: FONTS.body, fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
    etkinlikTurBadge: {
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: BORDER_RADIUS.full,
    },
    etkinlikTurText: { fontFamily: FONTS.bodySemiBold, fontSize: 10 },
    etkinlikAllBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, marginTop: SPACING.xs,
        backgroundColor: COLORS.primaryMuted,
        paddingVertical: 10, borderRadius: BORDER_RADIUS.lg,
    },
    etkinlikAllText: {
        fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.sm,
        color: COLORS.primary,
    },
    activityRail: {
        gap: SPACING.sm,
        paddingRight: SPACING.md,
    },
    activityCard: {
        width: 188,
        height: 142,
        borderRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
        backgroundColor: COLORS.surface,
    },
    activityImage: {
        ...StyleSheet.absoluteFillObject,
    },
    activityTypeBadge: {
        position: 'absolute',
        top: 10,
        left: 10,
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: 'rgba(255,255,255,0.9)',
    },
    activityTypeText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: 10,
        color: COLORS.primaryDark,
    },
    activityContent: {
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: 12,
    },
    activityTitle: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.sm,
        color: '#fff',
        lineHeight: 18,
    },
    activityMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        marginTop: 5,
    },
    activityCity: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: 'rgba(255,255,255,0.82)',
    },
});

export default HomeScreen;
