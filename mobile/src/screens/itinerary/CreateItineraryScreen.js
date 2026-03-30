import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Switch, Alert, KeyboardAvoidingView, Platform,
    TextInput, Linking, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { COLORS } from '../../constants/colors';
import { FONT_SIZES, FONTS } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/layout';
import { getCityCenter } from '../../constants/cities';
import { useAuth } from '../../contexts/AuthContext';
import { getCities } from '../../data/repositories/cityRepository';
import { getPlacesByCity } from '../../data/repositories/placeRepository';
import { createItinerary } from '../../data/repositories/itineraryRepository';
import { getNearbyHotels, getNearbyRestaurants } from '../../data/api/overpassApi';
import { getOptimizedRoute } from '../../data/api/edgeFunctionApi';
import { generateItinerary } from '../../domain/itineraryGenerator';
import { haversineDistance, sortPlacesByNearest, calculateTotalDistance } from '../../utils/haversine';
import { generateLeafletHtml } from '../../utils/leafletHtml';
import Button from '../../components/common/Button';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import ErrorMessage from '../../components/common/ErrorMessage';

// ─── Wizard Adımları ──────────────────────────────────────────────────────────
const STEPS = [
    { label: 'Şehir', icon: 'location-outline' },
    { label: 'Süre', icon: 'calendar-outline' },
    { label: 'Konaklama', icon: 'bed-outline' },
    { label: 'Ulaşım', icon: 'car-outline' },
    { label: 'Plan', icon: 'map-outline' },
];

// Güncel yakıt fiyatı (TL/L) — kullanıcı değiştirebilir
const DEFAULT_FUEL_PRICE = 45;
const DEFAULT_CONSUMPTION = 8; // L/100km

// ─── Yakıt maliyet hesabı ─────────────────────────────────────────────────────
function calcFuelCost(distanceKm, consumptionL100, priceTL) {
    return ((distanceKm * consumptionL100) / 100) * priceTL;
}

// ─── Google Maps deep-link ────────────────────────────────────────────────────
function openGoogleMapsTransit(origin, destination) {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=transit`;
    Linking.openURL(url).catch(() =>
        Alert.alert('Hata', 'Google Maps açılamadı. Lütfen uygulamanın yüklü olduğundan emin olun.')
    );
}

function openGoogleMapsWaypoints(places) {
    if (places.length < 2) return;
    const origin = `${places[0].lat},${places[0].lng}`;
    const destination = `${places[places.length - 1].lat},${places[places.length - 1].lng}`;
    const waypoints = places.slice(1, -1).map(p => `${p.lat},${p.lng}`).join('|');
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=transit`;
    Linking.openURL(url).catch(() =>
        Alert.alert('Hata', 'Google Maps açılamadı.')
    );
}

