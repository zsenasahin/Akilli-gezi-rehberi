import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Switch, Alert, KeyboardAvoidingView, Platform, TextInput,
    ActivityIndicator, Modal, Linking, FlatList,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/colors';
import { FONT_SIZES, FONTS } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/layout';
import { getCityCenter } from '../../constants/cities';
import { useAuth } from '../../contexts/AuthContext';
import { getCities } from '../../data/repositories/cityRepository';
import { createItinerary } from '../../data/repositories/itineraryRepository';
import { generateItinerary } from '../../domain/itineraryGenerator';
import { loadCityPlaces } from '../../services/placeDataManager';
import { getMockHotels, getHotelSuggestions } from '../../services/hotelService';
import PlaceSelectionCard from '../../components/itinerary/PlaceSelectionCard';
import ErrorMessage from '../../components/common/ErrorMessage';

const CATEGORY_COLORS = {
    'tarihi': '#8B5CF6',
    'müze': '#6366F1',
    'doğa': '#10B981',
    'park': '#84CC16',
    'dini': '#F59E0B',
    'restoran': '#EF4444',
    'kafe': '#F97316',
    'alışveriş': '#EC4899',
    'eğlence': '#3B82F6',
};

const STEP_LABELS = ['Şehir', 'Yerler', 'Süre', 'Konaklama'];

const TR_MONTHS = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];
const TR_DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

function formatDate(date) {
    return `${date.getDate()} ${TR_MONTHS[date.getMonth()]} ${date.getFullYear()} ${TR_DAYS[date.getDay()]}`;
}

