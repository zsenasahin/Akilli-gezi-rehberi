/**
 * CityDetailScreen — Şehir detay ekranı
 * 
 * Bir gezgin şehre girdiğinde gördüğü ilk ekran.
 * Hero fotoğraf, şehir açıklaması (Wikipedia), ve kategorilere göre mekanlar.
 * 
 * Kategoriler: Gezilecek Yerler | Restoranlar | Kafeler | Oteller | Pratik
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Dimensions,
    Animated,
    Linking,
    Alert,
    Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/layout';
import { getCityImages } from '../../constants/cityImages';
import { getPlaceImage } from '../../constants/placeImages';
import { getPlacesByCity } from '../../services/placeService';
import { getCityPOIs } from '../../services/poiService';
import { getPlaceSummary } from '../../services/wikipediaService';
import { toggleFavorite, getFavoriteIds } from '../../services/favoriteService';
import { useAuth } from '../../contexts/AuthContext';
import { getCityCenter } from '../../constants/cities';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const CATEGORIES = [
    { key: 'places', label: 'Gezilecek', icon: 'compass', emoji: '🏛️' },
    { key: 'restaurant', label: 'Restoranlar', icon: 'restaurant', emoji: '🍽️' },
    { key: 'cafe', label: 'Kafeler', icon: 'cafe', emoji: '☕' },
    { key: 'hotel', label: 'Oteller', icon: 'bed', emoji: '🏨' },
    { key: 'bar', label: 'Barlar', icon: 'beer', emoji: '🍺' },
    { key: 'practical', label: 'Pratik', icon: 'medkit', emoji: '🏧' },
];

const CityDetailScreen = ({ route, navigation }) => {
    const { city } = route.params;
    const { user } = useAuth();
    const cityName = city?.name || 'İstanbul';
    const cityCenter = getCityCenter(cityName);
    const cityImages = getCityImages(cityName);

    // State
    const [activeCategory, setActiveCategory] = useState('places');
    const [places, setPlaces] = useState([]);
    const [pois, setPois] = useState({});
    const [loading, setLoading] = useState(true);
    const [poiLoading, setPoiLoading] = useState(false);
    const [cityDescription, setCityDescription] = useState('');
    const [descLoading, setDescLoading] = useState(true);
    const [favorites, setFavorites] = useState({});  // { placeId: true }
    const [selectedItem, setSelectedItem] = useState(null);
    const [wikiInfo, setWikiInfo] = useState(null);
    const [wikiLoading, setWikiLoading] = useState(false);

    // Animation
    const scrollY = useRef(new Animated.Value(0)).current;
    const headerOpacity = scrollY.interpolate({
        inputRange: [0, 200],
        outputRange: [0, 1],
        extrapolate: 'clamp',
    });

    // ─── Şehir verileri yükle ───
    useEffect(() => {
        loadCityData();
    }, [city]);

    const loadCityData = async () => {
        setLoading(true);
        try {
            // Paralel yükleme: DB yerler + Wikipedia açıklama + Favoriler
            const [placesResult, wikiResult] = await Promise.all([
                getPlacesByCity(city.id),
                getPlaceSummary(cityName),
            ]);

            if (placesResult.data) {
                setPlaces(placesResult.data);
            }
            if (wikiResult) {
                setCityDescription(wikiResult.description);
            }

            // Favorileri toplu çek (user varsa)
            if (user) {
                checkFavorites();
            }
        } catch (err) {
            console.error('Load city data error:', err);
        }
        setLoading(false);
        setDescLoading(false);
    };


    // ─── Kategori değişince POI yükle ───
    useEffect(() => {
        if (activeCategory !== 'places' && !pois[activeCategory]) {
            loadPOIs(activeCategory);
        }
    }, [activeCategory]);

    const loadPOIs = async (category) => {
        setPoiLoading(true);
        let cat = category;
        let radius = 2000;

        if (category === 'practical') {
            // ATM + Eczane birlikte
            const [atms, pharmacies] = await Promise.all([
                getCityPOIs(cityCenter.lat, cityCenter.lng, 'atm', 1500),
                getCityPOIs(cityCenter.lat, cityCenter.lng, 'pharmacy', 1500),
            ]);
            const combined = [
                ...(atms.data || []),
                ...(pharmacies.data || []),
            ];
            setPois(prev => ({ ...prev, practical: combined }));
            setPoiLoading(false);
            return;
        }

        const { data } = await getCityPOIs(cityCenter.lat, cityCenter.lng, cat, radius);
        setPois(prev => ({ ...prev, [category]: data || [] }));
        setPoiLoading(false);
    };

    // ─── Favoriler ───
    // Single query for all favorites — avoids N+1 separate DB calls
    const checkFavorites = async () => {
        if (!user) return;
        const { favoriteIds } = await getFavoriteIds(user.id);
        const favMap = {};
        favoriteIds.forEach((id) => { favMap[id] = true; });
        setFavorites(favMap);
    };

    const handleToggleFavorite = async (placeId) => {
        if (!user) {
            Alert.alert('Giriş Gerekli', 'Favorilere eklemek için giriş yapmalısınız.');
            return;
        }
        const { isFavorite } = await toggleFavorite(user.id, placeId);
        setFavorites(prev => ({ ...prev, [placeId]: isFavorite }));
    };

    // ─── Telefon ara ───
    const handleCall = (phone) => {
        if (!phone) return;
        const cleanPhone = phone.replace(/[^0-9+]/g, '');
        Linking.openURL(`tel:${cleanPhone}`);
    };

    // ─── Website aç ───
    const handleWebsite = (url) => {
        if (!url) return;
        const fullUrl = url.startsWith('http') ? url : `https://${url}`;
        Linking.openURL(fullUrl);
    };

    // ─── Wikipedia bilgisi yükle ───
    const loadWikiForItem = async (itemName) => {
        setWikiLoading(true);
        const info = await getPlaceSummary(itemName);
        setWikiInfo(info);
        setWikiLoading(false);
    };

    // ─── Açılış saatlerini formatla ───
    const formatOpeningHours = (hours) => {
        if (!hours) return null;
        // Basit formatlama
        return hours
            .replace(/Mo/g, 'Pzt').replace(/Tu/g, 'Sal').replace(/We/g, 'Çar')
            .replace(/Th/g, 'Per').replace(/Fr/g, 'Cum').replace(/Sa/g, 'Cmt')
            .replace(/Su/g, 'Paz').replace(/off/g, 'Kapalı')
            .replace(/PH/g, 'Tatil');
    };

    // ═══════════════════════════════════════
    // RENDER: DB yerler (Gezilecek)
    // ═══════════════════════════════════════
    const renderPlaceCard = (place) => {
        const isFav = favorites[place.id];
        const imageUrl = getPlaceImage(place.name, place.image_url, place.category);

        return (
            <TouchableOpacity
                key={place.id}
                style={styles.placeCard}
                activeOpacity={0.85}
                onPress={() => {
                    setSelectedItem({ ...place, source: 'db' });
                    loadWikiForItem(place.name);
                }}
            >
                <Image
                    source={{ uri: imageUrl }}
                    style={styles.placeCardImage}
                    contentFit="cover"
                    transition={300}
                />
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.6)']}
                    style={styles.placeCardGradient}
                />

                {/* Favori butonu */}
                <TouchableOpacity
                    style={styles.favButton}
                    onPress={() => handleToggleFavorite(place.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Ionicons
                        name={isFav ? 'heart' : 'heart-outline'}
                        size={20}
                        color={isFav ? '#EF4444' : '#fff'}
                    />
                </TouchableOpacity>

                <View style={styles.placeCardContent}>
                    <Text style={styles.placeCardName} numberOfLines={1}>{place.name}</Text>
                    <View style={styles.placeCardMeta}>
                        {place.entry_fee > 0 ? (
                            <View style={styles.feeBadge}>
                                <Text style={styles.feeBadgeText}>₺{place.entry_fee}</Text>
                            </View>
                        ) : (
                            <View style={[styles.feeBadge, { backgroundColor: COLORS.success + '30' }]}>
                                <Text style={[styles.feeBadgeText, { color: COLORS.success }]}>Ücretsiz</Text>
                            </View>
                        )}
                        <Text style={styles.placeCardDuration}>⏱ {place.avg_duration}s</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    // ═══════════════════════════════════════
    // RENDER: POI kartları (Restoran, Kafe, vb.)
    // ═══════════════════════════════════════
    const renderPOICard = (poi) => {
        const isRestOrCafe = ['restaurant', 'cafe', 'fast_food', 'bar', 'pub'].includes(poi.category);
        const isHotel = ['hotel', 'hostel', 'guest_house', 'motel'].includes(poi.category);

        return (
            <TouchableOpacity
                key={poi.id}
                style={styles.poiCard}
                activeOpacity={0.85}
                onPress={() => setSelectedItem({ ...poi, source: 'overpass' })}
            >
                {/* Sol: Emoji + kategori */}
                <View style={styles.poiIconContainer}>
                    <Text style={styles.poiEmoji}>{poi.emoji}</Text>
                </View>

                {/* Orta: Bilgi */}
                <View style={styles.poiInfo}>
                    <Text style={styles.poiName} numberOfLines={1}>{poi.name}</Text>
                    <Text style={styles.poiCategory}>{poi.categoryLabel}</Text>

                    {/* Mutfak türü */}
                    {isRestOrCafe && poi.cuisine ? (
                        <Text style={styles.poiCuisine} numberOfLines={1}>🍴 {poi.cuisine}</Text>
                    ) : null}

                    {/* Otel yıldızı */}
                    {isHotel && poi.stars > 0 ? (
                        <Text style={styles.poiStars}>{'⭐'.repeat(Math.min(poi.stars, 5))}</Text>
                    ) : null}

                    {/* Adres */}
                    {poi.address ? (
                        <Text style={styles.poiAddress} numberOfLines={1}>📍 {poi.address}</Text>
                    ) : null}
                </View>

                {/* Sağ: Fiyat + aksiyonlar */}
                <View style={styles.poiActions}>
                    {poi.priceRange ? (
                        <Text style={styles.poiPrice}>{poi.priceRange}</Text>
                    ) : null}

                    {poi.phone ? (
                        <TouchableOpacity
                            style={styles.poiActionButton}
                            onPress={() => handleCall(poi.phone)}
                        >
                            <Ionicons name="call" size={16} color={COLORS.success} />
                        </TouchableOpacity>
                    ) : null}

                    <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
                </View>
            </TouchableOpacity>
        );
    };

    // ═══════════════════════════════════════
    // RENDER: Detay Modal
    // ═══════════════════════════════════════
    const renderDetailModal = () => {
        if (!selectedItem) return null;
        const item = selectedItem;
        const isDB = item.source === 'db';

        return (
            <View style={styles.detailOverlay}>
                <TouchableOpacity
                    style={styles.detailBackdrop}
                    onPress={() => { setSelectedItem(null); setWikiInfo(null); }}
                />
                <View style={styles.detailSheet}>
                    {/* Kapatma butonu */}
                    <TouchableOpacity
                        style={styles.detailClose}
                        onPress={() => { setSelectedItem(null); setWikiInfo(null); }}
                    >
                        <Ionicons name="close" size={22} color={COLORS.textPrimary} />
                    </TouchableOpacity>

                    <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                        {/* Başlık */}
                        <View style={styles.detailHeader}>
                            <Text style={styles.detailEmoji}>{item.emoji || '📍'}</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.detailName}>{item.name}</Text>
                                <Text style={styles.detailCategory}>
                                    {item.categoryLabel || item.category}
                                </Text>
                            </View>
                            {isDB && (
                                <TouchableOpacity
                                    onPress={() => handleToggleFavorite(item.id)}
                                    style={styles.detailFavButton}
                                >
                                    <Ionicons
                                        name={favorites[item.id] ? 'heart' : 'heart-outline'}
                                        size={24}
                                        color={favorites[item.id] ? '#EF4444' : COLORS.textLight}
                                    />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* İstatistikler (DB yerleri için) */}
                        {isDB && (
                            <View style={styles.detailStats}>
                                <View style={styles.detailStatItem}>
                                    <Ionicons name="time-outline" size={18} color={COLORS.primary} />
                                    <Text style={styles.detailStatValue}>{item.avg_duration}s</Text>
                                    <Text style={styles.detailStatLabel}>Süre</Text>
                                </View>
                                <View style={styles.detailStatItem}>
                                    <Ionicons name="cash-outline" size={18} color={COLORS.success} />
                                    <Text style={styles.detailStatValue}>
                                        {item.entry_fee > 0 ? `₺${item.entry_fee}` : 'Ücretsiz'}
                                    </Text>
                                    <Text style={styles.detailStatLabel}>Giriş</Text>
                                </View>
                                <View style={styles.detailStatItem}>
                                    <Ionicons name="star" size={18} color={COLORS.warning} />
                                    <Text style={styles.detailStatValue}>{item.popularity_score || '-'}</Text>
                                    <Text style={styles.detailStatLabel}>Popülerlik</Text>
                                </View>
                            </View>
                        )}

                        {/* Otel için yıldız + oda */}
                        {item.stars > 0 && (
                            <View style={styles.detailInfoRow}>
                                <Ionicons name="star" size={16} color={COLORS.warning} />
                                <Text style={styles.detailInfoText}>
                                    {'⭐'.repeat(item.stars)} {item.accommodationType}
                                    {item.rooms > 0 ? ` · ${item.rooms} oda` : ''}
                                </Text>
                            </View>
                        )}

                        {/* Mutfak */}
                        {item.cuisine ? (
                            <View style={styles.detailInfoRow}>
                                <Ionicons name="restaurant-outline" size={16} color={COLORS.primary} />
                                <Text style={styles.detailInfoText}>{item.cuisine}</Text>
                            </View>
                        ) : null}

                        {/* Fiyat aralığı */}
                        {item.priceRange ? (
                            <View style={styles.detailInfoRow}>
                                <Ionicons name="cash-outline" size={16} color={COLORS.success} />
                                <Text style={styles.detailInfoText}>Fiyat: {item.priceRange}</Text>
                            </View>
                        ) : null}

                        {/* Adres */}
                        {item.address ? (
                            <View style={styles.detailInfoRow}>
                                <Ionicons name="location-outline" size={16} color={COLORS.accent} />
                                <Text style={styles.detailInfoText}>{item.address}</Text>
                            </View>
                        ) : null}

                        {/* Açık saatler */}
                        {item.openingHours ? (
                            <View style={styles.detailInfoRow}>
                                <Ionicons name="time-outline" size={16} color={COLORS.info} />
                                <Text style={styles.detailInfoText}>
                                    {formatOpeningHours(item.openingHours)}
                                </Text>
                            </View>
                        ) : null}

                        {/* WiFi */}
                        {item.internetAccess && (
                            <View style={styles.detailInfoRow}>
                                <Ionicons name="wifi" size={16} color={COLORS.primary} />
                                <Text style={styles.detailInfoText}>Ücretsiz WiFi</Text>
                            </View>
                        )}

                        {/* Engelsiz erişim */}
                        {item.wheelchair === 'yes' && (
                            <View style={styles.detailInfoRow}>
                                <Ionicons name="accessibility" size={16} color={COLORS.success} />
                                <Text style={styles.detailInfoText}>Engelsiz erişim</Text>
                            </View>
                        )}

                        {/* Vegan/Vejetaryen */}
                        {(item.dietVegan || item.dietVegetarian) && (
                            <View style={styles.detailInfoRow}>
                                <Ionicons name="leaf" size={16} color={COLORS.success} />
                                <Text style={styles.detailInfoText}>
                                    {item.dietVegan ? 'Vegan seçenekler' : 'Vejetaryen seçenekler'}
                                </Text>
                            </View>
                        )}

                        {/* Wikipedia açıklama */}
                        {wikiLoading ? (
                            <View style={styles.wikiLoadingContainer}>
                                <ActivityIndicator size="small" color={COLORS.primary} />
                                <Text style={styles.wikiLoadingText}>Bilgi yükleniyor...</Text>
                            </View>
                        ) : wikiInfo?.description ? (
                            <View style={styles.wikiSection}>
                                <View style={styles.wikiHeader}>
                                    <Ionicons name="book-outline" size={16} color={COLORS.primary} />
                                    <Text style={styles.wikiTitle}>Hakkında</Text>
                                    <View style={styles.wikiBadge}>
                                        <Text style={styles.wikiBadgeText}>Wikipedia</Text>
                                    </View>
                                </View>
                                <Text style={styles.wikiText}>{wikiInfo.description}</Text>
                            </View>
                        ) : null}

                        {/* Aksiyon butonları */}
                        <View style={styles.detailActions}>
                            {item.phone ? (
                                <TouchableOpacity
                                    style={[styles.actionBtn, { backgroundColor: COLORS.success + '15' }]}
                                    onPress={() => handleCall(item.phone)}
                                >
                                    <Ionicons name="call" size={18} color={COLORS.success} />
                                    <Text style={[styles.actionBtnText, { color: COLORS.success }]}>Ara</Text>
                                </TouchableOpacity>
                            ) : null}

                            {item.website ? (
                                <TouchableOpacity
                                    style={[styles.actionBtn, { backgroundColor: COLORS.info + '15' }]}
                                    onPress={() => handleWebsite(item.website)}
                                >
                                    <Ionicons name="globe-outline" size={18} color={COLORS.info} />
                                    <Text style={[styles.actionBtnText, { color: COLORS.info }]}>Web</Text>
                                </TouchableOpacity>
                            ) : null}

                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: COLORS.primary + '15' }]}
                                onPress={() => {
                                    setSelectedItem(null);
                                    setWikiInfo(null);
                                    navigation.navigate('MapScreen', { city, focusLat: item.lat, focusLng: item.lng });
                                }}
                            >
                                <Ionicons name="navigate" size={18} color={COLORS.primary} />
                                <Text style={[styles.actionBtnText, { color: COLORS.primary }]}>Haritada Gör</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        );
    };

    // ═══════════════════════════════════════
    // RENDER: Aktif kategorinin içeriği
    // ═══════════════════════════════════════
    const renderCategoryContent = () => {
        if (activeCategory === 'places') {
            if (loading) return <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />;
            if (places.length === 0) {
                return (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyEmoji}>🔍</Text>
                        <Text style={styles.emptyText}>Bu şehirde henüz yer bulunamadı</Text>
                    </View>
                );
            }
            return (
                <View style={styles.placesGrid}>
                    {places.map(renderPlaceCard)}
                </View>
            );
        }

        // POI kategorileri
        const currentPOIs = pois[activeCategory];

        if (poiLoading) {
            return (
                <View style={styles.loadingPOI}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>
                        {activeCategory === 'restaurant' ? 'Restoranlar aranıyor...'
                            : activeCategory === 'cafe' ? 'Kafeler aranıyor...'
                                : activeCategory === 'hotel' ? 'Oteller aranıyor...'
                                    : activeCategory === 'bar' ? 'Barlar aranıyor...'
                                        : 'Mekanlar aranıyor...'}
                    </Text>
                </View>
            );
        }

        if (!currentPOIs || currentPOIs.length === 0) {
            return (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyEmoji}>
                        {activeCategory === 'restaurant' ? '🍽️'
                            : activeCategory === 'cafe' ? '☕'
                                : activeCategory === 'hotel' ? '🏨'
                                    : '📍'}
                    </Text>
                    <Text style={styles.emptyText}>Bu bölgede sonuç bulunamadı</Text>
                    <Text style={styles.emptySubtext}>
                        Farklı bir şehir merkezinde deneyin
                    </Text>
                </View>
            );
        }

        return (
            <View style={styles.poiList}>
                <Text style={styles.poiCount}>{currentPOIs.length} sonuç bulundu</Text>
                {currentPOIs.map(renderPOICard)}
            </View>
        );
    };

    // ═══════════════════════════════════════
    // MAIN RENDER
    // ═══════════════════════════════════════
    return (
        <View style={styles.container}>
            {/* Sabit üst bar (scroll olunca görünür) */}
            <Animated.View style={[styles.stickyHeader, { opacity: headerOpacity }]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.stickyTitle} numberOfLines={1}>{cityName}</Text>
                <TouchableOpacity
                    style={styles.mapBtn}
                    onPress={() => navigation.navigate('MapScreen', { city })}
                >
                    <Ionicons name="map" size={20} color="#fff" />
                </TouchableOpacity>
            </Animated.View>

            <Animated.ScrollView
                showsVerticalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
                scrollEventThrottle={16}
            >
                {/* ═══ HERO ═══ */}
                <View style={styles.heroSection}>
                    <Image
                        source={{ uri: cityImages.hero || cityImages.card }}
                        style={styles.heroImage}
                        contentFit="cover"
                        transition={500}
                    />
                    <LinearGradient
                        colors={['transparent', 'rgba(27,40,56,0.3)', 'rgba(27,40,56,0.9)']}
                        style={styles.heroGradient}
                    />

                    {/* Geri butonu */}
                    <TouchableOpacity
                        style={styles.heroBackBtn}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={22} color="#fff" />
                    </TouchableOpacity>

                    {/* Harita butonu */}
                    <TouchableOpacity
                        style={styles.heroMapBtn}
                        onPress={() => navigation.navigate('MapScreen', { city })}
                    >
                        <Ionicons name="map" size={18} color="#fff" />
                        <Text style={styles.heroMapText}>Harita</Text>
                    </TouchableOpacity>

                    <View style={styles.heroContent}>
                        <Text style={styles.heroCity}>{cityName}</Text>
                        {city?.region && (
                            <Text style={styles.heroRegion}>📍 {city.region}</Text>
                        )}
                    </View>
                </View>

                {/* ═══ Şehir açıklaması ═══ */}
                {descLoading ? (
                    <View style={styles.descLoading}>
                        <ActivityIndicator size="small" color={COLORS.primary} />
                    </View>
                ) : cityDescription ? (
                    <View style={styles.descSection}>
                        <Text style={styles.descText} numberOfLines={4}>
                            {cityDescription}
                        </Text>
                    </View>
                ) : null}

                {/* ═══ Hızlı aksiyonlar ═══ */}
                <View style={styles.quickActions}>
                    <TouchableOpacity
                        style={styles.quickActionBtn}
                        onPress={() => navigation.navigate('MapScreen', { city })}
                    >
                        <View style={[styles.quickActionIcon, { backgroundColor: COLORS.primary + '15' }]}>
                            <Ionicons name="navigate" size={20} color={COLORS.primary} />
                        </View>
                        <Text style={styles.quickActionLabel}>Rota Oluştur</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.quickActionBtn}
                        onPress={() => navigation.navigate('CreateItinerary', { city })}
                    >
                        <View style={[styles.quickActionIcon, { backgroundColor: COLORS.accent + '15' }]}>
                            <Ionicons name="calendar" size={20} color={COLORS.accent} />
                        </View>
                        <Text style={styles.quickActionLabel}>Gezi Planla</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.quickActionBtn}
                        onPress={() => setActiveCategory('hotel')}
                    >
                        <View style={[styles.quickActionIcon, { backgroundColor: COLORS.warning + '15' }]}>
                            <Ionicons name="bed" size={20} color={COLORS.warning} />
                        </View>
                        <Text style={styles.quickActionLabel}>Konaklama</Text>
                    </TouchableOpacity>
                </View>

                {/* ═══ Kategori sekmeler ═══ */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryTabs}
                >
                    {CATEGORIES.map(cat => (
                        <TouchableOpacity
                            key={cat.key}
                            style={[
                                styles.categoryTab,
                                activeCategory === cat.key && styles.categoryTabActive,
                            ]}
                            onPress={() => setActiveCategory(cat.key)}
                        >
                            <Text style={styles.categoryTabEmoji}>{cat.emoji}</Text>
                            <Text style={[
                                styles.categoryTabLabel,
                                activeCategory === cat.key && styles.categoryTabLabelActive,
                            ]}>
                                {cat.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* ═══ İçerik ═══ */}
                <View style={styles.contentSection}>
                    {renderCategoryContent()}
                </View>

                <View style={{ height: 100 }} />
            </Animated.ScrollView>

            {/* Detay modal */}
            {selectedItem && renderDetailModal()}
        </View>
    );
};

// ═══════════════════════════════════════
// STYLES
// ═══════════════════════════════════════
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },

    // Sticky header
    stickyHeader: {
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
        flexDirection: 'row', alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
        paddingBottom: 12, paddingHorizontal: SPACING.md,
        backgroundColor: COLORS.primary,
    },
    backBtn: { padding: 6 },
    stickyTitle: {
        flex: 1, fontFamily: 'PlayfairDisplay_700Bold',
        fontSize: FONT_SIZES.lg, color: '#fff', marginLeft: SPACING.sm,
    },
    mapBtn: {
        padding: 8, backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 10,
    },

    // Hero
    heroSection: {
        height: SCREEN_H * 0.4,
        position: 'relative',
    },
    heroImage: { ...StyleSheet.absoluteFillObject },
    heroGradient: { ...StyleSheet.absoluteFillObject },
    heroBackBtn: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 30,
        left: SPACING.md,
        width: 38, height: 38, borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center', alignItems: 'center',
    },
    heroMapBtn: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 30,
        right: SPACING.md,
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: 'rgba(8,145,178,0.85)',
    },
    heroMapText: {
        fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#fff',
    },
    heroContent: {
        position: 'absolute', bottom: SPACING.lg, left: SPACING.lg,
    },
    heroCity: {
        fontFamily: 'PlayfairDisplay_700Bold', fontSize: 36, color: '#fff',
    },
    heroRegion: {
        fontFamily: 'Inter_400Regular', fontSize: FONT_SIZES.md,
        color: 'rgba(255,255,255,0.8)', marginTop: 4,
    },

    // Description
    descSection: {
        paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    descText: {
        fontFamily: 'Inter_400Regular', fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary, lineHeight: 22,
    },
    descLoading: { padding: SPACING.md, alignItems: 'center' },

    // Quick actions
    quickActions: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.md,
        gap: SPACING.sm,
    },
    quickActionBtn: {
        flex: 1, alignItems: 'center', gap: 6,
        backgroundColor: COLORS.surface,
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 8,
        elevation: 2,
    },
    quickActionIcon: {
        width: 40, height: 40, borderRadius: 12,
        justifyContent: 'center', alignItems: 'center',
    },
    quickActionLabel: {
        fontFamily: 'Inter_500Medium', fontSize: 11, color: COLORS.textPrimary,
    },

    // Category tabs
    categoryTabs: {
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm,
        gap: SPACING.xs,
    },
    categoryTab: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 16, paddingVertical: 10,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.surface,
        borderWidth: 1.5, borderColor: COLORS.border,
    },
    categoryTabActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    categoryTabEmoji: { fontSize: 16 },
    categoryTabLabel: {
        fontFamily: 'Inter_500Medium', fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    categoryTabLabelActive: { color: '#fff', fontFamily: 'Inter_600SemiBold' },

    // Content
    contentSection: {
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.sm,
        minHeight: 300,
    },

    // Place cards (DB)
    placesGrid: {
        flexDirection: 'row', flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    placeCard: {
        width: (SCREEN_W - SPACING.lg * 2 - SPACING.sm) / 2,
        height: 200,
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
        position: 'relative',
    },
    placeCardImage: { ...StyleSheet.absoluteFillObject },
    placeCardGradient: {
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 100,
    },
    favButton: {
        position: 'absolute', top: 8, right: 8,
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center', alignItems: 'center',
    },
    placeCardContent: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: SPACING.sm,
    },
    placeCardName: {
        fontFamily: 'Inter_600SemiBold', fontSize: FONT_SIZES.sm,
        color: '#fff', marginBottom: 4,
    },
    placeCardMeta: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
    },
    feeBadge: {
        backgroundColor: 'rgba(255,255,255,0.25)',
        paddingHorizontal: 8, paddingVertical: 2,
        borderRadius: BORDER_RADIUS.sm,
    },
    feeBadgeText: {
        fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#fff',
    },
    placeCardDuration: {
        fontFamily: 'Inter_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.8)',
    },

    // POI cards
    poiList: { gap: SPACING.xs },
    poiCount: {
        fontFamily: 'Inter_400Regular', fontSize: FONT_SIZES.xs,
        color: COLORS.textLight, marginBottom: SPACING.sm,
    },
    poiCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: COLORS.surface,
        padding: SPACING.sm,
        borderRadius: BORDER_RADIUS.lg,
        marginBottom: SPACING.xs,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04, shadowRadius: 4,
        elevation: 1,
    },
    poiIconContainer: {
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: COLORS.surfaceAlt,
        justifyContent: 'center', alignItems: 'center',
        marginRight: SPACING.sm,
    },
    poiEmoji: { fontSize: 22 },
    poiInfo: { flex: 1 },
    poiName: {
        fontFamily: 'Inter_600SemiBold', fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
    },
    poiCategory: {
        fontFamily: 'Inter_400Regular', fontSize: FONT_SIZES.xs,
        color: COLORS.textLight, marginTop: 1,
    },
    poiCuisine: {
        fontFamily: 'Inter_400Regular', fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary, marginTop: 2,
    },
    poiStars: { fontSize: 12, marginTop: 2 },
    poiAddress: {
        fontFamily: 'Inter_400Regular', fontSize: 11,
        color: COLORS.textLight, marginTop: 2,
    },
    poiActions: {
        alignItems: 'flex-end', gap: 4, marginLeft: SPACING.xs,
    },
    poiPrice: {
        fontFamily: 'Inter_600SemiBold', fontSize: FONT_SIZES.sm,
        color: COLORS.success,
    },
    poiActionButton: {
        width: 32, height: 32, borderRadius: 10,
        backgroundColor: COLORS.success + '10',
        justifyContent: 'center', alignItems: 'center',
    },

    // Empty state
    emptyState: {
        alignItems: 'center', paddingTop: SPACING.xxl * 2,
    },
    emptyEmoji: { fontSize: 48, marginBottom: SPACING.md },
    emptyText: {
        fontFamily: 'Inter_500Medium', fontSize: FONT_SIZES.lg,
        color: COLORS.textPrimary,
    },
    emptySubtext: {
        fontFamily: 'Inter_400Regular', fontSize: FONT_SIZES.sm,
        color: COLORS.textLight, marginTop: 4,
    },

    // Loading
    loadingPOI: { alignItems: 'center', paddingTop: 60 },
    loadingText: {
        fontFamily: 'Inter_400Regular', fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary, marginTop: SPACING.sm,
    },

    // Detail modal
    detailOverlay: {
        ...StyleSheet.absoluteFillObject, zIndex: 200,
        justifyContent: 'flex-end',
    },
    detailBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    detailSheet: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: BORDER_RADIUS.xl,
        borderTopRightRadius: BORDER_RADIUS.xl,
        maxHeight: SCREEN_H * 0.75,
        paddingBottom: SPACING.xxl,
    },
    detailClose: {
        position: 'absolute', top: SPACING.sm, right: SPACING.sm, zIndex: 10,
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: COLORS.surfaceAlt,
        justifyContent: 'center', alignItems: 'center',
    },
    detailHeader: {
        flexDirection: 'row', alignItems: 'center',
        padding: SPACING.lg, paddingBottom: SPACING.sm, gap: SPACING.sm,
    },
    detailEmoji: { fontSize: 36 },
    detailName: {
        fontFamily: 'PlayfairDisplay_700Bold', fontSize: FONT_SIZES.xl,
        color: COLORS.textPrimary,
    },
    detailCategory: {
        fontFamily: 'Inter_400Regular', fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary, marginTop: 2,
    },
    detailFavButton: { padding: 8 },

    // Stats
    detailStats: {
        flexDirection: 'row', justifyContent: 'space-around',
        backgroundColor: COLORS.surfaceAlt,
        marginHorizontal: SPACING.lg,
        borderRadius: BORDER_RADIUS.lg,
        paddingVertical: SPACING.md,
        marginBottom: SPACING.md,
    },
    detailStatItem: { alignItems: 'center', gap: 4 },
    detailStatValue: {
        fontFamily: 'Inter_600SemiBold', fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
    },
    detailStatLabel: {
        fontFamily: 'Inter_400Regular', fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
    },

    // Info rows
    detailInfoRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingHorizontal: SPACING.lg, paddingVertical: 6,
    },
    detailInfoText: {
        fontFamily: 'Inter_400Regular', fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary, flex: 1,
    },

    // Wiki
    wikiLoadingContainer: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
    },
    wikiLoadingText: {
        fontFamily: 'Inter_400Regular', fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    wikiSection: {
        marginHorizontal: SPACING.lg, marginTop: SPACING.sm,
        padding: SPACING.md,
        backgroundColor: COLORS.surfaceAlt,
        borderRadius: BORDER_RADIUS.lg,
    },
    wikiHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        marginBottom: SPACING.sm,
    },
    wikiTitle: {
        fontFamily: 'Inter_600SemiBold', fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary, flex: 1,
    },
    wikiBadge: {
        backgroundColor: COLORS.primaryMuted,
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: BORDER_RADIUS.sm,
    },
    wikiBadgeText: {
        fontFamily: 'Inter_500Medium', fontSize: 10, color: COLORS.primary,
    },
    wikiText: {
        fontFamily: 'Inter_400Regular', fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary, lineHeight: 22,
    },

    // Actions
    detailActions: {
        flexDirection: 'row', gap: SPACING.sm,
        paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg,
    },
    actionBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 6,
        paddingVertical: 12, borderRadius: BORDER_RADIUS.lg,
    },
    actionBtnText: {
        fontFamily: 'Inter_600SemiBold', fontSize: FONT_SIZES.sm,
    },
});

export default CityDetailScreen;
