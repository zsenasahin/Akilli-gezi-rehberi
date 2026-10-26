import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, Alert, RefreshControl, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONT_SIZES, FONTS } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/layout';
import { getCityCenter } from '../../constants/cities';
import { getCityImages } from '../../services/cityImageService';
import {
    getItineraryById,
    toggleItemCompletion,
    removeItineraryItem,
    addItineraryItem,
    updateItineraryStatus,
    updateItineraryPlan,
    getItinerariesByUser,
} from '../../services/itineraryService';
import { buildBadges } from '../../services/achievementService';
import BadgeEarnedModal from '../../components/common/BadgeEarnedModal';
import { loadCityPlaces } from '../../services/placeDataManager';
import { getMealSuggestions } from '../../data/repositories/placeRepository';
import { suggestAlternative, estimateTotalBudget, rescheduleDay, getTripMeta } from '../../domain/itineraryGenerator';
import { getTransportProfile, getPaceProfile } from '../../algorithms/travelProfiles';
import { formatDate } from '../../utils/formatters';
import { addDays, formatDayMonth, formatDayMonthWeekday, parseLocalDate, toLocalISODate } from '../../utils/dateUtils';
import { shareItinerary } from '../../utils/shareManager';
import Button from '../../components/common/Button';
import { ItineraryDetailSkeleton } from '../../components/common/SkeletonLoader';
import ErrorMessage from '../../components/common/ErrorMessage';
import { useThemePreference } from '../../contexts/ThemeContext';
import ConfettiOverlay from '../../components/common/ConfettiOverlay';
import SmartImage from '../../components/common/SmartImage';
import CompletePlanSheet from '../../components/itinerary/CompletePlanSheet';
import { createThemedStyles } from '../../utils/themedStyles';

function formatDurationText(hours) {
    if (!hours || hours <= 0) return '1 sa';
    if (hours < 1) return `${Math.round(hours * 60)} dk`;
    return `${Math.round(hours * 10) / 10} sa`;
}

