import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, Alert, RefreshControl, Platform, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { COLORS } from '../../constants/colors';
import { FONT_SIZES, FONTS } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/layout';
import { getCityImages } from '../../services/cityImageService';
import {
    getItineraryById,
    toggleItemCompletion,
    removeItineraryItem,
    addItineraryItem,
    updateItineraryStatus,
} from '../../services/itineraryService';
import { getPlacesByCity } from '../../services/placeService';
import { getMealSuggestions } from '../../data/repositories/placeRepository';
import { suggestAlternative, estimateTotalBudget } from '../../logic/itineraryGenerator';
import { formatDate } from '../../utils/formatters';
import { shareItinerary } from '../../utils/shareManager';
import Button from '../../components/common/Button';
import { ItineraryDetailSkeleton } from '../../components/common/SkeletonLoader';
import ErrorMessage from '../../components/common/ErrorMessage';
import { useAssistantContext } from '../../contexts/AssistantContext';

const ItineraryDetailScreen = ({ route, navigation }) => {
    const { itineraryId } = route.params;
    const { setAssistantContext, clearAssistantContext } = useAssistantContext();
    const insets = useSafeAreaInsets();

    const [itinerary, setItinerary] = useState(null);
    const [allCityPlaces, setAllCityPlaces] = useState([]);
    const [mealSuggestions, setMealSuggestions] = useState({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setError(null);
        const { data, error: fetchError } = await getItineraryById(itineraryId);
        if (fetchError) {
            setError('Plan yüklenirken hata oluştu.');
            setLoading(false);
            return;
        }
        setItinerary(data);
        if (data?.city_id) {
            const { data: cityPlaces } = await getPlacesByCity(data.city_id);
            setAllCityPlaces(cityPlaces || []);

            // Her gün için yemek önerisi üret
            // plan JSONB veya itinerary_items'tan günlük yerleri al
            const cityName = data.cities?.name || '';
            const allItems = data.itinerary_items?.length > 0
                ? data.itinerary_items
                : (data.plan || []).flatMap((d, di) =>
                    (d.places || []).map((p, pi) => ({
                        day_number: d.day,
                        place_id: p.id,
                        places: p,
                    }))
                );

            const groups = {};
            allItems.forEach(item => {
                const day = item.day_number;
                if (!groups[day]) groups[day] = [];
                groups[day].push(item);
            });

            const meals = {};
            for (const [day, dayItems] of Object.entries(groups)) {
                const usedIds = dayItems.map(i => String(i.place_id));
                // Günün yerlerini sırayla al — aralarına yemek önerisi eklenecek
                const orderedPlaces = dayItems
                    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
                    .map(i => i.places);
                meals[day] = await getMealSuggestions(data.city_id, cityName, usedIds, orderedPlaces);
            }
            setMealSuggestions(meals);
        }
        setLoading(false);
        setRefreshing(false);
    }, [itineraryId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Ekran odaklandığında asistan bağlamını güncelle
    useFocusEffect(
        useCallback(() => {
            if (!itinerary) return;
            const completedPlaces = itinerary.itinerary_items
                .filter(i => i.is_completed).map(i => i.places?.name).filter(Boolean);
            const allPlaces = itinerary.itinerary_items.map(i => ({
                name: i.places?.name || '',
                category: i.places?.category || '',
                day: i.day_number,
            }));
            setAssistantContext({
                screen: 'itinerary',
                city: itinerary.cities?.name,
                days: itinerary.days,
                startDate: itinerary.start_date,
                places: allPlaces,
                completedPlaces,
                completedCount: completedPlaces.length,
                totalPlaces: itinerary.itinerary_items.length,
                status: itinerary.status,
            });
            return () => clearAssistantContext();
        }, [itinerary, setAssistantContext, clearAssistantContext])
    );

    const dayGroups = React.useMemo(() => {
        // Önce itinerary_items'tan oku (Supabase yerleri)
        if (itinerary?.itinerary_items?.length > 0) {
            const groups = {};
            itinerary.itinerary_items
                .sort((a, b) => a.day_number - b.day_number || a.order_index - b.order_index)
                .forEach((item) => {
                    if (!groups[item.day_number]) groups[item.day_number] = [];
                    groups[item.day_number].push(item);
                });
            return Object.entries(groups).map(([day, items]) => ({ day: Number(day), items }));
        }
        // Fallback: plan JSONB'den oku (Kültür Portalı yerleri)
        if (itinerary?.plan?.length > 0) {
            return itinerary.plan.map(dayPlan => ({
                day: dayPlan.day,
                items: (dayPlan.places || []).map((place, idx) => ({
                    id: `plan-${dayPlan.day}-${idx}`,
                    day_number: dayPlan.day,
                    order_index: idx,
                    is_completed: false,
                    place_id: place.id,
                    places: {
                        id: place.id,
                        name: place.name,
                        category: place.category,
                        avg_duration: place.avg_duration ?? 1,
                        entry_fee: place.entry_fee ?? 0,
                        lat: place.lat,
                        lng: place.lng,
                        popularity_score: place.popularity_score,
                        image_url: place.image_url || place.imageUrl,
                    },
                })),
            }));
        }
        return [];
    }, [itinerary]);

    const progress = React.useMemo(() => {
        const items = itinerary?.itinerary_items || [];
        // plan JSONB'den gelen yerler için tüm items'ı dayGroups'tan al
        const allItems = items.length > 0
            ? items
            : dayGroups.flatMap(g => g.items);
        const total = allItems.length;
        const completed = allItems.filter((i) => i.is_completed).length;
        return { completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
    }, [itinerary, dayGroups]);

    const budget = React.useMemo(() => {
        const items = itinerary?.itinerary_items?.length > 0
            ? itinerary.itinerary_items
            : dayGroups.flatMap(g => g.items);
        const totalFee = items.reduce((s, i) => s + (i.places?.entry_fee ?? 0), 0);
        return estimateTotalBudget({
            entryFees: totalFee,
            distanceKm: 0,
            days: itinerary?.days ?? 1,
            hasTransport: itinerary?.has_transport ?? false,
            restaurantPerDay: 250,
        });
    }, [itinerary, dayGroups]);

    const handleToggleCompletion = async (item) => {
        const newValue = !item.is_completed;
        const { error: toggleError } = await toggleItemCompletion(item.id, newValue);
        if (toggleError) { Alert.alert('Hata', 'Durum güncellenirken hata oluştu.'); return; }
        setItinerary((prev) => ({
            ...prev,
            itinerary_items: prev.itinerary_items.map((i) =>
                i.id === item.id ? { ...i, is_completed: newValue } : i
            ),
        }));
    };

    const handleRemoveItem = (item) => {
        Alert.alert('Yeri Kaldır', `"${item.places?.name}" planından çıkarılsın mı?`, [
            { text: 'İptal', style: 'cancel' },
            {
                text: 'Kaldır', style: 'destructive',
                onPress: async () => {
                    const { error: removeError } = await removeItineraryItem(item.id);
                    if (removeError) { Alert.alert('Hata', 'Yer kaldırılırken hata oluştu.'); }
                    else {
                        setItinerary((prev) => ({
                            ...prev,
                            itinerary_items: prev.itinerary_items.filter((i) => i.id !== item.id),
                        }));
                    }
                },
            },
        ]);
    };

    const handleSuggestAlternative = async (item) => {
        const usedIds = itinerary.itinerary_items.map(i => i.place_id);
        const suggestion = suggestAlternative(
            allCityPlaces, usedIds, item.places?.category,
            item.places?.lat, item.places?.lng    // mesafe tabanlı öneri
        );
        if (!suggestion) { Alert.alert('Bilgi', 'Alternatif yer bulunamadı.'); return; }
        Alert.alert(
            'Alternatif Öneri',
            `"${item.places?.name}" yerine "${suggestion.name}" önerildi.\n\nKategori: ${suggestion.category}\nSüre: ${suggestion.avg_duration}s\nGiriş: ${suggestion.entry_fee > 0 ? `₺${suggestion.entry_fee}` : 'Ücretsiz'}`,
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Değiştir',
                    onPress: async () => {
                        await removeItineraryItem(item.id);
                        await addItineraryItem(itinerary.id, suggestion.id, item.day_number, item.order_index);
                        fetchData();
                    },
                },
            ]
        );
    };

    const handleCompleteItinerary = () => {
        Alert.alert('Planı Tamamla', 'Bu gezi planını tamamlandı olarak işaretlemek istiyor musunuz?', [
            { text: 'İptal', style: 'cancel' },
            {
                text: 'Tamamla',
                onPress: async () => {
                    const { error: statusError } = await updateItineraryStatus(itinerary.id, 'completed');
                    if (statusError) { Alert.alert('Hata', 'Durum güncellenirken hata oluştu.'); }
                    else {
                        Alert.alert(
                            'Tebrikler! 🎉',
                            'Gezi planınız tamamlandı! Harika bir seyahat geçirdiniz.',
                            [{ text: 'Planlarıma Dön', onPress: () => navigation.goBack() }]
                        );
                    }
                },
            },
        ]);
    };

    // ─── Google Maps Rota ───────────────────────────────────────────────────────
    const openRouteInMaps = (mode = 'driving') => {
        // Hem itinerary_items hem plan JSONB'den koordinatlı yerleri topla
        let coordPlaces = [];

        if (itinerary?.itinerary_items?.length > 0) {
            coordPlaces = (itinerary.itinerary_items || [])
                .filter(i => i.places?.lat && i.places?.lng)
                .sort((a, b) => a.day_number - b.day_number || a.order_index - b.order_index)
                .map(i => ({ lat: i.places.lat, lng: i.places.lng, name: i.places.name }));
        }

        // itinerary_items koordinatsızsa plan JSONB'den al
        if (coordPlaces.length === 0 && itinerary?.plan?.length > 0) {
            coordPlaces = itinerary.plan
                .flatMap(d => (d.places || []))
                .filter(p => p.lat && p.lng)
                .map(p => ({ lat: p.lat, lng: p.lng, name: p.name }));
        }

        if (coordPlaces.length === 0) {
            // Koordinat yoksa şehir merkezini aç
            const cityName = itinerary?.cities?.name || '';
            const { getCityCenter } = require('../../constants/cities');
            const center = getCityCenter(cityName);
            const url = `https://www.google.com/maps/search/?api=1&query=${center.lat},${center.lng}`;
            Linking.openURL(url);
            return;
        }

        let url;
        if (coordPlaces.length === 1) {
            url = `https://www.google.com/maps/dir/?api=1&destination=${coordPlaces[0].lat},${coordPlaces[0].lng}&travelmode=${mode}`;
        } else {
            const origin = `${coordPlaces[0].lat},${coordPlaces[0].lng}`;
            const dest = `${coordPlaces[coordPlaces.length - 1].lat},${coordPlaces[coordPlaces.length - 1].lng}`;
            const mid = coordPlaces.slice(1, -1).slice(0, 8);
            const wps = mid.map(p => `${p.lat},${p.lng}`).join('|');
            url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}${wps ? `&waypoints=${encodeURIComponent(wps)}` : ''}&travelmode=${mode}`;
        }
        Linking.openURL(url);
    };

    // ─── AI Asistan ───────────────────────────────────────────────────────────
    const openAssistant = () => {
        const completedPlaces = itinerary.itinerary_items
            .filter(i => i.is_completed).map(i => i.places?.name).filter(Boolean);
        const allPlaces = itinerary.itinerary_items.map(i => ({
            name: i.places?.name || '',
            category: i.places?.category || '',
            day: i.day_number,
        }));
        navigation.navigate('TravelAssistant', {
            context: {
                screen: 'itinerary',
                city: itinerary.cities?.name,
                days: itinerary.days,
                startDate: itinerary.start_date,
                currentDay: dayGroups.length > 0 ? dayGroups[0].day : 1,
                places: allPlaces,
                completedPlaces,
                completedCount: completedPlaces.length,
                totalPlaces: itinerary.itinerary_items.length,
                remainingTime: null,
            },
        });
    };

    if (loading) return <ItineraryDetailSkeleton />;
    if (!itinerary) return <ErrorMessage message="Plan bulunamadı." />;

    const isCompleted = itinerary.status === 'completed';
    const routeItems = (itinerary.itinerary_items || [])
        .filter((item) => item.places?.lat && item.places?.lng)
        .sort((a, b) => a.day_number - b.day_number || a.order_index - b.order_index);
    const routePreview = routeItems.slice(0, 4);
    const cityImages = getCityImages(itinerary.cities?.name, itinerary.cities?.region);

    return (
        <View style={styles.container}>
            {/* ─── Sticky Header ─── */}
            <View style={[styles.stickyHeader, { paddingTop: insets.top + SPACING.xs }]}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => navigation.goBack()}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.stickyTitle} numberOfLines={1}>
                    {itinerary.cities?.name || 'Plan Detayı'}
                </Text>
                <TouchableOpacity
                    style={styles.shareBtn}
                    onPress={() => shareItinerary({
                        cityName: itinerary.cities?.name || 'Gezi',
                        days: itinerary.days,
                        itineraryId: itinerary.id,
                    })}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
                        <Image
                            source={{ uri: cityImages.hero || cityImages.card }}
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
                                <Text style={styles.overviewTitle}>📍 {itinerary.cities?.name || 'Şehir'}</Text>
                            </View>
                            <View style={[styles.statusBadge, isCompleted && styles.statusCompleted]}>
                                <Text style={styles.statusText}>{isCompleted ? 'Tamamlandı' : 'Devam Ediyor'}</Text>
                            </View>
                        </View>
                        <Text style={styles.overviewDate}>{formatDate(itinerary.created_at)}</Text>
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
                                <Text style={styles.overviewStatValue}>{routeItems.length}</Text>
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
                            onPress={() => openRouteInMaps('driving')}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="car" size={18} color="#fff" />
                            <Text style={styles.overviewMainBtnText}>Google Maps'te Aç</Text>
                        </TouchableOpacity>
                    </View>
                </View>


                {/* Günler */}
                {dayGroups.map((group) => (
                    <View key={group.day} style={styles.timelineDayCard}>
                        <View style={styles.dayHeader}>
                            <View style={styles.dayBadge}>
                                <Text style={styles.dayBadgeText}>{group.day}</Text>
                            </View>
                            <Text style={styles.dayTitle}>Gün {group.day}</Text>
                            <Text style={styles.dayItemCount}>
                                {group.items.filter((i) => i.is_completed).length}/{group.items.length} tamamlandı
                            </Text>
                        </View>

                        {group.items.map((item, idx) => (
                            <React.Fragment key={item.id}>
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
                                        <View style={styles.timelineCardTop}>
                                            <Text style={[styles.itemName, item.is_completed && styles.itemNameCompleted]}>
                                                {item.places?.name || 'Bilinmeyen Yer'}
                                            </Text>
                                            <TouchableOpacity
                                                style={styles.checkToggleBtn}
                                                onPress={() => handleToggleCompletion(item)}
                                                disabled={isCompleted}
                                            >
                                                <Ionicons
                                                    name={item.is_completed ? 'checkmark-circle' : 'ellipse-outline'}
                                                    size={22}
                                                    color={item.is_completed ? COLORS.success : COLORS.textLight}
                                                />
                                            </TouchableOpacity>
                                        </View>

                                        <Text style={styles.itemMeta}>
                                            {item.places?.category} · {item.places?.avg_duration}s ·{' '}
                                            {item.places?.entry_fee > 0 ? `₺${item.places.entry_fee}` : 'Ücretsiz'}
                                        </Text>

                                        <View style={styles.timelineActionsRow}>
                                            {item.places?.lat && item.places?.lng && (
                                                <TouchableOpacity
                                                    onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${item.places.lat},${item.places.lng}&travelmode=driving`)}
                                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                    style={styles.timelineActionPill}
                                                >
                                                    <Ionicons name="navigate" size={14} color={COLORS.info} />
                                                    <Text style={styles.timelineActionText}>Harita</Text>
                                                </TouchableOpacity>
                                            )}
                                            {!isCompleted && (
                                                <>
                                                    <TouchableOpacity
                                                        onPress={() => handleSuggestAlternative(item)}
                                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                        style={styles.timelineActionPill}
                                                    >
                                                        <Ionicons name="swap-horizontal-outline" size={14} color={COLORS.primary} />
                                                        <Text style={styles.timelineActionText}>Alternatif</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        onPress={() => handleRemoveItem(item)}
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

                                {/* Öğle yemeği önerisi — günün ortasındaki iki yer arasına */}
                                {(() => {
                                    const meal = mealSuggestions[group.day];
                                    if (!meal?.lunch) return null;
                                    if (idx !== meal.lunchAfterIndex) return null;
                                    return (
                                        <InlineMealCard
                                            key={`lunch-${group.day}`}
                                            emoji="🍽️"
                                            label="Öğle Yemeği Önerisi"
                                            place={meal.lunch}
                                            onAdd={() => {
                                                addItineraryItem(itinerary.id, meal.lunch.id, group.day, idx + 1);
                                                fetchData();
                                            }}
                                            isCompleted={isCompleted}
                                        />
                                    );
                                })()}

                                {/* Akşam yemeği önerisi — son yerden sonra */}
                                {(() => {
                                    const meal = mealSuggestions[group.day];
                                    if (!meal?.dinner) return null;
                                    if (idx !== meal.dinnerAfterIndex) return null;
                                    return (
                                        <InlineMealCard
                                            key={`dinner-${group.day}`}
                                            emoji="🌙"
                                            label="Akşam Yemeği Önerisi"
                                            place={meal.dinner}
                                            onAdd={() => {
                                                addItineraryItem(itinerary.id, meal.dinner.id, group.day, group.items.length + 1);
                                                fetchData();
                                            }}
                                            isCompleted={isCompleted}
                                        />
                                    );
                                })()}
                            </React.Fragment>
                        ))}

                        {group.items.length === 0 && (
                            <View style={styles.timelineEmptyBox}>
                                <Text style={styles.timelineEmptyText}>Bu gün için planlanan durak yok.</Text>
                            </View>
                        )}
                    </View>
                ))}

                {/* AI Asistan */}
                <TouchableOpacity style={styles.assistantBtn} onPress={openAssistant} activeOpacity={0.85}>
                    <Ionicons name="sparkles" size={18} color="#fff" />
                    <Text style={styles.assistantBtnText}>Seyahat Asistanı</Text>
                    <Ionicons name="chevron-forward" size={14} color="#fff" />
                </TouchableOpacity>

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
        </View>
    );
};

