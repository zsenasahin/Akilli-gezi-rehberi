/**
 * FavoritesScreen — Favorilere eklenen yerlerin listesi
 * 
 * Gezgin perspektifi: "Yarın nereye gideceğim?" sorusunun cevabı.
 * Kullanıcının kaydettiği tüm yerler burada, düzenli ve güzel.
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    Dimensions,
    RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/layout';
import { getPlaceImage } from '../../constants/placeImages';
import { getCategoryImage } from '../../constants/cityImages';
import { useAuth } from '../../contexts/AuthContext';
import { getFavorites, removeFavorite } from '../../services/favoriteService';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_W - SPACING.lg * 2;

const getCategoryIcon = (category) => {
    const map = {
        historical: 'library-outline',
        museum: 'color-palette-outline',
        nature: 'leaf-outline',
        religious: 'business-outline',
        shopping: 'bag-handle-outline',
        beach: 'sunny-outline',
    };
    return map[category] || 'location-outline';
};

const FavoritesScreen = ({ navigation }) => {
    const { user } = useAuth();
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useFocusEffect(
        useCallback(() => {
            if (user) loadFavorites();
        }, [user])
    );

    const loadFavorites = async () => {
        try {
            const { data, error } = await getFavorites(user.id);
            if (error) throw error;
            setFavorites(data || []);
        } catch (err) {
            console.error('Load favorites error:', err);
        }
        setLoading(false);
        setRefreshing(false);
    };

    const handleRemoveFavorite = async (placeId, placeName) => {
        Alert.alert(
            'Favoriden Çıkar',
            `"${placeName}" favorilerden çıkarılsın mı?`,
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Çıkar',
                    style: 'destructive',
                    onPress: async () => {
                        const { error } = await removeFavorite(user.id, placeId);
                        if (!error) {
                            setFavorites(prev => prev.filter(f => f.place_id !== placeId));
                        }
                    },
                },
            ]
        );
    };

    const renderFavoriteCard = ({ item }) => {
        const place = item.places;
        if (!place) return null;

        const imageUrl = getPlaceImage(place.name, place.image_url, place.category);

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => {
                    // Navigate to city detail with this place highlighted
                    // For now, just show the place in discover
                }}
            >
                <Image
                    source={{ uri: imageUrl }}
                    style={styles.cardImage}
                    contentFit="cover"
                    transition={300}
                />
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.7)']}
                    style={styles.cardGradient}
                />

                {/* Kategori badge */}
                <View style={styles.categoryBadge}>
                    <Ionicons name={getCategoryIcon(place.category)} size={14} color={COLORS.textPrimary} />
                    <Text style={styles.categoryText}>{place.category}</Text>
                </View>

                {/* Favori kaldır butonu */}
                <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => handleRemoveFavorite(place.id, place.name)}
                >
                    <Ionicons name="heart" size={22} color="#EF4444" />
                </TouchableOpacity>

                {/* İçerik */}
                <View style={styles.cardContent}>
                    <Text style={styles.cardName} numberOfLines={1}>{place.name}</Text>
                    <Text style={styles.cardCity}>📍 {place.cities?.name}</Text>

                    <View style={styles.cardMeta}>
                        <View style={styles.metaItem}>
                            <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.7)" />
                            <Text style={styles.metaText}>{place.avg_duration}s</Text>
                        </View>
                        {place.entry_fee > 0 ? (
                            <View style={styles.metaItem}>
                                <Ionicons name="cash-outline" size={14} color="rgba(255,255,255,0.7)" />
                                <Text style={styles.metaText}>₺{place.entry_fee}</Text>
                            </View>
                        ) : (
                            <View style={[styles.metaBadge, { backgroundColor: COLORS.success + '40' }]}>
                                <Text style={styles.metaBadgeText}>Ücretsiz</Text>
                            </View>
                        )}
                        <View style={styles.metaItem}>
                            <Ionicons name="star" size={14} color="rgba(255,255,255,0.7)" />
                            <Text style={styles.metaText}>{place.popularity_score}</Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <SkeletonLoader width={160} height={28} radius={8} style={{ marginBottom: 6 }} />
                    <SkeletonLoader width={90} height={14} radius={6} />
                </View>
                <View style={styles.listContent}>
                    {[0, 1, 2, 3].map(i => (
                        <SkeletonLoader
                            key={i}
                            width={CARD_WIDTH}
                            height={200}
                            radius={BORDER_RADIUS.xl}
                            style={{ marginBottom: SPACING.md }}
                        />
                    ))}
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Favorilerim</Text>
                <Text style={styles.headerSubtitle}>
                    {favorites.length > 0
                        ? `${favorites.length} kayıtlı yer`
                        : 'Henüz favori yer yok'}
                </Text>
            </View>

            {favorites.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIcon}>
                        <Ionicons name="heart-outline" size={64} color={COLORS.border} />
                    </View>
                    <Text style={styles.emptyTitle}>Henüz favori yer yok</Text>
                    <Text style={styles.emptyText}>
                        Şehirlere girerek beğendiğiniz yerleri{'\n'}kalp ikonuna basarak favorilere ekleyin.
                    </Text>
                    <TouchableOpacity
                        style={styles.emptyButton}
                        onPress={() => navigation.navigate('Home')}
                    >
                        <Ionicons name="compass" size={18} color="#fff" />
                        <Text style={styles.emptyButtonText}>Şehirleri Keşfet</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={favorites}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderFavoriteCard}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); loadFavorites(); }}
                            tintColor={COLORS.primary}
                        />
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },

    // Header
    header: {
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.xxl + 8,
        paddingBottom: SPACING.sm,
        backgroundColor: COLORS.surface,
    },
    headerTitle: {
        fontFamily: FONTS.heading,
        fontSize: 28,
        color: COLORS.textPrimary,
    },
    headerSubtitle: {
        fontFamily: 'Inter_400Regular',
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        marginTop: 2,
    },

    // List
    listContent: {
        padding: SPACING.lg,
        paddingBottom: SPACING.xxl,
    },

    // Card
    card: {
        width: CARD_WIDTH,
        height: 200,
        borderRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
        marginBottom: SPACING.md,
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 6,
    },
    cardImage: { ...StyleSheet.absoluteFillObject },
    cardGradient: {
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 140,
    },
    categoryBadge: {
        position: 'absolute', top: 12, left: 12,
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: BORDER_RADIUS.full,
    },
    categoryEmoji: { fontSize: 14 },
    categoryText: {
        fontFamily: 'Inter_500Medium',
        fontSize: 11, color: COLORS.textPrimary,
        textTransform: 'capitalize',
    },
    removeBtn: {
        position: 'absolute', top: 12, right: 12,
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center', alignItems: 'center',
    },
    cardContent: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: SPACING.md,
    },
    cardName: {
        fontFamily: 'Inter_600SemiBold', fontSize: FONT_SIZES.lg,
        color: '#fff', marginBottom: 2,
    },
    cardCity: {
        fontFamily: 'Inter_400Regular', fontSize: FONT_SIZES.sm,
        color: 'rgba(255,255,255,0.8)', marginBottom: 8,
    },
    cardMeta: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
    },
    metaItem: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
    },
    metaText: {
        fontFamily: 'Inter_500Medium', fontSize: 12,
        color: 'rgba(255,255,255,0.85)',
    },
    metaBadge: {
        paddingHorizontal: 8, paddingVertical: 2,
        borderRadius: BORDER_RADIUS.sm,
    },
    metaBadgeText: {
        fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#fff',
    },

    // Empty state
    emptyContainer: {
        flex: 1, justifyContent: 'center', alignItems: 'center',
        paddingHorizontal: SPACING.xl,
    },
    emptyIcon: {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: COLORS.surfaceAlt,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    emptyTitle: {
        fontFamily: FONTS.heading, fontSize: FONT_SIZES.xl,
        color: COLORS.textPrimary, marginBottom: SPACING.sm,
    },
    emptyText: {
        fontFamily: 'Inter_400Regular', fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary, textAlign: 'center',
        lineHeight: 22, marginBottom: SPACING.lg,
    },
    emptyButton: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: COLORS.primary,
        paddingHorizontal: 24, paddingVertical: 14,
        borderRadius: BORDER_RADIUS.lg,
    },
    emptyButtonText: {
        fontFamily: 'Inter_600SemiBold', fontSize: FONT_SIZES.md,
        color: '#fff',
    },
});

export default FavoritesScreen;
