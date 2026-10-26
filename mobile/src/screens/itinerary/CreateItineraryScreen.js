import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Switch, KeyboardAvoidingView, Platform, TextInput,
    ActivityIndicator, Linking, BackHandler,
} from 'react-native';
import Animated, { FadeInDown, FadeInLeft, FadeInRight } from 'react-native-reanimated';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { FONT_SIZES, FONTS } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/layout';
import { getCityCenter } from '../../constants/cities';
import { useAuth } from '../../contexts/AuthContext';
import { getCities } from '../../data/repositories/cityRepository';
import { createItinerary } from '../../data/repositories/itineraryRepository';
import { generateItinerary } from '../../domain/itineraryGenerator';
import { estimateGroupMinutes } from '../../domain/dayPlanner';
import { estimateDuration } from '../../algorithms/smartDuration';
import { loadCityPlaces } from '../../services/placeDataManager';
import { getHotelSuggestions } from '../../services/hotelService';
import PlaceSelectionCard from '../../components/itinerary/PlaceSelectionCard';
import ErrorMessage from '../../components/common/ErrorMessage';
import HotelSearch from '../../components/itinerary/HotelSearch';
import { consumePendingLocation } from '../../services/locationSelectionStore';
import { getCityImages } from '../../services/cityImageService';
import SmartImage from '../../components/common/SmartImage';
import PlannerHeader from '../../components/planner/PlannerHeader';
import PressableScale from '../../components/planner/PressableScale';
import PlanningOverlay from '../../components/planner/PlanningOverlay';
import DecisionStep from '../../components/planner/DecisionStep';
import { TRANSPORT_PROFILES, PACE_PROFILES, getPaceProfile, getTransportProfile } from '../../algorithms/travelProfiles';
import { addDays, countDaysInclusive, formatDayMonth, parseLocalDate, toLocalISODate } from '../../utils/dateUtils';
import { createThemedStyles } from '../../utils/themedStyles';

const CATEGORY_COLORS = {
    'tarihi': '#8B6B4E',
    'müze': '#6E5A47',
    'doğa': '#5B7A4A',
    'park': '#8A9A5B',
    'dini': '#B8893A',
    'restoran': '#B5523B',
    'kafe': '#B87B4F',
    'alışveriş': '#A86A5A',
    'eğlence': '#5A7D8C',
};

// Adımlar kullanıcının plan yaparken düşündüğü sırayı izler:
// nereye → ne zaman → neler → nasıl → nerede kalınacak → özet.
const STEPS = [
    { key: 'city', label: 'Şehir', icon: 'location-outline', title: 'Nereye gidiyorsun?' },
    { key: 'dates', label: 'Tarih', icon: 'calendar-outline', title: 'Ne zaman gidiyorsun?' },
    { key: 'places', label: 'Yerler', icon: 'images-outline', title: 'Neleri görmek istersin?' },
    { key: 'travel', label: 'Ulaşım', icon: 'bus-outline', title: 'Nasıl gezeceksin?' },
    { key: 'stay', label: 'Konaklama', icon: 'bed-outline', title: 'Nerede kalacaksın?' },
    { key: 'review', label: 'Özet', icon: 'sparkles-outline', title: 'Planını kontrol et' },
];

// Plan motoru gün başına birkaç durak planladığı için çok uzun aralıklar
// gerçekçi bir program üretmez; uzun geziler birden fazla plana bölünmelidir.
const MAX_TRIP_DAYS = 14;

// Plan saniyeden kısa sürede hesaplanır; animasyonun okunabilmesi için kısa bir süre gösterilir.
const MIN_PLANNING_ANIMATION_MS = 1400;

const normalizeSearch = (value = '') => String(value).toLocaleLowerCase('tr-TR').trim();

const buildRangeMarks = (start, end) => {
    const total = countDaysInclusive(start, end);
    const startDate = parseLocalDate(start);
    const marked = {};
    for (let offset = 0; offset < total; offset++) {
        const dateStr = toLocalISODate(addDays(startDate, offset));
        const isEdge = offset === 0 || offset === total - 1;
        marked[dateStr] = {
            startingDay: offset === 0,
            endingDay: offset === total - 1,
            color: isEdge ? COLORS.primary : COLORS.primaryMuted,
            textColor: isEdge ? '#fff' : COLORS.primary,
        };
    }
    return marked;
};