export default function CreateItineraryScreen({ navigation, route }) {
    const { user } = useAuth();

    const [step, setStep] = useState(0);

    // Step 0
    const [cities, setCities] = useState([]);
    const [selectedCity, setSelectedCity] = useState(null);

    // Step 1
    const [places, setPlaces] = useState([]);
    const [selectedPlaces, setSelectedPlaces] = useState([]);
    const [autoSelect, setAutoSelect] = useState(true);

    // Step 2
    const [markedDates, setMarkedDates] = useState({});
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [days, setDays] = useState(0);

    // Step 3
    const [hasAccommodation, setHasAccommodation] = useState(true);
    const [accommodationType, setAccommodationType] = useState('hotel'); // 'hotel' | 'own'
    const [hotels, setHotels] = useState([]);
    const [selectedHotel, setSelectedHotel] = useState(null);
    const [loadingHotels, setLoadingHotels] = useState(false);

    // UI
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // Preselected city varsa direkt yer seçimine geç
    useEffect(() => {
        const preselectedCity = route?.params?.preselectedCity;
        if (preselectedCity) {
            setSelectedCity(preselectedCity);
            setStep(1); // Direkt yer seçimine geç
        }
    }, [route?.params?.preselectedCity]);

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
            getHotelSuggestions(selectedCity.name, places).then(result => {
                setHotels(result.data);
            });
        }
    }, [places]);

    const loadHotels = async () => {
        if (!selectedCity) return;
        setLoadingHotels(true);
        // Gezilen yerlerin konumuna göre Overpass'tan gerçek otelleri çek
        const result = await getHotelSuggestions(selectedCity.name, places);
        setHotels(result.data);
        setLoadingHotels(false);
    };

    const loadCities = async () => {
        setLoading(true);
        const { data, error: err } = await getCities();
        setLoading(false);
        if (err) { setError(err.message); return; }
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
        
        if (!startDate || (startDate && endDate)) {
            // Yeni seçim başlat
            setStartDate(selectedDate);
            setEndDate(null);
            setMarkedDates({
                [selectedDate]: {
                    startingDay: true,
                    color: COLORS.primary,
                    textColor: '#fff',
                },
            });
            setDays(1);
        } else if (startDate && !endDate) {
            // Bitiş tarihini seç
            if (selectedDate < startDate) {
                // Başlangıçtan önce seçildi, başlangıcı değiştir
                setStartDate(selectedDate);
                setEndDate(null);
                setMarkedDates({
                    [selectedDate]: {
                        startingDay: true,
                        color: COLORS.primary,
                        textColor: '#fff',
                    },
                });
                setDays(1);
            } else {
                // Normal bitiş seçimi
                setEndDate(selectedDate);
                const start = new Date(startDate);
                const end = new Date(selectedDate);
                const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                setDays(daysDiff);
                
                // Aradaki günleri işaretle
                const marked = {};
                let current = new Date(start);
                while (current <= end) {
                    const dateStr = current.toISOString().split('T')[0];
                    if (dateStr === startDate) {
                        marked[dateStr] = {
                            startingDay: true,
                            color: COLORS.primary,
                            textColor: '#fff',
                        };
                    } else if (dateStr === selectedDate) {
                        marked[dateStr] = {
                            endingDay: true,
                            color: COLORS.primary,
                            textColor: '#fff',
                        };
                    } else {
                        marked[dateStr] = {
                            color: COLORS.primaryMuted,
                            textColor: COLORS.primary,
                        };
                    }
                    current.setDate(current.getDate() + 1);
                }
                setMarkedDates(marked);
            }
        }
    }, [startDate, endDate]);

    const handleNext = () => {
        setError(null);
        if (step === 0 && !selectedCity) {
            setError('Lütfen bir şehir seçin.');
            return;
        }
        if (step === 1 && !autoSelect && selectedPlaces.length === 0) {
            setError('Lütfen en az bir yer seçin.');
            return;
        }
        if (step === 2 && !startDate) {
            setError('Lütfen tarih aralığı seçin.');
            return;
        }
        if (step < 3) {
            // Tek gün seçildiyse endDate = startDate (step 2'den çıkarken)
            if (step === 2 && startDate && !endDate) {
                setEndDate(startDate);
            }
            setStep(s => s + 1);
        } else {
            handleCreatePlan();
        }
    };

    const handleBack = () => {
        setError(null);
        if (step > 0) setStep(s => s - 1);
    };

    const handleCreatePlan = async () => {
        const placesToUse = autoSelect ? places : selectedPlaces;
        if (placesToUse.length === 0) {
            setError('Plan oluşturmak için yer bulunamadı.');
            return;
        }
        if (!startDate) {
            setError('Lütfen başlangıç tarihi seçin.');
            return;
        }
        // endDate null ise startDate kullan (tek günlük gezi)
        const effectiveEndDate = endDate || startDate;
        const effectiveDays = days > 0 ? days : 1;

        setLoading(true);
        const cityCenter = getCityCenter(selectedCity.name);
        const result = generateItinerary(placesToUse, effectiveDays, {
            cityLat: cityCenter.lat,
            cityLng: cityCenter.lng,
        });
        const { data: saved, error: saveError } = await createItinerary({
            userId: user.id,
            cityId: selectedCity.id,
            days: effectiveDays,
            startDate: startDate,
            hasAccommodation,
            hasTransport: false,
            items: result.items,
            plan: result.plan,
        });
        setLoading(false);
        if (saveError) { setError(saveError.message); return; }
        navigation.replace('ItineraryDetail', { itineraryId: saved.id });
    };

    const adjustDate = (delta) => {
        const d = new Date(startDate);
        d.setDate(d.getDate() + delta);
        setStartDate(d.toISOString().split('T')[0]);
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Yeni Plan</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Step Indicator */}
            <StepIndicator step={step} />

            {/* Error */}
            {error ? <ErrorMessage message={error} style={styles.errorBox} /> : null}

            {/* Content */}
            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {loading && step !== 3 ? (
                    <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
                ) : (
                    <>
                        {step === 0 && (
                            <StepCity
                                cities={cities}
                                selectedCity={selectedCity}
                                onSelect={setSelectedCity}
                            />
                        )}
                        {step === 1 && (
                            <StepPlaces
                                places={places}
                                selectedPlaces={selectedPlaces}
                                autoSelect={autoSelect}
                                onToggleAuto={setAutoSelect}
                                onTogglePlace={togglePlace}
                            />
                        )}
                        {step === 2 && (
                            <StepDuration
                                markedDates={markedDates}
                                onDayPress={handleDayPress}
                                startDate={startDate}
                                endDate={endDate}
                                days={days}
                            />
                        )}
                        {step === 3 && (
                            <StepAccommodation
                                hasAccommodation={hasAccommodation}
                                onToggle={setHasAccommodation}
                                accommodationType={accommodationType}
                                onChangeType={setAccommodationType}
                                hotels={hotels}
                                selectedHotel={selectedHotel}
                                onSelectHotel={setSelectedHotel}
                                loadingHotels={loadingHotels}
                                selectedCity={selectedCity}
                                days={days}
                                startDate={startDate}
                                endDate={endDate}
                            />
                        )}
                    </>
                )}
            </ScrollView>

            {/* Bottom Nav */}
            <View style={styles.bottomNav}>
                {step > 0 ? (
                    <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                        <Ionicons name="chevron-back" size={18} color={COLORS.textSecondary} />
                        <Text style={styles.backBtnText}>Geri</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={{ flex: 1 }} />
                )}

                <TouchableOpacity onPress={handleNext} disabled={loading} style={styles.nextBtnWrapper}>
                    <LinearGradient
                        colors={COLORS.gradients.primary}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.nextBtn}
                    >
                        {loading && step === 3 ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Text style={styles.nextBtnText}>
                                    {step === 3 ? 'Plan Oluştur' : 'İleri'}
                                </Text>
                                {step < 3 && (
                                    <Ionicons name="chevron-forward" size={18} color="#fff" style={{ marginLeft: 4 }} />
                                )}
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StepIndicator({ step }) {
    return (
        <View style={styles.stepIndicator}>
            {STEP_LABELS.map((label, i) => {
                const isActive = i === step;
                const isDone = i < step;
                return (
                    <View key={i} style={styles.stepItem}>
                        <View style={[
                            styles.stepDot,
                            isActive && styles.stepDotActive,
                            isDone && styles.stepDotDone,
                        ]}>
                            {isDone
                                ? <Ionicons name="checkmark" size={12} color="#fff" />
                                : <View style={[
                                    styles.stepDotInner,
                                    isActive && styles.stepDotInnerActive,
                                ]} />
                            }
                        </View>
                        <Text style={[
                            styles.stepLabel,
                            isActive && styles.stepLabelActive,
                        ]}>{label}</Text>
                        {i < STEP_LABELS.length - 1 && (
                            <View style={[styles.stepLine, isDone && styles.stepLineDone]} />
                        )}
                    </View>
                );
            })}
        </View>
    );
}

function StepCity({ cities, selectedCity, onSelect }) {
    return (
        <View>
            <Text style={styles.stepTitle}>Nereye gidiyorsunuz?</Text>
            <Text style={styles.stepSubtitle}>Keşfetmek istediğiniz şehri seçin</Text>
            <View style={styles.cityGrid}>
                {cities.map(city => {
                    const isSelected = selectedCity?.id === city.id;
                    return (
                        <TouchableOpacity
                            key={city.id}
                            style={[styles.cityCard, isSelected && styles.cityCardSelected]}
                            onPress={() => onSelect(city)}
                            activeOpacity={0.7}
                        >
                            {isSelected && (
                                <View style={styles.cityCardCheckmark}>
                                    <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                                </View>
                            )}
                            <Text style={[styles.cityName, isSelected && styles.cityNameSelected]}>
                                {city.name}
                            </Text>
                            {city.region ? (
                                <Text style={[styles.cityRegion, isSelected && styles.cityRegionSelected]}>
                                    {city.region}
                                </Text>
                            ) : null}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

function StepPlaces({ places, selectedPlaces, autoSelect, onToggleAuto, onTogglePlace }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');

    const categories = ['all', ...new Set(places.map(p => p.category).filter(Boolean))];
    
    const filteredPlaces = places.filter(place => {
        const matchesSearch = place.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || place.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <View>
            <Text style={styles.stepTitle}>Gezilecek Yerler</Text>
            <Text style={styles.stepSubtitle}>
                {autoSelect ? 'En popüler yerler otomatik seçilecek' : 'Görmek istediğiniz yerleri seçin'}
            </Text>

            <View style={styles.toggleCard}>
                <View style={styles.toggleCardLeft}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="flash" size={24} color={COLORS.primary} />
                    </View>
                    <View style={styles.toggleCardText}>
                        <Text style={styles.toggleCardTitle}>Otomatik Seçim</Text>
                        <Text style={styles.toggleCardSubtitle}>
                            {autoSelect ? 'En iyi yerler seçilecek' : 'Manuel seçim yapılacak'}
                        </Text>
                    </View>
                </View>
                <Switch
                    value={autoSelect}
                    onValueChange={onToggleAuto}
                    trackColor={{ false: COLORS.border, true: COLORS.primaryMuted }}
                    thumbColor={autoSelect ? COLORS.primary : COLORS.textLight}
                    ios_backgroundColor={COLORS.border}
                />
            </View>

            {!autoSelect && (
                <>
                    {/* Arama */}
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

                    {/* Kategori Filtreleri */}
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

                    <View style={styles.selectedCountBadge}>
                        <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                        <Text style={styles.selectedCount}>
                            {selectedPlaces.length} yer seçildi
                        </Text>
                    </View>

                    {/* Yer Kartları */}
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
                </>
            )}
        </View>
    );
}

function StepDuration({ markedDates, onDayPress, startDate, endDate, days }) {
    const today = new Date().toISOString().split('T')[0];
    
    return (
        <View>
            <Text style={styles.stepTitle}>Ne Kadar Kalacaksınız?</Text>
            <Text style={styles.stepSubtitle}>
                Takvimde başlangıç ve bitiş tarihlerini seçin
            </Text>

            {days > 0 && (
                <View style={styles.durationSummary}>
                    <View style={styles.durationBadge}>
                        <Ionicons name="calendar" size={20} color={COLORS.primary} />
                        <Text style={styles.durationText}>{days} gün</Text>
                    </View>
                    {startDate && endDate && (
                        <Text style={styles.dateRangeText}>
                            {formatDateShort(startDate)} - {formatDateShort(endDate)}
                        </Text>
                    )}
                </View>
            )}

            <View style={styles.calendarContainer}>
                <Calendar
                    current={today}
                    minDate={today}
                    onDayPress={onDayPress}
                    markingType={'period'}
                    markedDates={markedDates}
                    theme={{
                        backgroundColor: COLORS.surface,
                        calendarBackground: COLORS.surface,
                        textSectionTitleColor: COLORS.textSecondary,
                        selectedDayBackgroundColor: COLORS.primary,
                        selectedDayTextColor: '#fff',
                        todayTextColor: COLORS.primary,
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
                <Ionicons name="information-circle" size={18} color={COLORS.primary} />
                <Text style={styles.calendarHintText}>
                    İlk tıklama başlangıç, ikinci tıklama bitiş tarihini belirler
                </Text>
            </View>
        </View>
    );
}

function formatDateShort(dateString) {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = TR_MONTHS[date.getMonth()];
    return `${day} ${month}`;
}



function StepAccommodation({ 
    hasAccommodation, onToggle, accommodationType, onChangeType,
    hotels, selectedHotel, onSelectHotel, loadingHotels,
    selectedCity, days, startDate, endDate 
}) {
    const openGoogleMaps = () => {
        const cityCenter = selectedCity ? getCityCenter(selectedCity.name) : { lat: 41.0082, lng: 28.9784 };
        Linking.openURL(`https://www.google.com/maps/search/hotels/@${cityCenter.lat},${cityCenter.lng},14z`);
    };

    return (
        <View>
            <Text style={styles.stepTitle}>Konaklama</Text>
            <Text style={styles.stepSubtitle}>Nerede kalacağınızı belirleyin</Text>

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
                            onPress={() => onChangeType('hotel')}
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
                            onPress={() => onChangeType('own')}
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
                                                        onSelectHotel(hotel);
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
                                                                    <Ionicons key={i} name="star" size={11} color="#FFB800" />
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

                    {/* Google Maps Butonu */}
                    {accommodationType === 'own' && (
                        <TouchableOpacity 
                            style={styles.mapSelectButton}
                            onPress={openGoogleMaps}
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
                                            Google Maps'te Seç
                                        </Text>
                                        <Text style={styles.mapSelectSubtitle}>
                                            Konaklama yerinizi haritada işaretleyin
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.8)" />
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Summary card */}
            {startDate && endDate && (
                <View style={styles.summaryCard}>
                    <View style={styles.summaryHeader}>
                        <Ionicons name="document-text" size={20} color={COLORS.primary} />
                        <Text style={styles.summaryTitle}>Plan Özeti</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryRow}>
                        <Ionicons name="location" size={18} color={COLORS.primary} />
                        <Text style={styles.summaryText}>{selectedCity?.name || '—'}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Ionicons name="calendar" size={18} color={COLORS.primary} />
                        <Text style={styles.summaryText}>
                            {days} gün · {formatDateShort(startDate)} - {formatDateShort(endDate)}
                        </Text>
                    </View>
                    {hasAccommodation && selectedHotel && (
                        <View style={styles.summaryRow}>
                            <Ionicons name="bed" size={18} color={COLORS.primary} />
                            <Text style={styles.summaryText}>{selectedHotel.name}</Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}


// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

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
        justifyContent: 'center',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.md,
        backgroundColor: COLORS.surface,
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stepDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
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
        backgroundColor: '#fff',
    },
    stepLabel: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textLight,
        marginLeft: 4,
        marginRight: 4,
    },
    stepLabelActive: {
        color: COLORS.primary,
        fontFamily: FONTS.bodyMedium,
    },
    stepLine: {
        width: 20,
        height: 2,
        backgroundColor: COLORS.border,
        marginHorizontal: 2,
    },
    stepLineDone: {
        backgroundColor: COLORS.primary,
    },

    // Content
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: SPACING.md,
        paddingBottom: SPACING.xxl,
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
        gap: SPACING.md,
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
        justifyContent: 'space-between',
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
        backgroundColor: COLORS.primaryMuted,
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
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
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
        alignItems: 'flex-end',
    },
    nextBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.sm + 2,
        paddingHorizontal: SPACING.lg,
        borderRadius: BORDER_RADIUS.full,
        minWidth: 120,
    },
    nextBtnText: {
        fontFamily: FONTS.bodyBold,
        fontSize: FONT_SIZES.md,
        color: '#fff',
    },
});
