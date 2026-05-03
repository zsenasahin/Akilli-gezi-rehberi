import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
// No Reanimated — Expo Go uyumluluğu
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/layout';
import { getCityImages } from '../../services/cityImageService';
import { useAuth } from '../../contexts/AuthContext';
import {
    getItinerariesByUser,
    deleteItinerary,
} from '../../services/itineraryService';
import { formatDate } from '../../utils/formatters';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import ErrorMessage from '../../components/common/ErrorMessage';
import { useThemePreference } from '../../contexts/ThemeContext';

const SavedItinerariesScreen = ({ navigation }) => {
    const { user } = useAuth();
    const { theme } = useThemePreference();
    const [itineraries, setItineraries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all');

    const fetchItineraries = async () => {
        if (!user) return;
        setError(null);

        const { data, error: fetchError } = await getItinerariesByUser(user.id);

        if (fetchError) {
            setError('Planlar yüklenirken hata oluştu.');
        } else {
            setItineraries(data || []);
        }

        setLoading(false);
        setRefreshing(false);
    };

    useFocusEffect(
        useCallback(() => {
            fetchItineraries();
        }, [user])
    );

    const handleDelete = (itinerary) => {
        Alert.alert(
            'Planı Sil',
            'Bu gezi planını silmek istediğinize emin misiniz?',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: async () => {
                        const { error: deleteError } = await deleteItinerary(itinerary.id);
                        if (deleteError) {
                            Alert.alert('Hata', 'Plan silinirken bir hata oluştu.');
                        } else {
                            setItineraries((prev) => prev.filter((i) => i.id !== itinerary.id));
                        }
                    },
                },
            ]
        );
    };

    const handleView = (itinerary) => {
        navigation.navigate('ItineraryDetail', { itineraryId: itinerary.id });
    };

    const filteredItineraries = itineraries.filter((item) => {
        if (filter === 'ongoing') return item.status === 'ongoing';
        if (filter === 'completed') return item.status === 'completed';
        return true;
    });

    const renderItineraryItem = ({ item, index }) => {
        const isCompleted = item.status === 'completed';
        const itemCount = item.itinerary_items?.length || 0;
        const cityImages = getCityImages(item.cities?.name, item.cities?.region);

        return (
            <View>
                <TouchableOpacity
                    style={styles.card}
                    onPress={() => handleView(item)}
                    activeOpacity={0.85}
                >
                    {/* City image header */}
                    <View style={styles.cardImageContainer}>
                        <Image
                            source={{ uri: cityImages.card }}
                            style={styles.cardImage}
                            contentFit="cover"
                            transition={300}
                        />
                        <LinearGradient
                            colors={COLORS.gradient.card}
                            style={styles.cardImageGradient}
                        />
                        <View style={styles.cardImageContent}>
                            <Text style={styles.cardCityName}>{item.cities?.name || 'Şehir'}</Text>
                            <View style={[styles.statusBadge, isCompleted && styles.statusCompleted]}>
                                <Ionicons
                                    name={isCompleted ? 'checkmark-circle' : 'time'}
                                    size={12}
                                    color="#fff"
                                />
                                <Text style={styles.statusText}>
                                    {isCompleted ? 'Tamamlandı' : 'Devam Ediyor'}
                                </Text>
                            </View>
                        </View>
                        {/* Delete button */}
                        <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={() => handleDelete(item)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="trash-outline" size={16} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/* Card body */}
                    <View style={styles.cardBody}>
                        <View style={styles.cardMeta}>
                            <View style={styles.metaItem}>
                                <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
                                <Text style={styles.metaText}>{item.days} gün</Text>
                            </View>
                            <View style={styles.metaItem}>
                                <Ionicons name="location-outline" size={14} color={COLORS.accent} />
                                <Text style={styles.metaText}>{itemCount} yer</Text>
                            </View>
                            <View style={styles.metaItem}>
                                <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
                                <Text style={styles.metaText}>{formatDate(item.created_at)}</Text>
                            </View>
                        </View>

                        {/* Feature badges */}
                        <View style={styles.badges}>
                            {item.has_accommodation && (
                                <View style={styles.badge}>
                                    <Ionicons name="bed-outline" size={12} color={COLORS.primary} />
                                    <Text style={styles.badgeText}>Konaklama</Text>
                                </View>
                            )}
                            {item.has_transport && (
                                <View style={styles.badge}>
                                    <Ionicons name="car-outline" size={12} color={COLORS.accent} />
                                    <Text style={styles.badgeText}>Ulaşım</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </TouchableOpacity>
            </View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
                <View style={styles.headerBar}>
                    <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Planlarim</Text>
                    <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>Tum rotalarin tek yerde</Text>
                </View>
                <View style={styles.filterRow}>
                    {[0, 1, 2].map(i => (
                        <SkeletonLoader key={i} width="30%" height={40} radius={BORDER_RADIUS.lg} />
                    ))}
                </View>
                <View style={styles.listContent}>
                    {[0, 1, 2, 3].map(i => (
                        <View key={i} style={[styles.card, { overflow: 'visible', marginBottom: SPACING.md }]}>
                            <SkeletonLoader width="100%" height={130} radius={BORDER_RADIUS.lg} style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }} />
                            <View style={{ padding: SPACING.sm + 2, backgroundColor: COLORS.surface, borderBottomLeftRadius: BORDER_RADIUS.lg, borderBottomRightRadius: BORDER_RADIUS.lg }}>
                                <SkeletonLoader width="50%" height={12} radius={6} style={{ marginBottom: 8 }} />
                                <SkeletonLoader width="35%" height={12} radius={6} />
                            </View>
                        </View>
                    ))}
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <View style={styles.headerBar}>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Planlarim</Text>
                <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>{filteredItineraries.length} gorunen plan</Text>
            </View>
            {/* Filter tabs */}
            <View style={styles.filterRow}>
                {[
                    { key: 'all', label: 'Tümü', icon: 'apps' },
                    { key: 'ongoing', label: 'Devam Eden', icon: 'time' },
                    { key: 'completed', label: 'Tamamlanan', icon: 'checkmark-circle' },
                ].map((f) => (
                    <TouchableOpacity
                        key={f.key}
                        style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
                        onPress={() => setFilter(f.key)}
                    >
                        <Ionicons
                            name={f.icon}
                            size={14}
                            color={filter === f.key ? '#fff' : COLORS.textSecondary}
                        />
                        <Text style={[styles.filterTabText, filter === f.key && styles.filterTabTextActive]}>
                            {f.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <FlatList
                data={filteredItineraries}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItineraryItem}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            setRefreshing(true);
                            fetchItineraries();
                        }}
                        tintColor={COLORS.primary}
                    />
                }
                ListEmptyComponent={
                    error ? (
                        <ErrorMessage message={error} onRetry={fetchItineraries} />
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="map-outline" size={64} color={COLORS.textLight} />
                            <Text style={styles.emptyText}>
                                {filter === 'ongoing'
                                    ? 'Devam eden planınız yok.'
                                    : filter === 'completed'
                                        ? 'Tamamlanan planınız yok.'
                                        : 'Henüz kaydedilmiş planınız yok.'}
                            </Text>
                            <Text style={styles.emptySubText}>
                                Ana sayfadan yeni bir gezi planı oluşturun!
                            </Text>
                        </View>
                    )
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerBar: {
        paddingHorizontal: SPACING.lg,
        paddingTop: 10,
        paddingBottom: 8,
    },
    headerTitle: {
        fontFamily: FONTS.heading,
        fontSize: 28,
    },
    headerSubtitle: {
        marginTop: 4,
        fontFamily: FONTS.body,
        fontSize: 13,
    },

    // ─── Filters ───
    filterRow: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.xs,
        paddingBottom: SPACING.sm,
        gap: SPACING.sm,
    },
    filterTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        paddingVertical: 10,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.surface,
        borderWidth: 1.5,
        borderColor: COLORS.border,
    },
    filterTabActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    filterTabText: {
        fontFamily: 'Inter_500Medium',
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
    },
    filterTabTextActive: {
        color: '#fff',
        fontFamily: 'Inter_600SemiBold',
    },

    // ─── List ───
    listContent: {
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.sm,
        paddingBottom: SPACING.xxl,
    },

    // ─── Card ───
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: 22,
        marginBottom: SPACING.md,
        overflow: 'hidden',
        shadowColor: '#10211A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 18,
        elevation: 4,
    },
    cardImageContainer: {
        height: 130,
        position: 'relative',
    },
    cardImage: {
        ...StyleSheet.absoluteFillObject,
    },
    cardImageGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    cardImageContent: {
        position: 'absolute',
        bottom: SPACING.sm,
        left: SPACING.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    cardCityName: {
        fontFamily: FONTS.heading,
        fontSize: FONT_SIZES.xl,
        color: '#fff',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.accent + '90',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: BORDER_RADIUS.sm,
    },
    statusCompleted: {
        backgroundColor: COLORS.success + '90',
    },
    statusText: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 10,
        color: '#fff',
    },
    deleteBtn: {
        position: 'absolute',
        top: SPACING.sm,
        right: SPACING.sm,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 14,
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardBody: {
        padding: SPACING.sm + 2,
    },
    cardMeta: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontFamily: 'Inter_400Regular',
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
    },
    badges: {
        flexDirection: 'row',
        gap: SPACING.sm,
        marginTop: SPACING.sm,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.sm,
        backgroundColor: COLORS.surfaceAlt,
    },
    badgeText: {
        fontFamily: 'Inter_500Medium',
        fontSize: 10,
        color: COLORS.textSecondary,
    },

    // ─── Empty ───
    emptyContainer: {
        alignItems: 'center',
        marginTop: SPACING.xxl * 2,
    },
    emptyText: {
        fontFamily: 'Inter_500Medium',
        fontSize: FONT_SIZES.lg,
        color: COLORS.textPrimary,
        textAlign: 'center',
        marginTop: SPACING.md,
    },
    emptySubText: {
        fontFamily: 'Inter_400Regular',
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        marginTop: SPACING.xs,
        textAlign: 'center',
    },
});

export default SavedItinerariesScreen;