export default function CreateItineraryScreen({ navigation, route }) {
    const { user } = useAuth();
    const insets = useSafeAreaInsets();
    const scrollRef = useRef(null);

    const [stepIndex, setStepIndex] = useState(0);
    const [direction, setDirection] = useState(1);
    const stepKey = STEPS[stepIndex].key;

    // Şehir
    const [cities, setCities] = useState([]);
    const [selectedCity, setSelectedCity] = useState(null);

    // Yerler
    const [places, setPlaces] = useState([]);
    const [selectedPlaces, setSelectedPlaces] = useState([]);
    const [autoSelect, setAutoSelect] = useState(true);

    // Tarih
    const [markedDates, setMarkedDates] = useState({});
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [days, setDays] = useState(0);

    // Ulaşım & tempo
    const [transportMode, setTransportMode] = useState('transit');
    const [pace, setPace] = useState('balanced');

    // Konaklama
    const [hasAccommodation, setHasAccommodation] = useState(true);
    const [accommodationType, setAccommodationType] = useState('hotel'); // 'hotel' | 'own'
    const [hotels, setHotels] = useState([]);
    const [selectedHotel, setSelectedHotel] = useState(null);
    const [selectedOwnLocation, setSelectedOwnLocation] = useState(null);
    const [loadingHotels, setLoadingHotels] = useState(false);

    // UI
    const [loading, setLoading] = useState(false);
    const [planning, setPlanning] = useState(false);
    const [decision, setDecision] = useState(null); // { conflicts }
    const [error, setError] = useState(null);

    // Şehir ekranından gelindiyse şehir adımı atlanır
    useEffect(() => {
        const preselectedCity = route?.params?.preselectedCity;
        if (preselectedCity) {
            setSelectedCity(preselectedCity);
            setStepIndex(1);
        }
    }, [route?.params?.preselectedCity]);

    useFocusEffect(useCallback(() => {
        const pickedLocation = consumePendingLocation();
        if (pickedLocation) {
            setSelectedOwnLocation(pickedLocation);
            setAccommodationType('own');
        }
    }, []));

    useEffect(() => {
        loadCities();
    }, []);

    useEffect(() => {
        if (selectedCity) {
            loadPlaces(selectedCity.id);
        }
    }, [selectedCity]);

    // Yerler yüklenince otelleri de güncelle (yakınlık hesabı için)
    useEffect(() => {
        if (selectedCity && places.length > 0) {
            setLoadingHotels(true);
            getHotelSuggestions(selectedCity.name, places)
                .then(result => setHotels(result.data || []))
                .finally(() => setLoadingHotels(false));
        }
    }, [places]);

    useEffect(() => {
        scrollRef.current?.scrollTo?.({ y: 0, animated: false });
    }, [stepIndex, decision]);

    const loadCities = async () => {
        setLoading(true);
        const { data, error: err } = await getCities();
        setLoading(false);
        if (err) { setError('Şehirler yüklenemedi. İnternet bağlantınızı kontrol edin.'); return; }
        setCities(data || []);
    };

    const loadPlaces = async (cityId) => {
        setLoading(true);
        try {
            const cityObj = { id: cityId, name: selectedCity?.name };
            const data = await loadCityPlaces(cityObj);
            setPlaces(data || []);
        } catch (err) {
            setError('Yerler yüklenirken hata oluştu.');
        }
        setLoading(false);
        setSelectedPlaces([]);
    };

    const togglePlace = useCallback((place) => {
        setSelectedPlaces(prev =>
            prev.find(p => p.id === place.id)
                ? prev.filter(p => p.id !== place.id)
                : [...prev, place]
        );
    }, []);

    const handleDayPress = useCallback((day) => {
        const selectedDate = day.dateString;
        setError(null);

        if (!startDate || endDate || selectedDate < startDate) {
            // Yeni seçim başlat (ya da başlangıçtan önceki bir güne tıklandı)
            setStartDate(selectedDate);
            setEndDate(null);
            setMarkedDates(buildRangeMarks(selectedDate, selectedDate));
            setDays(1);
            return;
        }

        const daysDiff = countDaysInclusive(startDate, selectedDate);
        if (daysDiff > MAX_TRIP_DAYS) {
            setError(`Bir plan en fazla ${MAX_TRIP_DAYS} gün olabilir. Daha uzun geziler için birden fazla plan oluşturun.`);
            return;
        }

        setEndDate(selectedDate);
        setDays(daysDiff);
        setMarkedDates(buildRangeMarks(startDate, selectedDate));
    }, [startDate, endDate]);

    const validateStep = (key = stepKey) => {
        if (key === 'city' && !selectedCity) return 'Lütfen bir şehir seçin.';
        if (key === 'dates' && !startDate) return 'Lütfen takvimden tarih seçin.';
        if (key === 'places' && !autoSelect && selectedPlaces.length === 0) return 'Lütfen en az bir yer seçin ya da otomatik seçimi açın.';
        if (key === 'stay' && hasAccommodation && accommodationType === 'hotel' && !selectedHotel) {
            return 'Devam etmek için bir otel seçin veya konaklamayı günübirlik olarak işaretleyin.';
        }
        if (key === 'stay' && hasAccommodation && accommodationType === 'own' && !selectedOwnLocation) {
            return 'Devam etmek için kendi konumunuzu arayın veya haritadan seçin.';
        }
        return null;
    };

    const goToStep = (nextIndex) => {
        if (nextIndex === stepIndex && !decision) return;
        setDirection(nextIndex >= stepIndex ? 1 : -1);
        setDecision(null);
        setStepIndex(nextIndex);
    };

    /**
     * Adım çizelgesinden doğrudan bir adıma geçiş. Geri gitmek her zaman
     * serbesttir; ileri atlarken aradaki adımlar doğrulanır ve eksik olan ilk
     * adımda durulur.
     */
    const handleStepPress = (targetIndex) => {
        setError(null);
        if (targetIndex <= stepIndex) { goToStep(targetIndex); return; }
        for (let index = stepIndex; index < targetIndex; index += 1) {
            const validationError = validateStep(STEPS[index].key);
            if (validationError) {
                goToStep(index);
                setError(validationError);
                return;
            }
        }
        if (startDate && !endDate) setEndDate(startDate);
        goToStep(targetIndex);
    };

    const handleNext = () => {
        setError(null);
        const validationError = validateStep();
        if (validationError) { setError(validationError); return; }

        if (stepKey === 'dates' && startDate && !endDate) setEndDate(startDate);
        if (stepIndex < STEPS.length - 1) {
            goToStep(stepIndex + 1);
        } else {
            handleCreatePlan();
        }
    };

    const handleBack = () => {
        setError(null);
        if (decision) { setDirection(-1); setDecision(null); return; }
        if (stepIndex > 0) goToStep(stepIndex - 1);
        else navigation.goBack();
    };

    // Android geri tuşu planlayıcıdan çıkmak yerine bir önceki adıma döner
    useFocusEffect(useCallback(() => {
        const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
            if (planning) return true;
            if (decision || stepIndex > 0) { handleBack(); return true; }
            return false;
        });
        return () => subscription.remove();
    }, [decision, stepIndex, planning]));

    const getStartLocation = () => {
        const accommodation = hasAccommodation
            ? (accommodationType === 'own' ? selectedOwnLocation : selectedHotel)
            : null;
        if (accommodation?.latitude != null) return { accommodation, startLocation: { latitude: accommodation.latitude, longitude: accommodation.longitude } };
        if (accommodation?.lat != null) return { accommodation, startLocation: { latitude: accommodation.lat, longitude: accommodation.lng } };
        return { accommodation, startLocation: undefined };
    };

    /**
     * Planı hesaplar; kullanıcı kararı gereken bir durum varsa Karar adımını
     * açar, yoksa kaydeder. `overrides` karar adımındaki seçimleri (tempo,
     * gün sayısı, çıkarılan yer) state güncellenmesini beklemeden uygular.
     */
    const handleCreatePlan = async (overrides = {}) => {
        const placesToUse = overrides.places ?? (autoSelect ? places : selectedPlaces);
        const effectiveDays = overrides.days ?? Math.max(days, 1);
        const effectivePace = overrides.pace ?? pace;

        if (placesToUse.length === 0) { setError('Plan oluşturmak için en az bir yer gerekli.'); return; }
        if (!startDate) { setError('Lütfen başlangıç tarihi seçin.'); return; }
        if (!user?.id) { setError('Plan kaydetmek için giriş yapmalısınız.'); return; }

        setError(null);
        setPlanning(true);
        const startedAt = Date.now();
        try {
            const cityCenter = getCityCenter(selectedCity.name);
            const { accommodation, startLocation } = getStartLocation();
            const result = generateItinerary(placesToUse, effectiveDays, {
                cityLat: cityCenter.lat,
                cityLng: cityCenter.lng,
                startLocation,
                returnToHotel: Boolean(startLocation),
                selectionMode: autoSelect ? 'auto' : 'manual',
                transportMode,
                pace: effectivePace,
                startDate,
                acceptCompromise: Boolean(overrides.acceptCompromise),
            });

            const wait = MIN_PLANNING_ANIMATION_MS - (Date.now() - startedAt);
            if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));

            if (result.conflicts?.length) {
                setDirection(1);
                setDecision({ conflicts: result.conflicts });
                return;
            }
            if (result.stats.totalPlaces === 0) {
                setError('Seçilen yerlerle uygulanabilir bir program çıkarılamadı. Daha fazla gün veya farklı yerler deneyin.');
                return;
            }
            if (accommodation?.name && result.plan[0]?.tripMeta) {
                result.plan[0].tripMeta.accommodationName = accommodation.name;
            }
            const { data: saved, error: saveError } = await createItinerary({
                userId: user.id,
                cityId: selectedCity.id,
                days: effectiveDays,
                startDate,
                hasAccommodation,
                hasTransport: transportMode === 'driving',
                startLocationLat: startLocation?.latitude ?? null,
                startLocationLng: startLocation?.longitude ?? null,
                items: result.items,
                plan: result.plan,
            });
            if (saveError) {
                setError('Plan kaydedilemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.');
                return;
            }
            setDecision(null);
            navigation.replace('ItineraryDetail', { itineraryId: saved.id });
        } catch (err) {
            console.warn('Plan oluşturulamadı:', err?.message);
            setError('Plan oluşturulurken beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
        } finally {
            setPlanning(false);
        }
    };

    // ─── Karar adımı seçenekleri ─────────────────────────────────────────
    const handleIntensify = () => {
        setPace('intense');
        handleCreatePlan({ pace: 'intense' });
    };

    const handleAddDay = () => {
        const newDays = Math.max(days, 1) + 1;
        const newEnd = toLocalISODate(addDays(parseLocalDate(startDate), newDays - 1));
        setEndDate(newEnd);
        setDays(newDays);
        setMarkedDates(buildRangeMarks(startDate, newEnd));
        handleCreatePlan({ days: newDays });
    };

    const handleDrop = (placeId) => {
        const remaining = selectedPlaces.filter(place => String(place.id) !== String(placeId));
        setSelectedPlaces(remaining);
        handleCreatePlan({ places: remaining });
    };

    const currentStep = STEPS[stepIndex];
    const headerTitle = decision ? 'Kararını ver' : currentStep.title;
    const headerEyebrow = decision ? 'SON DOKUNUŞ' : `ADIM ${stepIndex + 1} / ${STEPS.length}`;
    const nextLabel = decision
        ? null
        : stepKey === 'review' ? 'Planı Oluştur' : stepKey === 'stay' ? 'Özeti Gör' : 'Devam';
    // Kısa kayma + solma: yay (spring) animasyonu adım değişiminde titreme yapıyordu
    const EnterAnimation = direction > 0 ? FadeInRight : FadeInLeft;
    const canGoBack = Boolean(decision) || stepIndex > 0;
    const contentKey = decision ? 'decision' : stepKey;

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <PlannerHeader
                steps={STEPS}
                stepIndex={decision ? STEPS.length - 1 : stepIndex}
                topInset={insets.top}
                onClose={() => navigation.goBack()}
                onStepPress={handleStepPress}
                title={headerTitle}
                eyebrow={headerEyebrow}
            />

            {error ? (
                <Animated.View entering={FadeInDown.duration(220)}>
                    <ErrorMessage message={error} style={styles.errorBox} />
                </Animated.View>
            ) : null}

            <ScrollView
                ref={scrollRef}
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {loading && (stepKey === 'city' || stepKey === 'places') ? (
                    <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
                ) : (
                    <Animated.View key={contentKey} entering={EnterAnimation.duration(240)}>
                        {decision ? (
                            <DecisionStep
                                conflicts={decision.conflicts}
                                canIntensify={pace !== 'intense'}
                                canAddDay={Math.max(days, 1) < MAX_TRIP_DAYS}
                                onAccept={() => handleCreatePlan({ acceptCompromise: true })}
                                onIntensify={handleIntensify}
                                onAddDay={handleAddDay}
                                onDrop={handleDrop}
                                busy={planning}
                            />
                        ) : (
                            <>
                                {stepKey === 'city' && (
                                    <StepCity cities={cities} selectedCity={selectedCity} onSelect={setSelectedCity} />
                                )}
                                {stepKey === 'dates' && (
                                    <StepDuration
                                        markedDates={markedDates}
                                        onDayPress={handleDayPress}
                                        startDate={startDate}
                                        endDate={endDate}
                                        days={days}
                                    />
                                )}
                                {stepKey === 'places' && (
                                    <StepPlaces
                                        places={places}
                                        selectedPlaces={selectedPlaces}
                                        autoSelect={autoSelect}
                                        onToggleAuto={setAutoSelect}
                                        onTogglePlace={togglePlace}
                                        days={Math.max(days, 1)}
                                        pace={pace}
                                    />
                                )}
                                {stepKey === 'travel' && (
                                    <StepTravel
                                        transportMode={transportMode}
                                        onChangeTransport={setTransportMode}
                                        pace={pace}
                                        onChangePace={setPace}
                                    />
                                )}
                                {stepKey === 'stay' && (
                                    <StepAccommodation
                                        hasAccommodation={hasAccommodation}
                                        onToggle={setHasAccommodation}
                                        accommodationType={accommodationType}
                                        onChangeType={setAccommodationType}
                                        hotels={hotels}
                                        selectedHotel={selectedHotel}
                                        onSelectHotel={setSelectedHotel}
                                        selectedOwnLocation={selectedOwnLocation}
                                        onSelectOwnLocation={setSelectedOwnLocation}
                                        navigation={navigation}
                                        loadingHotels={loadingHotels}
                                        selectedCity={selectedCity}
                                    />
                                )}
                                {stepKey === 'review' && (
                                    <StepReview
                                        selectedCity={selectedCity}
                                        days={days}
                                        startDate={startDate}
                                        endDate={endDate || startDate}
                                        selectedPlaces={autoSelect ? places : selectedPlaces}
                                        autoSelect={autoSelect}
                                        hasAccommodation={hasAccommodation}
                                        accommodation={accommodationType === 'own' ? selectedOwnLocation : selectedHotel}
                                        transportMode={transportMode}
                                        pace={pace}
                                        onEditStep={(key) => goToStep(STEPS.findIndex(step => step.key === key))}
                                    />
                                )}
                            </>
                        )}
                    </Animated.View>
                )}
            </ScrollView>

            {!decision ? (
                <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, SPACING.sm) + SPACING.xs }]}>
                    {canGoBack ? (
                        <PressableScale
                            onPress={handleBack}
                            disabled={planning}
                            style={styles.backCircle}
                            accessibilityRole="button"
                            accessibilityLabel="Önceki adım"
                        >
                            <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
                        </PressableScale>
                    ) : null}
                    <PressableScale onPress={handleNext} disabled={loading || planning} style={styles.nextBtnWrapper}>
                        <LinearGradient
                            colors={COLORS.gradients.primary}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.nextBtn}
                        >
                            <Text style={styles.nextBtnText}>{nextLabel}</Text>
                            <Ionicons
                                name={stepKey === 'review' ? 'sparkles' : 'arrow-forward'}
                                size={18}
                                color="#fff"
                                style={{ marginLeft: 6 }}
                            />
                        </LinearGradient>
                    </PressableScale>
                </View>
            ) : (
                <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, SPACING.sm) + SPACING.xs }]}>
                    <PressableScale onPress={handleBack} disabled={planning} style={styles.backPill}>
                        <Ionicons name="arrow-back" size={18} color={COLORS.textPrimary} />
                        <Text style={styles.backPillText}>Seçimlere dön</Text>
                    </PressableScale>
                </View>
            )}

            <PlanningOverlay visible={planning} cityName={selectedCity?.name} />
        </KeyboardAvoidingView>
    );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StepReview({ selectedCity, days, startDate, endDate, selectedPlaces, autoSelect, hasAccommodation, accommodation, transportMode, pace, onEditStep }) {
    const tripDate = startDate && endDate
        ? (startDate === endDate ? formatDayMonth(startDate) : `${formatDayMonth(startDate)} – ${formatDayMonth(endDate)}`)
        : 'Tarih seçilmedi';
    const transport = getTransportProfile(transportMode);
    const paceProfile = getPaceProfile(pace);
    const tripDays = days || 1;
    const capacity = tripDays * paceProfile.maxStopsPerDay;
    const stopCount = autoSelect ? Math.min(selectedPlaces.length, capacity) : selectedPlaces.length;
    const cityImage = selectedCity ? getCityImages(selectedCity.name, selectedCity.region) : null;

    const rows = [
        { key: 'dates', icon: 'calendar-outline', label: 'Tarihler', value: `${tripDate} · ${tripDays} gün` },
        { key: 'places', icon: 'images-outline', label: 'Yerler', value: autoSelect ? 'En popüler yerler otomatik seçilecek' : `${selectedPlaces.length} yer seçildi` },
        { key: 'travel', icon: transport.icon, label: 'Ulaşım ve tempo', value: `${transport.label} · ${paceProfile.label} (${paceProfile.startTime} başlangıç)` },
        { key: 'stay', icon: 'bed-outline', label: 'Konaklama', value: !hasAccommodation ? 'Günübirlik gezi' : accommodation?.name || 'Konaklama seçilmedi' },
    ];

    return (
        <View>
            <View style={styles.reviewHeroCard}>
                <SmartImage uri={selectedCity?.image_url || cityImage?.hero || cityImage?.card} fallbackUri={cityImage?.fallbackHero || cityImage?.fallbackCard} style={StyleSheet.absoluteFill} contentFit="cover" />
                <LinearGradient colors={COLORS.gradients.heroOverlay} style={StyleSheet.absoluteFill} />
                <View style={styles.reviewHeroBody}>
                    <Text style={styles.reviewHeroEyebrow}>GEZİ ÖZETİN</Text>
                    <Text style={styles.reviewHeroCityLarge}>{selectedCity?.name || 'Şehir'}</Text>
                    <Text style={styles.reviewHeroMetaLight}>{tripDays} gün · {autoSelect ? `~${stopCount}` : stopCount} durak</Text>
                </View>
            </View>

            <View style={styles.summaryCard}>
                {rows.map(({ key: stepKey, ...row }, index) => (
                    <Animated.View key={stepKey} entering={FadeInDown.delay(80 + index * 70)}>
                        <ReviewRow {...row} last={index === rows.length - 1} onEdit={() => onEditStep(stepKey)} />
                    </Animated.View>
                ))}
            </View>

            <Animated.View entering={FadeInDown.delay(400)} style={styles.reviewNotice}>
                <Ionicons name="sparkles-outline" size={18} color={COLORS.primary} />
                <Text style={styles.reviewNoticeText}>
                    Yakın yerler aynı güne toplanır, tüm gün süren yerler (piknik, milli park…) kendi gününü alır. Bir yer sığmazsa sana sorarım.
                </Text>
            </Animated.View>
        </View>
    );
}