function formatMinutes(minutes) {
    if (!minutes || minutes <= 0) return '0 dk';
    if (minutes < 60) return `${minutes} dk`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours} sa ${rest} dk` : `${hours} sa`;
}

const formatMoney = (amount) => `₺${Math.round(amount || 0).toLocaleString('tr-TR')}`;

const isNumericId = (id) => id != null && id !== '' && !isNaN(Number(id));

// Yeme-içme mekanları rota durağı değildir; "Alternatif" önerisinde de
// müze yerine restoran önermemek için elenir.
const isVisitablePlace = (place) => {
    const category = String(place?.category || '').toLocaleLowerCase('tr-TR');
    return !['restoran', 'restaurant', 'kafe', 'cafe', 'fast_food', 'bar'].includes(category);
};

const placeDurationHours = (place) => (
    place?.duration_minutes ? place.duration_minutes / 60 : (place?.avg_duration ?? 1)
);

const ItineraryDetailScreen = ({ route, navigation }) => {
    const { itineraryId } = route.params;
    const insets = useSafeAreaInsets();
    useThemePreference();

    const [itinerary, setItinerary] = useState(null);
    const [allCityPlaces, setAllCityPlaces] = useState([]);
    const [mealSuggestions, setMealSuggestions] = useState({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [pendingBadge, setPendingBadge] = useState(null);
    const [newlyEarnedBadge, setNewlyEarnedBadge] = useState(null);
    const [completeSheetVisible, setCompleteSheetVisible] = useState(false);

    const cityName = itinerary?.cities?.name || '';
    const tripMeta = React.useMemo(() => getTripMeta(itinerary?.plan), [itinerary?.plan]);
    const transport = getTransportProfile(tripMeta?.transportMode ?? (itinerary?.has_transport ? 'driving' : 'transit'));
    const paceProfile = getPaceProfile(tripMeta?.pace);
    const hasPlanJson = Array.isArray(itinerary?.plan) && itinerary.plan.some(day => day?.places?.length);

    // ─── Gün grupları ───────────────────────────────────────────────────────
    // Plan JSONB, sıra ve saatlerin kaynağıdır. Supabase'teki itinerary_items ise
    // (varsa) tamamlanma durumunu ve DB işlemleri için ID'leri sağlar.
    const dayGroups = React.useMemo(() => {
        const dbItems = itinerary?.itinerary_items || [];

        if (hasPlanJson) {
            const matched = new Set();
            return itinerary.plan.map(dayPlan => {
                const items = (dayPlan.places || []).map((place, idx) => {
                    const dbItem = dbItems.find(item =>
                        !matched.has(item.id)
                        && item.day_number === dayPlan.day
                        && String(item.place_id) === String(place.id)
                    );
                    if (dbItem) matched.add(dbItem.id);
                    return {
                        id: dbItem?.id ?? `plan-${dayPlan.day}-${idx}`,
                        dbItemId: dbItem?.id ?? null,
                        planIndex: idx,
                        day_number: dayPlan.day,
                        order_index: idx,
                        is_completed: dbItem ? !!dbItem.is_completed : !!place.is_completed,
                        place_id: place.id,
                        places: {
                            ...dbItem?.places,
                            ...place,
                            image_url: place.image_url || place.imageUrl || dbItem?.places?.image_url,
                            avg_duration: placeDurationHours(place),
                        },
                        timing: place.arrivalTime ? {
                            arrivalTime: place.arrivalTime,
                            departureTime: place.departureTime,
                            travelMinutes: place.travelMinutesFromPrev ?? place._travelMinutes ?? 0,
                            travelMode: place.travelModeFromPrev,
                            travelDistanceKm: place.travelDistanceKmFromPrev,
                        } : null,
                        isOverflow: !!place.isOverflow,
                    };
                });

                // Plan JSONB'de olmayan eski DB kayıtları kaybolmasın (ör. önceki sürümde eklenen yerler)
                dbItems
                    .filter(item => item.day_number === dayPlan.day && !matched.has(item.id))
                    .forEach(item => {
                        matched.add(item.id);
                        items.push({ ...item, dbItemId: item.id, planIndex: null, timing: null, isOverflow: false });
                    });

                return {
                    day: dayPlan.day,
                    date: dayPlan.date || null,
                    breaks: dayPlan.breaks || [],
                    totalDistance: dayPlan.totalDistance || 0,
                    totalTravelMinutes: dayPlan.totalTravelMinutes || 0,
                    transitLegs: dayPlan.transitLegs || 0,
                    endTime: dayPlan.endTime,
                    startTime: dayPlan.startTime,
                    items,
                };
            });
        }

        // Eski planlar: yalnızca itinerary_items
        const groups = {};
        [...dbItems]
            .sort((a, b) => a.day_number - b.day_number || a.order_index - b.order_index)
            .forEach((item) => {
                if (!groups[item.day_number]) groups[item.day_number] = [];
                groups[item.day_number].push({ ...item, dbItemId: item.id, planIndex: null, timing: null });
            });
        return Object.entries(groups).map(([day, items]) => ({ day: Number(day), date: null, breaks: [], items }));
    }, [itinerary, hasPlanJson]);

    // Kayıtlı plan tarih içermiyorsa başlangıç tarihinden türet
    const dayDate = useCallback((group) => {
        if (group.date) return group.date;
        const start = parseLocalDate(itinerary?.start_date);
        return start ? toLocalISODate(addDays(start, group.day - 1)) : null;
    }, [itinerary?.start_date]);

    const allItems = React.useMemo(() => dayGroups.flatMap(g => g.items), [dayGroups]);

    const progress = React.useMemo(() => {
        const total = allItems.length;
        const completed = allItems.filter((i) => i.is_completed).length;
        return { completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
    }, [allItems]);

    const budget = React.useMemo(() => {
        const totalFee = allItems.reduce((s, i) => s + (Number(i.places?.entry_fee) || 0), 0);
        return estimateTotalBudget({
            entryFees: totalFee,
            distanceKm: dayGroups.reduce((s, g) => s + (g.totalDistance || 0), 0),
            transitLegs: dayGroups.reduce((s, g) => s + (g.transitLegs || 0), 0),
            days: itinerary?.days ?? 1,
            transportMode: transport.key,
        });
    }, [allItems, dayGroups, itinerary?.days, transport.key]);

    const scheduleOptions = React.useMemo(() => {
        const center = getCityCenter(cityName);
        const hasStart = itinerary?.start_location_lat != null && itinerary?.start_location_lng != null;
        return {
            transportMode: transport.key,
            pace: paceProfile.key,
            startDate: tripMeta?.startDate ?? itinerary?.start_date ?? null,
            startLocation: hasStart
                ? { latitude: itinerary.start_location_lat, longitude: itinerary.start_location_lng }
                : undefined,
            returnToHotel: hasStart,
            cityLat: tripMeta?.cityLat ?? center.lat,
            cityLng: tripMeta?.cityLng ?? center.lng,
        };
    }, [cityName, itinerary, transport.key, paceProfile.key, tripMeta]);

    // ─── Veri yükleme ───────────────────────────────────────────────────────
    const loadSupplementalData = useCallback(async (data) => {
        if (!data?.city_id) return;
        const name = data.cities?.name || '';

        try {
            const cityPlaces = await loadCityPlaces({ id: data.city_id, name });
            setAllCityPlaces((cityPlaces || []).filter(isVisitablePlace));
        } catch (placesError) {
            console.warn('Plan alternatif yerleri yüklenemedi:', placesError.message);
            setAllCityPlaces([]);
        }

        try {
            const planDays = Array.isArray(data.plan) && data.plan.some(day => day?.places?.length)
                ? data.plan.map(day => ({ day: day.day, places: day.places || [], breaks: day.breaks || [] }))
                : Object.values((data.itinerary_items || []).reduce((acc, item) => {
                    acc[item.day_number] = acc[item.day_number] || { day: item.day_number, places: [], breaks: [] };
                    acc[item.day_number].places.push({ ...item.places, order_index: item.order_index });
                    return acc;
                }, {})).map(day => ({ ...day, places: day.places.sort((a, b) => a.order_index - b.order_index) }));

            // Günler sırayla işlenir: aynı restoran/tatlıcı farklı günlerde tekrar önerilmez.
            const alreadySuggested = new Set();
            const mealEntries = [];
            const sortedDays = [...planDays].sort((a, b) => a.day - b.day);
            for (const [dayIndex, day] of sortedDays.entries()) {
                const usedIds = day.places.map(p => String(p.id));
                // Plan motorunun yerleştirdiği öğle arası varsa öneri oraya göre aranır.
                const lunchBreak = day.breaks.find(b => b.type === 'lunch');
                const meal = await getMealSuggestions(data.city_id, name, usedIds, day.places, dayIndex, alreadySuggested);
                if (lunchBreak) meal.lunchAfterIndex = Math.max(0, lunchBreak.afterIndex);
                mealEntries.push([day.day, meal]);
            }
            setMealSuggestions(Object.fromEntries(mealEntries));
        } catch (mealError) {
            console.warn('Yemek önerileri yüklenemedi:', mealError.message);
            setMealSuggestions({});
        }
    }, []);

    const fetchData = useCallback(async ({ withSupplemental = true } = {}) => {
        setError(null);
        try {
            const { data, error: fetchError } = await getItineraryById(itineraryId);
            if (fetchError) {
                setError('Plan yüklenirken hata oluştu.');
                return;
            }
            setItinerary(data);
            if (withSupplemental) loadSupplementalData(data);
        } catch (fetchError) {
            console.warn('Plan detayı yüklenemedi:', fetchError.message);
            setError('Plan yüklenirken hata oluştu.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [itineraryId, loadSupplementalData]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ─── Plan düzenleme yardımcıları ────────────────────────────────────────
    const persistPlan = async (updatedPlan) => {
        const { error: updateError } = await updateItineraryPlan(itinerary.id, updatedPlan);
        if (updateError) {
            Alert.alert('Hata', 'Plan güncellenemedi. Bağlantınızı kontrol edip tekrar deneyin.');
            return false;
        }
        setItinerary(prev => ({ ...prev, plan: updatedPlan }));
        return true;
    };

    /** Bir günün yer listesini değiştirir ve saatlerini yeniden hesaplar. */
    const buildPlanWithDay = (dayNumber, newPlaces) => itinerary.plan.map(dayPlan => {
        if (dayPlan.day !== dayNumber) return dayPlan;
        const rescheduled = rescheduleDay(newPlaces, dayNumber, scheduleOptions);
        return {
            ...dayPlan,
            ...rescheduled,
            date: dayPlan.date ?? rescheduled.date,
            ...(dayPlan.tripMeta ? { tripMeta: dayPlan.tripMeta } : {}),
        };
    });

    const dayPlacesOf = (dayNumber) => itinerary.plan.find(d => d.day === dayNumber)?.places || [];

    const handleToggleCompletion = async (item) => {
        const newValue = !item.is_completed;

        if (item.dbItemId) {
            const { error: toggleError } = await toggleItemCompletion(item.dbItemId, newValue);
            if (toggleError) { Alert.alert('Hata', 'Durum güncellenirken hata oluştu.'); return; }
            setItinerary((prev) => ({
                ...prev,
                itinerary_items: (prev.itinerary_items || []).map((i) =>
                    String(i.id) === String(item.dbItemId) ? { ...i, is_completed: newValue } : i
                ),
            }));
            return;
        }

        if (item.planIndex == null) return;
        const updatedPlan = itinerary.plan.map(day => day.day !== item.day_number ? day : ({
            ...day,
            places: day.places.map((p, idx) => idx === item.planIndex ? { ...p, is_completed: newValue } : p),
        }));
        await persistPlan(updatedPlan);
    };

    const handleRemoveItem = (item) => {
        Alert.alert('Yeri Kaldır', `"${item.places?.name}" planından çıkarılsın mı? Günün saatleri yeniden hesaplanacak.`, [
            { text: 'İptal', style: 'cancel' },
            {
                text: 'Kaldır', style: 'destructive',
                onPress: async () => {
                    setBusy(true);
                    try {
                        if (item.dbItemId) {
                            const { error: removeError } = await removeItineraryItem(item.dbItemId);
                            if (removeError) { Alert.alert('Hata', 'Yer kaldırılırken hata oluştu.'); return; }
                            setItinerary(prev => ({
                                ...prev,
                                itinerary_items: (prev.itinerary_items || []).filter(i => i.id !== item.dbItemId),
                            }));
                        }
                        if (hasPlanJson && item.planIndex != null) {
                            const remaining = dayPlacesOf(item.day_number).filter((_, idx) => idx !== item.planIndex);
                            await persistPlan(buildPlanWithDay(item.day_number, remaining));
                        }
                    } finally {
                        setBusy(false);
                    }
                },
            },
        ]);
    };

    const handleSuggestAlternative = (item) => {
        const usedIds = allItems.map(i => i.place_id);
        const suggestion = suggestAlternative(
            allCityPlaces, usedIds, item.places?.category,
            item.places?.lat, item.places?.lng    // mesafe tabanlı öneri
        );
        if (!suggestion) { Alert.alert('Bilgi', 'Bu durak için uygun bir alternatif bulunamadı.'); return; }

        const canStoreInDb = isNumericId(suggestion.id);
        if (!hasPlanJson && !canStoreInDb) {
            Alert.alert('Bilgi', 'Bu plan eski formatta olduğu için alternatif eklenemiyor. Yeni bir plan oluşturabilirsiniz.');
            return;
        }

        const distanceText = suggestion._dist != null ? `\nUzaklık: ${suggestion._dist.toFixed(1)} km` : '';
        Alert.alert(
            'Alternatif Öneri',
            `"${item.places?.name}" yerine "${suggestion.name}" önerildi.\n\nKategori: ${suggestion.category || '—'}\nSüre: ${formatDurationText(placeDurationHours(suggestion))}\nGiriş: ${suggestion.entry_fee > 0 ? formatMoney(suggestion.entry_fee) : 'Ücretsiz / bilgi yok'}${distanceText}`,
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Değiştir',
                    onPress: async () => {
                        setBusy(true);
                        try {
                            if (item.dbItemId) await removeItineraryItem(item.dbItemId);
                            if (canStoreInDb) {
                                await addItineraryItem(itinerary.id, Number(suggestion.id), item.day_number, item.order_index);
                            }
                            if (hasPlanJson && item.planIndex != null) {
                                const { _dist, is_completed, ...cleanSuggestion } = suggestion;
                                const replaced = dayPlacesOf(item.day_number)
                                    .map((p, idx) => (idx === item.planIndex ? cleanSuggestion : p));
                                await persistPlan(buildPlanWithDay(item.day_number, replaced));
                            }
                            await fetchData({ withSupplemental: false });
                        } finally {
                            setBusy(false);
                        }
                    },
                },
            ]
        );
    };

    const handleCompleteItinerary = () => setCompleteSheetVisible(true);

    // CompletePlanSheet'in onay adımı çağırır; `{ error }` dönerse panel hatayı gösterir.
    const confirmCompleteItinerary = async () => {
        // Rozet kontrolü için önceki hali al
        const { data: oldData } = await getItinerariesByUser(itinerary.user_id);
        const oldEarnedKeys = buildBadges(oldData || []).badges.filter(b => b.earned).map(b => b.key);

        const { error: statusError } = await updateItineraryStatus(itinerary.id, 'completed');
        if (statusError) return { error: statusError };
        setItinerary(prev => ({ ...prev, status: 'completed' }));

        // Yeni rozet kontrolü — konfeti panel kapandıktan sonra oynar
        const { data: newData } = await getItinerariesByUser(itinerary.user_id);
        const newEarnedBadges = buildBadges(newData || []).badges.filter(b => b.earned && !oldEarnedKeys.includes(b.key));
        if (newEarnedBadges.length > 0) setPendingBadge(newEarnedBadges[0]);
        return {};
    };

    const closeCompleteSheet = ({ leave = false } = {}) => {
        setCompleteSheetVisible(false);
        if (pendingBadge) { setShowConfetti(true); return; }
        if (leave) navigation.goBack();
    };

    // ─── Google Maps Rota ───────────────────────────────────────────────────
    // Gün bazlı rota açılır: çok günlük planı tek rotaya sıkıştırmak Google'ın
    // 9 ara nokta sınırına takılıyor ve günleri birbirine karıştırıyordu.
    const openDayRouteInMaps = (group) => {
        const stops = (group?.items || [])
            .filter(i => !i.is_completed && i.places?.lat && i.places?.lng)
            .map(i => ({ lat: i.places.lat, lng: i.places.lng }));

        if (stops.length === 0) {
            const center = getCityCenter(cityName);
            Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${center.lat},${center.lng}`);
            return;
        }

        const mode = transport.googleMode;
        const coord = (p) => `${p.lat},${p.lng}`;
        // Google Maps toplu taşıma modunda ara noktaları desteklemez; bu durumda
        // sıradaki durağa yol tarifi açılır.
        if (mode === 'transit' || stops.length === 1) {
            Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${coord(stops[0])}&travelmode=${mode}`);
            return;
        }

        const hotel = scheduleOptions.startLocation
            ? { lat: scheduleOptions.startLocation.latitude, lng: scheduleOptions.startLocation.longitude }
            : null;
        const destination = hotel || stops[stops.length - 1];
        const waypoints = (hotel ? stops : stops.slice(0, -1)).slice(0, 9).map(coord).join('|');
        const url = `https://www.google.com/maps/dir/?api=1&destination=${coord(destination)}`
            + (waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : '')
            + `&travelmode=${mode}`;
        Linking.openURL(url);
    };

    const openPlaceDirections = (place) => {
        Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}&travelmode=${transport.googleMode}`);
    };

    const handleShare = () => {
        shareItinerary({
            cityName: cityName || 'Gezi',
            days: itinerary.days,
            itineraryId: itinerary.id,
            dayGroups: dayGroups.map(group => ({ ...group, date: dayDate(group) })),
            transportLabel: transport.label,
        });
    };

    if (loading) return <ItineraryDetailSkeleton />;
    if (!itinerary) return <ErrorMessage message={error || 'Plan bulunamadı.'} />;

    const isCompleted = itinerary.status === 'completed';
    const routeItems = allItems.filter((item) => item.places?.lat && item.places?.lng);
    const cityImages = getCityImages(itinerary.cities?.name, itinerary.cities?.region);
    const activeDay = dayGroups.find(g => g.items.some(i => !i.is_completed)) || dayGroups[0];
    const firstDate = dayGroups[0] ? dayDate(dayGroups[0]) : null;
    const lastDate = dayGroups.length ? dayDate(dayGroups[dayGroups.length - 1]) : null;
    const tripDateText = firstDate
        ? (firstDate === lastDate ? formatDayMonth(firstDate) : `${formatDayMonth(firstDate)} – ${formatDayMonth(lastDate)}`)
        : formatDate(itinerary.created_at);
    const unscheduled = tripMeta?.selectionMode === 'manual' ? (tripMeta?.unscheduled || []) : [];

    return (
        <View style={styles.container}>
            {/* ─── Sticky Header ─── */}
            <View style={[styles.stickyHeader, { paddingTop: insets.top + SPACING.xs }]}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => navigation.goBack()}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityLabel="Geri"
                >
                    <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.stickyTitle} numberOfLines={1}>
                    {cityName || 'Plan Detayı'}
                </Text>
                <TouchableOpacity
                    style={styles.shareBtn}
                    onPress={handleShare}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityLabel="Planı paylaş"
                >
                    <Ionicons name="share-outline" size={22} color={COLORS.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.contentContainer}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); fetchData(); }}
                        tintColor={COLORS.primary}
                    />
                }
            >
                {error && <ErrorMessage message={error} />}

                {/* Tek üst kart: özet + rota aksiyonları */}
                <View style={styles.overviewCard}>
                    <View style={styles.overviewVisual}>
                        <SmartImage
                            uri={itinerary.cities?.image_url || cityImages.hero || cityImages.card}
                            fallbackUri={cityImages?.fallbackHero || cityImages?.fallbackCard}
                            style={styles.overviewImage}
                            contentFit="cover"
                            transition={400}
                        />
                        <LinearGradient
                            colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.45)']}
                            style={styles.overviewImageOverlay}
                        />
                        <View style={styles.overviewTopRow}>
                            <View>
                                <Text style={styles.overviewEyebrow}>GEZİ PLANI</Text>
                                <Text style={styles.overviewTitle}>📍 {cityName || 'Şehir'}</Text>
                            </View>
                            <View style={[styles.statusBadge, isCompleted && styles.statusCompleted]}>
                                <Text style={styles.statusText}>{isCompleted ? 'Tamamlandı' : 'Devam Ediyor'}</Text>
                            </View>
                        </View>
                        <View style={styles.overviewChipsRow}>
                            <View style={styles.overviewChip}>
                                <Ionicons name="calendar-outline" size={12} color="#fff" />
                                <Text style={styles.overviewChipText}>{tripDateText}</Text>
                            </View>
                            <View style={styles.overviewChip}>
                                <Ionicons name={transport.icon} size={12} color="#fff" />
                                <Text style={styles.overviewChipText}>{transport.label}</Text>
                            </View>
                            {tripMeta?.pace && (
                                <View style={styles.overviewChip}>
                                    <Ionicons name={paceProfile.icon} size={12} color="#fff" />
                                    <Text style={styles.overviewChipText}>{paceProfile.label} tempo</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <View style={styles.overviewBody}>
                        <View style={styles.overviewStatsRow}>
                            <View style={styles.overviewStatItem}>
                                <Ionicons name="calendar-outline" size={15} color={COLORS.primary} />
                                <Text style={styles.overviewStatValue}>{itinerary.days}</Text>
                                <Text style={styles.overviewStatLabel}>Gün</Text>
                            </View>
                            <View style={styles.overviewStatDivider} />
                            <View style={styles.overviewStatItem}>
                                <Ionicons name="location-outline" size={15} color={COLORS.primary} />
                                <Text style={styles.overviewStatValue}>{allItems.length}</Text>
                                <Text style={styles.overviewStatLabel}>Durak</Text>
                            </View>
                            <View style={styles.overviewStatDivider} />
                            <View style={styles.overviewStatItem}>
                                <Ionicons name="checkmark-circle-outline" size={15} color={COLORS.primary} />
                                <Text style={styles.overviewStatValue}>{progress.completed}</Text>
                                <Text style={styles.overviewStatLabel}>Tamam</Text>
                            </View>
                            <View style={styles.overviewStatDivider} />
                            <View style={styles.overviewStatItem}>
                                <Ionicons name="trending-up-outline" size={15} color={COLORS.primary} />
                                <Text style={styles.overviewStatValue}>{progress.percentage}%</Text>
                                <Text style={styles.overviewStatLabel}>İlerleme</Text>
                            </View>
                        </View>

                        <View style={styles.overviewProgressTrack}>
                            <View style={[styles.overviewProgressFill, { width: `${progress.percentage}%` }]} />
                        </View>

                        <TouchableOpacity
                            style={styles.overviewMainBtn}
                            onPress={() => openDayRouteInMaps(activeDay)}
                            activeOpacity={0.85}
                        >
                            <Ionicons name={transport.icon.replace('-outline', '')} size={18} color="#fff" />
                            <Text style={styles.overviewMainBtnText}>
                                {transport.googleMode === 'transit'
                                    ? 'Sıradaki durağa yol tarifi'
                                    : `Gün ${activeDay?.day ?? 1} rotasını Google Maps'te aç`}
                            </Text>
                        </TouchableOpacity>

                        {routeItems.length > 0 && (
                            <TouchableOpacity
                                style={[styles.overviewGhostBtn, { marginTop: SPACING.sm }]}
                                onPress={() => {
                                    navigation.navigate('MapScreen', {
                                        city: itinerary.cities,
                                        places: routeItems.map((item, index) => ({
                                            id: String(item.id || index),
                                            name: item.places?.name || `Durak ${index + 1}`,
                                            lat: item.places.lat,
                                            lng: item.places.lng,
                                        })),
                                    });
                                }}
                                activeOpacity={0.85}
                            >
                                <Ionicons name="map-outline" size={18} color={COLORS.primary} />
                                <Text style={styles.overviewGhostBtnText}>Uygulama haritası</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Plana sığmayan, kullanıcının seçtiği yerler */}
                {unscheduled.length > 0 && (
                    <View style={styles.noticeCard}>
                        <View style={styles.noticeHeader}>
                            <Ionicons name="time-outline" size={18} color={COLORS.warning} />
                            <Text style={styles.noticeTitle}>{unscheduled.length} yer programa sığmadı</Text>
                        </View>
                        <Text style={styles.noticeText}>
                            Seçtiğiniz gün sayısı ve tempo ile bu yerlere kapanış saatlerinden önce yetişilemiyor. Bir durağı kaldırıp yerine ekleyebilir veya gün sayısını artırabilirsiniz.
                        </Text>
                        <Text style={styles.noticeList}>{unscheduled.map(place => place.name).join(' · ')}</Text>
                    </View>
                )}

                {/* Günler */}
                {dayGroups.map((group) => {
                    const date = dayDate(group);
                    const meal = mealSuggestions[group.day];
                    const lunchBreak = group.breaks.find(b => b.type === 'lunch');
                    const lunchAfter = lunchBreak ? Math.max(0, lunchBreak.afterIndex) : meal?.lunchAfterIndex;
                    const lunchLabel = lunchBreak ? `Öğle Yemeği · ${lunchBreak.startTime}–${lunchBreak.endTime}` : 'Öğle Yemeği Önerisi';

                    return (
                        <View key={group.day} style={styles.timelineDayCard}>
                            <View style={styles.dayHeader}>
                                <View style={styles.dayBadge}>
                                    <Text style={styles.dayBadgeText}>{group.day}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.dayTitle}>Gün {group.day}</Text>
                                    {date ? <Text style={styles.dayDate}>{formatDayMonthWeekday(date)}</Text> : null}
                                </View>
                                <Text style={styles.dayItemCount}>
                                    {group.items.filter((i) => i.is_completed).length}/{group.items.length}
                                </Text>
                            </View>

                            {group.items.length > 0 && (group.endTime || group.totalDistance > 0) && (
                                <View style={styles.daySummaryRow}>
                                    {group.startTime && group.endTime ? (
                                        <View style={styles.daySummaryChip}>
                                            <Ionicons name="time-outline" size={12} color={COLORS.primary} />
                                            <Text style={styles.daySummaryText}>{group.startTime} – {group.endTime}</Text>
                                        </View>
                                    ) : null}
                                    {group.totalDistance > 0 && (
                                        <View style={styles.daySummaryChip}>
                                            <Ionicons name="navigate-outline" size={12} color={COLORS.primary} />
                                            <Text style={styles.daySummaryText}>{group.totalDistance} km</Text>
                                        </View>
                                    )}
                                    {group.totalTravelMinutes > 0 && (
                                        <View style={styles.daySummaryChip}>
                                            <Ionicons name={transport.icon} size={12} color={COLORS.primary} />
                                            <Text style={styles.daySummaryText}>{formatMinutes(group.totalTravelMinutes)} yolda</Text>
                                        </View>
                                    )}
                                    <TouchableOpacity
                                        style={[styles.daySummaryChip, styles.daySummaryAction]}
                                        onPress={() => openDayRouteInMaps(group)}
                                        accessibilityLabel={`Gün ${group.day} rotasını haritada aç`}
                                    >
                                        <Ionicons name="map" size={12} color="#fff" />
                                        <Text style={[styles.daySummaryText, { color: '#fff' }]}>Rota</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {group.items.map((item, idx) => (
                                <React.Fragment key={item.id}>
                                    {item.timing?.travelMinutes > 0 && (
                                        <TravelLegRow
                                            minutes={item.timing.travelMinutes}
                                            mode={item.timing.travelMode || transport.key}
                                            distanceKm={item.timing.travelDistanceKm}
                                            fromHotel={idx === 0}
                                        />
                                    )}
                                    <View style={styles.timelineItemRow}>
                                        <View style={styles.timelineRail}>
                                            <View style={[styles.timelineDot, item.is_completed && styles.timelineDotCompleted]}>
                                                <Ionicons
                                                    name={item.is_completed ? 'checkmark' : 'ellipse'}
                                                    size={item.is_completed ? 12 : 8}
                                                    color="#fff"
                                                />
                                            </View>
                                            {idx < group.items.length - 1 && <View style={styles.timelineLine} />}
                                        </View>

                                        <View style={[styles.timelineCard, item.is_completed && styles.timelineCardCompleted]}>
                                            {item.timing ? (
                                                <Text style={styles.itemTime}>{item.timing.arrivalTime} – {item.timing.departureTime}</Text>
                                            ) : item.isOverflow ? (
                                                <Text style={styles.itemOverflow}>Zaman yetmeyebilir</Text>
                                            ) : null}
                                            <TouchableOpacity
                                                style={styles.timelineCardTop}
                                                onPress={() => handleToggleCompletion(item)}
                                                activeOpacity={0.7}
                                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                accessibilityRole="checkbox"
                                                accessibilityState={{ checked: !!item.is_completed }}
                                            >
                                                <Text style={[styles.itemName, item.is_completed && styles.itemNameCompleted]}>
                                                    {item.places?.name || 'Bilinmeyen Yer'}
                                                </Text>
                                                <View style={styles.checkToggleBtn}>
                                                    <Ionicons
                                                        name={item.is_completed ? 'checkmark-circle' : 'ellipse-outline'}
                                                        size={24}
                                                        color={item.is_completed ? COLORS.success : COLORS.textLight}
                                                    />
                                                </View>
                                            </TouchableOpacity>

                                            <Text style={styles.itemMeta}>
                                                {item.places?.category || 'Gezi'} · {formatDurationText(item.places?.avg_duration)} ·{' '}
                                                {item.places?.entry_fee > 0 ? formatMoney(item.places.entry_fee) : 'Ücretsiz'}
                                                {item.places?.closing_hour && !item.is_completed
                                                    ? ` · ${formatClosing(item.places.closing_hour)}'e kadar`
                                                    : ''}
                                            </Text>

                                            <View style={styles.timelineActionsRow}>
                                                {item.places?.lat && item.places?.lng ? (
                                                    <TouchableOpacity
                                                        onPress={() => openPlaceDirections(item.places)}
                                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                        style={styles.timelineActionPill}
                                                    >
                                                        <Ionicons name="navigate" size={14} color={COLORS.info} />
                                                        <Text style={styles.timelineActionText}>Yol tarifi</Text>
                                                    </TouchableOpacity>
                                                ) : null}
                                                {!isCompleted && (
                                                    <>
                                                        <TouchableOpacity
                                                            onPress={() => handleSuggestAlternative(item)}
                                                            disabled={busy}
                                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                            style={styles.timelineActionPill}
                                                        >
                                                            <Ionicons name="swap-horizontal-outline" size={14} color={COLORS.primary} />
                                                            <Text style={styles.timelineActionText}>Alternatif</Text>
                                                        </TouchableOpacity>
                                                        <TouchableOpacity
                                                            onPress={() => handleRemoveItem(item)}
                                                            disabled={busy}
                                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                            style={styles.timelineActionPillDanger}
                                                        >
                                                            <Ionicons name="trash-outline" size={14} color={COLORS.error} />
                                                            <Text style={styles.timelineActionTextDanger}>Sil</Text>
                                                        </TouchableOpacity>
                                                    </>
                                                )}
                                            </View>
                                        </View>
                                    </View>

                                    {/* Öğle arası — motorun yerleştirdiği saatte, yakın restoran önerisiyle */}
                                    {idx === lunchAfter && (meal?.lunch ? (
                                        <InlineMealCard
                                            key={`lunch-${group.day}`}
                                            emoji="🍽️"
                                            label={lunchLabel}
                                            place={meal.lunch}
                                            isCompleted={isCompleted}
                                        />
                                    ) : lunchBreak ? (
                                        <BreakRow label={lunchLabel} />
                                    ) : null)}

                                    {/* Şehrin mutfağından kısa bir mola — yakın gerçek kafe ile */}
                                    {meal?.localBreak && idx === meal.breakAfterIndex && (
                                        <InlineMealCard
                                            key={`local-break-${group.day}`}
                                            emoji="🍨"
                                            label={meal.localBreak.categoryLabel || 'Yöresel lezzet molası'}
                                            place={meal.localBreak}
                                            isCompleted={isCompleted}
                                        />
                                    )}

                                    {/* Akşam yemeği önerisi — son yerden sonra */}
                                    {meal?.dinner && idx === meal.dinnerAfterIndex && (
                                        <InlineMealCard
                                            key={`dinner-${group.day}`}
                                            emoji="🌙"
                                            label="Akşam Yemeği Önerisi"
                                            place={meal.dinner}
                                            isCompleted={isCompleted}
                                        />
                                    )}
                                </React.Fragment>
                            ))}

                            {group.items.length === 0 && (
                                <View style={styles.timelineEmptyBox}>
                                    <Text style={styles.timelineEmptyText}>Bu gün için planlanan durak yok. Serbest gün olarak değerlendirebilirsiniz.</Text>
                                </View>
                            )}
                        </View>
                    );
                })}

                {/* Tahmini bütçe */}
                <View style={styles.budgetCard}>
                    <Text style={styles.budgetTitle}>Tahmini Bütçe</Text>
                    {budget.breakdown.map(row => (
                        <View key={row.label} style={styles.budgetRow}>
                            <Text style={styles.budgetEmoji}>{row.emoji}</Text>
                            <Text style={styles.budgetLabel}>{row.label}</Text>
                            <Text style={styles.budgetAmount}>{formatMoney(row.amount)}</Text>
                        </View>
                    ))}
                    <View style={styles.budgetDivider} />
                    <View style={styles.budgetRow}>
                        <Text style={styles.budgetEmoji}>💰</Text>
                        <Text style={[styles.budgetLabel, { color: COLORS.textPrimary, fontFamily: FONTS.bodyBold }]}>Toplam (kişi başı)</Text>
                        <Text style={[styles.budgetAmount, { color: COLORS.primary }]}>{formatMoney(budget.total)}</Text>
                    </View>
                    <Text style={styles.budgetNote}>
                        Konaklama hariç. Giriş ücreti bilgisi olmayan yerler ücretsiz kabul edilir; {transport.key === 'driving' ? 'yakıt 8 L/100 km ile' : 'toplu taşıma bacak başına ortalama biletle'} hesaplanır.
                    </Text>
                </View>

                {!isCompleted && (
                    <Button
                        title="Planı Tamamla ✅"
                        onPress={handleCompleteItinerary}
                        variant="primary"
                        style={styles.completeButton}
                    />
                )}

                {/* Alt boşluk */}
                <View style={{ height: insets.bottom + SPACING.md }} />
            </ScrollView>
            <ConfettiOverlay
                visible={showConfetti}
                onAnimationFinish={() => {
                    setShowConfetti(false);
                    if (pendingBadge) {
                        setNewlyEarnedBadge(pendingBadge);
                        setPendingBadge(null);
                    }
                }}
            />
            <CompletePlanSheet
                visible={completeSheetVisible}
                cityName={cityName}
                imageUri={itinerary.cities?.image_url || cityImages.hero || cityImages.card}
                fallbackUri={cityImages?.fallbackHero || cityImages?.fallbackCard}
                days={itinerary.days}
                progress={progress}
                distanceKm={dayGroups.reduce((sum, group) => sum + (group.totalDistance || 0), 0)}
                onConfirm={confirmCompleteItinerary}
                onClose={() => closeCompleteSheet()}
                onDone={() => closeCompleteSheet({ leave: true })}
            />
            <BadgeEarnedModal
                visible={!!newlyEarnedBadge}
                badge={newlyEarnedBadge}
                onClose={() => setNewlyEarnedBadge(null)}
                onAction={() => {
                    setNewlyEarnedBadge(null);
                    navigation.navigate('Badges');
                }}
            />
        </View>
    );
};

