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
    TextInput,
    Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/layout';
import { getCityImages } from '../../services/cityImageService';
import { getPlaceImage } from '../../constants/placeImages';
import { getCityPOIs } from '../../services/poiService';
import { getBatchPlacePhotos } from '../../services/placePhotoService';
import { toggleFavorite, getFavoriteIds } from '../../services/favoriteService';
import { useFocusEffect } from '@react-navigation/native';
import { loadCityPlaces } from '../../services/placeDataManager';
import { cache, TTL } from '../../services/cacheService';

import { useAuth } from '../../contexts/AuthContext';
import { getCityCenter } from '../../constants/cities';
import { CityDetailSkeleton, SkeletonLoader } from '../../components/common/SkeletonLoader';
import { useAssistantContext } from '../../contexts/AssistantContext';
import { useThemePreference } from '../../contexts/ThemeContext';

import mutfakData from '../../data/turkiye_mutfak.json';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const BASE_KP_URL = 'https://www.kulturportali.gov.tr';

const CATEGORIES = [
    { key: 'places', label: 'Gezilecek', icon: 'compass', emoji: '🏛️' },
    { key: 'neyenir', label: 'Ne Yenir?', icon: 'restaurant', emoji: '🍽️' },
    { key: 'restaurant', label: 'Restoranlar', icon: 'storefront', emoji: '🏪' },
    { key: 'cafe', label: 'Kafeler', icon: 'cafe', emoji: '☕' },
    { key: 'hotel', label: 'Oteller', icon: 'bed', emoji: '🏨' },
    { key: 'practical', label: 'Pratik', icon: 'medkit', emoji: '🏧' },
];

