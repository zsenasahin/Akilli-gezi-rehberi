import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Alert,
    ActivityIndicator,
    Dimensions,
    ScrollView,
    Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/layout';
import { getCityCenter } from '../../constants/cities';
import { generateLeafletHtml } from '../../utils/leafletHtml';
import { haversineDistance, sortPlacesByNearest, calculateTotalDistance } from '../../utils/haversine';
import { getNearbyHotels, getNearbyRestaurants, getOptimizedRoute } from '../../services/mapService';
import { getPlacesByCity } from '../../services/placeService';
import { createItinerary } from '../../services/itineraryService';
import { useAuth } from '../../contexts/AuthContext';
import HotelCard from '../../components/map/HotelCard';
import RestaurantCard from '../../components/map/RestaurantCard';
import Button from '../../components/common/Button';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const STEPS = ['Konaklama', 'Gezi Noktaları', 'Rota'];

/**
 * MapScreen — Harita tabanlı gezi planlama ekranı.
 * 
 * Akış:
 * 1. Kullanıcı konaklama yeri seçer (long-press veya otel önerisi)
 * 2. Gezilecek yerleri seçer
 * 3. Sistem optimize rota oluşturur ve haritada çizer
 */
const MapScreen = ({ route, navigation }) => {
    const { city, focusLat, focusLng, viewItem } = route.params || {};
    const { user } = useAuth();
    const cityName = city?.name || 'İstanbul';
    const cityCenter = getCityCenter(cityName);
    // Eğer belirli bir yer gösterilecekse (CityDetail'den gelince)
    const isViewMode = !!(focusLat && focusLng);

    const webViewRef = useRef(null);
    const [mapReady, setMapReady] = useState(false);
    const [currentStep, setCurrentStep] = useState(isViewMode ? 1 : 0); // viewMode'da konaklama adımını atla

    // Konaklama
    const [accommodation, setAccommodation] = useState(null);
    const [hotels, setHotels] = useState([]);
    const [hotelsLoading, setHotelsLoading] = useState(false);
    const [selectedHotel, setSelectedHotel] = useState(null);

    // Gezi noktaları
    const [allPlaces, setAllPlaces] = useState([]);
    const [selectedPlaces, setSelectedPlaces] = useState([]);
    const [placesLoading, setPlacesLoading] = useState(false);

    // Rota
    const [routeData, setRouteData] = useState(null);
    const [routeLoading, setRouteLoading] = useState(false);
    const [orderedPlaces, setOrderedPlaces] = useState([]);

    // Restoranlar
    const [restaurants, setRestaurants] = useState([]);
    const [restaurantsLoading, setRestaurantsLoading] = useState(false);

    // Genel
    const [bottomSheetExpanded, setBottomSheetExpanded] = useState(true);
    const [saving, setSaving] = useState(false);

    // ─── Şehir yerlerini yükle ───
    useEffect(() => {
        if (city?.id) {
            loadPlaces();
        }
    }, [city]);

    const loadPlaces = async () => {
        setPlacesLoading(true);
        const { data } = await getPlacesByCity(city.id);
        if (data) setAllPlaces(data);
        setPlacesLoading(false);
    };

    // ─── WebView mesaj handler ───
    const handleWebViewMessage = useCallback((event) => {
        try {
            const message = JSON.parse(event.nativeEvent.data);

            switch (message.type) {
                case 'mapReady':
                    setMapReady(true);
                    if (isViewMode) {
                        // Sadece görüntüleme: direkt o konuma git
                        sendCommand({ action: 'flyTo', lat: focusLat, lng: focusLng, zoom: 16 });
                        sendCommand({
                            action: 'setPlaces',
                            places: [{
                                id: 'view-focus',
                                name: viewItem?.name || 'Seçilen Yer',
                                lat: focusLat,
                                lng: focusLng,
                            }],
                        });
                    } else {
                        // Normal mod: şehir merkezine git ve otelleri yükle
                        sendCommand({ action: 'flyTo', lat: cityCenter.lat, lng: cityCenter.lng, zoom: 13 });
                        loadHotels(cityCenter.lat, cityCenter.lng);
                    }
                    break;

                case 'longPress':
                    if (!isViewMode) handleLongPress(message.data);
                    break;

                case 'hotelClick':
                    handleHotelSelect(message.data);
                    break;

                case 'placeClick':
                    break;
            }
        } catch (err) {
            console.error('WebView message parse error:', err);
        }
    }, [cityCenter, isViewMode, focusLat, focusLng, viewItem]);

    // ─── WebView'e komut gönder ───
    const sendCommand = useCallback((cmd) => {
        if (webViewRef.current) {
            webViewRef.current.postMessage(JSON.stringify(cmd));
        }
    }, []);

    // ─── Otel yükle (mapService üzerinden — Overpass API) ───
    const loadHotels = async (lat, lng) => {
        setHotelsLoading(true);
        const { data, error } = await getNearbyHotels(lat, lng, 2000);

        if (data && data.length > 0) {
            // Mesafe hesapla
            const withDistance = data.map(h => ({
                ...h,
                distance: Math.round(haversineDistance(lat, lng, h.lat, h.lng) * 1000),
            })).sort((a, b) => a.distance - b.distance);

            setHotels(withDistance);
            sendCommand({ action: 'setHotels', hotels: withDistance });
        } else {
            setHotels([]);
        }
        setHotelsLoading(false);
    };

    // ─── Long press → konaklama seç ───
    const handleLongPress = (coords) => {
        Alert.alert(
            'Konaklama Noktası',
            `Bu konumu konaklama noktası olarak seçmek ister misiniz?\n\n📍 ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`,
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Seç',
                    onPress: () => {
                        const acc = { lat: coords.lat, lng: coords.lng, name: 'Seçilen Konum' };
                        setAccommodation(acc);
                        setSelectedHotel(null);
                        sendCommand({ action: 'setAccommodation', ...acc });
                        if (currentStep === 0) setCurrentStep(1);
                    },
                },
            ]
        );
    };

    // ─── Otel seç ───
    const handleHotelSelect = (hotel) => {
        const acc = { lat: hotel.lat, lng: hotel.lng, name: hotel.name };
        setAccommodation(acc);
        setSelectedHotel(hotel);
        sendCommand({ action: 'setAccommodation', ...acc });
        sendCommand({ action: 'flyTo', lat: hotel.lat, lng: hotel.lng, zoom: 15 });
    };

    // ─── Gezi noktası toggle ───
    const togglePlace = (place) => {
        setSelectedPlaces(prev => {
            const exists = prev.find(p => p.id === place.id);
            if (exists) {
                return prev.filter(p => p.id !== place.id);
            }
            return [...prev, place];
        });
    };

    // ─── Rota oluştur ───
    const handleCreateRoute = async () => {
        if (!accommodation) {
            Alert.alert('Uyarı', 'Önce konaklama noktası seçin.');
            return;
        }
        if (selectedPlaces.length === 0) {
            Alert.alert('Uyarı', 'En az bir gezilecek yer seçin.');
            return;
        }

        setRouteLoading(true);
        setCurrentStep(2);

        // 1. Haversine ile sırala (client-side, hızlı)
        const sorted = sortPlacesByNearest(accommodation, selectedPlaces);
        setOrderedPlaces(sorted);

        // 2. Haritada numaralı marker'ları göster
        sendCommand({
            action: 'setPlaces',
            places: sorted.map((p, i) => ({
                id: p.id,
                name: p.name,
                lat: p.lat,
                lng: p.lng,
                distance: p.distanceFromPrev,
            })),
        });

        // 3. Edge Function ile optimize rota al
        const { data: routeResult, error } = await getOptimizedRoute(accommodation, sorted);

        if (routeResult && routeResult.route) {
            setRouteData(routeResult);
            sendCommand({ action: 'setRoute', coordinates: routeResult.route });
        } else {
            // Fallback: Düz çizgi polyline (ORS başarısız olursa)
            const fallbackCoords = [
                [accommodation.lng, accommodation.lat],
                ...sorted.map(p => [p.lng, p.lat]),
            ];
            sendCommand({ action: 'setRoute', coordinates: fallbackCoords });
            setRouteData({
                distance: calculateTotalDistance(accommodation, sorted),
                duration: null,
                route: fallbackCoords,
            });
        }

        // 4. Restoranları yükle
        loadRestaurants(accommodation.lat, accommodation.lng);

        setRouteLoading(false);
    };

    // ─── Restoran yükle ───
    const loadRestaurants = async (lat, lng) => {
        setRestaurantsLoading(true);
        const { data } = await getNearbyRestaurants(lat, lng, 1000);

        if (data && data.length > 0) {
            const withDistance = data.map(r => ({
                ...r,
                distance: Math.round(haversineDistance(lat, lng, r.lat, r.lng) * 1000),
            })).sort((a, b) => a.distance - b.distance);

            setRestaurants(withDistance);
            sendCommand({ action: 'setRestaurants', restaurants: withDistance });
        }
        setRestaurantsLoading(false);
    };

    // ─── Planı Supabase'e kaydet ───
    const handleSavePlan = async () => {
        if (!user) {
            Alert.alert('Giriş Gerekli', 'Planı kaydetmek için giriş yapmalısınız.');
            return;
        }

        setSaving(true);
        try {
            // Itinerary items hazırla (sıralı yerler)
            const items = orderedPlaces.map((place, index) => ({
                place_id: place.id,
                day_number: 1,
                order_index: index,
            }));

            const { error } = await createItinerary({
                userId: user.id,
                cityId: city.id,
                days: 1,
                hasAccommodation: true,
                hasTransport: false,
                startLocationLat: accommodation.lat,
                startLocationLng: accommodation.lng,
                items,
            });

            if (error) {
                console.error('Save itinerary error:', error);
                Alert.alert('Hata', 'Plan kaydedilirken bir hata oluştu. Tekrar deneyin.');
            } else {
                Alert.alert(
                    'Başarılı! 🎉',
                    `"${cityName}" gezi rotanız ${orderedPlaces.length} durak ile kaydedildi.`,
                    [{ text: 'Tamam', onPress: () => navigation.goBack() }]
                );
            }
        } catch (err) {
            console.error('Save plan error:', err);
            Alert.alert('Hata', 'Beklenmeyen bir hata oluştu.');
        }
        setSaving(false);
    };


    // ─── STEP RENDER FUNCTIONS ───

    const renderStep0_Accommodation = () => (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>📍 Konaklama Noktası Seçin</Text>
            <Text style={styles.stepDesc}>
                Haritada uzun basarak konum seçin veya aşağıdaki otelleri inceleyin
            </Text>

            {accommodation && (
                <View style={styles.selectedBadge}>
                    <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                    <Text style={styles.selectedText}>
                        {accommodation.name || 'Konum seçildi'}
                    </Text>
                </View>
            )}

            {hotelsLoading ? (
                <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 16 }} />
            ) : hotels.length > 0 ? (
                <View style={styles.hotelList}>
                    <Text style={styles.subTitle}>🏨 Yakın Oteller ({hotels.length})</Text>
                    {hotels.slice(0, 5).map(hotel => (
                        <HotelCard
                            key={hotel.id || `${hotel.lat}-${hotel.lng}`}
                            hotel={hotel}
                            selected={selectedHotel?.lat === hotel.lat && selectedHotel?.lng === hotel.lng}
                            onSelect={handleHotelSelect}
                        />
                    ))}
                </View>
            ) : (
                <Text style={styles.emptyText}>
                    Yakında otel bulunamadı. Haritada uzun basarak konum seçebilirsiniz.
                </Text>
            )}

            <Button
                title="Devam → Gezi Noktaları"
                onPress={() => {
                    if (!accommodation) {
                        Alert.alert('Uyarı', 'Önce konaklama noktası seçin.');
                        return;
                    }
                    setCurrentStep(1);
                }}
                disabled={!accommodation}
                style={styles.nextButton}
            />
        </View>
    );

    const renderStep1_Places = () => (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>📌 Gezilecek Yerleri Seçin</Text>
            <Text style={styles.stepDesc}>
                {selectedPlaces.length} yer seçildi — En az 1 yer gerekli
            </Text>

            {placesLoading ? (
                <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 16 }} />
            ) : (
                <View style={styles.placeList}>
                    {allPlaces.map(place => {
                        const isSelected = selectedPlaces.find(p => p.id === place.id);
                        const dist = accommodation
                            ? Math.round(haversineDistance(accommodation.lat, accommodation.lng, place.lat, place.lng) * 1000)
                            : null;

                        return (
                            <TouchableOpacity
                                key={place.id}
                                style={[styles.placeItem, isSelected && styles.placeItemSelected]}
                                onPress={() => togglePlace(place)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.placeCheckbox, isSelected && styles.placeCheckboxSelected]}>
                                    {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                                </View>
                                <View style={styles.placeInfo}>
                                    <Text style={styles.placeName}>{place.name}</Text>
                                    <Text style={styles.placeMeta}>
                                        {place.category} {dist ? `· ${dist}m` : ''}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}

            <View style={styles.buttonRow}>
                <Button
                    title="← Geri"
                    onPress={() => setCurrentStep(0)}
                    variant="outline"
                    style={styles.halfButton}
                />
                <Button
                    title="Rota Oluştur 🗺️"
                    onPress={handleCreateRoute}
                    disabled={selectedPlaces.length === 0}
                    style={styles.halfButton}
                />
            </View>
        </View>
    );

    const renderStep2_Route = () => (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>🗺️ Optimized Rota</Text>

            {routeLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Rota hesaplanıyor...</Text>
                </View>
            ) : (
                <>
                    {/* Rota özeti */}
                    {routeData && (
                        <View style={styles.routeSummary}>
                            <View style={styles.routeStat}>
                                <Ionicons name="navigate" size={18} color={COLORS.primary} />
                                <Text style={styles.routeStatValue}>
                                    {routeData.distance ? `${routeData.distance.toFixed(1)} km` : '—'}
                                </Text>
                                <Text style={styles.routeStatLabel}>Toplam</Text>
                            </View>
                            <View style={styles.routeStatDivider} />
                            <View style={styles.routeStat}>
                                <Ionicons name="time" size={18} color={COLORS.accent} />
                                <Text style={styles.routeStatValue}>
                                    {routeData.duration
                                        ? `${Math.round(routeData.duration / 60)} dk`
                                        : '—'}
                                </Text>
                                <Text style={styles.routeStatLabel}>Tahmini</Text>
                            </View>
                            <View style={styles.routeStatDivider} />
                            <View style={styles.routeStat}>
                                <Ionicons name="location" size={18} color={COLORS.success} />
                                <Text style={styles.routeStatValue}>{orderedPlaces.length}</Text>
                                <Text style={styles.routeStatLabel}>Durak</Text>
                            </View>
                        </View>
                    )}

                    {/* Sıralı duraklar */}
                    <Text style={styles.subTitle}>📋 Rota Sırası</Text>
                    <View style={styles.routeStops}>
                        <View style={styles.stopItem}>
                            <View style={[styles.stopBadge, { backgroundColor: COLORS.success }]}>
                                <Text style={styles.stopBadgeText}>🏠</Text>
                            </View>
                            <Text style={styles.stopName}>{accommodation?.name || 'Konaklama'}</Text>
                            <Text style={styles.stopLabel}>Başlangıç</Text>
                        </View>

                        {orderedPlaces.map((place, i) => (
                            <View key={place.id} style={styles.stopItem}>
                                <View style={styles.stopBadge}>
                                    <Text style={styles.stopBadgeText}>{i + 1}</Text>
                                </View>
                                <View style={styles.stopInfo}>
                                    <Text style={styles.stopName}>{place.name}</Text>
                                    <Text style={styles.stopDist}>📏 {place.distanceFromPrev}m</Text>
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Restoranlar */}
                    {restaurantsLoading ? (
                        <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 12 }} />
                    ) : restaurants.length > 0 ? (
                        <View style={styles.restaurantSection}>
                            <Text style={styles.subTitle}>🍽️ Yakın Restoranlar ({restaurants.length})</Text>
                            {restaurants.slice(0, 5).map((rest, i) => (
                                <RestaurantCard key={rest.id || i} restaurant={rest} />
                            ))}
                        </View>
                    ) : null}

                    <View style={styles.buttonRow}>
                        <Button
                            title="← Geri"
                            onPress={() => {
                                setCurrentStep(1);
                                sendCommand({ action: 'clearRoute' });
                            }}
                            variant="outline"
                            style={styles.halfButton}
                        />
                        <Button
                            title={saving ? 'Kaydediliyor...' : 'Planı Kaydet ✅'}
                            onPress={handleSavePlan}
                            loading={saving}
                            disabled={saving}
                            style={styles.halfButton}
                        />
                    </View>
                </>
            )}
        </View>
    );

    // ─── LEAFLET HTML ───
    const leafletHtml = generateLeafletHtml(cityCenter, 13);

    return (
        <View style={styles.container}>
            {/* ─── HEADER ─── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>🗺️ {cityName} Haritası</Text>
                <View style={styles.stepTracker}>
                    {STEPS.map((step, i) => (
                        <View key={step} style={styles.stepDotRow}>
                            <View style={[styles.stepDot, currentStep >= i && styles.stepDotActive]} />
                            {i < STEPS.length - 1 && (
                                <View style={[styles.stepLine, currentStep > i && styles.stepLineActive]} />
                            )}
                        </View>
                    ))}
                </View>
            </View>

            {/* ─── MAP ─── */}
            <View style={styles.mapContainer}>
                <WebView
                    ref={webViewRef}
                    source={{ html: leafletHtml }}
                    style={styles.map}
                    onMessage={handleWebViewMessage}
                    javaScriptEnabled
                    domStorageEnabled
                    startInLoadingState
                    renderLoading={() => (
                        <View style={styles.mapLoading}>
                            <ActivityIndicator size="large" color={COLORS.primary} />
                            <Text style={styles.loadingText}>Harita yükleniyor...</Text>
                        </View>
                    )}
                />

                {/* Step label on map */}
                <View style={styles.mapStepLabel}>
                    <Text style={styles.mapStepLabelText}>
                        {currentStep === 0 ? '📍 Uzun basarak konaklama seçin'
                            : currentStep === 1 ? '📌 Aşağıdan yer seçin'
                                : '🗺️ Rota hazır!'}
                    </Text>
                </View>
            </View>

            {/* ─── BOTTOM SHEET ─── */}
            <TouchableOpacity
                style={styles.sheetHandle}
                onPress={() => setBottomSheetExpanded(!bottomSheetExpanded)}
                activeOpacity={0.7}
            >
                <View style={styles.handleBar} />
                <Text style={styles.sheetTitle}>{STEPS[currentStep]}</Text>
            </TouchableOpacity>

            {bottomSheetExpanded && (
                <ScrollView
                    style={styles.bottomSheet}
                    contentContainerStyle={styles.bottomSheetContent}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled
                >
                    {currentStep === 0 && renderStep0_Accommodation()}
                    {currentStep === 1 && renderStep1_Places()}
                    {currentStep === 2 && renderStep2_Route()}
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingTop: Platform.OS === 'ios' ? 50 : SPACING.md,
        paddingBottom: SPACING.sm,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.divider,
    },
    backButton: { padding: 6, marginRight: SPACING.sm },
    headerTitle: {
        fontFamily: 'PlayfairDisplay_700Bold',
        fontSize: FONT_SIZES.lg,
        color: COLORS.textPrimary,
        flex: 1,
    },
    stepTracker: { flexDirection: 'row', alignItems: 'center' },
    stepDotRow: { flexDirection: 'row', alignItems: 'center' },
    stepDot: {
        width: 10, height: 10, borderRadius: 5,
        backgroundColor: COLORS.border,
    },
    stepDotActive: { backgroundColor: COLORS.primary },
    stepLine: {
        width: 16, height: 2,
        backgroundColor: COLORS.border,
        marginHorizontal: 2,
    },
    stepLineActive: { backgroundColor: COLORS.primary },
    // Map
    mapContainer: { height: SCREEN_H * 0.4, position: 'relative' },
    map: { flex: 1 },
    mapLoading: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    mapStepLabel: {
        position: 'absolute',
        top: SPACING.sm,
        left: SPACING.md,
        right: SPACING.md,
        backgroundColor: 'rgba(255,255,255,0.95)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: BORDER_RADIUS.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    mapStepLabelText: {
        fontFamily: 'Inter_500Medium',
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
        textAlign: 'center',
    },
    // Bottom Sheet
    sheetHandle: {
        backgroundColor: COLORS.surface,
        paddingVertical: SPACING.sm,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: COLORS.divider,
    },
    handleBar: {
        width: 40, height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.border,
        marginBottom: 6,
    },
    sheetTitle: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    bottomSheet: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    bottomSheetContent: {
        paddingBottom: 100,
    },
    // Steps
    stepContent: {
        padding: SPACING.md,
    },
    stepTitle: {
        fontFamily: 'PlayfairDisplay_700Bold',
        fontSize: FONT_SIZES.xl,
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    stepDesc: {
        fontFamily: 'Inter_400Regular',
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        marginBottom: SPACING.md,
    },
    subTitle: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
        marginTop: SPACING.md,
    },
    selectedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: COLORS.success + '15',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.sm,
    },
    selectedText: {
        fontFamily: 'Inter_500Medium',
        fontSize: FONT_SIZES.sm,
        color: COLORS.success,
    },
    emptyText: {
        fontFamily: 'Inter_400Regular',
        fontSize: FONT_SIZES.sm,
        color: COLORS.textLight,
        textAlign: 'center',
        paddingVertical: SPACING.lg,
    },
    hotelList: { marginTop: SPACING.sm },
    nextButton: { marginTop: SPACING.md },
    // Places
    placeList: { gap: SPACING.xs },
    placeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        padding: SPACING.sm,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1.5,
        borderColor: COLORS.border,
    },
    placeItemSelected: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryMuted,
    },
    placeCheckbox: {
        width: 22, height: 22, borderRadius: 6,
        borderWidth: 2, borderColor: COLORS.border,
        justifyContent: 'center', alignItems: 'center',
        marginRight: SPACING.sm,
    },
    placeCheckboxSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    placeInfo: { flex: 1 },
    placeName: {
        fontFamily: 'Inter_500Medium',
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
    },
    placeMeta: {
        fontFamily: 'Inter_400Regular',
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
        marginTop: SPACING.md,
    },
    halfButton: { flex: 1 },
    // Route
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: SPACING.xl,
    },
    loadingText: {
        fontFamily: 'Inter_400Regular',
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        marginTop: SPACING.sm,
    },
    routeSummary: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        justifyContent: 'space-around',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    routeStat: { alignItems: 'center', flex: 1 },
    routeStatValue: {
        fontFamily: 'Inter_700Bold',
        fontSize: FONT_SIZES.lg,
        color: COLORS.textPrimary,
        marginTop: 4,
    },
    routeStatLabel: {
        fontFamily: 'Inter_400Regular',
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    routeStatDivider: {
        width: 1, height: 36,
        backgroundColor: COLORS.divider,
    },
    routeStops: { gap: SPACING.xs },
    stopItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.xs,
    },
    stopBadge: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: COLORS.primary,
        justifyContent: 'center', alignItems: 'center',
        marginRight: SPACING.sm,
    },
    stopBadgeText: {
        color: '#fff',
        fontFamily: 'Inter_700Bold',
        fontSize: 12,
    },
    stopInfo: { flex: 1 },
    stopName: {
        fontFamily: 'Inter_500Medium',
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
    },
    stopDist: {
        fontFamily: 'Inter_400Regular',
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
    },
    stopLabel: {
        fontFamily: 'Inter_400Regular',
        fontSize: FONT_SIZES.xs,
        color: COLORS.textLight,
    },
    restaurantSection: { marginTop: SPACING.sm },
});

export default MapScreen;