function formatClosing(hour) {
    const h = Math.floor(hour);
    const m = Math.round((hour - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const LEG_LABELS = { walking: 'yürüyüş', transit: 'toplu taşıma', driving: 'araçla' };

const TravelLegRow = ({ minutes, mode, distanceKm, fromHotel }) => {
    const profile = getTransportProfile(mode);
    return (
        <View style={styles.legRow}>
            <View style={styles.timelineRail}>
                <View style={styles.legLine} />
            </View>
            <View style={styles.legContent}>
                <Ionicons name={profile.icon} size={13} color={COLORS.textSecondary} />
                <Text style={styles.legText}>
                    {fromHotel ? 'Konaklamadan ' : ''}{formatMinutes(minutes)} {LEG_LABELS[profile.key]}
                    {distanceKm ? ` · ${distanceKm} km` : ''}
                </Text>
            </View>
        </View>
    );
};

const BreakRow = ({ label }) => (
    <View style={styles.legRow}>
        <View style={styles.timelineRail}>
            <View style={styles.inlineMealDot}><Text style={{ fontSize: 10 }}>🍽️</Text></View>
            <View style={styles.timelineLine} />
        </View>
        <View style={[styles.legContent, styles.breakContent]}>
            <Text style={styles.breakText}>{label}</Text>
        </View>
    </View>
);

const styles = createThemedStyles(() => ({
    container: { flex: 1, backgroundColor: COLORS.background },

    // ─── Sticky Header ───
    stickyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.sm,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backBtn: { padding: 4 },
    shareBtn: { padding: 4 },
    stickyTitle: {
        flex: 1,
        fontFamily: FONTS.heading,
        fontSize: FONT_SIZES.lg,
        color: COLORS.textPrimary,
    },
    // ─── Tek Üst Özet Kartı ───
    overviewCard: {
        marginBottom: SPACING.md,
        borderRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    overviewVisual: {
        height: 170,
        padding: SPACING.md,
        justifyContent: 'space-between',
        position: 'relative',
        backgroundColor: '#2C3825', // fotoğraf yüklenmeden de beyaz yazı okunur
    },
    overviewImage: {
        ...StyleSheet.absoluteFill,
    },
    overviewImageOverlay: {
        ...StyleSheet.absoluteFill,
    },
    overviewTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    overviewEyebrow: {
        fontFamily: 'Inter_700Bold',
        fontSize: 10,
        color: 'rgba(255,255,255,0.86)',
        letterSpacing: 2,
    },
    overviewTitle: {
        fontFamily: FONTS.heading,
        fontSize: FONT_SIZES.xl,
        color: '#fff',
        marginTop: 2,
    },
    overviewDate: {
        fontFamily: 'Inter_500Medium',
        fontSize: FONT_SIZES.xs,
        color: 'rgba(255,255,255,0.88)',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.22)',
        borderRadius: BORDER_RADIUS.full,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    statusCompleted: { backgroundColor: 'rgba(16,185,129,0.22)' },
    statusText: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: FONT_SIZES.xs,
        color: '#fff',
    },
    overviewBody: {
        padding: SPACING.md,
        gap: SPACING.md,
        backgroundColor: COLORS.surface,
    },
    overviewStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceAlt,
        borderRadius: BORDER_RADIUS.lg,
        paddingVertical: 10,
        paddingHorizontal: 8,
    },
    overviewStatItem: {
        flex: 1,
        alignItems: 'center',
        gap: 3,
    },
    overviewStatValue: {
        fontFamily: 'Inter_700Bold',
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
    },
    overviewStatLabel: {
        fontFamily: 'Inter_500Medium',
        fontSize: 10,
        color: COLORS.textSecondary,
    },
    overviewStatDivider: {
        width: 1,
        height: 34,
        backgroundColor: COLORS.border,
    },
    overviewProgressTrack: {
        height: 6,
        backgroundColor: COLORS.primaryMuted,
        borderRadius: BORDER_RADIUS.full,
        overflow: 'hidden',
    },
    overviewProgressFill: {
        height: '100%',
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: '#8FA373',
    },
    overviewPreviewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 2,
    },
    overviewPreviewStop: {
        alignItems: 'center',
        gap: 4,
        maxWidth: 62,
    },
    overviewPreviewDot: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: COLORS.primaryMuted,
        borderWidth: 1.5,
        borderColor: COLORS.primary + '66',
        justifyContent: 'center', alignItems: 'center',
    },
    overviewPreviewDotDone: {
        backgroundColor: '#8FA373',
        borderColor: '#8FA373',
    },
    overviewPreviewNum: {
        fontFamily: 'Inter_700Bold',
        fontSize: 11, color: COLORS.primary,
    },
    overviewPreviewName: {
        fontFamily: 'Inter_500Medium',
        fontSize: 9, color: COLORS.textSecondary,
        textAlign: 'center',
    },
    overviewPreviewConnector: {
        flex: 1, flexDirection: 'row',
        alignItems: 'center', justifyContent: 'center',
        gap: 3, paddingBottom: 14,
    },
    overviewPreviewConnectorDot: {
        width: 3, height: 3, borderRadius: 1.5,
        backgroundColor: COLORS.primary + '55',
    },
    overviewPreviewMoreBadge: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: COLORS.primaryMuted,
        justifyContent: 'center', alignItems: 'center',
        alignSelf: 'flex-start', marginTop: 0,
    },
    overviewPreviewMoreText: {
        fontFamily: 'Inter_700Bold',
        fontSize: 10, color: COLORS.primary,
    },
    overviewActionsRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    overviewMainBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#5A7D8C',
        borderRadius: BORDER_RADIUS.lg,
        paddingVertical: 13,
    },
    overviewMainBtnText: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: FONT_SIZES.sm,
        color: '#fff',
    },
    overviewGhostBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1.5,
        borderColor: COLORS.primary + '40',
        borderRadius: BORDER_RADIUS.lg,
        backgroundColor: COLORS.primaryMuted,
        paddingVertical: 13,
    },
    overviewGhostBtnText: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: FONT_SIZES.sm,
        color: COLORS.primary,
    },

    // ─── Scroll ───
    scrollView: { flex: 1 },
    contentContainer: { padding: SPACING.md, paddingBottom: SPACING.xxl },

    // ─── Günler: Timeline düzeni ───
    timelineDayCard: {
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
    dayHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
    dayBadge: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: COLORS.primary,
        justifyContent: 'center', alignItems: 'center',
        marginRight: SPACING.sm,
    },
    dayBadgeText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: FONT_SIZES.sm },
    dayTitle: { fontSize: FONT_SIZES.lg, fontFamily: 'Inter_600SemiBold', color: COLORS.textPrimary, flex: 1 },
    dayItemCount: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontFamily: 'Inter_500Medium' },
    timelineItemRow: {
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: SPACING.sm,
        marginBottom: SPACING.sm,
    },
    timelineRail: {
        width: 22,
        alignItems: 'center',
    },
    timelineDot: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 6,
    },
    timelineDotCompleted: {
        backgroundColor: COLORS.success,
    },
    timelineLine: {
        flex: 1,
        width: 2,
        backgroundColor: COLORS.border,
        marginTop: 6,
        borderRadius: 1,
    },
    timelineCard: {
        flex: 1,
        backgroundColor: COLORS.surfaceAlt,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: SPACING.sm,
    },
    timelineCardCompleted: {
        opacity: 0.7,
        borderColor: COLORS.success + '40',
    },
    timelineCardTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: SPACING.xs,
    },
    checkToggleBtn: { flexShrink: 0, marginTop: -2 },
    itemName: { flex: 1, flexShrink: 1, fontSize: FONT_SIZES.sm, fontFamily: 'Inter_500Medium', color: COLORS.textPrimary },
    itemNameCompleted: { textDecorationLine: 'line-through', color: COLORS.textSecondary },
    itemMeta: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
    timelineActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        marginTop: SPACING.sm,
    },
    timelineActionPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.primaryMuted,
        borderRadius: BORDER_RADIUS.full,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    timelineActionText: {
        fontFamily: 'Inter_500Medium',
        fontSize: 11,
        color: COLORS.primary,
    },
    timelineActionPillDanger: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.error + '14',
        borderRadius: BORDER_RADIUS.full,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    timelineActionTextDanger: {
        fontFamily: 'Inter_500Medium',
        fontSize: 11,
        color: COLORS.error,
    },
    timelineEmptyBox: {
        backgroundColor: COLORS.surfaceAlt,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.sm,
    },
    timelineEmptyText: {
        textAlign: 'center',
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.sm,
        fontFamily: 'Inter_400Regular',
    },

    // ─── Inline Yemek Önerisi ───
    inlineMealRow: {
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: SPACING.sm,
        marginBottom: SPACING.sm,
    },
    inlineMealDot: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: COLORS.accentLight,
        borderWidth: 1.5,
        borderColor: '#B8893A',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 6,
    },
    inlineMealCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.accentLight,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.accentLight,
        gap: SPACING.sm,
    },
    inlineMealLeft: {
        flex: 1,
        gap: 3,
    },
    inlineMealBadge: {
        backgroundColor: COLORS.accentLight,
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    inlineMealBadgeText: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 10,
        color: '#9C7230',
    },
    inlineMealName: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
    },
    inlineMealMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    inlineMealMetaText: {
        fontFamily: 'Inter_400Regular',
        fontSize: 11,
        color: COLORS.textSecondary,
    },
    inlineMealActions: {
        flexDirection: 'row',
        gap: SPACING.xs,
        marginTop: 4,
        flexWrap: 'wrap',
    },
    inlineMealActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: COLORS.primaryMuted,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.sm,
    },
    inlineMealActionText: {
        fontFamily: 'Inter_500Medium',
        fontSize: 11,
        color: COLORS.primary,
    },
    inlineMealAddress: {
        fontFamily: 'Inter_400Regular',
        fontSize: 11,
        color: COLORS.textSecondary,
        marginTop: 2,
    },

    completeButton: { marginTop: SPACING.xs },

    // ─── Özet kartı çipleri ───
    overviewChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    overviewChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: BORDER_RADIUS.full,
        paddingHorizontal: 8, paddingVertical: 4,
    },
    overviewChipText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#fff' },

    // ─── Uyarı kartı (sığmayan yerler) ───
    noticeCard: {
        backgroundColor: 'rgba(183, 121, 31, 0.08)',
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: 'rgba(183, 121, 31, 0.25)',
        padding: SPACING.md,
        marginBottom: SPACING.md,
    },
    noticeHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: 4 },
    noticeTitle: { fontFamily: 'Inter_600SemiBold', fontSize: FONT_SIZES.sm, color: COLORS.textPrimary },
    noticeText: { fontFamily: 'Inter_400Regular', fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, lineHeight: 17 },
    noticeList: { fontFamily: 'Inter_500Medium', fontSize: FONT_SIZES.xs, color: COLORS.textPrimary, marginTop: SPACING.xs, lineHeight: 17 },

    // ─── Gün başlığı ve özeti ───
    dayDate: { fontFamily: 'Inter_400Regular', fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 1 },
    daySummaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: SPACING.sm },
    daySummaryChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: COLORS.primaryMuted,
        borderRadius: BORDER_RADIUS.full,
        paddingHorizontal: 8, paddingVertical: 4,
    },
    daySummaryAction: { backgroundColor: COLORS.primary },
    daySummaryText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: COLORS.primary },

    // ─── Durak saati ve ulaşım bacağı ───
    itemTime: { fontFamily: 'Inter_700Bold', fontSize: FONT_SIZES.xs, color: COLORS.primary, marginBottom: 2, letterSpacing: 0.3 },
    itemOverflow: { fontFamily: 'Inter_600SemiBold', fontSize: FONT_SIZES.xs, color: COLORS.warning, marginBottom: 2 },
    legRow: { flexDirection: 'row', alignItems: 'stretch', gap: SPACING.sm, marginBottom: SPACING.sm, marginTop: -2 },
    legLine: { flex: 1, width: 2, minHeight: 18, backgroundColor: COLORS.border, borderRadius: 1 },
    legContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 },
    legText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: COLORS.textSecondary },
    breakContent: {
        backgroundColor: COLORS.accentLight,
        borderRadius: BORDER_RADIUS.md,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 6,
    },
    breakText: { fontFamily: 'Inter_600SemiBold', fontSize: FONT_SIZES.xs, color: '#6E5328' },

    // ─── Bütçe Kartı ───
    budgetCard: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.primary + '20',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    budgetTitle: {
        fontFamily: FONTS.heading,
        fontSize: FONT_SIZES.lg,
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
    },
    budgetRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
    },
    budgetEmoji: { fontSize: 16, width: 28 },
    budgetLabel: {
        flex: 1,
        fontFamily: 'Inter_400Regular',
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    budgetAmount: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
    },
    budgetDivider: {
        height: 1,
        backgroundColor: COLORS.divider,
        marginVertical: 6,
    },
    budgetNote: {
        fontFamily: 'Inter_400Regular',
        fontSize: 10,
        color: COLORS.textLight,
        marginTop: 4,
        fontStyle: 'italic',
    },
}));