const CityDetailScreen = ({ route, navigation }) => {
    const { city } = route.params;
    const { user } = useAuth();
    const insets = useSafeAreaInsets();
    const cityName = city?.name || 'İstanbul';
    const cityCenter = getCityCenter(cityName);
    const cityImages = getCityImages(cityName, city?.region);
    const { setAssistantContext, clearAssistantContext } = useAssistantContext();
    const { theme } = useThemePreference();

    // State
    const [activeCategory, setActiveCategory] = useState('places');
    const [places, setPlaces] = useState([]);
    const [pois, setPois] = useState({});
    const [poiErrors, setPoiErrors] = useState({});
    const [loading, setLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState('');
    const [poiLoading, setPoiLoading] = useState(false);
    const [cityDescription, setCityDescription] = useState('');
    const [descLoading, setDescLoading] = useState(true);
    const [favorites, setFavorites] = useState({});
    const [selectedItem, setSelectedItem] = useState(null);
    const [placeSearch, setPlaceSearch] = useState('');
    const [placePhotos, setPlacePhotos] = useState({});
    const [lightboxUri, setLightboxUri] = useState(null);

    // Yöresel yemekler
    const [yemekler, setYemekler] = useState([]);
    const [selectedYemek, setSelectedYemek] = useState(null);

    // Animation
    const scrollY = useRef(new Animated.Value(0)).current;
    const headerOpacity = scrollY.interpolate({
        inputRange: [0, 200],
        outputRange: [0, 1],
        extrapolate: 'clamp',
    });
    // Sticky header pointer events: sadece görünür olduğunda tıklanabilir
    const [stickyVisible, setStickyVisible] = useState(false);
    useEffect(() => {
        const id = scrollY.addListener(({ value }) => {
            setStickyVisible(value > 150);
        });
        return () => scrollY.removeListener(id);
    }, [scrollY]);

    // ─── Asistan bağlamını güncelle ───
    useFocusEffect(
        useCallback(() => {
            setAssistantContext({
                screen: 'city',
                city: cityName,
                cityDescription,
            });
            return () => clearAssistantContext();
        }, [cityName, cityDescription, setAssistantContext, clearAssistantContext])
    );

    // ─── Şehir verileri yükle ───
    useEffect(() => {
        loadCityData();
    }, [city]);

    const loadCityData = async () => {
        setLoading(true);
        setLoadingProgress('');
        try {
            setDescLoading(false); // Şehir açıklaması artık gösterilmiyor
            // placeDataManager: Supabase cache → Overpass → Wikidata → Wikipedia → Commons
            const cityWithCoords = {
                id: city.id,
                name: cityName,
                lat: cityCenter.lat,
                lng: cityCenter.lng,
            };

            const osmPlaces = await loadCityPlaces(cityWithCoords, (step) => {
                setLoadingProgress(step);
            });

            if (osmPlaces.length > 0) {
                setPlaces(osmPlaces);
            }

            if (user) checkFavorites();

            // Yöresel yemekleri yükle (statik JSON'dan)
            loadYemekler();
        } catch (err) {
            console.warn('loadCityData error:', err);
        }
        setLoading(false);
        setLoadingProgress('');
    };


    // ─── Yöresel yemekleri yükle ───
    const loadYemekler = useCallback(() => {
        const ilData = mutfakData[cityName];
        if (ilData?.yemekler?.length) {
            setYemekler(ilData.yemekler);
            return;
        }
        // Normalize ile eşleştir
        const norm = (s) => (s||'').toLowerCase()
            .replace(/İ/g,'i').replace(/ı/g,'i').replace(/Ğ/g,'g').replace(/ğ/g,'g')
            .replace(/Ü/g,'u').replace(/ü/g,'u').replace(/Ş/g,'s').replace(/ş/g,'s')
            .replace(/Ö/g,'o').replace(/ö/g,'o').replace(/Ç/g,'c').replace(/ç/g,'c');
        const key = Object.keys(mutfakData).find(k => norm(k) === norm(cityName));
        if (key) setYemekler(mutfakData[key].yemekler || []);
    }, [cityName]);

    // ─── Kategori değişince POI yükle ───
    useEffect(() => {
        if (activeCategory !== 'places' && !pois[activeCategory]) {
            loadPOIs(activeCategory);
        }
    }, [activeCategory]);

    const loadPOIs = async (category) => {
        setPoiLoading(true);
        setPoiErrors(prev => ({ ...prev, [category]: null }));
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
            if (combined.length === 0 && (atms.error || pharmacies.error)) {
                setPoiErrors(prev => ({ ...prev, practical: 'Pratik yerler şu an alınamadı.' }));
            }
            setPoiLoading(false);
            return;
        }

        const { data, error: poiError } = await getCityPOIs(cityCenter.lat, cityCenter.lng, cat, radius);
        setPois(prev => ({ ...prev, [category]: data || [] }));
        if ((!data || data.length === 0) && poiError) {
            setPoiErrors(prev => ({ ...prev, [category]: 'Bu kategori için sonuçlar şu an alınamadı.' }));
        }
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

    const handleToggleFavorite = async (place) => {
        if (!user) {
            Alert.alert('Giriş Gerekli', 'Favorilere eklemek için giriş yapmalısınız.');
            return;
        }
        const placeToSave = {
            ...place,
            cities: place.cities || { name: cityName }
        };
        const { isFavorite, error } = await toggleFavorite(user.id, placeToSave);
        if (error) {
            Alert.alert('Hata', 'Favori işlemi gerçekleştirilemedi: ' + (error.message || 'Bilinmeyen hata'));
            return;
        }
        setFavorites(prev => ({ ...prev, [place.id]: isFavorite }));
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
        const isOverpassPlace = place.source === 'overpass';
        const isFav = favorites[place.id];
        // Öncelik: Wikipedia gerçek fotoğraf > curated fallback
        const wikiPhoto = placePhotos[place.name];
        const imageUrl = wikiPhoto?.imageUrl || getPlaceImage(place.name, place.image_url, place.category);
        const photoSource = wikiPhoto?.source;

        return (
            <TouchableOpacity
                key={place.id}
                style={styles.placeCard}
                activeOpacity={0.85}
                onPress={() => {
                    setSelectedItem({ ...place, source: place.source || 'db' });
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
                {!isOverpassPlace && (
                    <TouchableOpacity
                        style={styles.favButton}
                        onPress={() => handleToggleFavorite(place)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons
                            name={isFav ? 'heart' : 'heart-outline'}
                            size={20}
                            color={isFav ? '#EF4444' : '#fff'}
                        />
                    </TouchableOpacity>
                )}

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
                        <Text style={styles.placeCardDuration}>
                            {isOverpassPlace ? (place.categoryLabel || 'Turistik Yer') : `⏱ ${place.avg_duration}s`}
                        </Text>
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

        const photoResult = placePhotos[item.name];
        const heroImageUrl =
            photoResult?.imageUrl ||
            getPlaceImage(item.name, item.image_url, item.category);

        return (
            <View style={styles.detailOverlay}>
                <TouchableOpacity
                    style={styles.detailBackdrop}
                    onPress={() => { setSelectedItem(null); }}
                />
                <View style={styles.detailSheet}>
                    {/* Fotoğraf Hero */}
                    <View style={styles.detailHero}>
                        <Image
                            source={{ uri: heroImageUrl }}
                            style={styles.detailHeroImage}
                            contentFit="cover"
                            transition={400}
                        />
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.6)']}
                            style={StyleSheet.absoluteFillObject}
                        />
                        {/* Kaynak badge */}
                        <TouchableOpacity
                            style={styles.detailClose}
                            onPress={() => { setSelectedItem(null); }}
                        >
                            <Ionicons name="close" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>

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
                                    onPress={() => handleToggleFavorite(item)}
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

                        {/* Kültür Portalı açıklaması */}
                        {item.source === 'kulturportali' && item.description ? (
                            <View style={styles.wikiSection}>
                                <View style={styles.wikiHeader}>
                                    <Ionicons name="book-outline" size={16} color={COLORS.primary} />
                                    <Text style={styles.wikiTitle}>Hakkında</Text>
                                    <View style={[styles.wikiBadge, { backgroundColor: '#e8f4f8' }]}>
                                        <Text style={[styles.wikiBadgeText, { color: '#0077aa' }]}>Kültür Portalı</Text>
                                    </View>
                                </View>
                                <Text style={styles.wikiText}>{item.description}</Text>
                            </View>
                        ) : null}

                        {/* Fotoğraf galerisi (Kültür Portalı) */}
                        {item.source === 'kulturportali' && item.gallery?.length > 1 ? (
                            <View style={styles.gallerySection}>
                                <Text style={styles.gallerySectionTitle}>📸 Fotoğraflar</Text>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.galleryScroll}
                                >
                                    {item.gallery.map((imgUrl, idx) => (
                                        <TouchableOpacity key={idx} onPress={() => setLightboxUri(imgUrl)} activeOpacity={0.85}>
                                            <Image
                                                source={{ uri: imgUrl }}
                                                style={styles.galleryThumb}
                                                contentFit="cover"
                                                transition={300}
                                            />
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
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

                            {/* Web buton mantığı: her ikisi varsa sadece "Webde Gör", sadece biri varsa o gösterilir */}
                            {(() => {
                                const hasWebsite = !!item.website;
                                const hasKP = !!item.kulturportali_url;
                                if (hasKP) {
                                    return (
                                        <TouchableOpacity
                                            style={[styles.actionBtn, { backgroundColor: '#e8f4f8' }]}
                                            onPress={() => Linking.openURL(item.kulturportali_url)}
                                        >
                                            <Ionicons name="open-outline" size={18} color="#0077aa" />
                                            <Text style={[styles.actionBtnText, { color: '#0077aa' }]}>Webde Gör</Text>
                                        </TouchableOpacity>
                                    );
                                }
                                if (hasWebsite) {
                                    return (
                                        <TouchableOpacity
                                            style={[styles.actionBtn, { backgroundColor: COLORS.info + '15' }]}
                                            onPress={() => handleWebsite(item.website)}
                                        >
                                            <Ionicons name="globe-outline" size={18} color={COLORS.info} />
                                            <Text style={[styles.actionBtnText, { color: COLORS.info }]}>Web</Text>
                                        </TouchableOpacity>
                                    );
                                }
                                return null;
                            })()}

                            {/* Haritada Gör → direkt Google Maps */}
                            {item.lat && item.lng ? (
                                <TouchableOpacity
                                    style={[styles.actionBtn, { backgroundColor: COLORS.primary + '15' }]}
                                    onPress={() => {
                                        const url = `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`;
                                        Linking.openURL(url).catch(() => {
                                            Linking.openURL(`https://maps.google.com/?q=${item.lat},${item.lng}`);
                                        });
                                    }}
                                >
                                    <Ionicons name="navigate" size={18} color={COLORS.primary} />
                                    <Text style={[styles.actionBtnText, { color: COLORS.primary }]}>Haritada Gör</Text>
                                </TouchableOpacity>
                            ) : null}
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
            if (loading) return (
                <View>
                    <CityDetailSkeleton />
                    {loadingProgress ? (
                        <Text style={{ textAlign: 'center', color: COLORS.textLight, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 8, paddingHorizontal: 16 }}>
                            {loadingProgress}
                        </Text>
                    ) : null}
                </View>
            );
            if (places.length === 0) {
                return (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyEmoji}>🔍</Text>
                        <Text style={styles.emptyText}>Bu şehirde henüz yer bulunamadı</Text>
                    </View>
                );
            }

            const filteredPlaces = placeSearch.trim()
                ? places.filter(p =>
                    p.name.toLowerCase().includes(placeSearch.toLowerCase()) ||
                    p.category?.toLowerCase().includes(placeSearch.toLowerCase())
                )
                : places;

            return (
                <View>
                    {/* Arama kutusu */}
                    <View style={styles.placeSearchContainer}>
                        <Ionicons name="search" size={16} color={COLORS.textLight} />
                        <TextInput
                            style={styles.placeSearchInput}
                            placeholder="Yer ara..."
                            placeholderTextColor={COLORS.textLight}
                            value={placeSearch}
                            onChangeText={setPlaceSearch}
                        />
                        {placeSearch.length > 0 && (
                            <TouchableOpacity onPress={() => setPlaceSearch('')}>
                                <Ionicons name="close-circle" size={16} color={COLORS.textLight} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {filteredPlaces.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyEmoji}>🔍</Text>
                            <Text style={styles.emptyText}>"{placeSearch}" ile eşleşen yer bulunamadı</Text>
                        </View>
                    ) : (
                        <View style={styles.placesGrid}>
                            {filteredPlaces.map(renderPlaceCard)}
                        </View>
                    )}
                </View>
            );
        }

        // Ne Yenir? — Yöresel yemekler
        if (activeCategory === 'neyenir') {
            if (yemekler.length === 0) {
                return (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconWrap}>
                            <Text style={{ fontSize: 48 }}>🍽️</Text>
                        </View>
                        <Text style={styles.emptyText}>Yöresel yemek verisi bulunamadı</Text>
                        <Text style={styles.emptySubtext}>Bu şehir için henüz içerik eklenmemiş</Text>
                    </View>
                );
            }

            // Öne çıkan ilk yemek (hero card)
            const heroYemek = yemekler[0];
            const heroImgUrl = heroYemek.Resim ? `${BASE_KP_URL}${heroYemek.Resim}` : null;

            return (
                <View>
                    {/* Başlık */}
                    <View style={styles.neyenirHeader}>
                        <View style={styles.neyenirHeaderLeft}>
                            <Text style={styles.neyenirTitle}>{cityName} Mutfağı</Text>
                            <Text style={styles.neyenirSubtitle}>{yemekler.length} yöresel lezzet</Text>
                        </View>
                        <View style={styles.neyenirBadge}>
                            <Text style={styles.neyenirBadgeText}>🏆 Yöresel</Text>
                        </View>
                    </View>

                    {/* Hero kart — öne çıkan yemek */}
                    <TouchableOpacity
                        style={styles.yemekHeroCard}
                        activeOpacity={0.88}
                        onPress={() => setSelectedYemek(heroYemek)}
                    >
                        <Image
                            source={{ uri: heroImgUrl }}
                            style={styles.yemekHeroImage}
                            contentFit="cover"
                            transition={400}
                        />
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.82)']}
                            style={StyleSheet.absoluteFillObject}
                        />
                        <View style={styles.yemekHeroBadge}>
                            <Ionicons name="star" size={11} color="#FFB800" />
                            <Text style={styles.yemekHeroBadgeText}>Öne Çıkan</Text>
                        </View>
                        <View style={styles.yemekHeroContent}>
                            <Text style={styles.yemekHeroName} numberOfLines={2}>
                                {toTitleCase(heroYemek.Baslik || '')}
                            </Text>
                            <View style={styles.yemekHeroMeta}>
                                <Ionicons name="restaurant-outline" size={13} color="rgba(255,255,255,0.8)" />
                                <Text style={styles.yemekHeroMetaText}>{cityName} Mutfağı</Text>
                                <View style={styles.yemekHeroArrow}>
                                    <Ionicons name="arrow-forward" size={14} color="#fff" />
                                </View>
                            </View>
                        </View>
                    </TouchableOpacity>

                    {/* Diğer yemekler — 2'li grid */}
                    <Text style={styles.neyenirGridTitle}>Tüm Lezzetler</Text>
                    <View style={styles.yemekGrid}>
                        {yemekler.slice(1).map((yemek, idx) => {
                            const imgUrl = yemek.Resim
                                ? `${BASE_KP_URL}${yemek.Resim}`
                                : null;
                            return (
                                <TouchableOpacity
                                    key={idx}
                                    style={styles.yemekCard}
                                    activeOpacity={0.85}
                                    onPress={() => setSelectedYemek(yemek)}
                                >
                                    <Image
                                        source={{ uri: imgUrl }}
                                        style={styles.yemekCardImage}
                                        contentFit="cover"
                                        transition={300}
                                    />
                                    <LinearGradient
                                        colors={['transparent', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.72)']}
                                        style={StyleSheet.absoluteFillObject}
                                    />
                                    <View style={styles.yemekCardContent}>
                                        <Text style={styles.yemekCardName} numberOfLines={2}>
                                            {toTitleCase(yemek.Baslik || '')}
                                        </Text>
                                        <View style={styles.yemekCardFooter}>
                                            <Ionicons name="restaurant-outline" size={10} color="rgba(255,255,255,0.7)" />
                                            <Text style={styles.yemekCardCity}>{cityName}</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Kültür Portalı atıfı */}
                    <View style={styles.neyenirFooter}>
                        <Ionicons name="information-circle-outline" size={13} color={COLORS.textLight} />
                        <Text style={styles.neyenirFooterText}>Veriler Kültür Portalı'ndan alınmaktadır</Text>
                    </View>
                </View>
            );
        }

        // POI kategorileri
        const currentPOIs = pois[activeCategory];
        const currentPOIError = poiErrors[activeCategory];

        if (poiLoading) {
            return (
                <View style={styles.poiSkeletonList}>
                    {[0, 1, 2, 3, 4].map(i => (
                        <View key={i} style={styles.poiSkeletonRow}>
                            <SkeletonLoader width={44} height={44} radius={12} />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <SkeletonLoader width="65%" height={14} radius={6} style={{ marginBottom: 6 }} />
                                <SkeletonLoader width="45%" height={12} radius={6} style={{ marginBottom: 4 }} />
                                <SkeletonLoader width="30%" height={11} radius={6} />
                            </View>
                            <SkeletonLoader width={24} height={24} radius={12} />
                        </View>
                    ))}
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
                    <Text style={styles.emptyText}>
                        {currentPOIError ? 'Şu an sonuç alınamadı' : 'Bu bölgede sonuç bulunamadı'}
                    </Text>
                    <Text style={styles.emptySubtext}>
                        {currentPOIError ? 'Ücretsiz harita servisleri bazen yanıt vermeyebilir.' : 'Farklı bir şehir merkezinde deneyin'}
                    </Text>
                    {currentPOIError ? (
                        <TouchableOpacity style={styles.retryPoiBtn} onPress={() => loadPOIs(activeCategory)} activeOpacity={0.82}>
                            <Ionicons name="refresh" size={15} color="#fff" />
                            <Text style={styles.retryPoiText}>Tekrar dene</Text>
                        </TouchableOpacity>
                    ) : null}
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
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Sabit üst bar (scroll olunca görünür) */}
            <Animated.View
                pointerEvents={stickyVisible ? 'auto' : 'none'}
                style={[
                    styles.stickyHeader, 
                    { opacity: headerOpacity, paddingTop: insets.top + 6, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }
                ]}
            >
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.stickyTitle, { color: theme.colors.text }]} numberOfLines={1}>{cityName}</Text>
                <TouchableOpacity
                    style={[styles.mapBtn, { backgroundColor: theme.colors.surfaceSoft }]}
                    onPress={() => {
                        const center = getCityCenter(cityName);
                        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${center.lat},${center.lng}`);
                    }}
                >
                    <Ionicons name="map" size={20} color={theme.colors.primary} />
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
                        style={[styles.heroBackBtn, { top: insets.top + 6 }]}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={22} color="#fff" />
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
                        onPress={() => {
                            const center = getCityCenter(cityName);
                            Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${center.lat},${center.lng}`);
                        }}
                    >
                        <LinearGradient
                            colors={[COLORS.primary + '18', COLORS.primary + '08']}
                            style={styles.quickActionIconGrad}
                        >
                            <Ionicons name="map" size={20} color={COLORS.primary} />
                        </LinearGradient>
                        <Text style={styles.quickActionLabel}>Haritada Gör</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.quickActionBtn}
                        onPress={() => navigation.navigate('CreateItinerary', { preselectedCity: city })}
                    >
                        <LinearGradient
                            colors={[COLORS.accent + '18', COLORS.accent + '08']}
                            style={styles.quickActionIconGrad}
                        >
                            <Ionicons name="calendar" size={20} color={COLORS.accent} />
                        </LinearGradient>
                        <Text style={styles.quickActionLabel}>Gezi Planla</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.quickActionBtn}
                        onPress={() => {
                            const query = encodeURIComponent(`${cityName} hava durumu`);
                            Linking.openURL(`https://www.google.com/search?q=${query}`);
                        }}
                    >
                        <LinearGradient
                            colors={['#38BDF818', '#38BDF808']}
                            style={styles.quickActionIconGrad}
                        >
                            <Ionicons name="partly-sunny" size={20} color="#38BDF8" />
                        </LinearGradient>
                        <Text style={styles.quickActionLabel}>Hava Durumu</Text>
                    </TouchableOpacity>
                </View>

                {/* ═══ Kategori sekmeler — Modern Pill ═══ */}
                <View style={styles.categorySection}>
                    <Text style={styles.categorySectionTitle}>Kategoriler</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.categoryTabs}
                    >
                        {CATEGORIES.map(cat => {
                            const isActive = activeCategory === cat.key;
                            return (
                                <TouchableOpacity
                                    key={cat.key}
                                    style={[
                                        styles.categoryTab,
                                        isActive && styles.categoryTabActive,
                                    ]}
                                    onPress={() => setActiveCategory(cat.key)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.categoryTabEmoji}>{cat.emoji}</Text>
                                    <Text style={[
                                        styles.categoryTabLabel,
                                        isActive && styles.categoryTabLabelActive,
                                    ]}>
                                        {cat.label}
                                    </Text>
                                    {isActive && <View style={styles.categoryTabDot} />}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* ═══ İçerik ═══ */}
                <View style={styles.contentSection}>
                    {renderCategoryContent()}
                </View>

                <View style={{ height: 100 }} />
            </Animated.ScrollView>

            {/* Detay modal */}
            {selectedItem && renderDetailModal()}

            {/* Lightbox — fotoğraf büyütme */}
            <Modal visible={!!lightboxUri} transparent animationType="fade" onRequestClose={() => setLightboxUri(null)}>
                <TouchableOpacity style={styles.lightboxOverlay} activeOpacity={1} onPress={() => setLightboxUri(null)}>
                    <Image source={{ uri: lightboxUri }} style={styles.lightboxImage} contentFit="contain" />
                    <TouchableOpacity style={styles.lightboxClose} onPress={() => setLightboxUri(null)}>
                        <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

            {/* Yemek detay modal */}
            {selectedYemek && (
                <View style={styles.detailOverlay}>
                    <TouchableOpacity
                        style={styles.detailBackdrop}
                        onPress={() => setSelectedYemek(null)}
                    />
                    <View style={styles.detailSheet}>
                        {/* Hero fotoğraf */}
                        <View style={styles.detailHero}>
                            <Image
                                source={{ uri: selectedYemek.Resim ? `${BASE_KP_URL}${selectedYemek.Resim}` : null }}
                                style={styles.detailHeroImage}
                                contentFit="cover"
                                transition={400}
                            />
                            <LinearGradient
                                colors={['rgba(0,0,0,0.15)', 'transparent', 'rgba(0,0,0,0.55)']}
                                style={StyleSheet.absoluteFillObject}
                            />
                            <TouchableOpacity
                                style={styles.detailClose}
                                onPress={() => setSelectedYemek(null)}
                            >
                                <Ionicons name="close" size={20} color="#fff" />
                            </TouchableOpacity>
                            <View style={styles.yemekModalBadge}>
                                <Text style={styles.yemekModalBadgeText}>🍽️ Yöresel Lezzet</Text>
                            </View>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                            {/* Başlık */}
                            <View style={styles.yemekModalHeader}>
                                <Text style={styles.yemekModalName}>
                                    {toTitleCase(selectedYemek.Baslik || '')}
                                </Text>
                                <View style={styles.yemekModalCityRow}>
                                    <View style={styles.yemekModalCityBadge}>
                                        <Ionicons name="location" size={12} color={COLORS.primary} />
                                        <Text style={styles.yemekModalCityText}>{cityName}</Text>
                                    </View>
                                    <View style={styles.yemekModalCategoryBadge}>
                                        <Text style={styles.yemekModalCategoryText}>Türk Mutfağı</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Bilgi kartları */}
                            <View style={styles.yemekInfoCards}>
                                <View style={styles.yemekInfoCard}>
                                    <View style={[styles.yemekInfoIconWrap, { backgroundColor: COLORS.primaryMuted }]}>
                                        <Ionicons name="restaurant" size={18} color={COLORS.primary} />
                                    </View>
                                    <Text style={styles.yemekInfoLabel}>Kategori</Text>
                                    <Text style={styles.yemekInfoValue}>Yöresel</Text>
                                </View>
                                <View style={styles.yemekInfoCard}>
                                    <View style={[styles.yemekInfoIconWrap, { backgroundColor: '#FEF3C7' }]}>
                                        <Ionicons name="location" size={18} color="#D97706" />
                                    </View>
                                    <Text style={styles.yemekInfoLabel}>Şehir</Text>
                                    <Text style={styles.yemekInfoValue}>{cityName}</Text>
                                </View>
                                <View style={styles.yemekInfoCard}>
                                    <View style={[styles.yemekInfoIconWrap, { backgroundColor: '#D1FAE5' }]}>
                                        <Ionicons name="leaf" size={18} color="#059669" />
                                    </View>
                                    <Text style={styles.yemekInfoLabel}>Mutfak</Text>
                                    <Text style={styles.yemekInfoValue}>Türk</Text>
                                </View>
                            </View>

                            {/* Açıklama */}
                            <View style={styles.yemekDescSection}>
                                <View style={styles.yemekDescHeader}>
                                    <Ionicons name="book-outline" size={16} color={COLORS.primary} />
                                    <Text style={styles.yemekDescTitle}>Hakkında</Text>
                                    <View style={styles.yemekKpBadge}>
                                        <Text style={styles.yemekKpBadgeText}>Kültür Portalı</Text>
                                    </View>
                                </View>
                                <Text style={styles.yemekDescText}>
                                    {toTitleCase(selectedYemek.Baslik || '')}, {cityName} mutfağının vazgeçilmez lezzetlerinden biridir. Yöreye özgü malzemeler ve geleneksel tariflerle hazırlanan bu yemek, bölgenin kültürel mirasını yansıtmaktadır.
                                </Text>
                            </View>

                            {/* Aksiyon */}
                            <View style={styles.detailActions}>
                                {selectedYemek.Url ? (
                                    <TouchableOpacity
                                        style={[styles.actionBtn, { backgroundColor: COLORS.primary }]}
                                        onPress={() => Linking.openURL(`${BASE_KP_URL}${selectedYemek.Url}`)}
                                    >
                                        <Ionicons name="open-outline" size={18} color="#fff" />
                                        <Text style={[styles.actionBtnText, { color: '#fff' }]}>Kültür Portalı'nda Gör</Text>
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        </ScrollView>
                    </View>
                </View>
            )}
        </View>
    );
};

// ═══════════════════════════════════════
// STYLES
// ═══════════════════════════════════════
// ─── Yardımcı ────────────────────────────────────────────────────────────────
function toTitleCase(str) {
    return str.toLowerCase()
        .replace(/(?:^|\s|[-])\S/g, c => c.toUpperCase())
        .replace(/\bVe\b/g, 've').replace(/\bİle\b/g, 'ile');
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },

    // Sticky header
    stickyHeader: {
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
        flexDirection: 'row', alignItems: 'center',
        paddingBottom: 12, paddingHorizontal: SPACING.md,
        backgroundColor: COLORS.background,
        borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    backBtn: { padding: 6 },
    stickyTitle: {
        flex: 1, fontFamily: FONTS.heading,
        fontSize: FONT_SIZES.lg, color: COLORS.textPrimary, marginLeft: SPACING.sm,
    },
    mapBtn: {
        padding: 8, backgroundColor: COLORS.surfaceAlt,
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
        left: SPACING.md,
        width: 38, height: 38, borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center', alignItems: 'center',
    },
    heroMapBtn: {
        position: 'absolute',
        right: SPACING.md,
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: 'rgba(8,145,178,0.85)',
    },
    heroMapText: {
        fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#fff',
    },
    heroVisitToggle: {
        position: 'absolute',
        bottom: SPACING.lg,
        right: SPACING.md,
    },
    heroContent: {
        position: 'absolute', bottom: SPACING.lg, left: SPACING.lg,
    },
    heroCity: {
        fontFamily: FONTS.heading, fontSize: 36, color: '#fff',
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

    // ─── Yer Arama ───
    placeSearchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceAlt,
        borderRadius: BORDER_RADIUS.lg,
        paddingHorizontal: SPACING.md,
        paddingVertical: 9,
        gap: SPACING.sm,
        marginBottom: SPACING.sm,
        marginHorizontal: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    placeSearchInput: {
        flex: 1,
        fontFamily: 'Inter_400Regular',
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
    },

    // Quick actions
    quickActions: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.md,
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
    quickActionIconGrad: {
        width: 44, height: 44, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center',
    },
    quickActionLabel: {
        fontFamily: 'Inter_500Medium', fontSize: 11, color: COLORS.textPrimary,
    },

    // Category section
    categorySection: {
        paddingTop: SPACING.xs,
    },
    categorySectionTitle: {
        fontFamily: 'Inter_600SemiBold', fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary, marginBottom: SPACING.sm,
        paddingHorizontal: SPACING.lg, letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    categoryTabs: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.sm,
        gap: SPACING.sm,
    },
    categoryTab: {
        alignItems: 'center', gap: 4,
        paddingHorizontal: 18, paddingVertical: 12,
        borderRadius: 16,
        backgroundColor: COLORS.surface,
        borderWidth: 1.5, borderColor: COLORS.border,
        minWidth: 72,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04, shadowRadius: 4,
        elevation: 1,
    },
    categoryTabActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
        shadowColor: COLORS.primary,
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    categoryTabEmoji: {
        fontSize: 20,
    },
    categoryTabLabel: {
        fontFamily: 'Inter_500Medium', fontSize: 12,
        color: COLORS.textSecondary,
    },
    categoryTabLabelActive: { color: '#fff', fontFamily: 'Inter_600SemiBold' },
    categoryTabDot: {
        width: 4, height: 4, borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },

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
    emptyEmoji: { fontSize: 48, marginBottom: SPACING.md },    emptyText: {
        fontFamily: 'Inter_500Medium', fontSize: FONT_SIZES.lg,
        color: COLORS.textPrimary,
    },
    emptySubtext: {
        fontFamily: 'Inter_400Regular', fontSize: FONT_SIZES.sm,
        color: COLORS.textLight, marginTop: 4, textAlign: 'center',
    },
    retryPoiBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: SPACING.md,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.primary,
    },
    retryPoiText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.sm,
        color: '#fff',
    },

    // Loading
    loadingPOI: { alignItems: 'center', paddingTop: 60 },
    loadingText: {
        fontFamily: 'Inter_400Regular', fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary, marginTop: SPACING.sm,
    },
    poiSkeletonList: {
        paddingTop: SPACING.sm,
    },
    poiSkeletonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
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
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center', alignItems: 'center',
    },
    detailHero: {
        width: '100%',
        height: 200,
        position: 'relative',
        overflow: 'hidden',
        borderTopLeftRadius: BORDER_RADIUS.xl,
        borderTopRightRadius: BORDER_RADIUS.xl,
    },
    detailHeroImage: {
        width: '100%',
        height: '100%',
    },
    photoSourceBadge: {
        position: 'absolute',
        bottom: SPACING.sm,
        left: SPACING.sm,
        backgroundColor: 'rgba(0,0,0,0.55)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: BORDER_RADIUS.full,
    },
    photoSourceText: {
        fontFamily: FONTS.body,
        fontSize: 10,
        color: 'rgba(255,255,255,0.85)',
    },
    detailHeader: {
        flexDirection: 'row', alignItems: 'center',
        padding: SPACING.lg, paddingBottom: SPACING.sm, gap: SPACING.sm,
    },
    detailEmoji: { fontSize: 36 },
    detailName: {
        fontFamily: FONTS.heading, fontSize: FONT_SIZES.xl,
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

    // Lightbox
    lightboxOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
        justifyContent: 'center', alignItems: 'center',
    },
    lightboxImage: {
        width: '100%', height: '80%',
    },
    lightboxClose: {
        position: 'absolute', top: 50, right: 20,
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center', alignItems: 'center',
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

    // Galeri
    gallerySection: {
        marginHorizontal: SPACING.lg, marginTop: SPACING.sm,
    },
    gallerySectionTitle: {
        fontFamily: 'Inter_600SemiBold', fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary, marginBottom: SPACING.xs,
    },
    galleryScroll: {
        gap: SPACING.xs,
        paddingRight: SPACING.lg,
    },
    galleryThumb: {
        width: 120,
        height: 90,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.surfaceAlt,
    },

    // Yemek grid
    yemekGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
        paddingTop: SPACING.xs,
    },
    yemekCard: {
        width: (SCREEN_W - SPACING.lg * 2 - SPACING.sm) / 2,
        height: 150,
        borderRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
        backgroundColor: COLORS.surfaceAlt,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 4,
    },
    yemekCardImage: {
        ...StyleSheet.absoluteFillObject,
    },
    yemekCardContent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: SPACING.sm,
    },
    yemekCardName: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.sm,
        color: '#fff',
        letterSpacing: -0.2,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    yemekCardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        marginTop: 3,
    },
    yemekCardCity: {
        fontFamily: FONTS.body,
        fontSize: 10,
        color: 'rgba(255,255,255,0.75)',
    },

    // Ne Yenir header
    neyenirHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.md,
    },
    neyenirHeaderLeft: {
        flex: 1,
    },
    neyenirTitle: {
        fontFamily: FONTS.bodyBold,
        fontSize: FONT_SIZES.xl,
        color: COLORS.textPrimary,
        letterSpacing: -0.5,
    },
    neyenirSubtitle: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    neyenirBadge: {
        backgroundColor: COLORS.primaryMuted,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: BORDER_RADIUS.full,
        borderWidth: 1,
        borderColor: COLORS.primary + '30',
    },
    neyenirBadgeText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.xs,
        color: COLORS.primary,
    },

    // Hero yemek kartı
    yemekHeroCard: {
        height: 200,
        borderRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
        backgroundColor: COLORS.surfaceAlt,
        marginBottom: SPACING.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
        elevation: 8,
    },
    yemekHeroImage: {
        ...StyleSheet.absoluteFillObject,
    },
    yemekHeroBadge: {
        position: 'absolute',
        top: SPACING.sm,
        left: SPACING.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(0,0,0,0.45)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: BORDER_RADIUS.full,
    },
    yemekHeroBadgeText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: 11,
        color: '#fff',
    },
    yemekHeroContent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: SPACING.md,
    },
    yemekHeroName: {
        fontFamily: FONTS.bodyBold,
        fontSize: FONT_SIZES.xl,
        color: '#fff',
        letterSpacing: -0.5,
        marginBottom: SPACING.xs,
        textShadowColor: 'rgba(0,0,0,0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 6,
    },
    yemekHeroMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    yemekHeroMetaText: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.sm,
        color: 'rgba(255,255,255,0.85)',
        flex: 1,
    },
    yemekHeroArrow: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Grid başlığı
    neyenirGridTitle: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
        letterSpacing: -0.3,
    },

    // Footer
    neyenirFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        justifyContent: 'center',
        paddingVertical: SPACING.md,
        marginTop: SPACING.sm,
    },
    neyenirFooterText: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textLight,
    },

    // Yemek modal
    yemekModalBadge: {
        position: 'absolute',
        bottom: SPACING.sm,
        left: SPACING.sm,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: BORDER_RADIUS.full,
    },
    yemekModalBadgeText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: 11,
        color: '#fff',
    },
    yemekModalHeader: {
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.md,
        paddingBottom: SPACING.sm,
    },
    yemekModalName: {
        fontFamily: FONTS.heading,
        fontSize: FONT_SIZES.xxl,
        color: COLORS.textPrimary,
        letterSpacing: -0.5,
        marginBottom: SPACING.sm,
    },
    yemekModalCityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    yemekModalCityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.primaryMuted,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.full,
    },
    yemekModalCityText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.xs,
        color: COLORS.primary,
    },
    yemekModalCategoryBadge: {
        backgroundColor: COLORS.surfaceAlt,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.full,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    yemekModalCategoryText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
    },

    // Yemek bilgi kartları
    yemekInfoCards: {
        flexDirection: 'row',
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.md,
        gap: SPACING.sm,
    },
    yemekInfoCard: {
        flex: 1,
        backgroundColor: COLORS.surfaceAlt,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.sm,
        alignItems: 'center',
        gap: 4,
    },
    yemekInfoIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 2,
    },
    yemekInfoLabel: {
        fontFamily: FONTS.body,
        fontSize: 10,
        color: COLORS.textSecondary,
    },
    yemekInfoValue: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textPrimary,
    },

    // Yemek açıklama
    yemekDescSection: {
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.md,
        backgroundColor: COLORS.surfaceAlt,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
    },
    yemekDescHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: SPACING.sm,
    },
    yemekDescTitle: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
        flex: 1,
    },
    yemekKpBadge: {
        backgroundColor: COLORS.primaryMuted,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: BORDER_RADIUS.sm,
    },
    yemekKpBadgeText: {
        fontFamily: FONTS.bodyMedium,
        fontSize: 10,
        color: COLORS.primary,
    },
    yemekDescText: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        lineHeight: 22,
    },

    // Empty icon wrap
    emptyIconWrap: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: COLORS.surfaceAlt,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.md,
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
