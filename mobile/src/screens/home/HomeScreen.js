import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
    TextInput,
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
const HERO_HEIGHT = SCREEN.height * 0.48;
const CITY_CARD_WIDTH = (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.sm) / 2;

const HERO_IMAGE = 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1200&h=900&fit=crop&q=85';

// Bölge renk haritası — emoji yerine renkli nokta
const REGION_COLORS = {
    'Tümü': COLORS.primary,
    'Marmara': '#6366F1',
    'Ege': '#0891B2',
    'Akdeniz': '#F59E0B',
    'İç Anadolu': '#84CC16',
    'Karadeniz': '#10B981',
    'Doğu Anadolu': '#8B5CF6',
    'Güneydoğu Anadolu': '#EF4444',
};

const HomeScreen = ({ navigation }) => {
    const { user, isGuest } = useAuth();
    const requireAuth = useRequireAuth(navigation);
    const [profile, setProfile] = useState(null);
    const [cities, setCities] = useState([]);
    const [recentItineraries, setRecentItineraries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    // Arama & filtre
    const [searchQuery, setSearchQuery] = useState('');
    const [activeRegion, setActiveRegion] = useState('Tümü');

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

    // Bölge listesi (oluştur)
    const regions = useMemo(() => {
        const uniqueRegions = [...new Set(cities.map(c => c.region))];
        return ['Tümü', ...uniqueRegions];
    }, [cities]);

    // Arama + bölge filtresi
    const filteredCities = useMemo(() => {
        let result = cities;
        if (activeRegion !== 'Tümü') {
            result = result.filter(c => c.region === activeRegion);
        }
        if (searchQuery.trim().length > 0) {
            const q = searchQuery.trim().toLowerCase();
            result = result.filter(c =>
                c.name.toLowerCase().includes(q) ||
                c.region.toLowerCase().includes(q)
            );
        }
        return result;
    }, [cities, activeRegion, searchQuery]);

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
                </View>

                {/* İçerik kartı — beyaz yüzey */}
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

                    {/* ═══ HIZLI İŞLEMLER — Minimalist ═══ */}
                    <View style={styles.quickRow}>
                        <TouchableOpacity
                            style={styles.quickItem}
                            onPress={() => {
                                if (!requireAuth('Gezi planı oluşturmak için giriş yapmalısınız.')) return;
                                navigation.navigate('CreateItinerary', {});
                            }}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.quickIcon, { backgroundColor: COLORS.primary + '12' }]}>
                                <Ionicons name="add-circle-outline" size={22} color={COLORS.primary} />
                            </View>
                            <Text style={styles.quickLabel}>Gezi Planla</Text>
                        </TouchableOpacity>

                        {ongoingCount > 0 && (
                            <TouchableOpacity
                                style={styles.quickItem}
                                onPress={() => navigation.navigate('Saved')}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.quickIcon, { backgroundColor: COLORS.success + '12' }]}>
                                    <View style={styles.quickBadge}>
                                        <Text style={styles.quickBadgeText}>{ongoingCount}</Text>
                                    </View>
                                    <Ionicons name="map-outline" size={22} color={COLORS.success} />
                                </View>
                                <Text style={styles.quickLabel}>Aktif Plan</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={styles.quickItem}
                            onPress={() => navigation.navigate('Saved')}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.quickIcon, { backgroundColor: COLORS.accent + '12' }]}>
                                <Ionicons name="bookmarks-outline" size={20} color={COLORS.accent} />
                            </View>
                            <Text style={styles.quickLabel}>Planlarım</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.quickItem}
                            onPress={() => navigation.navigate('Favorites')}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.quickIcon, { backgroundColor: '#EF444412' }]}>
                                <Ionicons name="heart-outline" size={20} color="#EF4444" />
                            </View>
                            <Text style={styles.quickLabel}>Favoriler</Text>
                        </TouchableOpacity>
                    </View>

                    {/* ═══ ŞEHİRLER — Arama + Filtre + Grid ═══ */}
                    <Animated.View style={[styles.section, {
                        opacity: cityCardAnim,
                        transform: [{ translateY: cityCardAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }]
                    }]}>
                        <View style={styles.sectionHeaderRow}>
                            <View>
                                <Text style={styles.sectionTitle}>Şehirler</Text>
                                <Text style={styles.sectionSubtitle}>{filteredCities.length} şehir</Text>
                            </View>
                        </View>

                        {/* Arama kutusu */}
                        <View style={styles.searchContainer}>
                            <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Şehir veya bölge ara..."
                                placeholderTextColor={COLORS.textLight}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                returnKeyType="search"
                                clearButtonMode="while-editing"
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Bölge filtreleri */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.regionFilters}
                        >
                            {regions.map((region) => {
                                const isActive = activeRegion === region;
                                const dotColor = REGION_COLORS[region] || COLORS.primary;
                                return (
                                    <TouchableOpacity
                                        key={region}
                                        style={[styles.regionChip, isActive && styles.regionChipActive, isActive && { borderColor: dotColor + '60', backgroundColor: dotColor + '12' }]}
                                        onPress={() => setActiveRegion(region)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.regionDot, { backgroundColor: dotColor }]} />
                                        <Text style={[styles.regionText, isActive && styles.regionTextActive, isActive && { color: dotColor }]}>{region}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* Şehir grid'i — 2'li sütun */}
                        {filteredCities.length === 0 ? (
                            <View style={styles.emptySearch}>
                                <Ionicons name="search-outline" size={36} color={COLORS.textLight} />
                                <Text style={styles.emptySearchTitle}>Sonuç bulunamadı</Text>
                                <Text style={styles.emptySearchText}>
                                    Farklı bir arama terimi veya bölge deneyin
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.cityGrid}>
                                {filteredCities.map((city, index) => {
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
                        )}
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

    // ─── HIZLI İŞLEMLER (Minimalist) ───
    quickRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: SPACING.lg,
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.lg,
        paddingVertical: SPACING.sm,
    },
    quickItem: {
        alignItems: 'center',
        gap: 6,
    },
    quickIcon: {
        width: 52,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    quickLabel: {
        fontFamily: FONTS.bodyMedium,
        fontSize: 11,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    quickBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: COLORS.success,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    quickBadgeText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: 10,
        color: '#fff',
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
        marginBottom: SPACING.sm,
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

    // ─── ARAMA ───
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        paddingHorizontal: SPACING.md,
        paddingVertical: Platform.OS === 'ios' ? 12 : 6,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: SPACING.sm,
    },
    searchInput: {
        flex: 1,
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        paddingVertical: 0,
    },

    // ─── BÖLGE FİLTRELERİ ───
    regionFilters: {
        gap: 8,
        paddingBottom: SPACING.sm + 4,
    },
    regionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    regionChipActive: {
        backgroundColor: COLORS.primary + '12',
        borderColor: COLORS.primary + '40',
    },
    regionDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    regionText: {
        fontFamily: FONTS.bodyMedium,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
    },
    regionTextActive: {
        color: COLORS.primary,
        fontFamily: FONTS.bodySemiBold,
    },

    // ─── ŞEHİR GRID ───
    cityGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
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
        backgroundColor: 'rgba(8,145,178,0.88)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },

    // ─── BOŞTA ARAMA ───
    emptySearch: {
        alignItems: 'center',
        paddingVertical: SPACING.xxl,
        gap: SPACING.sm,
    },
    emptySearchTitle: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
    },
    emptySearchText: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        textAlign: 'center',
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