// ─── InlineMealCard — yerler arasına entegre yemek yeri önerisi ─────────────
const InlineMealCard = ({ emoji, label, place, onAdd, isCompleted }) => {
    const isRestaurant = place.category === 'restaurant' || place.category === 'cafe'
        || place.type === 'restaurant';

    const openDirections = () => {
        if (place.lat && place.lng) {
            Linking.openURL(
                `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}&travelmode=walking`
            );
        }
    };

    const openMaps = () => {
        if (place.lat && place.lng) {
            Linking.openURL(
                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&ll=${place.lat},${place.lng}`
            );
        }
    };

    return (
        <View style={styles.inlineMealRow}>
            <View style={styles.timelineRail}>
                <View style={styles.inlineMealDot}>
                    <Text style={{ fontSize: 10 }}>{emoji}</Text>
                </View>
                <View style={styles.timelineLine} />
            </View>

            <View style={styles.inlineMealCard}>
                <View style={styles.inlineMealLeft}>
                    <View style={styles.inlineMealBadge}>
                        <Text style={styles.inlineMealBadgeText}>{label}</Text>
                    </View>
                    <Text style={styles.inlineMealName} numberOfLines={1}>{place.name}</Text>

                    <View style={styles.inlineMealMeta}>
                        <Ionicons name="restaurant-outline" size={11} color={COLORS.textSecondary} />
                        <Text style={styles.inlineMealMetaText}>
                            {place.categoryLabel || (place.category === 'cafe' ? 'Kafe' : 'Restoran')}
                            {place.cuisine ? ` · ${place.cuisine}` : ''}
                            {place.distanceKm != null ? ` · ${place.distanceKm < 1 ? `${Math.round(place.distanceKm * 1000)} m` : `${place.distanceKm} km`}` : ''}
                        </Text>
                    </View>

                    {place.address ? (
                        <Text style={styles.inlineMealAddress} numberOfLines={1}>
                            📍 {place.address}
                        </Text>
                    ) : null}

                    {/* Aksiyon butonları */}
                    <View style={styles.inlineMealActions}>
                        {place.lat && place.lng && (
                            <>
                                <TouchableOpacity style={styles.inlineMealActionBtn} onPress={openDirections}>
                                    <Ionicons name="navigate-outline" size={12} color={COLORS.primary} />
                                    <Text style={styles.inlineMealActionText}>Yol Tarifi</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.inlineMealActionBtn} onPress={openMaps}>
                                    <Ionicons name="map-outline" size={12} color={COLORS.primary} />
                                    <Text style={styles.inlineMealActionText}>Haritada Gör</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </View>
        </View>
    );
};

export default ItineraryDetailScreen;
