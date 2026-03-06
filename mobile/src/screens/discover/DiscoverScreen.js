import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Modal,
    ScrollView,
    Dimensions,
    TextInput,
    Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/layout';
import { getCategoryImage } from '../../constants/cityImages';
import { getPlaceImage } from '../../constants/placeImages';
import { getPlaceSummary } from '../../services/wikipediaService';
import { toggleFavorite, getFavoriteIds } from '../../services/favoriteService';
import { getCities } from '../../services/cityService';
import { getPlaces } from '../../services/placeService';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.sm) / 2;

const DiscoverScreen = () => {
    const navigation = useNavigation();
    const { user } = useAuth();
    const [places, setPlaces] = useState([]);
    const [cities, setCities] = useState([]);
    const [selectedCity, setSelectedCity] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [selectedPlace, setSelectedPlace] = useState(null);
    const [failedImages, setFailedImages] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [wikiInfo, setWikiInfo] = useState(null);
    const [wikiLoading, setWikiLoading] = useState(false);
    const [favorites, setFavorites] = useState({});
    const [cityModalVisible, setCityModalVisible] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState(null); // null = Tüm kategoriler

    const CATEGORY_CHIPS = [
        { key: null, label: 'Tümü', emoji: '🌍' },
        { key: 'historical', label: 'Tarihi', emoji: '🏛️' },
        { key: 'museum', label: 'Müze', emoji: '🎨' },
        { key: 'nature', label: 'Doğa', emoji: '🌿' },
        { key: 'religious', label: 'Dini', emoji: '🕌' },
        { key: 'shopping', label: 'Alışveriş', emoji: '🛍️' },
        { key: 'beach', label: 'Plaj', emoji: '🏖️' },
    ];

    const fetchPlaces = useCallback(async () => {
        setError(null);
        try {
            const [citiesResult, placesResult] = await Promise.all([
                getCities(),
                getPlaces({ cityId: selectedCity, sortBy: 'popularity' }),
            ]);


            if (citiesResult.error) throw citiesResult.error;
            if (placesResult.error) throw placesResult.error;

            setCities(citiesResult.data || []);
            setPlaces(placesResult.data || []);

            // Favorileri tek sorguda çek
            if (user) {
                const { favoriteIds } = await getFavoriteIds(user.id);
                const favMap = {};
                favoriteIds.forEach(id => { favMap[id] = true; });
                setFavorites(favMap);
            }
        } catch (err) {
            console.error('Fetch error:', err);
            setError('Veriler yüklenirken hata oluştu.');
        }
        setLoading(false);
        setRefreshing(false);
    }, [selectedCity, user]);

    useEffect(() => {
        fetchPlaces();
    }, [fetchPlaces]);



    // Load Wikipedia info for selected place
    useEffect(() => {
        if (!selectedPlace) {
            setWikiInfo(null);
            return;
        }
        const loadWiki = async () => {
            setWikiLoading(true);
            const info = await getPlaceSummary(selectedPlace.name);
            setWikiInfo(info);
            setWikiLoading(false);
        };
        loadWiki();
    }, [selectedPlace]);

    const handleImageError = (placeId) => {
        setFailedImages((prev) => ({ ...prev, [placeId]: true }));
    };

    // Arama + şehir + kategori filtresi
    const filteredPlaces = places.filter((p) => {
        const q = searchQuery.trim().toLowerCase();
        const matchesSearch = !q ||
            p.name.toLowerCase().includes(q) ||
            p.cities?.name?.toLowerCase().includes(q) ||
            p.category?.toLowerCase().includes(q);
        const matchesCity = !selectedCity || p.city_id === selectedCity;
        const matchesCategory = !categoryFilter || p.category === categoryFilter;
        return matchesSearch && matchesCity && matchesCategory;
    });

    const activeFilterCount = (selectedCity ? 1 : 0) + (categoryFilter ? 1 : 0);

    const getCategoryEmoji = (category) => {
        const map = {
            historical: '🏛️', museum: '🎨', nature: '🌿',
            religious: '🕌', shopping: '🛒', beach: '🏖️',
        };
        return map[category] || '📍';
    };

    // Favori toggle
    const handleToggleFavorite = async (placeId) => {
        if (!user) {
            Alert.alert('Giriş Gerekli', 'Favorilere eklemek için giriş yapmalısınız.');
            return;
        }
        const { isFavorite } = await toggleFavorite(user.id, placeId);
        setFavorites(prev => ({ ...prev, [placeId]: isFavorite }));
    };

    // ─── Şehir seçici dropdown ───
    const selectedCityName = cities.find(c => c.id === selectedCity)?.name || 'Tüm Şehirler';

    const renderCityFilter = () => (
        <View style={styles.cityFilterRow}>
            <TouchableOpacity
                style={styles.cityDropdown}
                onPress={() => setCityModalVisible(true)}
                activeOpacity={0.8}
            >
                <Ionicons name="location-outline" size={16} color={COLORS.primary} />
                <Text style={styles.cityDropdownText}>{selectedCityName}</Text>
                <Ionicons name="chevron-down" size={16} color={COLORS.textLight} />
            </TouchableOpacity>
            {selectedCity && (
                <TouchableOpacity
                    style={styles.cityResetBtn}
                    onPress={() => setSelectedCity(null)}
                >
                    <Ionicons name="close-circle" size={20} color={COLORS.textLight} />
                </TouchableOpacity>
            )}

            {/* Dropdown Modal */}
            <Modal
                visible={cityModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setCityModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.cityModalBackdrop}
                    activeOpacity={1}
                    onPress={() => setCityModalVisible(false)}
                >
                    <View style={styles.cityModalBox}>
                        <Text style={styles.cityModalTitle}>Bir Şehir Seçin</Text>

                        <TouchableOpacity
                            style={[styles.cityModalOption, !selectedCity && styles.cityModalOptionActive]}
                            onPress={() => { setSelectedCity(null); setCityModalVisible(false); }}
                        >
                            <Text style={[styles.cityModalOptionText, !selectedCity && styles.cityModalOptionTextActive]}>
                                Tüm Şehirler
                            </Text>
                            {!selectedCity && <Ionicons name="checkmark" size={18} color={COLORS.primary} />}
                        </TouchableOpacity>

                        {cities.map(city => (
                            <TouchableOpacity
                                key={city.id}
                                style={[styles.cityModalOption, selectedCity === city.id && styles.cityModalOptionActive]}
                                onPress={() => { setSelectedCity(city.id); setCityModalVisible(false); }}
                            >
                                <View>
                                    <Text style={[styles.cityModalOptionText, selectedCity === city.id && styles.cityModalOptionTextActive]}>
                                        {city.name}
                                    </Text>
                                    <Text style={styles.cityModalOptionSub}>{city.region}</Text>
                                </View>
                                {selectedCity === city.id && <Ionicons name="checkmark" size={18} color={COLORS.primary} />}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );

    const renderPlaceCard = ({ item, index }) => {
        const imageUrl = failedImages[item.id]
            ? getCategoryImage(item.category)
            : getPlaceImage(item.name, item.image_url, item.category);

        const isFav = favorites[item.id];

        return (
            <View>
                <TouchableOpacity
                    style={styles.card}
                    activeOpacity={0.85}
                    onPress={() => setSelectedPlace(item)}
                >
                    <View style={styles.cardImageContainer}>
                        <Image
                            source={{ uri: imageUrl }}
                            style={styles.cardImage}
                            contentFit="cover"
                            transition={300}
                            onError={() => handleImageError(item.id)}
                        />
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.4)']}
                            style={styles.cardImageOverlay}
                        />
                        <View style={styles.cardCategoryBadge}>
                            <Text style={styles.cardCategoryEmoji}>
                                {getCategoryEmoji(item.category)}
                            </Text>
                        </View>
                        {/* Favori butonu */}
                        <TouchableOpacity
                            style={styles.cardFavButton}
                            onPress={() => handleToggleFavorite(item.id)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons
                                name={isFav ? 'heart' : 'heart-outline'}
                                size={18}
                                color={isFav ? '#EF4444' : '#fff'}
                            />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.cardContent}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.cardCity} numberOfLines={1}>
                            📍 {item.cities?.name}
                        </Text>
                        <View style={styles.cardMeta}>
                            {item.entry_fee > 0 ? (
                                <Text style={styles.cardFee}>₺{item.entry_fee}</Text>
                            ) : (
                                <Text style={styles.cardFree}>Ücretsiz</Text>
                            )}
                            <Text style={styles.cardDuration}>⏱ {item.avg_duration}s</Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </View>
        );
    };

    // ─── Detail modal ───
    const renderDetailModal = () => {
        if (!selectedPlace) return null;
        const p = selectedPlace;
        const hasImage = p.image_url && !failedImages[p.id];
        const fallbackImage = getCategoryImage(p.category);
        const description = wikiInfo?.description || p.description || p.short_description;

        return (
            <Modal
                visible={!!selectedPlace}
                transparent
                animationType="slide"
                onRequestClose={() => setSelectedPlace(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <TouchableOpacity
                            style={styles.modalClose}
                            onPress={() => setSelectedPlace(null)}
                        >
                            <Ionicons name="close" size={22} color={COLORS.textPrimary} />
                        </TouchableOpacity>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Hero Image */}
                            <View style={styles.modalImageContainer}>
                                <Image
                                    source={{ uri: hasImage ? p.image_url : fallbackImage }}
                                    style={styles.modalImage}
                                    contentFit="cover"
                                    transition={400}
                                />
                                <LinearGradient
                                    colors={COLORS.gradient.card}
                                    style={styles.modalImageGradient}
                                />
                                {/* Favori butonu modal içinde */}
                                <TouchableOpacity
                                    style={styles.modalFavButton}
                                    onPress={() => handleToggleFavorite(p.id)}
                                >
                                    <Ionicons
                                        name={favorites[p.id] ? 'heart' : 'heart-outline'}
                                        size={24}
                                        color={favorites[p.id] ? '#EF4444' : '#fff'}
                                    />
                                </TouchableOpacity>
                                <View style={styles.modalImageOverlayContent}>
                                    <Text style={styles.modalOverlayTitle}>{p.name}</Text>
                                    <Text style={styles.modalOverlayCity}>📍 {p.cities?.name}</Text>
                                </View>
                            </View>

                            <View style={styles.modalBody}>
                                {/* Stats */}
                                <View style={styles.modalStats}>
                                    <View style={styles.modalStat}>
                                        <View style={[styles.modalStatIcon, { backgroundColor: COLORS.primaryMuted }]}>
                                            <Ionicons name="time-outline" size={18} color={COLORS.primary} />
                                        </View>
                                        <Text style={styles.modalStatValue}>{p.avg_duration} saat</Text>
                                        <Text style={styles.modalStatLabel}>Süre</Text>
                                    </View>
                                    <View style={styles.modalStat}>
                                        <View style={[styles.modalStatIcon, { backgroundColor: COLORS.success + '15' }]}>
                                            <Ionicons name="cash-outline" size={18} color={COLORS.success} />
                                        </View>
                                        <Text style={styles.modalStatValue}>
                                            {p.entry_fee > 0 ? `₺${p.entry_fee}` : 'Ücretsiz'}
                                        </Text>
                                        <Text style={styles.modalStatLabel}>Giriş</Text>
                                    </View>
                                    <View style={styles.modalStat}>
                                        <View style={[styles.modalStatIcon, { backgroundColor: COLORS.warning + '15' }]}>
                                            <Ionicons name="star" size={18} color={COLORS.warning} />
                                        </View>
                                        <Text style={styles.modalStatValue}>{p.popularity_score}</Text>
                                        <Text style={styles.modalStatLabel}>Popülerlik</Text>
                                    </View>
                                </View>

                                {/* Description from Wikipedia */}
                                {wikiLoading ? (
                                    <View style={styles.wikiLoading}>
                                        <Text style={styles.wikiLoadingText}>📖 Bilgi yükleniyor...</Text>
                                    </View>
                                ) : description ? (
                                    <View style={styles.descriptionSection}>
                                        <View style={styles.descriptionHeader}>
                                            <Ionicons name="book-outline" size={18} color={COLORS.primary} />
                                            <Text style={styles.modalSectionTitle}>Hakkında</Text>
                                            {wikiInfo && (
                                                <View style={styles.wikiBadge}>
                                                    <Text style={styles.wikiBadgeText}>Wikipedia</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={styles.modalDesc}>{description}</Text>
                                    </View>
                                ) : null}

                                {p.short_description && !wikiInfo?.description ? (
                                    <Text style={styles.modalShortDesc}>{p.short_description}</Text>
                                ) : null}
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        );
    };

    if (loading) return <LoadingSpinner message="Yerler yükleniyor..." />;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerRow}>
                    <Text style={styles.headerTitle}>Keşfet</Text>
                    {activeFilterCount > 0 && (
                        <TouchableOpacity
                            style={styles.clearFiltersBtn}
                            onPress={() => { setSelectedCity(null); setCategoryFilter(null); setSearchQuery(''); }}
                        >
                            <Ionicons name="close-circle" size={14} color={COLORS.error} />
                            <Text style={styles.clearFiltersText}>Filtreleri Temizle</Text>
                        </TouchableOpacity>
                    )}
                </View>
                <Text style={styles.headerSubtitle}>{filteredPlaces.length} yer bulundu</Text>
            </View>

            {/* Search bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={18} color={COLORS.textLight} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Yer veya şehir ara..."
                    placeholderTextColor={COLORS.textLight}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
                    </TouchableOpacity>
                )}
            </View>

            {renderCityFilter()}

            {/* Kategori Chip'leri */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryChipsRow}
            >
                {CATEGORY_CHIPS.map(chip => (
                    <TouchableOpacity
                        key={String(chip.key)}
                        style={[
                            styles.categoryChip,
                            categoryFilter === chip.key && styles.categoryChipActive,
                        ]}
                        onPress={() => setCategoryFilter(chip.key)}
                        activeOpacity={0.75}
                    >
                        <Text style={styles.categoryChipEmoji}>{chip.emoji}</Text>
                        <Text style={[
                            styles.categoryChipLabel,
                            categoryFilter === chip.key && styles.categoryChipLabelActive,
                        ]}>{chip.label}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {error && <ErrorMessage message={error} onRetry={fetchPlaces} />}

            <FlatList
                data={filteredPlaces}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderPlaceCard}
                numColumns={2}
                columnWrapperStyle={styles.row}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); fetchPlaces(); }}
                        tintColor={COLORS.primary}
                    />
                }
                ListEmptyComponent={
                    !error ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyEmoji}>🔍</Text>
                            <Text style={styles.emptyText}>Henüz yer bulunamadı</Text>
                        </View>
                    ) : null
                }
            />

            {renderDetailModal()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.xxl + 8,
        paddingBottom: SPACING.xs,
        backgroundColor: COLORS.surface,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    clearFiltersBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.error + '12',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: BORDER_RADIUS.full,
    },
    clearFiltersText: {
        fontFamily: 'Inter_500Medium',
        fontSize: FONT_SIZES.xs,
        color: COLORS.error,
    },
    headerTitle: {
        fontFamily: 'PlayfairDisplay_700Bold',
        fontSize: 28,
        color: COLORS.textPrimary,
    },
    headerSubtitle: {
        fontFamily: 'Inter_400Regular',
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        marginTop: 2,
    },

    // ─── Search ───
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceAlt,
        marginHorizontal: SPACING.lg,
        marginVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.lg,
        paddingHorizontal: SPACING.md,
        paddingVertical: 10,
        gap: SPACING.sm,
    },
    searchInput: {
        flex: 1,
        fontFamily: 'Inter_400Regular',
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
    },

    // ─── Kategori Chip'leri ───
    categoryChipsRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.md,
        paddingTop: SPACING.xs,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.surface,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    categoryChipActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
        shadowColor: COLORS.primary,
        shadowOpacity: 0.25,
        elevation: 4,
    },
    categoryChipEmoji: { fontSize: 16 },
    categoryChipLabel: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    categoryChipLabelActive: {
        color: '#fff',
    },

    // ─── City Dropdown ───
    cityFilterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        marginBottom: SPACING.sm,
        gap: SPACING.xs,
    },
    cityDropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.full,
        paddingHorizontal: SPACING.md,
        paddingVertical: 8,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        flex: 1,
    },
    cityDropdownText: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
        flex: 1,
    },
    cityResetBtn: { padding: 4 },
    cityModalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        paddingHorizontal: SPACING.xl,
    },
    cityModalBox: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 10,
    },
    cityModalTitle: {
        fontFamily: 'PlayfairDisplay_700Bold',
        fontSize: FONT_SIZES.lg,
        color: COLORS.textPrimary,
        marginBottom: SPACING.md,
        textAlign: 'center',
    },
    cityModalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.sm,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: 4,
    },
    cityModalOptionActive: { backgroundColor: COLORS.primary + '15' },
    cityModalOptionText: {
        fontFamily: 'Inter_500Medium',
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
    },
    cityModalOptionTextActive: {
        color: COLORS.primary,
        fontFamily: 'Inter_700Bold',
    },
    cityModalOptionSub: {
        fontFamily: 'Inter_400Regular',
        fontSize: FONT_SIZES.xs,
        color: COLORS.textLight,
        marginTop: 2,
    },

    // ─── Grid ───
    row: {
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.lg,
    },
    listContent: {
        paddingTop: SPACING.xs,
        paddingBottom: SPACING.xxl,
    },

    // ─── Card ───
    card: {
        width: CARD_WIDTH,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        marginBottom: SPACING.sm,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    cardImageContainer: {
        position: 'relative',
    },
    cardImage: {
        width: '100%',
        height: CARD_WIDTH * 0.8,
    },
    cardImageOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 40,
    },
    cardCategoryBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 8,
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardCategoryEmoji: { fontSize: 14 },
    cardFavButton: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 14,
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardContent: {
        padding: SPACING.sm,
    },
    cardTitle: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
    },
    cardCity: {
        fontFamily: 'Inter_400Regular',
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    cardMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: SPACING.xs,
    },
    cardFee: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: FONT_SIZES.xs,
        color: COLORS.primary,
    },
    cardFree: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: FONT_SIZES.xs,
        color: COLORS.success,
    },
    cardDuration: {
        fontFamily: 'Inter_400Regular',
        fontSize: FONT_SIZES.xs,
        color: COLORS.textLight,
    },

    // ─── Empty ───
    emptyContainer: {
        alignItems: 'center',
        paddingTop: SPACING.xxl * 2,
        paddingHorizontal: SPACING.lg,
    },
    emptyEmoji: { fontSize: 56, marginBottom: SPACING.md },
    emptyText: {
        fontFamily: 'Inter_500Medium',
        fontSize: FONT_SIZES.lg,
        color: COLORS.textPrimary,
        textAlign: 'center',
    },

    // ─── Modal ───
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: BORDER_RADIUS.xl,
        borderTopRightRadius: BORDER_RADIUS.xl,
        maxHeight: '92%',
    },
    modalFavButton: {
        position: 'absolute',
        top: SPACING.sm,
        left: SPACING.sm,
        zIndex: 10,
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalClose: {
        position: 'absolute',
        top: SPACING.sm,
        right: SPACING.sm,
        zIndex: 10,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 20,
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalImageContainer: {
        position: 'relative',
    },
    modalImage: {
        width: '100%',
        height: 260,
        borderTopLeftRadius: BORDER_RADIUS.xl,
        borderTopRightRadius: BORDER_RADIUS.xl,
    },
    modalImageGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 120,
    },
    modalImageOverlayContent: {
        position: 'absolute',
        bottom: SPACING.md,
        left: SPACING.md,
    },
    modalOverlayTitle: {
        fontFamily: 'PlayfairDisplay_700Bold',
        fontSize: 24,
        color: '#fff',
    },
    modalOverlayCity: {
        fontFamily: 'Inter_400Regular',
        fontSize: FONT_SIZES.sm,
        color: 'rgba(255,255,255,0.85)',
        marginTop: 4,
    },
    modalBody: {
        padding: SPACING.lg,
        paddingBottom: SPACING.xxl,
    },
    modalStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: COLORS.surfaceAlt,
        borderRadius: BORDER_RADIUS.lg,
        paddingVertical: SPACING.md,
        marginBottom: SPACING.lg,
    },
    modalStat: {
        alignItems: 'center',
    },
    modalStatIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    modalStatValue: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
    },
    modalStatLabel: {
        fontFamily: 'Inter_400Regular',
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    descriptionSection: {
        marginBottom: SPACING.md,
    },
    descriptionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: SPACING.sm,
    },
    modalSectionTitle: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        flex: 1,
    },
    wikiBadge: {
        backgroundColor: COLORS.primaryMuted,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: BORDER_RADIUS.sm,
    },
    wikiBadgeText: {
        fontFamily: 'Inter_500Medium',
        fontSize: 10,
        color: COLORS.primary,
    },
    wikiLoading: {
        paddingVertical: SPACING.md,
        alignItems: 'center',
    },
    wikiLoadingText: {
        fontFamily: 'Inter_400Regular',
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    modalShortDesc: {
        fontFamily: 'Inter_500Medium',
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        fontStyle: 'italic',
        marginBottom: SPACING.md,
        lineHeight: 22,
    },
    modalDesc: {
        fontFamily: 'Inter_400Regular',
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        lineHeight: 22,
    },
});

export default DiscoverScreen;