const styles = StyleSheet.create({
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
    },
    overviewImage: {
        ...StyleSheet.absoluteFillObject,
    },
    overviewImageOverlay: {
        ...StyleSheet.absoluteFillObject,
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
        backgroundColor: '#34D399',
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
        backgroundColor: '#34D399',
        borderColor: '#34D399',
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
        backgroundColor: '#2563EB',
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
    checkToggleBtn: { marginLeft: 'auto' },
    itemName: { fontSize: FONT_SIZES.sm, fontFamily: 'Inter_500Medium', color: COLORS.textPrimary },
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
        marginBottom: SPACING.xs,
    },
    inlineMealDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FEF3C7',
        borderWidth: 1.5,
        borderColor: '#F59E0B',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.sm,
        flexShrink: 0,
    },
    inlineMealCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFBEB',
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.sm,
        borderWidth: 1,
        borderColor: '#FDE68A',
        gap: SPACING.sm,
        marginBottom: SPACING.xs,
    },
    inlineMealLeft: {
        flex: 1,
        gap: 3,
    },
    inlineMealBadge: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    inlineMealBadgeText: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 10,
        color: '#D97706',
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

    // ─── Alt Butonlar ───
    assistantBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        backgroundColor: COLORS.accent,
        borderRadius: BORDER_RADIUS.lg,
        paddingVertical: 14,
        marginBottom: SPACING.sm,
        shadowColor: COLORS.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    assistantBtnText: { fontFamily: 'Inter_700Bold', fontSize: FONT_SIZES.md, color: '#fff' },
    completeButton: { marginTop: SPACING.xs },

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
});


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