// ─── Ana Bileşen ──────────────────────────────────────────────────────────────
const CreateItineraryScreen = ({ navigation, route }) => {
    const { user } = useAuth();
    const { preselectedCity } = route?.params || {};
    const webViewRef = useRef(null);

    // Wizard
    const [step, setStep] = useState(0);
    const [error, setError] = useState(null);

    // Adım 0: Şehir
    const [cities, setCities] = useState([]);
    const [selectedCity, setSelectedCity] = useState(null);
    const [places, setPlaces] = useState([]);
    const [selectedPlaces, setSelectedPlaces] = useState([]);
    const [autoSelect, setAutoSelect] = useState(true);
    const [citiesLoading, setCitiesLoading] = useState(true);
    const [placesLoading, setPlacesLoading] = useState(false);

    // Adım 1: Süre + Tarih
    const [days, setDays] = useState(2);
    const [startDate, setStartDate] = useState(() => {
        // Bugünden başlasın
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    });
    const [showCalendar, setShowCalendar] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState(() => {
        const d = new Date();
        return { year: d.getFullYear(), month: d.getMonth() };
    });

    // Adım 2: Konaklama
    const [hasAccommodation, setHasAccommodation] = useState(true);
    const [accommodation, setAccommodation] = useState(null);   // { name, lat, lng }
    const [hotels, setHotels] = useState([]);
    const [hotelsLoading, setHotelsLoading] = useState(false);
    const [mapReady, setMapReady] = useState(false);

    // Adım 3: Ulaşım
    const [hasTransport, setHasTransport] = useState(false);    // araç var mı?
    const [fuelPrice, setFuelPrice] = useState(String(DEFAULT_FUEL_PRICE));
    const [consumption, setConsumption] = useState(String(DEFAULT_CONSUMPTION));

    // Adım 4: Plan
    const [generatedPlan, setGeneratedPlan] = useState(null);
    const [routeData, setRouteData] = useState(null);
    const [nearbyRestaurants, setNearbyRestaurants] = useState([]);
    const [saving, setSaving] = useState(false);
    const [planLoading, setPlanLoading] = useState(false);

    // ─── Şehirleri yükle ─────────────────────────────────────────────────────
    useEffect(() => {
        getCities().then(({ data }) => {
            const list = data || [];
            setCities(list);
            // Dışarıdan şehir parametresi geldiyse direkt seç
            if (preselectedCity) {
                const match = list.find(c => c.id === preselectedCity.id) || preselectedCity;
                setSelectedCity(match);
            }
            setCitiesLoading(false);
        });
    }, []);

    // ─── Şehir seçilince yerleri yükle ──────────────────────────────────────
    useEffect(() => {
        if (!selectedCity) return;
        setPlacesLoading(true);
        getPlacesByCity(selectedCity.id).then(({ data }) => {
            setPlaces(data || []);
            setPlacesLoading(false);
        });
    }, [selectedCity]);

    // ─── Konaklama adımına gelince otelleri yükle ───────────────────────────
    useEffect(() => {
        if (step === 2 && !hasAccommodation && selectedCity && places.length > 0 && hotels.length === 0) {
            loadHotels();
        }
    }, [step, hasAccommodation, selectedCity]);

    const loadHotels = async () => {
        if (!places[0]?.lat) return;
        setHotelsLoading(true);
        const { data } = await getNearbyHotels(places[0].lat, places[0].lng, 3000);
        if (data && data.length > 0) {
            const cityCenter = getCityCenter(selectedCity.name);
            const withDist = data.map(h => ({
                ...h,
                distance: Math.round(haversineDistance(cityCenter.lat, cityCenter.lng, h.lat, h.lng) * 1000),
            })).sort((a, b) => a.distance - b.distance);
            setHotels(withDist.slice(0, 8));
        }
        setHotelsLoading(false);
    };

    // ─── WebView harita mesajları ────────────────────────────────────────────
    const sendCommand = useCallback((cmd) => {
        webViewRef.current?.postMessage(JSON.stringify(cmd));
    }, []);

    const handleWebViewMessage = useCallback((event) => {
        try {
            const msg = JSON.parse(event.nativeEvent.data);
            if (msg.type === 'mapReady') {
                setMapReady(true);
                const center = getCityCenter(selectedCity?.name || 'İstanbul');
                sendCommand({ action: 'flyTo', lat: center.lat, lng: center.lng, zoom: 13 });
            }
            if (msg.type === 'longPress') {
                Alert.alert(
                    'Konaklama Noktası',
                    `Bu konumu konaklama olarak seç?\n📍 ${msg.data.lat.toFixed(4)}, ${msg.data.lng.toFixed(4)}`,
                    [
                        { text: 'İptal', style: 'cancel' },
                        {
                            text: 'Seç', onPress: () => {
                                const acc = { lat: msg.data.lat, lng: msg.data.lng, name: 'Özel Konum' };
                                setAccommodation(acc);
                                sendCommand({ action: 'setAccommodation', ...acc });
                            }
                        },
                    ]
                );
            }
        } catch { /* ignore */ }
    }, [selectedCity, sendCommand]);

    const selectHotel = (hotel) => {
        const acc = { lat: hotel.lat, lng: hotel.lng, name: hotel.name };
        setAccommodation(acc);
        sendCommand({ action: 'setAccommodation', ...acc });
        sendCommand({ action: 'flyTo', lat: hotel.lat, lng: hotel.lng, zoom: 15 });
    };

    // ─── Plan oluştur ────────────────────────────────────────────────────────
    const buildPlan = useCallback(async () => {
        const placesToUse = autoSelect ? places : selectedPlaces;
        if (placesToUse.length === 0) {
            setError('Plan oluşturmak için en az bir yer gerekli.');
            return false;
        }

        setPlanLoading(true);
        setError(null);

        const startLoc = accommodation
            ? { lat: accommodation.lat, lng: accommodation.lng }
            : (placesToUse[0]?.lat ? { lat: placesToUse[0].lat, lng: placesToUse[0].lng } : null);

        const result = generateItinerary(placesToUse, days, { startLocation: startLoc });
        setGeneratedPlan(result);

        // Rota optimize et (ORS Edge Function)
        if (result.items.length >= 2) {
            const routePlaces = result.items.slice(0, 25).map(item => {
                const p = placesToUse.find(pl => pl.id === item.place_id);
                return p ? { id: p.id, name: p.name, lat: p.lat, lng: p.lng } : null;
            }).filter(Boolean);

            const acc = accommodation || { lat: routePlaces[0].lat, lng: routePlaces[0].lng, name: 'Başlangıç' };
            const { data: rd } = await getOptimizedRoute(acc, routePlaces);
            setRouteData(rd || { distance: result.totalDistance, duration: null });
        } else {
            setRouteData({ distance: result.totalDistance, duration: null });
        }

        setPlanLoading(false);

        // Yakın restoranları yükle (paralel — planı yavaşlatmaz)
        const center = getCityCenter(selectedCity?.name || 'İstanbul');
        getNearbyRestaurants(center.lat, center.lng, 1500).then(({ data: rests }) => {
            if (rests && rests.length > 0) {
                setNearbyRestaurants(rests.slice(0, 5));
            }
        });
        return true;
    }, [places, selectedPlaces, autoSelect, days, accommodation]);

    // ─── Kaydet ─────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!user || !generatedPlan) return;
        setSaving(true);

        const { error: saveError } = await createItinerary({
            userId: user.id,
            cityId: selectedCity.id,
            days,
            startDate: startDate.toISOString().split('T')[0],
            hasAccommodation: hasAccommodation || !!accommodation,
            hasTransport,
            startLocationLat: accommodation?.lat ?? null,
            startLocationLng: accommodation?.lng ?? null,
            items: generatedPlan.items,
        });

        setSaving(false);

        if (saveError) {
            setError('Kaydedilemedi: ' + saveError.message);
            return;
        }

        Alert.alert('Başarılı! ✅', 'Gezi planınız kaydedildi.', [
            { text: 'Planlarıma Git', onPress: () => navigation.navigate('Saved') },
        ]);
    };

    // ─── Adım geçişi ────────────────────────────────────────────────────────
    const handleNext = async () => {
        setError(null);

        if (step === 0 && !selectedCity) {
            setError('Lütfen bir şehir seçin.');
            return;
        }
        if (step === 0 && !autoSelect && selectedPlaces.length === 0) {
            setError('En az bir yer seçin veya otomatik seçimi açın.');
            return;
        }
        if (step === 2 && !hasAccommodation && !accommodation) {
            Alert.alert(
                'Konaklama Seçilmedi',
                'Konaklama noktası seçmeden devam etmek istiyor musunuz? (Rota en iyi yerden başlar)',
                [
                    { text: 'Geri Dön', style: 'cancel' },
                    { text: 'Devam Et', onPress: () => setStep(s => s + 1) },
                ]
            );
            return;
        }
        if (step === 3) {
            const ok = await buildPlan();
            if (!ok) return;
        }

        setStep(s => Math.min(s + 1, STEPS.length - 1));
    };

    // ─── Türetilmiş veriler ──────────────────────────────────────────────────
    const totalDistance = routeData?.distance ?? generatedPlan?.totalDistance ?? 0;
    const fuelCost = hasTransport
        ? calcFuelCost(totalDistance, parseFloat(consumption) || DEFAULT_CONSUMPTION, parseFloat(fuelPrice) || DEFAULT_FUEL_PRICE)
        : 0;
    const totalEntryCost = generatedPlan?.plan?.reduce((sum, day) =>
        day.places.reduce((s, p) => s + (p.entry_fee || 0), sum), 0) ?? 0;

    const cityCenter = selectedCity ? getCityCenter(selectedCity.name) : { lat: 41.01, lng: 28.95 };
    const leafletHtml = generateLeafletHtml(cityCenter, 13);

    if (citiesLoading) {
        return (
            <View style={styles.flex}>
                {/* Progress Bar Skeleton */}
                <View style={{ flexDirection: 'row', padding: SPACING.md, paddingTop: SPACING.xxl + 8, backgroundColor: COLORS.surface, gap: SPACING.sm }}>
                    {[0, 1, 2, 3, 4].map(i => (
                        <SkeletonLoader key={i} width={48} height={48} radius={24} />
                    ))}
                </View>
                <View style={{ padding: SPACING.lg }}>
                    <SkeletonLoader width={220} height={24} radius={8} style={{ marginBottom: 8 }} />
                    <SkeletonLoader width={280} height={14} radius={6} style={{ marginBottom: SPACING.lg }} />
                    {/* City card skeletons */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
                        {[0, 1, 2, 3, 4, 5].map(i => (
                            <SkeletonLoader key={i} width="47%" height={90} radius={BORDER_RADIUS.lg} />
                        ))}
                    </View>
                </View>
            </View>
        );
    }

    // ─── RENDER ──────────────────────────────────────────────────────────────
    return (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            {/* Progress Bar */}
            <View style={styles.progressBar}>
                {STEPS.map((s, i) => (
                    <View key={s.label} style={styles.progressStep}>
                        <View style={[styles.progressDot, i <= step && styles.progressDotActive]}>
                            {i < step
                                ? <Ionicons name="checkmark" size={12} color="#fff" />
                                : <Ionicons name={s.icon} size={12} color={i <= step ? '#fff' : COLORS.textLight} />
                            }
                        </View>
                        <Text style={[styles.progressLabel, i <= step && styles.progressLabelActive]}>
                            {s.label}
                        </Text>
                        {i < STEPS.length - 1 && (
                            <View style={[styles.progressLine, i < step && styles.progressLineActive]} />
                        )}
                    </View>
                ))}
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {error && <ErrorMessage message={error} />}

                {/* ── ADIM 0: ŞEHİR ── */}
                {step === 0 && (
                    <View>
                        <Text style={styles.stepTitle}>📍 Nereye gidiyorsunuz?</Text>
                        <Text style={styles.stepDesc}>Şehir seçin, ardından yerler otomatik belirlenir.</Text>

                        <View style={styles.cityGrid}>
                            {cities.map((city) => {
                                const active = selectedCity?.id === city.id;
                                const emoji = city.name === 'İstanbul' ? '🕌' : city.name === 'Antalya' ? '🏖️' : city.name === 'Konya' ? '🌾' : '🏙️';
                                return (
                                    <TouchableOpacity
                                        key={city.id}
                                        style={[styles.cityCard, active && styles.cityCardActive]}
                                        onPress={() => { setSelectedCity(city); setSelectedPlaces([]); setAccommodation(null); setHotels([]); }}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.cityEmoji}>{emoji}</Text>
                                        <Text style={[styles.cityName, active && styles.cityNameActive]}>{city.name}</Text>
                                        <Text style={styles.cityRegion}>{city.region}</Text>
                                        {active && <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} style={styles.cityCheck} />}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {selectedCity && (
                            <View style={styles.card}>
                                <View style={styles.rowBetween}>
                                    <Text style={styles.cardLabel}>Yerleri otomatik seç</Text>
                                    <Switch value={autoSelect} onValueChange={setAutoSelect}
                                        trackColor={{ true: COLORS.primaryLight, false: COLORS.border }}
                                        thumbColor={autoSelect ? COLORS.primary : COLORS.textLight} />
                                </View>
                                {!autoSelect && (
                                    <>
                                        <Text style={[styles.cardLabel, { marginTop: SPACING.md }]}>
                                            {selectedPlaces.length} yer seçildi
                                        </Text>
                                        {placesLoading
                                            ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 12 }} />
                                            : places.map(place => {
                                                const sel = selectedPlaces.some(p => p.id === place.id);
                                                return (
                                                    <TouchableOpacity
                                                        key={place.id}
                                                        style={[styles.placeRow, sel && styles.placeRowActive]}
                                                        onPress={() => setSelectedPlaces(prev =>
                                                            sel ? prev.filter(p => p.id !== place.id) : [...prev, place]
                                                        )}
                                                    >
                                                        <View style={styles.placeInfo}>
                                                            <Text style={styles.placeName}>{place.name}</Text>
                                                            <Text style={styles.placeMeta}>{place.category} · {place.avg_duration}s</Text>
                                                        </View>
                                                        <Ionicons
                                                            name={sel ? 'checkbox' : 'square-outline'}
                                                            size={22} color={sel ? COLORS.primary : COLORS.textLight}
                                                        />
                                                    </TouchableOpacity>
                                                );
                                            })
                                        }
                                    </>
                                )}
                            </View>
                        )}
                    </View>
                )}

                {/* ── ADIM 1: SÜRE + TARİH ── */}
                {step === 1 && (
                    <View>
                        <Text style={styles.stepTitle}>📅 Kaç gün & ne zaman?</Text>
                        <Text style={styles.stepDesc}>Gezi sürenizi ve başlangıç tarihinizi seçin.</Text>

                        {/* Gün sayısı */}
                        <View style={styles.daySelectorRow}>
                            <TouchableOpacity onPress={() => setDays(d => Math.max(1, d - 1))} disabled={days <= 1}>
                                <Ionicons name="remove-circle-outline" size={44} color={days <= 1 ? COLORS.textLight : COLORS.primary} />
                            </TouchableOpacity>
                            <View style={styles.dayDisplay}>
                                <Text style={styles.dayNumber}>{days}</Text>
                                <Text style={styles.dayLabel}>gün</Text>
                            </View>
                            <TouchableOpacity onPress={() => setDays(d => Math.min(14, d + 1))} disabled={days >= 14}>
                                <Ionicons name="add-circle-outline" size={44} color={days >= 14 ? COLORS.textLight : COLORS.primary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.chipRow}>
                            {[1, 2, 3, 5, 7, 10].map(d => (
                                <TouchableOpacity key={d} style={[styles.chip, days === d && styles.chipActive]} onPress={() => setDays(d)}>
                                    <Text style={[styles.chipText, days === d && styles.chipTextActive]}>{d} gün</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Başlangıç tarihi */}
                        <TouchableOpacity
                            style={styles.datePickerButton}
                            onPress={() => setShowCalendar(!showCalendar)}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.datePickerLabel}>Başlangıç Tarihi</Text>
                                <Text style={styles.datePickerValue}>
                                    {startDate.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                </Text>
                            </View>
                            <Ionicons
                                name={showCalendar ? 'chevron-up' : 'chevron-down'}
                                size={18} color={COLORS.textLight}
                            />
                        </TouchableOpacity>

                        {/* Bitiş tarihi hesapla */}
                        <View style={styles.dateRangeRow}>
                            <View style={styles.dateRangeItem}>
                                <Text style={styles.dateRangeLabel}>Başlangıç</Text>
                                <Text style={styles.dateRangeValue}>
                                    {startDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                                </Text>
                            </View>
                            <Ionicons name="arrow-forward" size={16} color={COLORS.textLight} />
                            <View style={styles.dateRangeItem}>
                                <Text style={styles.dateRangeLabel}>Bitiş</Text>
                                <Text style={styles.dateRangeValue}>
                                    {(() => {
                                        const end = new Date(startDate);
                                        end.setDate(end.getDate() + days - 1);
                                        return end.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
                                    })()}
                                </Text>
                            </View>
                            <View style={styles.dateRangeDivider} />
                            <View style={styles.dateRangeItem}>
                                <Text style={styles.dateRangeLabel}>Toplam</Text>
                                <Text style={[styles.dateRangeValue, { color: COLORS.primary }]}>{days} gün</Text>
                            </View>
                        </View>

                        {/* Inline Takvim */}
                        {showCalendar && (() => {
                            const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                                'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
                            const DAYS_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
                            const today = new Date(); today.setHours(0, 0, 0, 0);
                            const { year, month } = calendarMonth;
                            const firstDay = new Date(year, month, 1);
                            // Pazartesi başlangıçlı: 0=Pzt...6=Paz
                            const startOffset = (firstDay.getDay() + 6) % 7;
                            const daysInMonth = new Date(year, month + 1, 0).getDate();
                            const cells = [];
                            for (let i = 0; i < startOffset; i++) cells.push(null);
                            for (let d = 1; d <= daysInMonth; d++) cells.push(d);

                            const isSelected = (d) => {
                                if (!d) return false;
                                const cell = new Date(year, month, d);
                                return cell.toDateString() === startDate.toDateString();
                            };
                            const isInRange = (d) => {
                                if (!d) return false;
                                const cell = new Date(year, month, d);
                                const end = new Date(startDate);
                                end.setDate(startDate.getDate() + days - 1);
                                return cell > startDate && cell <= end;
                            };
                            const isPast = (d) => {
                                if (!d) return false;
                                return new Date(year, month, d) < today;
                            };

                            return (
                                <View style={styles.calendarContainer}>
                                    {/* Ay navigasyonu */}
                                    <View style={styles.calendarHeader}>
                                        <TouchableOpacity onPress={() => {
                                            const prev = new Date(year, month - 1, 1);
                                            setCalendarMonth({ year: prev.getFullYear(), month: prev.getMonth() });
                                        }}>
                                            <Ionicons name="chevron-back" size={22} color={COLORS.primary} />
                                        </TouchableOpacity>
                                        <Text style={styles.calendarMonthLabel}>
                                            {MONTHS_TR[month]} {year}
                                        </Text>
                                        <TouchableOpacity onPress={() => {
                                            const next = new Date(year, month + 1, 1);
                                            setCalendarMonth({ year: next.getFullYear(), month: next.getMonth() });
                                        }}>
                                            <Ionicons name="chevron-forward" size={22} color={COLORS.primary} />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Haftanın günleri */}
                                    <View style={styles.calendarDayNames}>
                                        {DAYS_TR.map(n => (
                                            <Text key={n} style={styles.calendarDayName}>{n}</Text>
                                        ))}
                                    </View>

                                    {/* Günler */}
                                    <View style={styles.calendarGrid}>
                                        {cells.map((d, i) => (
                                            <TouchableOpacity
                                                key={i}
                                                style={[
                                                    styles.calendarCell,
                                                    isSelected(d) && styles.calendarCellSelected,
                                                    isInRange(d) && styles.calendarCellInRange,
                                                    !d && { backgroundColor: 'transparent' },
                                                ]}
                                                onPress={() => {
                                                    if (!d || isPast(d)) return;
                                                    const picked = new Date(year, month, d);
                                                    setStartDate(picked);
                                                    setShowCalendar(false);
                                                }}
                                                disabled={!d || isPast(d)}
                                                activeOpacity={0.7}
                                            >
                                                {d ? (
                                                    <Text style={[
                                                        styles.calendarCellText,
                                                        isSelected(d) && styles.calendarCellTextSelected,
                                                        isInRange(d) && styles.calendarCellTextInRange,
                                                        isPast(d) && styles.calendarCellTextPast,
                                                    ]}>{d}</Text>
                                                ) : null}
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            );
                        })()}
                    </View>
                )}

                {/* ── ADIM 2: KONAKLAMA ── */}
                {step === 2 && (
                    <View>
                        <Text style={styles.stepTitle}>🏨 Konaklama</Text>
                        <Text style={styles.stepDesc}>Konaklama konumunuzu belirleyin. Rota planlaması buradan başlar.</Text>

                        {/* Toggle */}
                        <View style={styles.card}>
                            <View style={styles.rowBetween}>
                                <View style={styles.prefInfo}>
                                    <Ionicons name="bed-outline" size={22} color={COLORS.primary} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.prefName}>Konaklama yerim var</Text>
                                        <Text style={styles.prefDesc}>Otel/pansiyon rezervasyonunuz varsa konumunu belirleyin</Text>
                                    </View>
                                </View>
                                <Switch
                                    value={hasAccommodation}
                                    onValueChange={(v) => {
                                        setHasAccommodation(v);
                                        if (v) { setAccommodation(null); setHotels([]); }
                                    }}
                                    trackColor={{ true: COLORS.primaryLight, false: COLORS.border }}
                                    thumbColor={hasAccommodation ? COLORS.primary : COLORS.textLight}
                                />
                            </View>
                        </View>

                        {/* Seçilen konaklama */}
                        {accommodation && (
                            <View style={styles.selectedBadge}>
                                <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                                <Text style={styles.selectedText}>{accommodation.name}</Text>
                                <Text style={styles.selectedCoord}>{accommodation.lat?.toFixed(4)}, {accommodation.lng?.toFixed(4)}</Text>
                                <TouchableOpacity onPress={() => setAccommodation(null)}>
                                    <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
                                </TouchableOpacity>
                            </View>
                        )}

                        {selectedCity && (
                            <>
                                {/* ─ Google Maps ile Konum Seç ─ */}
                                <View style={styles.card}>
                                    <Text style={styles.sectionLabel}>📌 Konum Seçimi</Text>
                                    <Text style={styles.cardDesc}>Google Haritalar'da yerinizi arayıp koordinatları buraya girin.</Text>

                                    <TouchableOpacity
                                        style={styles.googleMapsPickerBtn}
                                        onPress={() => {
                                            const center = getCityCenter(selectedCity?.name || 'İstanbul');
                                            const url = `https://www.google.com/maps/search/?api=1&query=${center.lat},${center.lng}`;
                                            Linking.openURL(url).catch(() =>
                                                Linking.openURL(`https://maps.google.com/?q=${center.lat},${center.lng}`)
                                            );
                                        }}
                                        activeOpacity={0.85}
                                    >
                                        <Ionicons name="logo-google" size={18} color="#fff" />
                                        <Text style={styles.googleMapsPickerBtnText}>Google Maps'te Ara</Text>
                                        <Ionicons name="open-outline" size={16} color="rgba(255,255,255,0.8)" />
                                    </TouchableOpacity>

                                    <Text style={styles.orText}>— veya koordinat girin —</Text>

                                    <View style={styles.coordInputRow}>
                                        <View style={styles.coordInputWrap}>
                                            <Text style={styles.coordLabel}>Enlem (Lat)</Text>
                                            <TextInput
                                                style={styles.coordInput}
                                                placeholder="37.8746"
                                                placeholderTextColor={COLORS.textLight}
                                                keyboardType="numeric"
                                                onChangeText={(v) => {
                                                    const lat = parseFloat(v);
                                                    if (!isNaN(lat)) {
                                                        setAccommodation(prev => ({
                                                            ...(prev || {}),
                                                            lat,
                                                            name: prev?.name || 'Konaklama Yerim',
                                                            lng: prev?.lng ?? getCityCenter(selectedCity.name).lng,
                                                        }));
                                                    }
                                                }}
                                            />
                                        </View>
                                        <View style={styles.coordInputWrap}>
                                            <Text style={styles.coordLabel}>Boylam (Lng)</Text>
                                            <TextInput
                                                style={styles.coordInput}
                                                placeholder="32.4932"
                                                placeholderTextColor={COLORS.textLight}
                                                keyboardType="numeric"
                                                onChangeText={(v) => {
                                                    const lng = parseFloat(v);
                                                    if (!isNaN(lng)) {
                                                        setAccommodation(prev => ({
                                                            ...(prev || {}),
                                                            lng,
                                                            name: prev?.name || 'Konaklama Yerim',
                                                            lat: prev?.lat ?? getCityCenter(selectedCity.name).lat,
                                                        }));
                                                    }
                                                }}
                                            />
                                        </View>
                                    </View>
                                </View>

                                {/* ─ Haritada Görüntüle & Uzun Basarak Seç ─ */}
                                <Text style={styles.sectionLabel}>🗺️ Haritada seçin (uzun basın)</Text>
                                <View style={styles.mapContainer}>
                                    <WebView
                                        ref={webViewRef}
                                        source={{ html: leafletHtml }}
                                        style={styles.map}
                                        onMessage={handleWebViewMessage}
                                        javaScriptEnabled domStorageEnabled startInLoadingState
                                        renderLoading={() => (
                                            <View style={styles.mapLoading}>
                                                <ActivityIndicator color={COLORS.primary} />
                                                <Text style={styles.loadingText}>Harita yükleniyor...</Text>
                                            </View>
                                        )}
                                    />
                                    <View style={styles.mapHint}>
                                        <Text style={styles.mapHintText}>👆 Haritada uzun basarak konaklama seçin</Text>
                                    </View>
                                </View>

                                {/* ─ Yakın Oteller (hasAccommodation = false ise) ─ */}
                                {!hasAccommodation && (
                                    <View style={{ marginTop: SPACING.md }}>
                                        <Text style={styles.sectionLabel}>🏨 Yakın Oteller</Text>
                                        {hotelsLoading ? (
                                            <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 12 }} />
                                        ) : hotels.length === 0 ? (
                                            <View style={styles.emptyCard}>
                                                <Ionicons name="bed-outline" size={32} color={COLORS.textLight} />
                                                <Text style={styles.emptyText}>Yakında otel bulunamadı.</Text>
                                                <Text style={styles.emptySubText}>Yukarıdan koordinat girerek veya haritadan seçebilirsiniz.</Text>
                                            </View>
                                        ) : hotels.map((hotel, i) => {
                                            const selected = accommodation?.name === hotel.name && accommodation?.lat === hotel.lat;
                                            return (
                                                <TouchableOpacity
                                                    key={i}
                                                    style={[styles.hotelCard, selected && styles.hotelCardSelected]}
                                                    onPress={() => selectHotel(hotel)}
                                                    activeOpacity={0.8}
                                                >
                                                    <View style={[styles.hotelIcon, selected && styles.hotelIconSelected]}>
                                                        <Ionicons name="bed" size={18} color={selected ? '#fff' : COLORS.primary} />
                                                    </View>
                                                    <View style={styles.hotelInfo}>
                                                        <Text style={styles.hotelName} numberOfLines={1}>{hotel.name}</Text>
                                                        <View style={styles.hotelMeta}>
                                                            {hotel.stars > 0 && <Text style={styles.hotelStars}>{'⭐'.repeat(Math.min(hotel.stars, 5))}</Text>}
                                                            {hotel.distance && <Text style={styles.hotelDist}> · {hotel.distance}m</Text>}
                                                        </View>
                                                        {hotel.address ? <Text style={styles.hotelAddr} numberOfLines={1}>{hotel.address}</Text> : null}
                                                    </View>
                                                    {selected && <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                )}
                            </>
                        )}
                    </View>
                )}

                {/* ── ADIM 3: ULAŞIM ── */}
                {step === 3 && (
                    <View>
                        <Text style={styles.stepTitle}>🚗 Ulaşım Tercihi</Text>
                        <Text style={styles.stepDesc}>Ulaşım tercihlerinize göre maliyet ve yol tarifi hesaplanacak.</Text>

                        {/* Araç var mı? */}
                        <View style={styles.card}>
                            <View style={styles.rowBetween}>
                                <View style={styles.prefInfo}>
                                    <Ionicons name="car-outline" size={22} color={COLORS.accent} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.prefName}>Özel aracım var</Text>
                                        <Text style={styles.prefDesc}>Yakıt maliyeti ve sürüş süresi hesaplanır</Text>
                                    </View>
                                </View>
                                <Switch value={hasTransport} onValueChange={setHasTransport}
                                    trackColor={{ true: COLORS.primaryLight, false: COLORS.border }}
                                    thumbColor={hasTransport ? COLORS.primary : COLORS.textLight} />
                            </View>
                        </View>

                        {/* Araçlı — yakıt bilgisi */}
                        {hasTransport && (
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>⛽ Yakıt Bilgisi</Text>
                                <View style={styles.inputRow}>
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Yakıt fiyatı (₺/L)</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={fuelPrice}
                                            onChangeText={setFuelPrice}
                                            keyboardType="decimal-pad"
                                            placeholder="45"
                                            placeholderTextColor={COLORS.textLight}
                                        />
                                    </View>
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Tüketim (L/100km)</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={consumption}
                                            onChangeText={setConsumption}
                                            keyboardType="decimal-pad"
                                            placeholder="8"
                                            placeholderTextColor={COLORS.textLight}
                                        />
                                    </View>
                                </View>
                                <View style={styles.infoBox}>
                                    <Ionicons name="information-circle-outline" size={16} color={COLORS.info} />
                                    <Text style={styles.infoText}>
                                        Plan oluşturunca tahmini yakıt maliyetinizi göreceksiniz.
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Araçsız — toplu taşıma bilgilendirme */}
                        {!hasTransport && (
                            <View style={styles.card}>
                                <View style={styles.transitHeader}>
                                    <Ionicons name="bus-outline" size={24} color={COLORS.info} />
                                    <Text style={styles.cardTitle}>🚌 Toplu Taşıma</Text>
                                </View>
                                <Text style={styles.transitDesc}>
                                    Plan oluşturulduktan sonra her durak için Google Maps'te toplu taşıma
                                    yol tarifini açabilirsiniz. Otobüs, metro, tramvay ve dolmuş güzergahları
                                    gerçek zamanlı olarak gösterilir.
                                </Text>
                                <View style={styles.transitFeatures}>
                                    {['🚇 Metro & tramvay güzergahları', '🚌 Otobüs saatleri', '🚶 Yürüyüş mesafeleri', '💳 Tahmini biniş ücretleri'].map(f => (
                                        <View key={f} style={styles.transitFeatureRow}>
                                            <Text style={styles.transitFeatureText}>{f}</Text>
                                        </View>
                                    ))}
                                </View>
                                <View style={styles.infoBox}>
                                    <Ionicons name="information-circle-outline" size={16} color={COLORS.info} />
                                    <Text style={styles.infoText}>
                                        "Google Maps'te Aç" butonu ile anlık toplu taşıma tariflerini görüntüleyebilirsiniz.
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>
                )}

                {/* ── ADIM 4: PLAN ── */}
                {step === 4 && (
                    <View>
                        <Text style={styles.stepTitle}>🗺️ Gezi Planınız</Text>

                        {planLoading ? (
                            <View style={styles.planLoading}>
                                <ActivityIndicator size="large" color={COLORS.primary} />
                                <Text style={styles.loadingText}>Plan oluşturuluyor...</Text>
                            </View>
                        ) : generatedPlan ? (
                            <>
                                {/* Özet Kartı */}
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
                                            <Text style={styles.summaryValue}>{(routeData?.distance ?? generatedPlan.totalDistance).toFixed(1)}km</Text>
                                            <Text style={styles.summaryLabel}>Mesafe</Text>
                                        </View>
                                        {routeData?.duration && (
                                            <>
                                                <View style={styles.summaryDivider} />
                                                <View style={styles.summaryStat}>
                                                    <Text style={styles.summaryValue}>{Math.round(routeData.duration / 60)}dk</Text>
                                                    <Text style={styles.summaryLabel}>Yürüyüş</Text>
                                                </View>
                                            </>
                                        )}
                                    </View>
                                </View>

                                {/* Maliyet Kartı */}
                                <View style={styles.costCard}>
                                    <Text style={styles.costTitle}>💰 Tahmini Giriş Ücreti</Text>
                                    <Text style={styles.costValue}>₺{totalEntryCost.toFixed(0)}</Text>
                                    {hasTransport && fuelCost > 0 && (
                                        <>
                                            <View style={styles.costDivider} />
                                            <Text style={styles.costTitle}>⛽ Tahmini Yakıt Maliyeti</Text>
                                            <Text style={styles.costValue}>₺{fuelCost.toFixed(0)}</Text>
                                            <Text style={styles.costSub}>
                                                {totalDistance.toFixed(1)} km × {consumption} L/100km × ₺{fuelPrice}/L
                                            </Text>
                                        </>
                                    )}
                                    {!hasTransport && (
                                        <>
                                            <View style={styles.costDivider} />
                                            <TouchableOpacity
                                                style={styles.transitButton}
                                                onPress={() => {
                                                    const allPlacesFlat = generatedPlan.plan.flatMap(d => d.places).filter(p => p.lat && p.lng);
                                                    if (allPlacesFlat.length >= 2) openGoogleMapsWaypoints(allPlacesFlat);
                                                    else if (allPlacesFlat.length === 1 && accommodation) openGoogleMapsTransit(accommodation, allPlacesFlat[0]);
                                                }}
                                            >
                                                <Ionicons name="bus-outline" size={18} color="#fff" />
                                                <Text style={styles.transitButtonText}>🗺️ Google Maps'te Toplu Taşıma Göster</Text>
                                            </TouchableOpacity>
                                            <Text style={styles.costSub}>Google Maps uygulaması açılır</Text>
                                        </>
                                    )}
                                </View>

                                {/* Günlük Planlar */}
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
                                            {/* Tek gün için toplu taşıma butonu */}
                                            {!hasTransport && dayPlan.places.length >= 1 && (
                                                <TouchableOpacity
                                                    style={styles.dayTransitBtn}
                                                    onPress={() => {
                                                        const pts = dayPlan.places.filter(p => p.lat && p.lng);
                                                        if (pts.length >= 2) openGoogleMapsWaypoints(pts);
                                                        else if (pts.length === 1 && accommodation) openGoogleMapsTransit(accommodation, pts[0]);
                                                    }}
                                                >
                                                    <Ionicons name="navigate-outline" size={14} color={COLORS.info} />
                                                    <Text style={styles.dayTransitText}>Yol Tarifi</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>

                                        {dayPlan.places.map((place, idx) => (
                                            <View key={place.id} style={styles.planPlace}>
                                                <View style={styles.planPlaceIdx}>
                                                    <Text style={styles.planPlaceIdxText}>{idx + 1}</Text>
                                                </View>
                                                <View style={styles.planPlaceInfo}>
                                                    <Text style={styles.planPlaceName}>{place.name}</Text>
                                                    <Text style={styles.planPlaceMeta}>
                                                        {place.category} · {place.avg_duration}s ·{' '}
                                                        {place.entry_fee > 0 ? `₺${place.entry_fee}` : 'Ücretsiz'}
                                                    </Text>
                                                </View>
                                                {!hasTransport && (
                                                    <TouchableOpacity
                                                        onPress={() => {
                                                            const prev = idx === 0 ? accommodation : dayPlan.places[idx - 1];
                                                            if (prev?.lat && place.lat) openGoogleMapsTransit(prev, place);
                                                        }}
                                                        style={styles.placeNavBtn}
                                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                    >
                                                        <Ionicons name="navigate-outline" size={16} color={COLORS.info} />
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        ))}

                                        {dayPlan.places.length === 0 && (
                                            <Text style={styles.emptyDay}>Bu gün için yer bulunamadı.</Text>
                                        )}
                                    </View>
                                ))}

                                {/* ── Yemek Molaları ── */}
                                {nearbyRestaurants.length > 0 && (
                                    <View style={styles.restaurantSection}>
                                        <Text style={styles.sectionLabel}>🍽️ Yakın Restoranlar</Text>
                                        <Text style={styles.sectionSubLabel}>
                                            Şehir merkezinden ~1.5 km içindeki restoranlar
                                        </Text>
                                        {nearbyRestaurants.map((rest, i) => (
                                            <TouchableOpacity
                                                key={rest.id || i}
                                                style={styles.restaurantCard}
                                                onPress={() => {
                                                    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rest.name)}&center=${rest.lat},${rest.lng}`;
                                                    Linking.openURL(url);
                                                }}
                                                activeOpacity={0.8}
                                            >
                                                <Text style={styles.restaurantEmoji}>{rest.emoji || '🍽️'}</Text>
                                                <View style={styles.restaurantInfo}>
                                                    <Text style={styles.restaurantName} numberOfLines={1}>{rest.name}</Text>
                                                    <Text style={styles.restaurantMeta}>
                                                        {[rest.cuisine, rest.address].filter(Boolean).join(' · ') || rest.categoryLabel}
                                                    </Text>
                                                </View>
                                                {rest.priceRange ? (
                                                    <Text style={styles.restaurantPrice}>{rest.priceRange}</Text>
                                                ) : null}
                                                <Ionicons name="open-outline" size={14} color={COLORS.textLight} />
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}

                                <Button title="Planı Kaydet 💾" onPress={handleSave} loading={saving} style={{ marginTop: SPACING.md }} />
                            </>
                        ) : (
                            <Text style={styles.emptyText}>Plan oluşturulamadı. Geri dönüp tekrar deneyin.</Text>
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Alt Navigasyon */}
            <View style={styles.navBar}>
                {step > 0 && step < STEPS.length - 1 && (
                    <Button title="← Geri" onPress={() => setStep(s => s - 1)} variant="outline" style={styles.navBtn} />
                )}
                {step < STEPS.length - 1 && (
                    <Button title={step === 3 ? 'Plan Oluştur 🗺️' : 'İleri →'} onPress={handleNext} style={[styles.navBtn, step === 0 && styles.navBtnFull]} />
                )}
            </View>
        </KeyboardAvoidingView>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: COLORS.background },
    scroll: { flex: 1 },
    scrollContent: { padding: SPACING.md, paddingBottom: 100 },

    // Progress
    progressBar: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
        paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
        backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.divider,
    },
    progressStep: { alignItems: 'center', flex: 1, position: 'relative' },
    progressDot: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: COLORS.surfaceAlt, borderWidth: 2, borderColor: COLORS.border,
        justifyContent: 'center', alignItems: 'center',
    },
    progressDotActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    progressLabel: { fontSize: 9, color: COLORS.textLight, marginTop: 4, textAlign: 'center' },
    progressLabelActive: { color: COLORS.primary, fontFamily: 'Inter_600SemiBold' },
    progressLine: {
        position: 'absolute', top: 14, left: '60%', right: '-40%',
        height: 2, backgroundColor: COLORS.border, zIndex: -1,
    },
    progressLineActive: { backgroundColor: COLORS.primary },

    // Step headers
    stepTitle: {
        fontSize: FONT_SIZES.xl, fontFamily: FONTS.heading,
        color: COLORS.textPrimary, marginBottom: SPACING.xs,
    },
    stepDesc: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginBottom: SPACING.md },

    // City grid
    cityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
    cityCard: {
        flex: 1, minWidth: '30%', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md, alignItems: 'center', borderWidth: 2, borderColor: COLORS.border,
        position: 'relative',
    },
    cityCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '08' },
    cityEmoji: { fontSize: 30, marginBottom: 6 },
    cityName: { fontSize: FONT_SIZES.md, fontFamily: 'Inter_600SemiBold', color: COLORS.textPrimary },
    cityNameActive: { color: COLORS.primary },
    cityRegion: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
    cityCheck: { position: 'absolute', top: 6, right: 6 },

    // Cards
    card: {
        backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md, marginBottom: SPACING.sm,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    },
    cardTitle: {
        fontSize: FONT_SIZES.md, fontFamily: 'Inter_600SemiBold',
        color: COLORS.textPrimary, marginBottom: SPACING.sm,
    },
    cardLabel: { fontSize: FONT_SIZES.md, fontFamily: 'Inter_500Medium', color: COLORS.textPrimary },

    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    prefInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, flex: 1, paddingRight: SPACING.sm },
    prefName: { fontSize: FONT_SIZES.md, fontFamily: 'Inter_600SemiBold', color: COLORS.textPrimary },
    prefDesc: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },

    // Place list
    placeRow: {
        flexDirection: 'row', alignItems: 'center', padding: SPACING.sm,
        backgroundColor: COLORS.surfaceAlt, borderRadius: BORDER_RADIUS.md,
        marginTop: SPACING.xs, borderWidth: 1, borderColor: COLORS.border,
    },
    placeRowActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '08' },
    placeInfo: { flex: 1 },
    placeName: { fontSize: FONT_SIZES.sm, fontFamily: 'Inter_500Medium', color: COLORS.textPrimary },
    placeMeta: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },

    // Day selector
    daySelectorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: SPACING.xl },
    dayDisplay: { alignItems: 'center', marginHorizontal: SPACING.xl },
    dayNumber: { fontSize: 56, fontFamily: 'Inter_700Bold', color: COLORS.primary },
    dayLabel: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, justifyContent: 'center' },
    chip: {
        paddingHorizontal: 16, paddingVertical: 8, borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border,
    },
    chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    chipText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontFamily: 'Inter_500Medium' },
    chipTextActive: { color: '#fff', fontFamily: 'Inter_600SemiBold' },

    // Map
    sectionLabel: { fontSize: FONT_SIZES.sm, fontFamily: 'Inter_600SemiBold', color: COLORS.textPrimary, marginBottom: SPACING.sm, marginTop: SPACING.md },
    mapContainer: { height: 220, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', position: 'relative', marginBottom: SPACING.sm },
    map: { flex: 1 },
    mapLoading: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    mapHint: {
        position: 'absolute', bottom: SPACING.sm, left: SPACING.sm, right: SPACING.sm,
        backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: BORDER_RADIUS.md,
    },
    mapHintText: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, textAlign: 'center' },

    // Selected badge
    selectedBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: COLORS.success + '15', paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.sm,
    },
    selectedText: { flex: 1, fontSize: FONT_SIZES.sm, fontFamily: 'Inter_500Medium', color: COLORS.success },
    selectedCoord: { fontSize: 10, color: COLORS.textLight, fontFamily: 'Inter_400Regular' },

    // Google Maps Picker
    googleMapsPickerBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: '#4285F4',
        borderRadius: BORDER_RADIUS.md, paddingVertical: 12, paddingHorizontal: 16,
        marginTop: SPACING.sm,
        shadowColor: '#4285F4', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
    },
    googleMapsPickerBtnText: { fontSize: FONT_SIZES.md, fontFamily: 'Inter_600SemiBold', color: '#fff', flex: 1, textAlign: 'center' },
    orText: { textAlign: 'center', fontSize: FONT_SIZES.xs, color: COLORS.textLight, fontFamily: 'Inter_400Regular', marginVertical: SPACING.sm },
    coordInputRow: { flexDirection: 'row', gap: SPACING.sm },
    coordInputWrap: { flex: 1 },
    coordLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontFamily: 'Inter_500Medium', marginBottom: 4 },
    coordInput: {
        borderWidth: 1.5, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.md,
        paddingHorizontal: 12, paddingVertical: 10,
        fontSize: FONT_SIZES.sm, fontFamily: 'Inter_400Regular', color: COLORS.textPrimary,
        backgroundColor: COLORS.background,
    },
    cardDesc: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontFamily: 'Inter_400Regular', marginBottom: SPACING.sm },

    // Empty card
    emptyCard: {
        alignItems: 'center', paddingVertical: SPACING.lg,
        backgroundColor: COLORS.surfaceAlt, borderRadius: BORDER_RADIUS.md,
    },
    emptySubText: { fontSize: FONT_SIZES.xs, color: COLORS.textLight, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 4, paddingHorizontal: SPACING.md },

    // Hotels
    hotelCard: {
        flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
        backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md,
        padding: SPACING.sm, marginBottom: SPACING.xs,
        borderWidth: 1.5, borderColor: COLORS.border,
    },
    hotelCardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '08' },
    hotelIcon: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: COLORS.primaryMuted, justifyContent: 'center', alignItems: 'center',
    },
    hotelIconSelected: { backgroundColor: COLORS.primary },
    hotelInfo: { flex: 1 },
    hotelName: { fontSize: FONT_SIZES.sm, fontFamily: 'Inter_600SemiBold', color: COLORS.textPrimary },
    hotelMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    hotelStars: { fontSize: 10 },
    hotelDist: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
    hotelAddr: { fontSize: FONT_SIZES.xs, color: COLORS.textLight, marginTop: 2 },

    // Transport
    transitHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
    transitDesc: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, lineHeight: 20, marginBottom: SPACING.sm },
    transitFeatures: { gap: 6, marginBottom: SPACING.sm },
    transitFeatureRow: { flexDirection: 'row', alignItems: 'center' },
    transitFeatureText: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary },
    infoBox: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 6,
        backgroundColor: COLORS.info + '12', padding: SPACING.sm, borderRadius: BORDER_RADIUS.md,
    },
    infoText: { flex: 1, fontSize: FONT_SIZES.xs, color: COLORS.info, lineHeight: 16 },

    // Fuel inputs
    inputRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
    inputGroup: { flex: 1 },
    inputLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginBottom: 4 },
    input: {
        backgroundColor: COLORS.surfaceAlt, borderRadius: BORDER_RADIUS.md,
        paddingHorizontal: 12, paddingVertical: 10,
        fontSize: FONT_SIZES.md, color: COLORS.textPrimary,
        borderWidth: 1, borderColor: COLORS.border,
    },

    // Plan summary
    planLoading: { alignItems: 'center', paddingVertical: SPACING.xl },
    loadingText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: SPACING.sm },
    summaryCard: {
        backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md, marginBottom: SPACING.sm,
    },
    summaryCity: { fontSize: FONT_SIZES.lg, fontFamily: FONTS.heading, color: '#fff', marginBottom: SPACING.sm },
    summaryStats: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
    summaryStat: { alignItems: 'center' },
    summaryValue: { fontSize: FONT_SIZES.lg, fontFamily: 'Inter_700Bold', color: '#fff' },
    summaryLabel: { fontSize: FONT_SIZES.xs, color: '#fff', opacity: 0.8 },
    summaryDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.3)' },

    // Cost card
    costCard: {
        backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md, marginBottom: SPACING.sm,
        borderWidth: 1, borderColor: COLORS.border,
    },
    costTitle: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontFamily: 'Inter_500Medium' },
    costValue: { fontSize: FONT_SIZES.xl, fontFamily: 'Inter_700Bold', color: COLORS.textPrimary, marginTop: 2 },
    costSub: { fontSize: FONT_SIZES.xs, color: COLORS.textLight, marginTop: 4 },
    costDivider: { height: 1, backgroundColor: COLORS.divider, marginVertical: SPACING.sm },
    transitButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: SPACING.sm, backgroundColor: COLORS.info,
        paddingVertical: 12, paddingHorizontal: 16, borderRadius: BORDER_RADIUS.md,
        marginTop: SPACING.xs,
    },
    transitButtonText: { color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: FONT_SIZES.sm },

    // Day card
    dayCard: {
        backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md, marginBottom: SPACING.sm,
        borderWidth: 1, borderColor: COLORS.border,
    },
    dayHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
    dayBadge: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
    },
    dayBadgeText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: FONT_SIZES.md },
    dayTitle: { fontSize: FONT_SIZES.md, fontFamily: 'Inter_600SemiBold', color: COLORS.textPrimary },
    dayMeta: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
    dayTransitBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        marginLeft: 'auto', backgroundColor: COLORS.info + '15',
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: BORDER_RADIUS.full,
    },
    dayTransitText: { fontSize: FONT_SIZES.xs, color: COLORS.info, fontFamily: 'Inter_500Medium' },

    // Plan places
    planPlace: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 6 },
    planPlaceIdx: {
        width: 26, height: 26, borderRadius: 13,
        backgroundColor: COLORS.surfaceAlt, justifyContent: 'center', alignItems: 'center',
    },
    planPlaceIdxText: { fontSize: FONT_SIZES.xs, fontFamily: 'Inter_600SemiBold', color: COLORS.textSecondary },
    planPlaceInfo: { flex: 1 },
    planPlaceName: { fontSize: FONT_SIZES.sm, fontFamily: 'Inter_500Medium', color: COLORS.textPrimary },
    planPlaceMeta: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
    placeNavBtn: { padding: 4 },
    emptyDay: { fontSize: FONT_SIZES.sm, color: COLORS.textLight, textAlign: 'center', paddingVertical: SPACING.sm },
    emptyText: { fontSize: FONT_SIZES.sm, color: COLORS.textLight, textAlign: 'center', paddingVertical: SPACING.lg },

    // Navigation
    navBar: {
        flexDirection: 'row', gap: SPACING.sm, padding: SPACING.md,
        backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.divider,
        shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, elevation: 8,
    },
    navBtn: { flex: 1 },
    navBtnFull: { flex: 1 },

    // ─── Tarih Seçici ───
    datePickerButton: {
        flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
        backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md, marginTop: SPACING.md,
        borderWidth: 1.5, borderColor: COLORS.primary + '40',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    },
    datePickerLabel: {
        fontSize: FONT_SIZES.xs, color: COLORS.textSecondary,
        fontFamily: 'Inter_400Regular',
    },
    datePickerValue: {
        fontSize: FONT_SIZES.sm, color: COLORS.textPrimary,
        fontFamily: 'Inter_600SemiBold', marginTop: 2,
    },
    dateRangeRow: {
        flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
        backgroundColor: COLORS.primaryMuted, borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md, marginTop: SPACING.sm,
    },
    dateRangeItem: { alignItems: 'center', flex: 1 },
    dateRangeLabel: {
        fontSize: 10, color: COLORS.textSecondary,
        fontFamily: 'Inter_400Regular', marginBottom: 2,
    },
    dateRangeValue: {
        fontSize: FONT_SIZES.sm, fontFamily: 'Inter_700Bold',
        color: COLORS.textPrimary,
    },
    dateRangeDivider: { width: 1, height: 28, backgroundColor: COLORS.border },

    // ─── Inline Takvim ───
    calendarContainer: {
        backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md, marginTop: SPACING.sm,
        borderWidth: 1, borderColor: COLORS.border,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    },
    calendarHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: SPACING.md,
    },
    calendarMonthLabel: {
        fontFamily: 'Inter_600SemiBold', fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
    },
    calendarDayNames: {
        flexDirection: 'row', marginBottom: SPACING.xs,
    },
    calendarDayName: {
        flex: 1, textAlign: 'center', fontSize: FONT_SIZES.xs,
        fontFamily: 'Inter_600SemiBold', color: COLORS.textSecondary,
    },
    calendarGrid: {
        flexDirection: 'row', flexWrap: 'wrap',
    },
    calendarCell: {
        width: `${100 / 7}%`, aspectRatio: 1,
        justifyContent: 'center', alignItems: 'center',
        borderRadius: BORDER_RADIUS.sm,
    },
    calendarCellSelected: {
        backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md,
    },
    calendarCellInRange: {
        backgroundColor: COLORS.primaryMuted,
    },
    calendarCellText: {
        fontSize: FONT_SIZES.sm, fontFamily: 'Inter_400Regular',
        color: COLORS.textPrimary,
    },
    calendarCellTextSelected: {
        color: '#fff', fontFamily: 'Inter_700Bold',
    },
    calendarCellTextInRange: {
        color: COLORS.primary, fontFamily: 'Inter_500Medium',
    },
    calendarCellTextPast: {
        color: COLORS.textLight, opacity: 0.4,
    },

    // ─── Restoran Önerileri ───
    restaurantSection: {
        marginTop: SPACING.md,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        borderWidth: 1, borderColor: COLORS.border,
    },
    sectionLabel: {
        fontFamily: 'Inter_600SemiBold', fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary, marginBottom: 2,
    },
    sectionSubLabel: {
        fontFamily: 'Inter_400Regular', fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary, marginBottom: SPACING.sm,
    },
    restaurantCard: {
        flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
        paddingVertical: SPACING.sm,
        borderTopWidth: 1, borderTopColor: COLORS.divider,
    },
    restaurantEmoji: { fontSize: 22, width: 30, textAlign: 'center' },
    restaurantInfo: { flex: 1 },
    restaurantName: {
        fontFamily: 'Inter_600SemiBold', fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
    },
    restaurantMeta: {
        fontFamily: 'Inter_400Regular', fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary, marginTop: 2,
    },
    restaurantPrice: {
        fontFamily: 'Inter_600SemiBold', fontSize: FONT_SIZES.xs,
        color: COLORS.success,
    },
});

export default CreateItineraryScreen;