function ReviewRow({ icon, label, value, last, onEdit }) {
    return (
        <TouchableOpacity style={[styles.reviewRow, last && { marginBottom: 0 }]} onPress={onEdit} activeOpacity={0.7} accessibilityLabel={`${label}: ${value}. Düzenle`}>
            <View style={styles.reviewRowIcon}><Ionicons name={icon} size={17} color={COLORS.primary} /></View>
            <View style={styles.reviewRowText}>
                <Text style={styles.reviewRowLabel}>{label}</Text>
                <Text style={styles.reviewRowValue}>{value}</Text>
            </View>
            <Ionicons name="create-outline" size={17} color={COLORS.textLight} />
        </TouchableOpacity>
    );
}

function StepCity({ cities, selectedCity, onSelect }) {
    const [query, setQuery] = useState('');
    const normalizedQuery = normalizeSearch(query);
    const visibleCities = useMemo(() => (normalizedQuery
        ? cities.filter(city => normalizeSearch(city.name).includes(normalizedQuery)
            || normalizeSearch(city.region).includes(normalizedQuery))
        : cities), [cities, normalizedQuery]);

    return (
        <View>
            <Text style={styles.stepSubtitle}>81 il arasından keşfetmek istediğin şehri seç.</Text>
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={COLORS.textSecondary} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Şehir veya bölge ara..."
                    placeholderTextColor={COLORS.textLight}
                    value={query}
                    onChangeText={setQuery}
                    autoCorrect={false}
                    returnKeyType="search"
                />
                {query.length > 0 && (
                    <TouchableOpacity onPress={() => setQuery('')} accessibilityLabel="Aramayı temizle">
                        <Ionicons name="close-circle" size={20} color={COLORS.textLight} />
                    </TouchableOpacity>
                )}
            </View>
            {visibleCities.length === 0 && (
                <Text style={styles.emptySearchText}>"{query}" ile eşleşen şehir bulunamadı.</Text>
            )}
            <View style={styles.cityGrid}>
                {visibleCities.map((city, index) => {
                    const isSelected = selectedCity?.id === city.id;
                    const images = getCityImages(city.name, city.region);
                    return (
                        <Animated.View key={city.id} entering={FadeInDown.delay(Math.min(index, 8) * 40)} style={styles.cityCardWrap}>
                            <PressableScale
                                style={[styles.cityPhotoCard, isSelected && styles.cityPhotoCardSelected]}
                                onPress={() => onSelect(city)}
                                accessibilityRole="button"
                                accessibilityState={{ selected: isSelected }}
                                accessibilityLabel={city.name}
                            >
                                <SmartImage thumbnail uri={city.image_url || images.card} fallbackUri={images?.fallbackCard || images?.card} style={StyleSheet.absoluteFill} contentFit="cover" />
                                <LinearGradient colors={COLORS.gradients.cardOverlay} style={StyleSheet.absoluteFill} />
                                {isSelected && (
                                    <View style={styles.cityCardCheckmark}>
                                        <Ionicons name="checkmark-circle" size={24} color="#fff" />
                                    </View>
                                )}
                                <View style={styles.cityPhotoBody}>
                                    <Text style={styles.cityPhotoName} numberOfLines={1}>{city.name}</Text>
                                    {city.region ? <Text style={styles.cityPhotoRegion} numberOfLines={1}>{city.region}</Text> : null}
                                </View>
                            </PressableScale>
                        </Animated.View>
                    );
                })}
            </View>
        </View>
    );
}

