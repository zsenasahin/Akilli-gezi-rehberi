import React, { useState, useEffect, useCallback, memo } from 'react';

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
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SmartImage from '../../components/common/SmartImage';
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
import { getBatchPlacePhotos } from '../../services/placePhotoService';
import { useAuth, useRequireAuth } from '../../contexts/AuthContext';
import { DiscoverSkeleton } from '../../components/common/SkeletonLoader';
import ErrorMessage from '../../components/common/ErrorMessage';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.sm) / 2;
const ITEMS_PER_PAGE = 10;

const CATEGORIES = [
    { key: null, label: 'Tüm Kategoriler', emoji: '🌍' },
    { key: 'historical', label: 'Tarihi', emoji: '🏛️' },
    { key: 'museum', label: 'Müze', emoji: '🎨' },
    { key: 'nature', label: 'Doğa', emoji: '🌿' },
    { key: 'religious', label: 'Dini', emoji: '🕌' },
    { key: 'shopping', label: 'Alışveriş', emoji: '🛍️' },
    { key: 'beach', label: 'Plaj', emoji: '🏖️' },
];

// Modül seviyesinde tanımlandı — PlaceCard (memo) ve DiscoverScreen her ikisi de erişebilir
const getCategoryEmoji = (category) => {
    const map = { historical: '🏛️', museum: '🎨', nature: '🌿', religious: '🕌', shopping: '🛒', beach: '🏖️' };
    return map[category] || '📍';
};

// ─── Memo'lu Yer Kartı — gereksiz re-render'ları önler ────────────────────
const PlaceCard = memo(({ item, isFav, onPress, onFavToggle, imageUrl }) => {
    const resolvedImage = imageUrl || getPlaceImage(item.name, item.image_url, item.category);
    return (
        <TouchableOpacity style={styles.card} activeOpacity={0.88} onPress={onPress}>
            <View style={styles.cardImageContainer}>
                <SmartImage
                    uri={resolvedImage}
                    fallbackUri={getCategoryImage(item.category)}
                    style={styles.cardImage}
                    contentFit="cover"
                    transition={300}
                />
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.45)']}
                    style={styles.cardImageOverlay}
                />
                <View style={styles.cardCategoryBadge}>
                    <Text style={styles.cardCategoryEmoji}>{getCategoryEmoji(item.category)}</Text>
                </View>
                <TouchableOpacity
                    style={styles.cardFavButton}
                    onPress={onFavToggle}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={16} color={isFav ? '#EF4444' : '#fff'} />
                </TouchableOpacity>
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.cardCity} numberOfLines={1}>📍 {item.cities?.name}</Text>
                <View style={styles.cardMeta}>
                    {item.entry_fee > 0
                        ? <Text style={styles.cardFee}>₺{item.entry_fee}</Text>
                        : <Text style={styles.cardFree}>Ücretsiz</Text>
                    }
                    <Text style={styles.cardDuration}>⏱ {item.avg_duration}s</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}, (prev, next) => prev.isFav === next.isFav && prev.item.id === next.item.id);

