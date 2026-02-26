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
import { Image } from 'expo-image';
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
import LoadingSpinner from '../../components/common/LoadingSpinner';
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
        navigation.navigate('CreateItinerary', { city });
    };

    if (loading) return <LoadingSpinner message="Yükleniyor..." />;

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
                <Image
                    source={{ uri: HERO_IMAGE }}
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
                        onPress={() => {
                            if (cities.length > 0) {
                                navigation.navigate('CreateItinerary', { city: cities[0] });
                            }
                        }}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="navigate" size={18} color="#fff" />
                        <Text style={styles.heroCTAText}>Şehir Seç, Planla</Text>
                        <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </TouchableOpacity>
                </Animated.View>
            </View>

            {error && <ErrorMessage message={error} onRetry={fetchData} />}

            {/* ═══ NEDEN AKILLI GEZI ═══ */}
            <Animated.View style={[styles.whySection, whyAnim]}>
                <Text style={styles.sectionTitle}>Neden Akıllı Gezi?</Text>
                <View style={styles.featureGrid}>
                    {[
                        { icon: 'compass', title: 'Akıllı Rotalar', desc: 'Optimum sıralama' },
                        { icon: 'time', title: 'Zaman Tasarrufu', desc: 'Hızlı planlama' },
                        { icon: 'heart', title: 'Kişiselleştirilmiş', desc: 'Size özel' },
                        { icon: 'map', title: 'Detaylı Bilgi', desc: 'Wikipedia verisi' },
                    ].map((feature) => (
                        <View key={feature.title} style={styles.featureCard}>
                            <View style={styles.featureIconContainer}>
                                <Ionicons name={feature.icon} size={22} color={COLORS.primary} />
                            </View>
                            <Text style={styles.featureTitle}>{feature.title}</Text>
                            <Text style={styles.featureDesc}>{feature.desc}</Text>
                        </View>
                    ))}
                </View>
            </Animated.View>

            {/* ═══ ACTIVE PLAN BANNER ═══ */}
            {ongoingCount > 0 && (
                <Animated.View style={bannerAnim}>
                    <TouchableOpacity
                        style={styles.activePlanBanner}
                        onPress={() => navigation.navigate('Saved')}
                        activeOpacity={0.85}
                    >
                        <LinearGradient
                            colors={COLORS.gradient.primary}
                            style={styles.bannerGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Ionicons name="map-outline" size={24} color="#fff" />
                            <View style={styles.bannerTextContainer}>
                                <Text style={styles.bannerTitle}>
                                    {ongoingCount} aktif gezi planın var!
                                </Text>
                                <Text style={styles.bannerSubtitle}>
                                    Devam etmek için dokun →
                                </Text>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            )}

            {/* ═══ CITY SELECTION ═══ */}
            <Animated.View style={[styles.section, cityAnim]}>
                <Text style={styles.sectionTitle}>🏙️ Popüler Şehirler</Text>
                <Text style={styles.sectionSubtitle}>
                    Bir şehir seçerek gezi planınızı oluşturun
                </Text>
                <View style={styles.cityGrid}>
                    {cities.map((city) => {
                        const images = getCityImages(city.name);
                        return (
                            <TouchableOpacity
                                key={city.id}
                                style={styles.cityCard}
                                onPress={() => handleCityPress(city)}
                                activeOpacity={0.85}
                            >
                                <Image
                                    source={{ uri: images.card }}
                                    style={styles.cityCardImage}
                                    contentFit="cover"
                                    transition={400}
                                />
                                <LinearGradient
                                    colors={COLORS.gradient.card}
                                    style={styles.cityCardGradient}
                                />
                                <View style={styles.cityCardContent}>
                                    <Text style={styles.cityCardName}>{city.name}</Text>
                                    <Text style={styles.cityCardRegion}>{city.region}</Text>
                                </View>
                                {/* Harita ikonu */}
                                <TouchableOpacity
                                    style={styles.cityMapButton}
                                    onPress={() => navigation.navigate('MapScreen', { city })}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Ionicons name="map" size={16} color="#fff" />
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
                        <Text style={styles.sectionTitle}>📋 Son Planlarım</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Saved')}>
                            <Text style={styles.seeAllText}>Tümü →</Text>
                        </TouchableOpacity>
                    </View>
                    {recentItineraries.map((itin) => (
                        <TouchableOpacity
                            key={itin.id}
                            style={styles.recentCard}
                            onPress={() =>
                                navigation.navigate('Saved', {
                                    screen: 'ItineraryDetail',
                                    params: { itineraryId: itin.id },
                                })
                            }
                            activeOpacity={0.85}
                        >
                            <View style={styles.recentIconContainer}>
                                <Ionicons name="map" size={20} color={COLORS.primary} />
                            </View>
                            <View style={styles.recentInfo}>
                                <Text style={styles.recentCity}>
                                    {itin.cities?.name}
                                </Text>
                                <Text style={styles.recentMeta}>
                                    {itin.days} gün · {itin.itinerary_items?.length || 0} yer
                                </Text>
                            </View>
                            <View
                                style={[
                                    styles.recentStatus,
                                    itin.status === 'completed' && styles.recentStatusCompleted,
                                ]}
                            >
                                <Text style={styles.recentStatusText}>
                                    {itin.status === 'completed' ? '✅' : '🔄'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
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
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
        marginBottom: SPACING.md,
    },
    bannerGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        gap: SPACING.sm,
    },
    bannerTextContainer: { flex: 1 },
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

    // ─── SECTIONS ───
    section: {
        paddingHorizontal: SPACING.lg,
        marginBottom: SPACING.lg,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    sectionTitle: {
        fontFamily: FONTS.heading,
        fontSize: FONT_SIZES.xl,
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    sectionSubtitle: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        marginBottom: SPACING.md,
    },
    seeAllText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.sm,
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
        padding: SPACING.sm,
        marginBottom: SPACING.xs,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    recentIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: COLORS.primaryMuted,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.sm,
    },
    recentInfo: { flex: 1 },
    recentCity: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
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
        backgroundColor: COLORS.accent + '20',
        justifyContent: 'center',
        alignItems: 'center',
    },
    recentStatusCompleted: {
        backgroundColor: COLORS.success + '20',
    },
    recentStatusText: { fontSize: 14 },
});

export default HomeScreen;