/**
 * Seçilen yerlerin süresini gün kapasitesiyle karşılaştıran canlı gösterge.
 * Kullanıcı daha seçim yaparken "bu kadar yer 2 güne sığmaz" bilgisini görür.
 */
function CapacityMeter({ selectedPlaces, days, pace }) {
    const paceProfile = getPaceProfile(pace);
    const dayMinutes = paceProfile.dayEndHour * 60 - (Number(paceProfile.startTime.split(':')[0]) * 60 + Number(paceProfile.startTime.split(':')[1])) - paceProfile.lunchMinutes;
    const normalized = selectedPlaces.map(place => ({
        ...place,
        latitude: place.lat ?? 0,
        longitude: place.lng ?? 0,
        duration_minutes: place.duration_minutes ?? Math.round((place.avg_duration ?? estimateDuration(place.name || '', place.category)) * 60),
    }));
    const needed = normalized.length ? estimateGroupMinutes(normalized, 'transit') : 0;
    const available = dayMinutes * days;
    const ratio = available > 0 ? needed / available : 0;
    const state = ratio > 1 ? 'over' : ratio > 0.8 ? 'tight' : 'ok';
    const color = state === 'over' ? COLORS.error : state === 'tight' ? COLORS.warning : COLORS.primary;
    const neededHours = Math.round((needed / 60) * 10) / 10;

    return (
        <View style={styles.capacityCard}>
            <View style={styles.capacityHeader}>
                <Text style={styles.capacityTitle}>{selectedPlaces.length} yer · ~{neededHours} saat</Text>
                <Text style={[styles.capacityState, { color }]}>
                    {state === 'over' ? `${days} güne sığmayabilir` : state === 'tight' ? 'Dolu bir program' : 'Rahat sığar'}
                </Text>
            </View>
            <View style={styles.capacityTrack}>
                <View style={[styles.capacityFill, { width: `${Math.min(ratio, 1) * 100}%`, backgroundColor: color }]} />
            </View>
            <Text style={styles.capacityHint}>
                {days} gün · {paceProfile.label.toLocaleLowerCase('tr-TR')} tempo için günde ~{Math.round(dayMinutes / 60)} saat gezi zamanı var.
            </Text>
        </View>
    );
}

