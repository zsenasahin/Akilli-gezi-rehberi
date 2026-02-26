import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/layout';
import { useAuth } from '../../contexts/AuthContext';
import { getCities } from '../../services/cityService';
import { getPlacesByCity } from '../../services/placeService';
import { createItinerary } from '../../services/itineraryService';
import { fetchNearbyHotels } from '../../services/apiService';
import { generateItinerary } from '../../logic/itineraryGenerator';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';

const STEPS = ['Şehir & Yerler', 'Gün Sayısı', 'Tercihler', 'Plan'];

/**
 * Step-by-step trip planning wizard.
 * Step 1: Select city + optionally select places
 * Step 2: Select number of days
 * Step 3: Accommodation & transport preferences
 * Step 4: Review generated plan & save
 */
const CreateItineraryScreen = ({ navigation }) => {
    const { user } = useAuth();

    // Wizard state
    const [currentStep, setCurrentStep] = useState(0);

    // Step 1: City & Places
    const [cities, setCities] = useState([]);
    const [selectedCity, setSelectedCity] = useState(null);
    const [places, setPlaces] = useState([]);
    const [selectedPlaces, setSelectedPlaces] = useState([]);
    const [autoSelect, setAutoSelect] = useState(true);
    const [placesLoading, setPlacesLoading] = useState(false);

    // Step 2: Days
    const [days, setDays] = useState(2);

    // Step 3: Preferences
    const [hasAccommodation, setHasAccommodation] = useState(true);
    const [hasTransport, setHasTransport] = useState(true);
    const [nearbyHotels, setNearbyHotels] = useState([]);
    const [hotelsLoading, setHotelsLoading] = useState(false);

    // Step 4: Generated plan
    const [generatedPlan, setGeneratedPlan] = useState(null);
    const [saving, setSaving] = useState(false);

    // General
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Load cities
    useEffect(() => {
        const loadCities = async () => {
            const { data, error: citiesError } = await getCities();
            if (citiesError) {
                setError('Şehirler yüklenirken hata oluştu.');
            } else {
                setCities(data || []);
            }
            setLoading(false);
        };
        loadCities();
    }, []);

    // Load places when city changes
    useEffect(() => {
        if (!selectedCity) return;

        const loadPlaces = async () => {
            setPlacesLoading(true);
            const { data, error: placesError } = await getPlacesByCity(selectedCity.id);
            if (!placesError) {
                setPlaces(data || []);
            }
            setPlacesLoading(false);
        };
        loadPlaces();
    }, [selectedCity]);

    const togglePlaceSelection = (place) => {
        setSelectedPlaces((prev) => {
            const exists = prev.find((p) => p.id === place.id);
            if (exists) {
                return prev.filter((p) => p.id !== place.id);
            }
            return [...prev, place];
        });
    };

    const isPlaceSelected = (placeId) =>
        selectedPlaces.some((p) => p.id === placeId);

    // Generate plan on step 4
    const handleGeneratePlan = useCallback(() => {
        const placesToUse = autoSelect ? places : selectedPlaces;

        if (placesToUse.length === 0) {
            setError('Plan oluşturmak için en az bir yer gerekli.');
            return;
        }

        const startLocation = selectedCity
            ? { lat: selectedCity.lat || placesToUse[0]?.lat, lng: selectedCity.lng || placesToUse[0]?.lng }
            : null;

        const result = generateItinerary(placesToUse, days, { startLocation });
        setGeneratedPlan(result);
        setError(null);
    }, [places, selectedPlaces, autoSelect, days, selectedCity]);

    // Fetch hotels when user doesn't have accommodation
    useEffect(() => {
        if (currentStep === 2 && !hasAccommodation && selectedCity && places.length > 0) {
            const fetchHotels = async () => {
                setHotelsLoading(true);
                const centerPlace = places[0];
                const { data } = await fetchNearbyHotels(centerPlace.lat, centerPlace.lng, 5000);
                setNearbyHotels((data || []).slice(0, 5));
                setHotelsLoading(false);
            };
            fetchHotels();
        }
    }, [currentStep, hasAccommodation, selectedCity, places]);

    const handleNext = () => {
        if (currentStep === 0 && !selectedCity) {
            setError('Lütfen bir şehir seçin.');
            return;
        }
        if (currentStep === 0 && !autoSelect && selectedPlaces.length === 0) {
            setError('Lütfen en az bir yer seçin veya otomatik seçimi açın.');
            return;
        }

        setError(null);

        if (currentStep === 2) {
            // Moving to step 4 — generate plan
            handleGeneratePlan();
        }

        setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    };

    const handleBack = () => {
        setError(null);
        setCurrentStep((prev) => Math.max(prev - 1, 0));
    };

    const handleSave = async () => {
        if (!user || !generatedPlan) return;

        setSaving(true);
        setError(null);

        const { error: saveError } = await createItinerary({
            userId: user.id,
            cityId: selectedCity.id,
            days,
            hasAccommodation,
            hasTransport,
            startLocationLat: null,
            startLocationLng: null,
            items: generatedPlan.items,
        });

        setSaving(false);

        if (saveError) {
            setError('Plan kaydedilirken hata oluştu: ' + saveError.message);
            return;
        }

        Alert.alert('Başarılı! ✅', 'Gezi planınız kaydedildi.', [
            {
                text: 'Planlarıma Git',
                onPress: () => navigation.navigate('Saved'),
            },
        ]);
    };

    if (loading) return <LoadingSpinner message="Yükleniyor..." />;

    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                keyboardShouldPersistTaps="handled"
            >
                {/* Progress bar */}
                <View style={styles.progressContainer}>
                    {STEPS.map((step, idx) => (
                        <View key={step} style={styles.progressStep}>
                            <View
                                style={[
                                    styles.progressDot,
                                    idx <= currentStep && styles.progressDotActive,
                                ]}
                            >
                                {idx < currentStep ? (
                                    <Ionicons name="checkmark" size={12} color="#fff" />
                                ) : (
                                    <Text style={[
                                        styles.progressNumber,
                                        idx <= currentStep && styles.progressNumberActive,
                                    ]}>
                                        {idx + 1}
                                    </Text>
                                )}
                            </View>
                            <Text
                                style={[
                                    styles.progressLabel,
                                    idx <= currentStep && styles.progressLabelActive,
                                ]}
                            >
                                {step}
                            </Text>
                            {idx < STEPS.length - 1 && (
                                <View style={[
                                    styles.progressLine,
                                    idx < currentStep && styles.progressLineActive,
                                ]} />
                            )}
                        </View>
                    ))}
                </View>

                {error && <ErrorMessage message={error} />}

                {/* Step content */}
                {currentStep === 0 && (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>📍 Şehir Seç</Text>
                        <View style={styles.cityGrid}>
                            {cities.map((city) => {
                                const isActive = selectedCity?.id === city.id;
                                return (
                                    <TouchableOpacity
                                        key={city.id}
                                        style={[styles.cityCard, isActive && styles.cityCardActive]}
                                        onPress={() => {
                                            setSelectedCity(city);
                                            setSelectedPlaces([]);
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.cityIcon}>
                                            {city.name === 'İstanbul' ? '🕌' :
                                                city.name === 'Antalya' ? '🏖️' :
                                                    city.name === 'Konya' ? '🌾' : '🏙️'}
                                        </Text>
                                        <Text style={[styles.cityCardName, isActive && styles.cityCardNameActive]}>
                                            {city.name}
                                        </Text>
                                        <Text style={styles.cityCardRegion}>{city.region}</Text>
                                        {isActive && (
                                            <View style={styles.checkMark}>
                                                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {selectedCity && (
                            <>
                                <View style={styles.toggleRow}>
                                    <Text style={styles.toggleLabel}>Yerleri otomatik seç</Text>
                                    <Switch
                                        value={autoSelect}
                                        onValueChange={setAutoSelect}
                                        trackColor={{ true: COLORS.primaryLight, false: COLORS.border }}
                                        thumbColor={autoSelect ? COLORS.primary : COLORS.textLight}
                                    />
                                </View>

                                {!autoSelect && (
                                    <>
                                        <Text style={styles.sectionLabel}>
                                            Yerleri seç ({selectedPlaces.length} seçildi)
                                        </Text>
                                        {placesLoading ? (
                                            <LoadingSpinner message="Yerler yükleniyor..." />
                                        ) : (
                                            <View style={styles.placeList}>
                                                {places.map((place) => (
                                                    <TouchableOpacity
                                                        key={place.id}
                                                        style={[
                                                            styles.placeOption,
                                                            isPlaceSelected(place.id) && styles.placeOptionActive,
                                                        ]}
                                                        onPress={() => togglePlaceSelection(place)}
                                                    >
                                                        <View style={styles.placeOptionInfo}>
                                                            <Text style={styles.placeOptionName}>{place.name}</Text>
                                                            <Text style={styles.placeOptionMeta}>
                                                                {place.category} · {place.avg_duration}s
                                                            </Text>
                                                        </View>
                                                        <Ionicons
                                                            name={isPlaceSelected(place.id) ? 'checkbox' : 'square-outline'}
                                                            size={22}
                                                            color={isPlaceSelected(place.id) ? COLORS.primary : COLORS.textLight}
                                                        />
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </View>
                )}

                {currentStep === 1 && (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>📅 Kaç gün?</Text>
                        <Text style={styles.stepDescription}>
                            Gezi planınız kaç gün sürsün?
                        </Text>
                        <View style={styles.daySelector}>
                            <TouchableOpacity
                                style={styles.dayButton}
                                onPress={() => setDays(Math.max(1, days - 1))}
                                disabled={days <= 1}
                            >
                                <Ionicons name="remove-circle-outline" size={36} color={days <= 1 ? COLORS.textLight : COLORS.primary} />
                            </TouchableOpacity>
                            <View style={styles.dayDisplay}>
                                <Text style={styles.dayNumber}>{days}</Text>
                                <Text style={styles.dayLabel}>gün</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.dayButton}
                                onPress={() => setDays(Math.min(14, days + 1))}
                                disabled={days >= 14}
                            >
                                <Ionicons name="add-circle-outline" size={36} color={days >= 14 ? COLORS.textLight : COLORS.primary} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.dayQuickSelect}>
                            {[1, 2, 3, 5, 7].map((d) => (
                                <TouchableOpacity
                                    key={d}
                                    style={[styles.dayQuickChip, days === d && styles.dayQuickChipActive]}
                                    onPress={() => setDays(d)}
                                >
                                    <Text style={[styles.dayQuickText, days === d && styles.dayQuickTextActive]}>
                                        {d} gün
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {currentStep === 2 && (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>🏨 Tercihler</Text>

                        <View style={styles.preferenceCard}>
                            <View style={styles.preferenceRow}>
                                <View style={styles.preferenceInfo}>
                                    <Ionicons name="bed-outline" size={24} color={COLORS.primary} />
                                    <View>
                                        <Text style={styles.preferenceName}>Konaklama var mı?</Text>
                                        <Text style={styles.preferenceDesc}>
                                            Kalacak yeriniz varsa başlangıç noktası olarak kullanılır
                                        </Text>
                                    </View>
                                </View>
                                <Switch
                                    value={hasAccommodation}
                                    onValueChange={setHasAccommodation}
                                    trackColor={{ true: COLORS.primaryLight, false: COLORS.border }}
                                    thumbColor={hasAccommodation ? COLORS.primary : COLORS.textLight}
                                />
                            </View>
                        </View>

                        <View style={styles.preferenceCard}>
                            <View style={styles.preferenceRow}>
                                <View style={styles.preferenceInfo}>
                                    <Ionicons name="car-outline" size={24} color={COLORS.accent} />
                                    <View>
                                        <Text style={styles.preferenceName}>Ulaşım var mı?</Text>
                                        <Text style={styles.preferenceDesc}>
                                            Aracınız varsa uzak yerler de önerilir
                                        </Text>
                                    </View>
                                </View>
                                <Switch
                                    value={hasTransport}
                                    onValueChange={setHasTransport}
                                    trackColor={{ true: COLORS.primaryLight, false: COLORS.border }}
                                    thumbColor={hasTransport ? COLORS.primary : COLORS.textLight}
                                />
                            </View>
                        </View>

                        {/* Hotel suggestions when no accommodation */}
                        {!hasAccommodation && (
                            <View style={styles.hotelSection}>
                                <Text style={styles.sectionLabel}>🏨 Yakın Oteller</Text>
                                {hotelsLoading ? (
                                    <Text style={styles.loadingText}>Oteller aranıyor...</Text>
                                ) : nearbyHotels.length > 0 ? (
                                    nearbyHotels.map((hotel, idx) => (
                                        <View key={idx} style={styles.hotelCard}>
                                            <Ionicons name="bed-outline" size={18} color={COLORS.primary} />
                                            <View style={styles.hotelInfo}>
                                                <Text style={styles.hotelName}>{hotel.name}</Text>
                                                {hotel.address && (
                                                    <Text style={styles.hotelAddress}>{hotel.address}</Text>
                                                )}
                                                {hotel.stars && (
                                                    <Text style={styles.hotelStars}>{'⭐'.repeat(Number(hotel.stars))}</Text>
                                                )}
                                            </View>
                                        </View>
                                    ))
                                ) : (
                                    <Text style={styles.noHotels}>
                                        Yakında otel bulunamadı. (OpenStreetMap verileri sınırlı olabilir)
                                    </Text>
                                )}
                            </View>
                        )}
                    </View>
                )}

                {currentStep === 3 && (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>🗺️ Gezi Planınız</Text>

                        {generatedPlan ? (
                            <>
                                {/* Summary */}
                                <View style={styles.summaryCard}>
                                    <Text style={styles.summaryCity}>📍 {selectedCity?.name}</Text>
                                    <View style={styles.summaryStats}>
                                        <View style={styles.summaryStat}>
                                            <Text style={styles.summaryValue}>{days}</Text>
                                            <Text style={styles.summaryLabel}>Gün</Text>
                                        </View>
                                        <View style={styles.summaryDivider} />
                                        <View style={styles.summaryStat}>
                                            <Text style={styles.summaryValue}>{generatedPlan.totalHours}s</Text>
                                            <Text style={styles.summaryLabel}>Toplam</Text>
                                        </View>
                                        <View style={styles.summaryDivider} />
                                        <View style={styles.summaryStat}>
                                            <Text style={styles.summaryValue}>{generatedPlan.totalDistance}km</Text>
                                            <Text style={styles.summaryLabel}>Mesafe</Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Day plans */}
                                {generatedPlan.plan.map((dayPlan) => (
                                    <View key={dayPlan.day} style={styles.dayCard}>
                                        <View style={styles.dayHeader}>
                                            <View style={styles.dayBadge}>
                                                <Text style={styles.dayBadgeText}>{dayPlan.day}</Text>
                                            </View>
                                            <View>
                                                <Text style={styles.dayTitle}>Gün {dayPlan.day}</Text>
                                                <Text style={styles.dayMeta}>
                                                    {dayPlan.places.length} yer · {dayPlan.totalHours}s ·{' '}
                                                    {Math.round(dayPlan.totalDistance * 10) / 10}km
                                                </Text>
                                            </View>
                                        </View>
                                        {dayPlan.places.map((place, idx) => (
                                            <View key={place.id} style={styles.planPlaceItem}>
                                                <View style={styles.planPlaceIndex}>
                                                    <Text style={styles.planPlaceIndexText}>{idx + 1}</Text>
                                                </View>
                                                <View style={styles.planPlaceInfo}>
                                                    <Text style={styles.planPlaceName}>{place.name}</Text>
                                                    <Text style={styles.planPlaceMeta}>
                                                        {place.category} · {place.avg_duration}s ·{' '}
                                                        {place.entry_fee > 0 ? `₺${place.entry_fee}` : 'Ücretsiz'}
                                                    </Text>
                                                </View>
                                            </View>
                                        ))}
                                        {dayPlan.places.length === 0 && (
                                            <Text style={styles.emptyDay}>Bu gün için yer bulunamadı.</Text>
                                        )}
                                    </View>
                                ))}

                                <Button
                                    title="Planı Kaydet 💾"
                                    onPress={handleSave}
                                    loading={saving}
                                    style={styles.saveButton}
                                />
                            </>
                        ) : (
                            <Text style={styles.noPlaces}>Plan oluşturulamadı.</Text>
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Navigation buttons */}
            <View style={styles.navButtons}>
                {currentStep > 0 && (
                    <Button
                        title="Geri"
                        onPress={handleBack}
                        variant="outline"
                        style={styles.navButton}
                    />
                )}
                {currentStep < STEPS.length - 1 && (
                    <Button
                        title="İleri"
                        onPress={handleNext}
                        style={[styles.navButton, currentStep === 0 && styles.navButtonFull]}
                    />
                )}
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: COLORS.background },
    container: { flex: 1 },
    contentContainer: {
        padding: SPACING.md,
        paddingBottom: SPACING.xxl * 2,
    },
    // Progress
    progressContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.lg,
    },
    progressStep: {
        alignItems: 'center',
        flex: 1,
        position: 'relative',
    },
    progressDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.surfaceAlt,
        borderWidth: 2,
        borderColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressDotActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    progressNumber: {
        fontSize: 11,
        fontFamily: "Inter_700Bold",
        color: COLORS.textLight,
    },
    progressNumberActive: {
        color: '#fff',
    },
    progressLabel: {
        fontSize: 10,
        color: COLORS.textLight,
        marginTop: 4,
        textAlign: 'center',
    },
    progressLabelActive: {
        color: COLORS.primary,
        fontFamily: "Inter_600SemiBold",
    },
    progressLine: {
        position: 'absolute',
        top: 14,
        left: '60%',
        right: '-40%',
        height: 2,
        backgroundColor: COLORS.border,
        zIndex: -1,
    },
    progressLineActive: {
        backgroundColor: COLORS.primary,
    },
    // Step content
    stepContent: {
        marginTop: SPACING.sm,
    },
    stepTitle: {
        fontSize: FONT_SIZES.xl,
        fontFamily: 'PlayfairDisplay_700Bold',
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
    },
    stepDescription: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        marginBottom: SPACING.md,
    },
    // City selection
    cityGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
        marginBottom: SPACING.md,
    },
    cityCard: {
        flex: 1,
        minWidth: '30%',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.border,
        position: 'relative',
    },
    cityCardActive: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primary + '08',
    },
    cityIcon: { fontSize: 32, marginBottom: SPACING.xs },
    cityCardName: {
        fontSize: FONT_SIZES.md,
        fontFamily: "Inter_600SemiBold",
        color: COLORS.textPrimary,
    },
    cityCardNameActive: { color: COLORS.primary },
    cityCardRegion: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    checkMark: { position: 'absolute', top: 8, right: 8 },
    // Toggle
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.md,
    },
    toggleLabel: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        fontFamily: "Inter_500Medium",
    },
    sectionLabel: {
        fontSize: FONT_SIZES.md,
        fontFamily: "Inter_600SemiBold",
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
    },
    // Place selection
    placeList: { gap: SPACING.xs },
    placeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.sm,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    placeOptionActive: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primary + '08',
    },
    placeOptionInfo: { flex: 1 },
    placeOptionName: {
        fontSize: FONT_SIZES.sm,
        fontFamily: "Inter_500Medium",
        color: COLORS.textPrimary,
    },
    placeOptionMeta: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    // Day selector
    daySelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: SPACING.xl,
    },
    dayButton: { padding: SPACING.sm },
    dayDisplay: { alignItems: 'center', marginHorizontal: SPACING.xl },
    dayNumber: {
        fontSize: 48,
        fontFamily: "Inter_700Bold",
        color: COLORS.primary,
    },
    dayLabel: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
    },
    dayQuickSelect: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: SPACING.sm,
    },
    dayQuickChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.surfaceAlt,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    dayQuickChipActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    dayQuickText: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        fontFamily: "Inter_500Medium",
    },
    dayQuickTextActive: { color: '#fff', fontFamily: "Inter_600SemiBold" },
    // Preferences
    preferenceCard: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    preferenceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    preferenceInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        flex: 1,
    },
    preferenceName: {
        fontSize: FONT_SIZES.md,
        fontFamily: "Inter_600SemiBold",
        color: COLORS.textPrimary,
    },
    preferenceDesc: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        marginTop: 2,
        maxWidth: 200,
    },
    hotelSection: { marginTop: SPACING.md },
    loadingText: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    hotelCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        backgroundColor: COLORS.surface,
        padding: SPACING.sm,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.xs,
    },
    hotelInfo: { flex: 1 },
    hotelName: {
        fontSize: FONT_SIZES.sm,
        fontFamily: "Inter_500Medium",
        color: COLORS.textPrimary,
    },
    hotelAddress: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
    hotelStars: { fontSize: 10 },
    noHotels: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textLight,
        textAlign: 'center',
        paddingVertical: SPACING.md,
    },
    // Plan view
    summaryCard: {
        backgroundColor: COLORS.primary,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.md,
    },
    summaryCity: {
        fontSize: FONT_SIZES.xl,
        fontFamily: 'PlayfairDisplay_700Bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: SPACING.md,
    },
    summaryStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    summaryStat: { alignItems: 'center', flex: 1 },
    summaryValue: {
        fontSize: FONT_SIZES.lg,
        fontFamily: "Inter_700Bold",
        color: '#fff',
    },
    summaryLabel: {
        fontSize: FONT_SIZES.xs,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    summaryDivider: {
        width: 1,
        height: 30,
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    dayCard: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    dayHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    dayBadge: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.sm,
    },
    dayBadgeText: {
        color: '#fff',
        fontFamily: "Inter_700Bold",
        fontSize: FONT_SIZES.md,
    },
    dayTitle: {
        fontSize: FONT_SIZES.lg,
        fontFamily: "Inter_600SemiBold",
        color: COLORS.textPrimary,
    },
    dayMeta: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
    },
    planPlaceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.sm,
        borderTopWidth: 1,
        borderTopColor: COLORS.divider,
    },
    planPlaceIndex: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: COLORS.primaryLight + '40',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.sm,
    },
    planPlaceIndexText: {
        fontSize: 11,
        fontFamily: "Inter_700Bold",
        color: COLORS.primaryDark,
    },
    planPlaceInfo: { flex: 1 },
    planPlaceName: {
        fontSize: FONT_SIZES.sm,
        fontFamily: "Inter_500Medium",
        color: COLORS.textPrimary,
    },
    planPlaceMeta: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    emptyDay: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textLight,
        textAlign: 'center',
        paddingVertical: SPACING.md,
    },
    noPlaces: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textLight,
        textAlign: 'center',
        paddingVertical: SPACING.xl,
    },
    saveButton: { marginTop: SPACING.sm },
    // Nav buttons
    navButtons: {
        flexDirection: 'row',
        padding: SPACING.md,
        gap: SPACING.sm,
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.divider,
    },
    navButton: { flex: 1 },
    navButtonFull: { flex: 1 },
});

export default CreateItineraryScreen;
