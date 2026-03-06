import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, Alert, RefreshControl, Platform, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONT_SIZES } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/layout';
import {
    getItineraryById,
    toggleItemCompletion,
    removeItineraryItem,
    addItineraryItem,
    updateItineraryStatus,
} from '../../services/itineraryService';
import { getPlacesByCity } from '../../services/placeService';
import { suggestAlternative } from '../../logic/itineraryGenerator';
import { formatDate } from '../../utils/formatters';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';

const ItineraryDetailScreen = ({ route, navigation }) => {
    const { itineraryId } = route.params;

    const [itinerary, setItinerary] = useState(null);
    const [allCityPlaces, setAllCityPlaces] = useState([]);
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
        }
        setLoading(false);
        setRefreshing(false);
    }, [itineraryId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const dayGroups = React.useMemo(() => {
        if (!itinerary?.itinerary_items) return [];
        const groups = {};
        itinerary.itinerary_items
            .sort((a, b) => a.day_number - b.day_number || a.order_index - b.order_index)
            .forEach((item) => {
                if (!groups[item.day_number]) groups[item.day_number] = [];
                groups[item.day_number].push(item);
            });
        return Object.entries(groups).map(([day, items]) => ({ day: Number(day), items }));
    }, [itinerary]);

    const progress = React.useMemo(() => {
        if (!itinerary?.itinerary_items) return { completed: 0, total: 0, percentage: 0 };
        const total = itinerary.itinerary_items.length;
        const completed = itinerary.itinerary_items.filter((i) => i.is_completed).length;
        return { completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
    }, [itinerary]);

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
        const usedIds = itinerary.itinerary_items.map((i) => i.place_id);
        const suggestion = suggestAlternative(allCityPlaces, usedIds, item.places?.category);
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

    // ─── Google Maps Rota ─────────────────────────────────────────────────────
    const openRouteInMaps = () => {
        const sorted = itinerary?.itinerary_items
            ?.filter(i => i.places?.lat && i.places?.lng)
            ?.sort((a, b) => a.day_number - b.day_number || a.order_index - b.order_index);

        if (!sorted || sorted.length === 0) {
            Alert.alert('Bilgi', 'Haritada gösterilecek koordinatlı yer bulunamadı.');
            return;
        }

        let url;
        if (sorted.length === 1) {
            url = `https://www.google.com/maps/dir/?api=1&destination=${sorted[0].places.lat},${sorted[0].places.lng}&travelmode=walking`;
        } else {
            const origin = `${sorted[0].places.lat},${sorted[0].places.lng}`;
            const dest = `${sorted[sorted.length - 1].places.lat},${sorted[sorted.length - 1].places.lng}`;
            const mid = sorted.slice(1, -1).slice(0, 8);
            const wps = mid.map(p => `${p.places.lat},${p.places.lng}`).join('|');
            url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}${wps ? `&waypoints=${encodeURIComponent(wps)}` : ''}&travelmode=walking`;
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
                city: itinerary.cities?.name,
                days: itinerary.days,
                startDate: itinerary.start_date,
                currentDay: dayGroups.length > 0 ? dayGroups[0].day : 1,
                places: allPlaces,
                completedPlaces,
                remainingTime: null,
            },
        });
    };

    if (loading) return <LoadingSpinner message="Plan yükleniyor..." />;
    if (!itinerary) return <ErrorMessage message="Plan bulunamadı." />;

    const isCompleted = itinerary.status === 'completed';

    return (
        <View style={styles.container}>
            {/* ─── Sticky Header ─── */}
            <View style={styles.stickyHeader}>
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
                <TouchableOpacity style={styles.mapsBtn} onPress={openRouteInMaps} activeOpacity={0.85}>
                    <Ionicons name="navigate" size={14} color="#fff" />
                    <Text style={styles.mapsBtnText}>Rota</Text>
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

                {/* Plan Özeti */}
                <View style={[styles.headerCard, isCompleted && styles.headerCardCompleted]}>
                    <View style={styles.headerTop}>
                        <Text style={styles.headerCity}>📍 {itinerary.cities?.name || 'Şehir'}</Text>
                        <View style={[styles.statusBadge, isCompleted && styles.statusCompleted]}>
                            <Text style={styles.statusText}>
                                {isCompleted ? '✅ Tamamlandı' : '🔄 Devam Ediyor'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.headerStats}>
                        <View style={styles.headerStat}>
                            <Text style={styles.headerStatValue}>{itinerary.days}</Text>
                            <Text style={styles.headerStatLabel}>Gün</Text>
                        </View>
                        <View style={styles.headerStatDivider} />
                        <View style={styles.headerStat}>
                            <Text style={styles.headerStatValue}>{itinerary.itinerary_items?.length || 0}</Text>
                            <Text style={styles.headerStatLabel}>Yer</Text>
                        </View>
                        <View style={styles.headerStatDivider} />
                        <View style={styles.headerStat}>
                            <Text style={styles.headerStatValue}>{progress.percentage}%</Text>
                            <Text style={styles.headerStatLabel}>İlerleme</Text>
                        </View>
                    </View>

                    <View style={styles.progressBarContainer}>
                        <View style={[
                            styles.progressBarFill,
                            { width: `${progress.percentage}%` },
                            isCompleted && styles.progressBarCompleted,
                        ]} />
                    </View>
                    <Text style={styles.headerDate}>{formatDate(itinerary.created_at)}</Text>
                </View>

                {/* Günler */}
                {dayGroups.map((group) => (
                    <View key={group.day} style={styles.dayCard}>
                        <View style={styles.dayHeader}>
                            <View style={styles.dayBadge}>
                                <Text style={styles.dayBadgeText}>{group.day}</Text>
                            </View>
                            <Text style={styles.dayTitle}>Gün {group.day}</Text>
                            <Text style={styles.dayItemCount}>
                                {group.items.filter((i) => i.is_completed).length}/{group.items.length} tamamlandı
                            </Text>
                        </View>

                        {group.items.map((item) => (
                            <View key={item.id} style={[styles.itemRow, item.is_completed && styles.itemRowCompleted]}>
                                <TouchableOpacity
                                    style={styles.checkbox}
                                    onPress={() => handleToggleCompletion(item)}
                                    disabled={isCompleted}
                                >
                                    <Ionicons
                                        name={item.is_completed ? 'checkbox' : 'square-outline'}
                                        size={24}
                                        color={item.is_completed ? COLORS.success : COLORS.textLight}
                                    />
                                </TouchableOpacity>

                                <View style={styles.itemInfo}>
                                    <Text style={[styles.itemName, item.is_completed && styles.itemNameCompleted]}>
                                        {item.places?.name || 'Bilinmeyen Yer'}
                                    </Text>
                                    <Text style={styles.itemMeta}>
                                        {item.places?.category} · {item.places?.avg_duration}s ·{' '}
                                        {item.places?.entry_fee > 0 ? `₺${item.places.entry_fee}` : 'Ücretsiz'}
                                    </Text>
                                </View>

                                {/* Haritada gör */}
                                {item.places?.lat && item.places?.lng && (
                                    <TouchableOpacity
                                        onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${item.places.lat},${item.places.lng}&travelmode=walking`)}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        style={styles.mapIconBtn}
                                    >
                                        <Ionicons name="navigate-outline" size={18} color={COLORS.primary} />
                                    </TouchableOpacity>
                                )}

                                {!isCompleted && (
                                    <View style={styles.itemActions}>
                                        <TouchableOpacity
                                            onPress={() => handleSuggestAlternative(item)}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                            <Ionicons name="swap-horizontal-outline" size={18} color={COLORS.info} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => handleRemoveItem(item)}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                            <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                ))}

                {/* Alt Butonlar */}
                <TouchableOpacity style={styles.assistantBtn} onPress={openAssistant} activeOpacity={0.85}>
                    <Text style={styles.assistantBtnEmoji}>✈️</Text>
                    <Text style={styles.assistantBtnText}>AI Asistan</Text>
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
        paddingTop: Platform.OS === 'ios' ? 52 : SPACING.md,
        paddingBottom: SPACING.sm,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backBtn: { padding: 4 },
    stickyTitle: {
        flex: 1,
        fontFamily: 'PlayfairDisplay_700Bold',
        fontSize: FONT_SIZES.lg,
        color: COLORS.textPrimary,
    },
    mapsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: BORDER_RADIUS.full,
    },
    mapsBtnText: { fontSize: FONT_SIZES.xs, fontFamily: 'Inter_600SemiBold', color: '#fff' },

    // ─── Scroll ───
    scrollView: { flex: 1 },
    contentContainer: { padding: SPACING.md, paddingBottom: SPACING.xxl },

    // ─── Plan Özeti Header ───
    headerCard: {
        backgroundColor: COLORS.primary,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.md,
    },
    headerCardCompleted: { backgroundColor: COLORS.success },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    headerCity: { fontSize: FONT_SIZES.xl, fontFamily: 'PlayfairDisplay_700Bold', color: '#fff' },
    statusBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.full,
    },
    statusCompleted: { backgroundColor: 'rgba(255,255,255,0.3)' },
    statusText: { fontSize: FONT_SIZES.xs, color: '#fff', fontFamily: 'Inter_600SemiBold' },
    headerStats: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
    headerStat: { alignItems: 'center', flex: 1 },
    headerStatValue: { fontSize: FONT_SIZES.lg, fontFamily: 'Inter_700Bold', color: '#fff' },
    headerStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    headerStatDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.3)' },
    progressBarContainer: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 3,
        marginTop: SPACING.md,
        overflow: 'hidden',
    },
    progressBarFill: { height: '100%', backgroundColor: '#fff', borderRadius: 3 },
    progressBarCompleted: { backgroundColor: 'rgba(255,255,255,0.9)' },
    headerDate: {
        fontSize: FONT_SIZES.xs,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        marginTop: SPACING.sm,
    },

    // ─── Günler ───
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

    // ─── Yer Satırları ───
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.sm,
        borderTopWidth: 1,
        borderTopColor: COLORS.divider,
    },
    itemRowCompleted: { opacity: 0.6 },
    checkbox: { marginRight: SPACING.sm },
    itemInfo: { flex: 1 },
    itemName: { fontSize: FONT_SIZES.sm, fontFamily: 'Inter_500Medium', color: COLORS.textPrimary },
    itemNameCompleted: { textDecorationLine: 'line-through', color: COLORS.textSecondary },
    itemMeta: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
    mapIconBtn: { padding: 4, marginRight: 4 },
    itemActions: { flexDirection: 'row', gap: SPACING.md },

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
    assistantBtnEmoji: { fontSize: 18 },
    assistantBtnText: { fontFamily: 'Inter_700Bold', fontSize: FONT_SIZES.md, color: '#fff' },
    completeButton: { marginTop: SPACING.xs },
});

export default ItineraryDetailScreen;