function StepPlaces({ places, selectedPlaces, autoSelect, onToggleAuto, onTogglePlace, days, pace }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');

    const categories = useMemo(() => ['all', ...new Set(places.map(p => p.category).filter(Boolean))], [places]);

    const filteredPlaces = places.filter(place => {
        const matchesSearch = normalizeSearch(place.name).includes(normalizeSearch(searchQuery));
        const matchesCategory = selectedCategory === 'all' || place.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <View>
            <View style={styles.modeSwitch}>
                {[
                    { value: true, icon: 'flash-outline', title: 'Benim için seç', description: 'Popüler yerler sürene göre seçilir' },
                    { value: false, icon: 'hand-left-outline', title: 'Kendim seçeceğim', description: 'Gitmek istediğin yerleri işaretle' },
                ].map(option => {
                    const active = autoSelect === option.value;
                    return (
                        <PressableScale
                            key={String(option.value)}
                            style={[styles.modeCard, active && styles.modeCardActive]}
                            onPress={() => onToggleAuto(option.value)}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: active }}
                        >
                            <View style={[styles.optionIcon, active && styles.optionIconActive]}>
                                <Ionicons name={option.icon} size={18} color={active ? '#fff' : COLORS.primary} />
                            </View>
                            <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>{option.title}</Text>
                            <Text style={styles.optionDescription}>{option.description}</Text>
                        </PressableScale>
                    );
                })}
            </View>

            {autoSelect ? (
                <Animated.View entering={FadeInDown} style={styles.reviewNotice}>
                    <Ionicons name="sparkles-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.reviewNoticeText}>
                        {places.length} yer arasından, {days} günlük gezine sığacak en popüler ve birbirine yakın yerleri seçeceğim.
                    </Text>
                </Animated.View>
            ) : (
                <Animated.View entering={FadeInDown}>
                    {selectedPlaces.length > 0 && <CapacityMeter selectedPlaces={selectedPlaces} days={days} pace={pace} />}

                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color={COLORS.textSecondary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Yer ara..."
                            placeholderTextColor={COLORS.textLight}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={20} color={COLORS.textLight} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.categoryFilters}
                    >
                        {categories.map(cat => {
                            const isActive = selectedCategory === cat;
                            return (
                                <TouchableOpacity
                                    key={cat}
                                    style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                                    onPress={() => setSelectedCategory(cat)}
                                >
                                    <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                                        {cat === 'all' ? 'Tümü' : cat}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    <Text style={styles.placesHint}>Bilgi için karta uzun bas.</Text>

                    <View style={styles.placeGrid}>
                        {filteredPlaces.map(place => (
                            <PlaceSelectionCard
                                key={place.id}
                                place={place}
                                selected={!!selectedPlaces.find(p => p.id === place.id)}
                                onPress={() => onTogglePlace(place)}
                            />
                        ))}
                    </View>
                </Animated.View>
            )}
        </View>
    );
}

function StepDuration({ markedDates, onDayPress, startDate, endDate, days }) {
    const today = toLocalISODate();

    return (
        <View>
            <Text style={styles.stepSubtitle}>Takvimde önce gidiş, sonra dönüş gününe dokun.</Text>

            {days > 0 && (
                <Animated.View entering={FadeInDown} style={styles.durationSummary}>
                    <View style={styles.durationBadge}>
                        <Ionicons name="calendar" size={20} color={COLORS.primary} />
                        <Text style={styles.durationText}>{days} gün</Text>
                    </View>
                    {startDate && (
                        <Text style={styles.dateRangeText}>
                            {formatDayMonth(startDate)}{endDate && endDate !== startDate ? ` – ${formatDayMonth(endDate)}` : ''}
                        </Text>
                    )}
                </Animated.View>
            )}

            <View style={styles.calendarContainer}>
                <Calendar
                    current={startDate || today}
                    minDate={today}
                    onDayPress={onDayPress}
                    markingType={'period'}
                    markedDates={markedDates}
                    firstDay={1}
                    theme={{
                        backgroundColor: COLORS.surface,
                        calendarBackground: COLORS.surface,
                        textSectionTitleColor: COLORS.textSecondary,
                        selectedDayBackgroundColor: COLORS.primary,
                        selectedDayTextColor: '#fff',
                        todayTextColor: COLORS.earth,
                        dayTextColor: COLORS.textPrimary,
                        textDisabledColor: COLORS.textLight,
                        dotColor: COLORS.primary,
                        selectedDotColor: '#fff',
                        arrowColor: COLORS.primary,
                        monthTextColor: COLORS.textPrimary,
                        indicatorColor: COLORS.primary,
                        textDayFontFamily: FONTS.body,
                        textMonthFontFamily: FONTS.bodyBold,
                        textDayHeaderFontFamily: FONTS.bodyMedium,
                        textDayFontSize: FONT_SIZES.md,
                        textMonthFontSize: FONT_SIZES.lg,
                        textDayHeaderFontSize: FONT_SIZES.sm,
                    }}
                    style={styles.calendar}
                />
            </View>

            <View style={styles.calendarHint}>
                <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
                <Text style={styles.calendarHintText}>
                    Tek günlük gezi için yalnızca bir güne dokunman yeterli. En fazla {MAX_TRIP_DAYS} gün.
                </Text>
            </View>
        </View>
    );
}

function StepTravel({ transportMode, onChangeTransport, pace, onChangePace }) {
    return (
        <View>
            <Text style={styles.stepSubtitle}>Yol süreleri ve günlük program bu seçimlere göre hesaplanır.</Text>

            <Text style={styles.optionSectionTitle}>Şehirde nasıl dolaşacaksın?</Text>
            <OptionGroup options={Object.values(TRANSPORT_PROFILES)} value={transportMode} onChange={onChangeTransport} />

            <Text style={styles.optionSectionTitle}>Gezi temponu seç</Text>
            <OptionGroup options={Object.values(PACE_PROFILES)} value={pace} onChange={onChangePace} />

            <View style={[styles.reviewNotice, { marginTop: SPACING.lg }]}>
                <Ionicons name="time-outline" size={18} color={COLORS.primary} />
                <Text style={styles.reviewNoticeText}>
                    {getPaceProfile(pace).label} tempoda günler {getPaceProfile(pace).startTime}'da başlar, en geç {formatHour(getPaceProfile(pace).dayEndHour)}'da biter ve öğle arası eklenir.
                </Text>
            </View>
        </View>
    );
}

const formatHour = (hour) => `${String(Math.floor(hour)).padStart(2, '0')}:${String(Math.round((hour % 1) * 60)).padStart(2, '0')}`;

function OptionGroup({ options, value, onChange }) {
    return (
        <View style={styles.optionGroup}>
            {options.map(option => {
                const isActive = option.key === value;
                return (
                    <PressableScale
                        key={option.key}
                        style={[styles.optionCard, isActive && styles.optionCardActive]}
                        onPress={() => onChange(option.key)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isActive }}
                        accessibilityLabel={`${option.label}. ${option.description}`}
                    >
                        <View style={[styles.optionIcon, isActive && styles.optionIconActive]}>
                            <Ionicons name={option.icon} size={20} color={isActive ? '#fff' : COLORS.primary} />
                        </View>
                        <Text style={[styles.optionLabel, isActive && styles.optionLabelActive]}>{option.label}</Text>
                        <Text style={styles.optionDescription} numberOfLines={3}>{option.description}</Text>
                        {isActive && (
                            <Animated.View entering={FadeInDown.duration(200)} style={styles.optionCheck}>
                                <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
                            </Animated.View>
                        )}
                    </PressableScale>
                );
            })}
        </View>
    );
}

function StepAccommodation({ 
    hasAccommodation, onToggle, accommodationType, onChangeType,
    hotels, selectedHotel, onSelectHotel, loadingHotels,
    selectedCity, selectedOwnLocation, onSelectOwnLocation, navigation
}) {
    const changeAccommodationType = (type) => {
        onChangeType(type);
        if (type === 'hotel') onSelectOwnLocation(null);
        if (type === 'own') onSelectHotel(null);
    };

    return (
        <View>
            <Text style={styles.stepSubtitle}>Rotalar her gün konaklama noktandan başlar ve oraya döner.</Text>

            <View style={styles.toggleCard}>
                <View style={styles.toggleCardLeft}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="bed" size={24} color={COLORS.primary} />
                    </View>
                    <View style={styles.toggleCardText}>
                        <Text style={styles.toggleCardTitle}>Konaklama gerekli</Text>
                        <Text style={styles.toggleCardSubtitle}>
                            {hasAccommodation ? 'Konaklama eklenecek' : 'Günübirlik gezi'}
                        </Text>
                    </View>
                </View>
                <Switch
                    value={hasAccommodation}
                    onValueChange={onToggle}
                    trackColor={{ false: COLORS.border, true: COLORS.primaryMuted }}
                    thumbColor={hasAccommodation ? COLORS.primary : COLORS.textLight}
                    ios_backgroundColor={COLORS.border}
                />
            </View>

            {hasAccommodation && (
                <View style={styles.accommodationSection}>
                    {/* Tip Seçimi */}
                    <View style={styles.accommodationTypeSelector}>
                        <TouchableOpacity
                            style={[
                                styles.typeButton,
                                accommodationType === 'hotel' && styles.typeButtonActive
                            ]}
                            onPress={() => changeAccommodationType('hotel')}
                        >
                            <Ionicons 
                                name="business" 
                                size={20} 
                                color={accommodationType === 'hotel' ? '#fff' : COLORS.textSecondary} 
                            />
                            <Text style={[
                                styles.typeButtonText,
                                accommodationType === 'hotel' && styles.typeButtonTextActive
                            ]}>
                                Otel Öner
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.typeButton,
                                accommodationType === 'own' && styles.typeButtonActive
                            ]}
                            onPress={() => changeAccommodationType('own')}
                        >
                            <Ionicons 
                                name="location" 
                                size={20} 
                                color={accommodationType === 'own' ? '#fff' : COLORS.textSecondary} 
                            />
                            <Text style={[
                                styles.typeButtonText,
                                accommodationType === 'own' && styles.typeButtonTextActive
                            ]}>
                                Kendi Yerim
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Otel Listesi */}
                    {accommodationType === 'own' && (
                        <View style={styles.ownLocationSection}>
                            <HotelSearch onSelectLocation={onSelectOwnLocation} />
                            {selectedOwnLocation && (
                                <View style={styles.selectedLocationCard}>
                                    <View style={styles.selectedLocationIcon}><Ionicons name="location" size={19} color="#fff" /></View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.selectedLocationName} numberOfLines={1}>{selectedOwnLocation.name}</Text>
                                        <Text style={styles.selectedLocationAddress} numberOfLines={2}>{selectedOwnLocation.address || 'Haritadan seçilen konum'}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => onSelectOwnLocation(null)} accessibilityRole="button" accessibilityLabel="Seçilen konumu kaldır">
                                        <Ionicons name="close-circle" size={23} color={COLORS.textLight} />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    )}
                    {accommodationType === 'hotel' && (
                        <View style={styles.hotelList}>
                            {loadingHotels ? (
                                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: SPACING.xl }} />
                            ) : (
                                <>
                                    <View style={styles.hotelListHeader}>
                                        <Text style={styles.hotelListTitle}>Önerilen Oteller</Text>
                                        <Text style={styles.hotelListSubtitle}>Gezilecek yerlere yakınlığa göre sıralandı</Text>
                                    </View>
                                    {hotels.map(hotel => {
                                        const isSelected = selectedHotel?.id === hotel.id;
                                        const iconName = hotel.isMapsLink ? 'search' : hotel.type === 'Butik Otel' ? 'diamond' : hotel.type === 'Apart Otel' ? 'home' : hotel.type === 'Pansiyon' ? 'bed' : 'business';
                                        return (
                                            <TouchableOpacity
                                                key={hotel.id}
                                                style={[styles.hotelCard, isSelected && styles.hotelCardSelected]}
                                                onPress={() => {
                                                    if (hotel.isMapsLink) {
                                                        Linking.openURL(hotel.mapsUrl);
                                                    } else {
                                                        onSelectHotel(isSelected ? null : hotel);
                                                    }
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                {/* Sol: ikon */}
                                                <View style={[styles.hotelIcon, isSelected && styles.hotelIconSelected]}>
                                                    <Ionicons name={iconName} size={20} color={isSelected ? '#fff' : COLORS.primary} />
                                                </View>

                                                {/* Orta: bilgi */}
                                                <View style={styles.hotelInfo}>
                                                    <View style={styles.hotelNameRow}>
                                                        <Text style={styles.hotelName} numberOfLines={1}>{hotel.name}</Text>
                                                        {isSelected && (
                                                            <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
                                                        )}
                                                    </View>

                                                    <View style={styles.hotelMeta}>
                                                        <View style={styles.hotelTypeBadge}>
                                                            <Text style={styles.hotelType}>{hotel.type}</Text>
                                                        </View>
                                                        {hotel.stars > 0 && (
                                                            <View style={styles.hotelStars}>
                                                                {[...Array(Math.min(hotel.stars, 5))].map((_, i) => (
                                                                    <Ionicons key={i} name="star" size={11} color="#B8893A" />
                                                                ))}
                                                            </View>
                                                        )}
                                                        <Text style={styles.hotelPrice}>{hotel.priceRange}</Text>
                                                    </View>

                                                    <Text style={styles.hotelDescription} numberOfLines={1}>
                                                        {hotel.description}
                                                    </Text>

                                                    {/* Amenities */}
                                                    {hotel.amenities?.length > 0 && (
                                                        <View style={styles.hotelAmenities}>
                                                            {hotel.amenities.slice(0, 3).map((a, i) => (
                                                                <View key={i} style={styles.hotelAmenityChip}>
                                                                    <Text style={styles.hotelAmenityText}>{a}</Text>
                                                                </View>
                                                            ))}
                                                        </View>
                                                    )}
                                                </View>

                                                {/* Sağ: mesafe + harita */}
                                                <View style={styles.hotelRight}>
                                                    {hotel.distanceKm != null && (
                                                        <View style={styles.hotelDistanceBadge}>
                                                            <Ionicons name="walk-outline" size={11} color={COLORS.primary} />
                                                            <Text style={styles.hotelDistanceText}>{hotel.distanceKm} km</Text>
                                                        </View>
                                                    )}
                                                    {hotel.lat && hotel.lng && (
                                                        <TouchableOpacity
                                                            style={styles.hotelMapBtn}
                                                            onPress={() => {
                                                                const url = `https://www.google.com/maps/search/?api=1&query=${hotel.lat},${hotel.lng}`;
                                                                Linking.openURL(url);
                                                            }}
                                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                        >
                                                            <Ionicons name="map-outline" size={16} color={COLORS.primary} />
                                                        </TouchableOpacity>
                                                    )}
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </>
                            )}
                        </View>
                    )}

                    {/* Uygulama içi harita seçici */}
                    {accommodationType === 'own' && (
                        <TouchableOpacity 
                            style={styles.mapSelectButton}
                            onPress={() => navigation.navigate('MapScreen', {
                                city: selectedCity,
                                selectionMode: true,
                                onLocationSelect: onSelectOwnLocation,
                            })}
                            activeOpacity={0.7}
                        >
                            <LinearGradient
                                colors={COLORS.gradients.primary}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.mapSelectGradient}
                            >
                                <View style={styles.mapSelectContent}>
                                    <Ionicons name="location" size={28} color="#fff" />
                                    <View style={styles.mapSelectTextContainer}>
                                        <Text style={styles.mapSelectTitle}>
                                            Haritadan Konum Seç
                                        </Text>
                                        <Text style={styles.mapSelectSubtitle}>
                                            Haritaya dokunun, konumu doğrulayın ve planınıza ekleyin
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.8)" />
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    )}
                </View>
            )}

        </View>
    );
}


// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = createThemedStyles(() => ({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    // Compact wizard header: the native stack header is intentionally hidden so
    // the progress state and page title do not consume two separate rows.
    wizardHeader: {
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.sm,
        paddingBottom: SPACING.sm,
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    wizardBackButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
    },
    wizardHeaderBody: { flex: 1 },
    wizardEyebrow: { fontFamily: FONTS.bodyBold, fontSize: 10, letterSpacing: 0.8, color: COLORS.primary },
    wizardTitle: { fontFamily: FONTS.heading, fontSize: FONT_SIZES.lg, color: COLORS.textPrimary, marginTop: 1 },
    wizardHeaderSpacer: { width: 36 },
    reviewHeaderIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.xl,
        paddingBottom: SPACING.sm,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    closeBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontFamily: FONTS.bodyBold,
        fontSize: FONT_SIZES.lg,
        color: COLORS.textPrimary,
    },

    // Step indicator
    stepIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        paddingTop: SPACING.xs,
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stepDot: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.surface,
    },
    stepDotActive: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primary,
    },
    stepDotDone: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primary,
    },
    stepDotInner: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.border,
    },
    stepDotInnerActive: {
        backgroundColor: COLORS.surface,
    },
    stepLabel: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textLight,
        marginLeft: 3,
        marginRight: 3,
    },
    stepLabelActive: {
        color: COLORS.primary,
        fontFamily: FONTS.bodyMedium,
    },
    stepLine: {
        flex: 1,
        maxWidth: 34,
        height: 2,
        backgroundColor: COLORS.border,
        marginHorizontal: 2,
    },
    stepLineDone: {
        backgroundColor: COLORS.primary,
    },

    // Fotoğraflı şehir kartları
    cityCardWrap: { width: '48%' },
    cityPhotoCard: {
        height: 118,
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
        backgroundColor: COLORS.surfaceAlt,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    cityPhotoCardSelected: { borderColor: COLORS.primary },
    cityPhotoBody: { position: 'absolute', left: SPACING.sm + 2, right: SPACING.sm, bottom: SPACING.sm },
    cityPhotoName: { fontFamily: FONTS.bodyBold, fontSize: FONT_SIZES.lg, color: '#fff' },
    cityPhotoRegion: { fontFamily: FONTS.body, fontSize: FONT_SIZES.xs, color: 'rgba(255,255,255,0.85)', marginTop: 1 },

    // Özet hero
    reviewHeroCard: { height: 170, borderRadius: BORDER_RADIUS.xl, overflow: 'hidden', marginBottom: SPACING.md, backgroundColor: COLORS.surfaceAlt },
    reviewHeroBody: { position: 'absolute', left: SPACING.md, right: SPACING.md, bottom: SPACING.md },
    reviewHeroEyebrow: { fontFamily: FONTS.bodyBold, fontSize: 10, letterSpacing: 1.5, color: 'rgba(255,255,255,0.85)' },
    reviewHeroCityLarge: { fontFamily: FONTS.heading, fontSize: FONT_SIZES.display, color: '#fff', marginTop: 2 },
    reviewHeroMetaLight: { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.sm, color: 'rgba(255,255,255,0.9)' },

    // Yer seçimi modu ve kapasite
    modeSwitch: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
    modeCard: {
        flex: 1, backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border,
        padding: SPACING.sm + 2,
    },
    modeCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryMuted },
    capacityCard: {
        backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1, borderColor: COLORS.border,
        padding: SPACING.md, marginBottom: SPACING.md,
    },
    capacityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    capacityTitle: { fontFamily: FONTS.bodyBold, fontSize: FONT_SIZES.sm, color: COLORS.textPrimary },
    capacityState: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.xs },
    capacityTrack: { height: 6, borderRadius: 3, backgroundColor: COLORS.surfaceAlt, marginTop: SPACING.sm, overflow: 'hidden' },
    capacityFill: { height: '100%', borderRadius: 3 },
    capacityHint: { fontFamily: FONTS.body, fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 6 },
    placesHint: { fontFamily: FONTS.body, fontSize: FONT_SIZES.xs, color: COLORS.textLight, marginBottom: SPACING.sm },
    optionCheck: { position: 'absolute', top: 8, right: 8 },

    // Ulaşım / tempo seçimi
    optionSectionTitle: {
        fontFamily: FONTS.bodyBold,
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        marginTop: SPACING.lg,
        marginBottom: SPACING.sm,
    },
    optionGroup: { flexDirection: 'row', gap: SPACING.sm },
    optionCard: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        padding: SPACING.sm,
        alignItems: 'flex-start',
        minHeight: 112,
    },
    optionCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryMuted },
    optionIcon: {
        width: 34, height: 34, borderRadius: 17,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: COLORS.primaryMuted, marginBottom: SPACING.xs,
    },
    optionIconActive: { backgroundColor: COLORS.primary },
    optionLabel: { fontFamily: FONTS.bodyBold, fontSize: FONT_SIZES.sm, color: COLORS.textPrimary },
    optionLabelActive: { color: COLORS.primary },
    optionDescription: { fontFamily: FONTS.body, fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2, lineHeight: 15 },
    emptySearchText: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginVertical: SPACING.lg,
    },

    // Content
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: SPACING.md,
        paddingBottom: SPACING.xl,
    },
    errorBox: {
        marginHorizontal: SPACING.md,
        marginTop: SPACING.sm,
    },

    // Step title
    stepTitle: {
        fontFamily: FONTS.heading,
        fontSize: FONT_SIZES.xxl,
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
        letterSpacing: -0.5,
    },
    stepSubtitle: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        marginBottom: SPACING.lg,
        lineHeight: 22,
    },

    // City grid
    cityGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: SPACING.sm + 4,
    },
    cityCard: {
        width: '47%',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        borderWidth: 2,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        position: 'relative',
        minHeight: 100,
        justifyContent: 'center',
    },
    cityCardSelected: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryMuted,
        shadowColor: COLORS.primary,
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 6,
    },
    cityCardCheckmark: {
        position: 'absolute',
        top: SPACING.sm,
        right: SPACING.sm,
    },
    cityName: {
        fontFamily: FONTS.bodyBold,
        fontSize: FONT_SIZES.lg,
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    cityNameSelected: {
        color: COLORS.primary,
    },
    cityRegion: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textLight,
    },
    cityRegionSelected: {
        color: COLORS.primaryDark,
    },

    // Auto row
    placesIntro: {
        flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
        marginBottom: SPACING.md, paddingHorizontal: SPACING.xs,
    },
    placesIntroText: { flex: 1, fontFamily: FONTS.body, fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, lineHeight: 19 },
    autoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    autoRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    autoLabel: {
        fontFamily: FONTS.bodyMedium,
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
    },

    // Info card
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primaryMuted,
        borderRadius: BORDER_RADIUS.sm,
        padding: SPACING.sm,
        marginTop: SPACING.xs,
        gap: SPACING.xs,
    },
    infoText: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.sm,
        color: COLORS.primary,
        marginLeft: SPACING.xs,
    },

    // Places
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: SPACING.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        paddingVertical: 6,
    },
    categoryFilters: {
        paddingVertical: SPACING.sm,
        gap: SPACING.sm,
        marginBottom: SPACING.md,
    },
    categoryChip: {
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.surface,
        borderWidth: 1.5,
        borderColor: COLORS.border,
    },
    categoryChipActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    categoryChipText: {
        fontFamily: FONTS.bodyMedium,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        textTransform: 'capitalize',
    },
    categoryChipTextActive: {
        color: '#fff',
        fontFamily: FONTS.bodyBold,
    },
    selectedCountBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        backgroundColor: COLORS.primaryMuted,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.full,
        alignSelf: 'flex-start',
        marginBottom: SPACING.md,
    },
    selectedCount: {
        fontFamily: FONTS.bodyBold,
        fontSize: FONT_SIZES.sm,
        color: COLORS.primary,
    },
    placeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    placeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    placeInfo: {
        flex: 1,
    },
    placeName: {
        fontFamily: FONTS.bodyMedium,
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    placeMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    categoryBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: BORDER_RADIUS.full,
    },
    categoryText: {
        fontFamily: FONTS.bodyMedium,
        fontSize: FONT_SIZES.xs,
    },
    durationText: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textLight,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: SPACING.sm,
    },
    checkboxChecked: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },

    // Duration - Calendar
    durationSummary: {
        backgroundColor: COLORS.primaryMuted,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    durationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    durationText: {
        fontFamily: FONTS.bodyBold,
        fontSize: FONT_SIZES.xl,
        color: COLORS.primary,
    },
    dateRangeText: {
        fontFamily: FONTS.bodyMedium,
        fontSize: FONT_SIZES.sm,
        color: COLORS.primary,
    },
    calendarContainer: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
        marginBottom: SPACING.md,
    },
    calendar: {
        borderRadius: BORDER_RADIUS.xl,
    },
    calendarHint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        backgroundColor: COLORS.surface,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    calendarHintText: {
        flex: 1,
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        lineHeight: 20,
    },
    daysSelector: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
    daysSelectorHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    sliderLabel: {
        fontFamily: FONTS.bodyMedium,
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
    },
    daysDisplay: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    daysNumber: {
        fontFamily: FONTS.heading,
        fontSize: 32,
        color: COLORS.primary,
    },
    daysText: {
        fontFamily: FONTS.bodyMedium,
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
    },
    daysButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginBottom: SPACING.sm,
    },
    dayAdjustBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primaryMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayAdjustBtnDisabled: {
        backgroundColor: COLORS.border,
        opacity: 0.5,
    },
    daysRange: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.xs,
        justifyContent: 'center',
    },
    quickDayBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    quickDayBtnActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    quickDayText: {
        fontFamily: FONTS.bodyMedium,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    quickDayTextActive: {
        color: '#fff',
        fontFamily: FONTS.bodySemiBold,
    },
    daysLimits: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    daysLimitText: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textLight,
    },

    // Date range
    sectionLabel: {
        fontFamily: FONTS.bodyMedium,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        marginTop: SPACING.lg,
        marginBottom: SPACING.sm,
    },
    dateRangeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginTop: SPACING.sm,
    },
    dateCard: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    dateCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },
    dateCardLabel: {
        fontFamily: FONTS.bodyMedium,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
    },
    dateCardDate: {
        fontFamily: FONTS.bodyBold,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
    },
    dateAdjustRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.md,
        marginTop: SPACING.sm,
    },
    dateAdjustBtn: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dateInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: SPACING.sm,
    },
    dateInfoText: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textLight,
    },
    dateArrow: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Accommodation
    toggleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    toggleCardCompact: { padding: SPACING.md, marginBottom: SPACING.sm },
    toggleCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: SPACING.md,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.primaryMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconCircleCompact: { width: 40, height: 40, borderRadius: 20 },
    toggleCardText: {
        flex: 1,
    },
    toggleCardTitle: {
        fontFamily: FONTS.bodyBold,
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    toggleCardSubtitle: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    accommodationSection: {
        marginTop: SPACING.md,
    },
    ownLocationSection: { marginTop: SPACING.xs },
    selectedLocationCard: {
        flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
        backgroundColor: COLORS.primaryMuted, borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1, borderColor: COLORS.primaryLight,
        padding: SPACING.md, marginBottom: SPACING.md,
    },
    selectedLocationIcon: {
        width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary,
        alignItems: 'center', justifyContent: 'center',
    },
    selectedLocationName: { fontFamily: FONTS.bodyBold, fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, marginBottom: 2 },
    selectedLocationAddress: { fontFamily: FONTS.body, fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, lineHeight: 16 },
    accommodationTypeSelector: {
        flexDirection: 'row',
        gap: SPACING.sm,
        marginBottom: SPACING.md,
    },
    typeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        borderWidth: 2,
        borderColor: COLORS.border,
    },
    typeButtonActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    typeButtonText: {
        fontFamily: FONTS.bodyBold,
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
    },
    typeButtonTextActive: {
        color: '#fff',
    },
    hotelList: {
        marginTop: SPACING.sm,
    },
    hotelListHeader: {
        marginBottom: SPACING.sm,
    },
    hotelListTitle: {
        fontFamily: FONTS.bodyBold,
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    hotelListSubtitle: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
    },
    hotelCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
        gap: SPACING.sm,
    },
    hotelCardSelected: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.surface,
        shadowColor: COLORS.primary,
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    hotelIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: COLORS.primaryMuted,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    hotelIconSelected: {
        backgroundColor: COLORS.primary,
    },
    hotelInfo: {
        flex: 1,
        gap: 3,
    },
    hotelNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 4,
    },
    hotelName: {
        fontFamily: FONTS.bodyBold,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
        flex: 1,
    },
    hotelMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        flexWrap: 'wrap',
    },
    hotelTypeBadge: {
        backgroundColor: COLORS.surfaceAlt,
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: BORDER_RADIUS.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    hotelType: {
        fontFamily: FONTS.bodyMedium,
        fontSize: 10,
        color: COLORS.textSecondary,
    },
    hotelStars: {
        flexDirection: 'row',
        gap: 1,
    },
    hotelPrice: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.xs,
        color: COLORS.success,
    },
    hotelDescription: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
    },
    hotelAmenities: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        marginTop: 2,
    },
    hotelAmenityChip: {
        backgroundColor: COLORS.primaryMuted,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    hotelAmenityText: {
        fontFamily: FONTS.body,
        fontSize: 10,
        color: COLORS.primary,
    },
    hotelRight: {
        alignItems: 'flex-end',
        gap: SPACING.xs,
        flexShrink: 0,
    },
    hotelDistanceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: COLORS.primaryMuted,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: BORDER_RADIUS.full,
    },
    hotelDistanceText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: 10,
        color: COLORS.primary,
    },
    hotelMapBtn: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: COLORS.primaryMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    hotelAddress: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textLight,
    },
    mapSelectButton: {
        marginBottom: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 5,
    },
    mapSelectGradient: {
        padding: SPACING.lg,
    },
    mapSelectContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    mapSelectTextContainer: {
        flex: 1,
    },
    mapSelectTitle: {
        fontFamily: FONTS.bodyBold,
        fontSize: FONT_SIZES.lg,
        color: '#fff',
        marginBottom: 4,
    },
    mapSelectSubtitle: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.sm,
        color: 'rgba(255,255,255,0.9)',
        lineHeight: 18,
    },
    accommodationForm: {
        marginTop: SPACING.sm,
        marginBottom: SPACING.md,
    },
    textInput: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: SPACING.md,
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        marginTop: SPACING.sm,
        marginBottom: SPACING.md,
    },

    // Summary card
    summaryCard: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        marginTop: SPACING.xl,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    summaryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginBottom: SPACING.md,
    },
    summaryTitle: {
        fontFamily: FONTS.bodyBold,
        fontSize: FONT_SIZES.lg,
        color: COLORS.textPrimary,
    },
    summaryDivider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginBottom: SPACING.md,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        marginBottom: SPACING.sm,
        paddingVertical: SPACING.xs,
    },
    summaryText: {
        fontFamily: FONTS.bodyMedium,
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        flex: 1,
    },
    reviewHero: {
        flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
        padding: SPACING.lg, borderRadius: BORDER_RADIUS.xl,
        backgroundColor: COLORS.primary, marginBottom: SPACING.md,
    },
    reviewHeroIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
    reviewHeroCity: { fontFamily: FONTS.heading, fontSize: FONT_SIZES.xl, color: '#fff', marginBottom: 3 },
    reviewHeroMeta: { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.sm, color: 'rgba(255,255,255,0.85)' },
    reviewRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, marginBottom: SPACING.md },
    reviewRowIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center' },
    reviewRowText: { flex: 1 },
    reviewRowLabel: { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.xs, color: COLORS.textLight, marginBottom: 2 },
    reviewRowValue: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, lineHeight: 19 },
    reviewWarning: { backgroundColor: 'rgba(183, 121, 31, 0.10)' },
    reviewNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, backgroundColor: COLORS.primaryMuted, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginTop: SPACING.md },
    reviewNoticeText: { flex: 1, fontFamily: FONTS.body, fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, lineHeight: 20 },

    // Date picker styles
    datePickersContainer: {
        gap: SPACING.md,
        marginTop: SPACING.md,
    },
    dateSummary: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    dateSummaryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginBottom: SPACING.xs,
    },
    dateSummaryText: {
        fontFamily: FONTS.bodyMedium,
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
    },
    daysBadge: {
        backgroundColor: COLORS.primaryMuted,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.full,
        alignSelf: 'flex-start',
        marginTop: SPACING.xs,
    },
    daysBadgeText: {
        fontFamily: FONTS.bodyBold,
        fontSize: FONT_SIZES.sm,
        color: COLORS.primary,
    },
    datePickerCard: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    datePickerLabel: {
        fontFamily: FONTS.bodyMedium,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xs,
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.sm,
        backgroundColor: COLORS.background,
        borderRadius: BORDER_RADIUS.sm,
        gap: SPACING.sm,
    },
    datePickerButtonText: {
        flex: 1,
        fontFamily: FONTS.bodyMedium,
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
    },
    dateHint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        marginTop: SPACING.sm,
    },
    dateHintText: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },

    // Map styles
    mapButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        marginTop: SPACING.sm,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: SPACING.sm,
    },
    mapButtonText: {
        flex: 1,
        fontFamily: FONTS.bodyMedium,
        fontSize: FONT_SIZES.md,
    },

    // Map styles
    modalContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.xl,
        paddingBottom: SPACING.sm,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    modalCloseBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalTitle: {
        fontFamily: FONTS.bodyBold,
        fontSize: FONT_SIZES.lg,
        color: COLORS.textPrimary,
    },
    modalContent: {
        flex: 1,
        padding: SPACING.lg,
    },
    mapPlaceholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
    },
    mapPlaceholderText: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        marginTop: SPACING.md,
        marginBottom: SPACING.xl,
        textAlign: 'center',
    },
    openGoogleMapsBtn: {
        borderRadius: BORDER_RADIUS.full,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    openGoogleMapsGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md,
    },
    openGoogleMapsText: {
        fontFamily: FONTS.bodyBold,
        fontSize: FONT_SIZES.md,
        color: '#fff',
    },

    // Bottom nav
    bottomNav: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.sm + 4,
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    backCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.surfaceAlt,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    backPill: {
        flex: 1,
        height: 50,
        borderRadius: 25,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: COLORS.surfaceAlt,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    backPillText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        flex: 1,
    },
    backBtnText: {
        fontFamily: FONTS.bodyMedium,
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        marginLeft: 4,
    },
    nextBtnWrapper: {
        flex: 1,
        borderRadius: BORDER_RADIUS.full,
        overflow: 'hidden',
    },
    nextBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 50,
        paddingHorizontal: SPACING.lg,
        borderRadius: BORDER_RADIUS.full,
    },
    nextBtnText: {
        fontFamily: FONTS.bodyBold,
        fontSize: FONT_SIZES.md,
        color: '#fff',
    },
}));