const DiscoverScreen = () => {
    const navigation = useNavigation();
    const { user } = useAuth();
    const requireAuth = useRequireAuth(navigation);
    const insets = useSafeAreaInsets();
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
    const [categoryFilter, setCategoryFilter] = useState(null);
    const [placePhotos, setPlacePhotos] = useState({});
    const [currentPage, setCurrentPage] = useState(1);

    // Dropdown görünürlük state'leri
    const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
    const [catDropdownOpen, setCatDropdownOpen] = useState(false);

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
            const placeList = placesResult.data || [];
            setPlaces(placeList);
            if (placeList.length) {
                getBatchPlacePhotos(placeList)
                    .then((photos) => setPlacePhotos(photos || {}))
                    .catch(() => setPlacePhotos({}));
            } else {
                setPlacePhotos({});
            }
            if (user) {
                const { favoriteIds } = await getFavoriteIds(user.id);
                const favMap = {};
                favoriteIds.forEach(id => { favMap[id] = true; });
                setFavorites(favMap);
            }
        } catch (err) {
            setError('Veriler yüklenirken hata oluştu.');
        }
        setLoading(false);
        setRefreshing(false);
    }, [selectedCity, user]);

    useEffect(() => { fetchPlaces(); }, [fetchPlaces]);

    useEffect(() => {
        if (!selectedPlace) { setWikiInfo(null); return; }
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

    // Pagination
    const totalPages = Math.ceil(filteredPlaces.length / ITEMS_PER_PAGE);
    const paginatedPlaces = filteredPlaces.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Reset page on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedCity, categoryFilter, searchQuery]);

    const handleToggleFavorite = async (placeId) => {
        if (!requireAuth('Favorilere eklemek için giriş yapmalısınız.')) return;
        const { isFavorite } = await toggleFavorite(user.id, placeId);
        setFavorites(prev => ({ ...prev, [placeId]: isFavorite }));
    };

    const selectedCityName = cities.find(c => c.id === selectedCity)?.name || 'Tüm Şehirler';
    const selectedCatLabel = CATEGORIES.find(c => c.key === categoryFilter)?.label || 'Tüm Kategoriler';
    const selectedCatEmoji = CATEGORIES.find(c => c.key === categoryFilter)?.emoji || '🌍';

    // ─── Dropdown bileşeni ───────────────────────────────────────────────────
    const renderDropdownModal = ({ visible, onClose, title, children }) => (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <TouchableOpacity style={styles.dropdownBackdrop} activeOpacity={1} onPress={onClose}>
                <View style={styles.dropdownBox}>
                    <View style={styles.dropdownHeader}>
                        <Text style={styles.dropdownTitle}>{title}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.dropdownClose}>
                            <Ionicons name="close" size={20} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    {children}
                </View>
            </TouchableOpacity>
        </Modal>
    );

    // ─── Yer kartı (memo ile optimize) ──────────────────────────────────────
    const renderPlaceCard = useCallback(({ item }) => (
        <PlaceCard
            item={item}
            isFav={!!favorites[item.id]}
            imageUrl={placePhotos[item.name]?.imageUrl}
            onPress={() => setSelectedPlace(item)}
            onFavToggle={() => handleToggleFavorite(item.id)}
            failedImages={failedImages}
        />
    ), [favorites, failedImages, handleToggleFavorite, placePhotos]);

    // ─── Detay modal ─────────────────────────────────────────────────────────────────
    const renderDetailModal = () => {
        if (!selectedPlace) return null;
        const p = selectedPlace;
        const hasImage = p.image_url && !failedImages[p.id];
        const fallbackImage = getCategoryImage(p.category);
        const description = wikiInfo?.description || p.description || p.short_description;

        return (
            <Modal visible={!!selectedPlace} transparent animationType="fade" onRequestClose={() => setSelectedPlace(null)}>
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setSelectedPlace(null)} />
                    <View style={[styles.modalContent, { paddingBottom: insets.bottom + SPACING.md }]}>
                        <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedPlace(null)}>
                            <Ionicons name="close" size={22} color={COLORS.textPrimary} />
                        </TouchableOpacity>

                        {/* Handle bar */}
                        <View style={styles.modalHandle}>
                            <View style={styles.modalHandleBar} />
                        </View>

                        {/* Hero Image */}
                        <View style={styles.modalImageContainer}>
                            <SmartImage
                                uri={hasImage ? p.image_url : fallbackImage}
                                fallbackUri={fallbackImage}
                                style={styles.modalImage}
                                contentFit="cover"
                                transition={400}
                            />
                            <LinearGradient colors={COLORS.gradient.card} style={styles.modalImageGradient} />
                            <TouchableOpacity style={styles.modalFavButton} onPress={() => handleToggleFavorite(p.id)}>
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
                                    <Text style={styles.modalStatValue}>{p.entry_fee > 0 ? `₺${p.entry_fee}` : 'Ücretsiz'}</Text>
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

                            {/* Wikipedia */}
                            {wikiLoading
                                ? <View style={styles.wikiLoading}><Text style={styles.wikiLoadingText}>📖 Bilgi yükleniyor...</Text></View>
                                : description
                                    ? (
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
                                    )
                                    : null
                            }

                            {/* Navigasyon */}
                            {p.lat && p.lng && (
                                <TouchableOpacity
                                    style={styles.modalNavBtn}
                                    onPress={() => {
                                        setSelectedPlace(null);
                                        navigation.navigate('MapScreen', {
                                            city: { id: p.city_id, name: p.cities?.name },
                                            focusLat: p.lat,
                                            focusLng: p.lng,
                                            viewItem: { name: p.name },
                                        });
                                    }}
                                >
                                    <Ionicons name="navigate" size={18} color="#fff" />
                                    <Text style={styles.modalNavBtnText}>Haritada Gör</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
        );
    };

    if (loading) return <DiscoverSkeleton />;

    return (
        <View style={styles.container}>
            {/* ─── Header ─── */}
            <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.headerTitle}>Keşfet</Text>
                        <Text style={styles.headerSubtitle}>
                            {filteredPlaces.length} yer bulundu{totalPages > 1 ? ` · Sayfa ${currentPage}/${totalPages}` : ''}
                        </Text>
                    </View>
                    {activeFilterCount > 0 && (
                        <TouchableOpacity
                            style={styles.clearFiltersBtn}
                            onPress={() => { setSelectedCity(null); setCategoryFilter(null); setSearchQuery(''); }}
                        >
                            <Ionicons name="close-circle" size={13} color={COLORS.error} />
                            <Text style={styles.clearFiltersText}>Temizle</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* ─── Arama ─── */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={18} color={COLORS.textLight} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Yer, şehir veya kategori ara..."
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

            {/* ─── Filtreler (Şehir + Kategori yan yana) ─── */}
            <View style={styles.filterRow}>
                {/* Şehir dropdown */}
                <TouchableOpacity
                    style={[styles.filterDropdown, selectedCity && styles.filterDropdownActive]}
                    onPress={() => { setCityDropdownOpen(true); setCatDropdownOpen(false); }}
                    activeOpacity={0.8}
                >
                    <Ionicons name="location-outline" size={15} color={selectedCity ? COLORS.primary : COLORS.textSecondary} />
                    <Text style={[styles.filterDropdownText, selectedCity && styles.filterDropdownTextActive]} numberOfLines={1}>
                        {selectedCityName}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color={selectedCity ? COLORS.primary : COLORS.textLight} />
                </TouchableOpacity>

                {/* Kategori dropdown */}
                <TouchableOpacity
                    style={[styles.filterDropdown, categoryFilter && styles.filterDropdownActive]}
                    onPress={() => { setCatDropdownOpen(true); setCityDropdownOpen(false); }}
                    activeOpacity={0.8}
                >
                    <Text style={{ fontSize: 14 }}>{selectedCatEmoji}</Text>
                    <Text style={[styles.filterDropdownText, categoryFilter && styles.filterDropdownTextActive]} numberOfLines={1}>
                        {categoryFilter ? selectedCatLabel : 'Kategori'}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color={categoryFilter ? COLORS.primary : COLORS.textLight} />
                </TouchableOpacity>
            </View>

            {error && <ErrorMessage message={error} onRetry={fetchPlaces} />}

            <FlatList
                data={paginatedPlaces}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderPlaceCard}
                numColumns={2}
                columnWrapperStyle={styles.row}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                // ─── Performans optimizasyonları ───
                initialNumToRender={8}
                maxToRenderPerBatch={8}
                windowSize={5}
                removeClippedSubviews={true}
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
                            <Text style={styles.emptyTitle}>Yer bulunamadı</Text>
                            <Text style={styles.emptySubText}>Filtrelerinizi değiştirmeyi deneyin</Text>
                        </View>
                    ) : null
                }
                ListFooterComponent={
                    totalPages > 1 ? (
                        <View style={styles.paginationContainer}>
                            <TouchableOpacity
                                style={[styles.paginationBtn, currentPage === 1 && styles.paginationBtnDisabled]}
                                onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                <Ionicons name="chevron-back" size={18} color={currentPage === 1 ? COLORS.textLight : COLORS.primary} />
                            </TouchableOpacity>
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(p => Math.abs(p - currentPage) <= 2 || p === 1 || p === totalPages)
                                .map((page, idx, arr) => {
                                    const showEllipsis = idx > 0 && page - arr[idx - 1] > 1;
                                    return (
                                        <React.Fragment key={page}>
                                            {showEllipsis && <Text style={styles.paginationEllipsis}>…</Text>}
                                            <TouchableOpacity
                                                style={[styles.paginationPage, currentPage === page && styles.paginationPageActive]}
                                                onPress={() => setCurrentPage(page)}
                                            >
                                                <Text style={[styles.paginationPageText, currentPage === page && styles.paginationPageTextActive]}>
                                                    {page}
                                                </Text>
                                            </TouchableOpacity>
                                        </React.Fragment>
                                    );
                                })
                            }
                            <TouchableOpacity
                                style={[styles.paginationBtn, currentPage === totalPages && styles.paginationBtnDisabled]}
                                onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                <Ionicons name="chevron-forward" size={18} color={currentPage === totalPages ? COLORS.textLight : COLORS.primary} />
                            </TouchableOpacity>
                        </View>
                    ) : null
                }
            />

            {renderDetailModal()}

            {/* ─── Şehir Dropdown Modal ─── */}
            {renderDropdownModal({
                visible: cityDropdownOpen,
                onClose: () => setCityDropdownOpen(false),
                title: 'Şehir Seçin',
                children: (
                    <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                        <TouchableOpacity
                            style={[styles.dropdownOption, !selectedCity && styles.dropdownOptionActive]}
                            onPress={() => { setSelectedCity(null); setCityDropdownOpen(false); }}
                        >
                            <View style={styles.dropdownOptionLeft}>
                                <Text style={styles.dropdownOptionEmoji}>🌍</Text>
                                <Text style={[styles.dropdownOptionText, !selectedCity && styles.dropdownOptionTextActive]}>
                                    Tüm Şehirler
                                </Text>
                            </View>
                            {!selectedCity && <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />}
                        </TouchableOpacity>
                        {cities.map(city => (
                            <TouchableOpacity
                                key={city.id}
                                style={[styles.dropdownOption, selectedCity === city.id && styles.dropdownOptionActive]}
                                onPress={() => { setSelectedCity(city.id); setCityDropdownOpen(false); }}
                            >
                                <View style={styles.dropdownOptionLeft}>
                                    <Text style={styles.dropdownOptionEmoji}>📍</Text>
                                    <View>
                                        <Text style={[styles.dropdownOptionText, selectedCity === city.id && styles.dropdownOptionTextActive]}>
                                            {city.name}
                                        </Text>
                                        <Text style={styles.dropdownOptionSub}>{city.region}</Text>
                                    </View>
                                </View>
                                {selectedCity === city.id && <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                ),
            })}

            {/* ─── Kategori Dropdown Modal ─── */}
            {renderDropdownModal({
                visible: catDropdownOpen,
                onClose: () => setCatDropdownOpen(false),
                title: 'Kategori Seçin',
                children: (
                    <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                        {CATEGORIES.map(cat => (
                            <TouchableOpacity
                                key={String(cat.key)}
                                style={[styles.dropdownOption, categoryFilter === cat.key && styles.dropdownOptionActive]}
                                onPress={() => { setCategoryFilter(cat.key); setCatDropdownOpen(false); }}
                            >
                                <View style={styles.dropdownOptionLeft}>
                                    <Text style={styles.dropdownOptionEmoji}>{cat.emoji}</Text>
                                    <Text style={[styles.dropdownOptionText, categoryFilter === cat.key && styles.dropdownOptionTextActive]}>
                                        {cat.label}
                                    </Text>
                                </View>
                                {categoryFilter === cat.key && <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                ),
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },

    // ─── Header ───
    header: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.sm,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.divider,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
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
        marginBottom: 4,
    },
    clearFiltersText: {
        fontFamily: 'Inter_500Medium',
        fontSize: FONT_SIZES.xs,
        color: COLORS.error,
    },
    headerTitle: {
        fontFamily: FONTS.heading,
        fontSize: 28,
        color: COLORS.textPrimary,
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontFamily: 'Inter_400Regular',
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        marginTop: 2,
    },

    // ─── Arama ───
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceAlt,
        marginHorizontal: SPACING.lg,
        marginVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.lg,
        paddingHorizontal: SPACING.md,
        paddingVertical: 11,
        gap: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    searchInput: {
        flex: 1,
        fontFamily: 'Inter_400Regular',
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
    },

    // ─── Filtre Dropdown'ları ───
    filterRow: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.lg,
        gap: SPACING.sm,
        marginBottom: SPACING.sm,
    },
    filterDropdown: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        paddingHorizontal: SPACING.sm + 4,
        paddingVertical: 10,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    filterDropdownActive: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryMuted,
    },
    filterDropdownText: {
        flex: 1,
        fontFamily: 'Inter_500Medium',
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    filterDropdownTextActive: {
        color: COLORS.primary,
        fontFamily: 'Inter_600SemiBold',
    },

    // ─── Dropdown Modal ───
    dropdownBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        padding: SPACING.lg,
    },
    dropdownBox: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        maxHeight: '70%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 12,
        overflow: 'hidden',
    },
    dropdownHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.divider,
    },
    dropdownTitle: {
        fontFamily: FONTS.heading,
        fontSize: FONT_SIZES.lg,
        color: COLORS.textPrimary,
    },
    dropdownClose: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.surfaceAlt,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dropdownOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: SPACING.sm + 2,
        paddingHorizontal: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.divider,
    },
    dropdownOptionActive: {
        backgroundColor: COLORS.primaryMuted,
    },
    dropdownOptionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        flex: 1,
    },
    dropdownOptionEmoji: { fontSize: 18 },
    dropdownOptionText: {
        fontFamily: 'Inter_500Medium',
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
    },
    dropdownOptionTextActive: {
        color: COLORS.primary,
        fontFamily: 'Inter_600SemiBold',
    },
    dropdownOptionSub: {
        fontFamily: 'Inter_400Regular',
        fontSize: FONT_SIZES.xs,
        color: COLORS.textLight,
        marginTop: 1,
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

    // ─── Kart ───
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
    cardImageContainer: { position: 'relative' },
    cardImage: { width: '100%', height: CARD_WIDTH * 0.8 },
    cardImageOverlay: {
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 40,
    },
    cardCategoryBadge: {
        position: 'absolute', top: 8, right: 8,
        backgroundColor: 'rgba(255,255,255,0.92)',
        borderRadius: 8, width: 30, height: 30,
        justifyContent: 'center', alignItems: 'center',
    },
    cardCategoryEmoji: { fontSize: 15 },
    cardFavButton: {
        position: 'absolute', top: 8, left: 8,
        backgroundColor: 'rgba(0,0,0,0.35)',
        borderRadius: 14, width: 28, height: 28,
        justifyContent: 'center', alignItems: 'center',
    },
    cardContent: { padding: SPACING.sm },
    cardTitle: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
        letterSpacing: -0.2,
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
    cardFee: { fontFamily: 'Inter_600SemiBold', fontSize: FONT_SIZES.xs, color: COLORS.primary },
    cardFree: { fontFamily: 'Inter_600SemiBold', fontSize: FONT_SIZES.xs, color: COLORS.success },
    cardDuration: { fontFamily: 'Inter_400Regular', fontSize: FONT_SIZES.xs, color: COLORS.textLight },

    // ─── Boş durum ───
    emptyContainer: {
        alignItems: 'center',
        paddingTop: SPACING.xxl * 2,
        paddingHorizontal: SPACING.lg,
    },

    // ─── Pagination ───
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: SPACING.lg,
        paddingHorizontal: SPACING.md,
        gap: 6,
    },
    paginationBtn: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: COLORS.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    paginationBtnDisabled: {
        opacity: 0.4,
    },
    paginationPage: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: COLORS.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: COLORS.border,
    },
    paginationPageActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
    },
    paginationPageText: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    paginationPageTextActive: {
        color: '#fff',
    },
    paginationEllipsis: {
        fontFamily: 'Inter_400Regular',
        fontSize: FONT_SIZES.sm,
        color: COLORS.textLight,
        paddingHorizontal: 4,
    },
    emptyEmoji: { fontSize: 52, marginBottom: SPACING.md },
    emptyTitle: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: FONT_SIZES.lg,
        color: COLORS.textPrimary,
        marginBottom: 6,
    },
    emptySubText: {
        fontFamily: 'Inter_400Regular',
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },

    // ─── Detay Modal ───
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        flex: 1,
    },
    modalContent: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: BORDER_RADIUS.xl,
        borderTopRightRadius: BORDER_RADIUS.xl,
        maxHeight: '85%',
    },
    modalHandle: {
        alignItems: 'center',
        paddingTop: SPACING.sm,
        paddingBottom: SPACING.xs,
    },
    modalHandleBar: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.border,
    },
    modalClose: {
        position: 'absolute', top: SPACING.sm, right: SPACING.sm,
        zIndex: 10, backgroundColor: COLORS.surface,
        borderRadius: 20, width: 36, height: 36,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1, shadowRadius: 4, elevation: 4,
    },
    modalFavButton: {
        position: 'absolute', top: SPACING.sm, left: SPACING.sm, zIndex: 10,
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 20, width: 40, height: 40,
        justifyContent: 'center', alignItems: 'center',
    },
    modalImageContainer: { height: 240, position: 'relative' },
    modalImage: { ...StyleSheet.absoluteFillObject },
    modalImageGradient: {
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 120,
    },
    modalImageOverlayContent: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: SPACING.md,
    },
    modalOverlayTitle: {
        fontFamily: FONTS.heading,
        fontSize: FONT_SIZES.xl,
        color: '#fff',
    },
    modalOverlayCity: {
        fontFamily: 'Inter_400Regular',
        fontSize: FONT_SIZES.sm,
        color: 'rgba(255,255,255,0.85)',
        marginTop: 2,
    },
    modalBody: { padding: SPACING.md },
    modalStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: COLORS.surfaceAlt,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
    },
    modalStat: { alignItems: 'center', flex: 1 },
    modalStatIcon: {
        width: 40, height: 40, borderRadius: 12,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 6,
    },
    modalStatValue: {
        fontFamily: 'Inter_700Bold',
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
    },
    modalStatLabel: {
        fontFamily: 'Inter_400Regular',
        fontSize: 10,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    wikiLoading: { paddingVertical: SPACING.md, alignItems: 'center' },
    wikiLoadingText: {
        fontFamily: 'Inter_400Regular',
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    descriptionSection: {
        backgroundColor: COLORS.surfaceAlt,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
    },
    descriptionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: SPACING.sm,
    },
    modalSectionTitle: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        flex: 1,
    },
    wikiBadge: {
        backgroundColor: COLORS.primary + '15',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: BORDER_RADIUS.full,
    },
    wikiBadgeText: {
        fontFamily: 'Inter_500Medium',
        fontSize: 10,
        color: COLORS.primary,
    },
    modalDesc: {
        fontFamily: 'Inter_400Regular',
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        lineHeight: 22,
    },
    modalNavBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: COLORS.primary,
        borderRadius: BORDER_RADIUS.lg,
        paddingVertical: 14,
        marginTop: SPACING.xs,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    modalNavBtnText: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: FONT_SIZES.md,
        color: '#fff',
    },
});

export default DiscoverScreen;
