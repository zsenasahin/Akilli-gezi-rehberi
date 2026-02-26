import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    RefreshControl,
    Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
// No Reanimated — Expo Go uyumluluğu
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SCREEN } from '../../constants/layout';
import { useAuth } from '../../contexts/AuthContext';
import { getProfile, updateProfile } from '../../services/profileService';
import { getItinerariesByUser } from '../../services/itineraryService';
import { signOut } from '../../services/authService';
import useFavorites from '../../hooks/useFavorites';
import { formatDate } from '../../utils/formatters';
import { getCategoryByKey } from '../../constants/categories';
import { getCategoryImage } from '../../constants/cityImages';
import { getPlaceImage } from '../../constants/placeImages';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Button from '../../components/common/Button';

const SCREEN_WIDTH = Dimensions.get('window').width;

const ProfileScreen = ({ navigation }) => {
    const { user } = useAuth();
    const { favorites, toggle: toggleFav, loading: favLoading } = useFavorites();

    const [profile, setProfile] = useState(null);
    const [itineraries, setItineraries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [editing, setEditing] = useState(false);
    const [fullName, setFullName] = useState('');
    const [travelStyle, setTravelStyle] = useState('');

    const fetchData = useCallback(async () => {
        if (!user) return;

        const [profileResult, itineraryResult] = await Promise.all([
            getProfile(user.id),
            getItinerariesByUser(user.id),
        ]);

        if (profileResult.data) {
            setProfile(profileResult.data);
            setFullName(profileResult.data.full_name || '');
            setTravelStyle(profileResult.data.travel_style || '');
        }

        if (itineraryResult.data) {
            setItineraries(itineraryResult.data);
        }

        setLoading(false);
        setRefreshing(false);
    }, [user]);

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [fetchData])
    );

    const handleSaveProfile = async () => {
        if (!user) return;

        const { error } = await updateProfile(user.id, {
            full_name: fullName,
            travel_style: travelStyle,
        });

        if (error) {
            Alert.alert('Hata', 'Profil güncellenirken hata oluştu.');
        } else {
            setProfile((prev) => ({
                ...prev,
                full_name: fullName,
                travel_style: travelStyle,
            }));
            setEditing(false);
            Alert.alert('Başarılı', 'Profiliniz güncellendi.');
        }
    };

    const handleLogout = () => {
        Alert.alert('Çıkış Yap', 'Çıkış yapmak istediğinize emin misiniz?', [
            { text: 'İptal', style: 'cancel' },
            {
                text: 'Çıkış Yap',
                style: 'destructive',
                onPress: async () => {
                    await signOut();
                },
            },
        ]);
    };

    if (loading) return <LoadingSpinner message="Profil yükleniyor..." />;

    // Stats
    const ongoingCount = itineraries.filter((i) => i.status === 'ongoing').length;
    const completedCount = itineraries.filter((i) => i.status === 'completed').length;
    const favCount = favorites.length;

    const TRAVEL_STYLES = ['Kültürel', 'Macera', 'Rahat', 'Gastronomi', 'Doğa'];

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => {
                        setRefreshing(true);
                        fetchData();
                    }}
                    tintColor={COLORS.primary}
                />
            }
        >
            {/* ═══ PROFILE HEADER ═══ */}
            <View style={styles.profileHeader}>
                <LinearGradient
                    colors={COLORS.gradient.primary}
                    style={styles.profileGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={styles.avatarContainer}>
                        <Text style={styles.avatarText}>
                            {(fullName || user?.email || '?')[0].toUpperCase()}
                        </Text>
                    </View>

                    {editing ? (
                        <View style={styles.editForm}>
                            <TextInput
                                style={styles.input}
                                value={fullName}
                                onChangeText={setFullName}
                                placeholder="Ad Soyad"
                                placeholderTextColor="rgba(255,255,255,0.5)"
                            />
                            <Text style={styles.styleLabel}>Seyahat Tarzı</Text>
                            <View style={styles.styleChips}>
                                {TRAVEL_STYLES.map((style) => (
                                    <TouchableOpacity
                                        key={style}
                                        style={[
                                            styles.styleChip,
                                            travelStyle === style && styles.styleChipActive,
                                        ]}
                                        onPress={() => setTravelStyle(style)}
                                    >
                                        <Text
                                            style={[
                                                styles.styleChipText,
                                                travelStyle === style && styles.styleChipTextActive,
                                            ]}
                                        >
                                            {style}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <View style={styles.editActions}>
                                <TouchableOpacity
                                    style={styles.editCancelBtn}
                                    onPress={() => setEditing(false)}
                                >
                                    <Text style={styles.editCancelText}>İptal</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.editSaveBtn}
                                    onPress={handleSaveProfile}
                                >
                                    <Text style={styles.editSaveText}>Kaydet</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <>
                            <Text style={styles.userName}>
                                {profile?.full_name || 'Adınızı ekleyin'}
                            </Text>
                            <Text style={styles.userEmail}>{user?.email}</Text>
                            {travelStyle ? (
                                <View style={styles.travelStyleBadge}>
                                    <Text style={styles.travelStyleText}>
                                        ✈️ {travelStyle}
                                    </Text>
                                </View>
                            ) : null}
                            <TouchableOpacity
                                style={styles.editProfileButton}
                                onPress={() => setEditing(true)}
                            >
                                <Ionicons name="pencil-outline" size={14} color="#fff" />
                                <Text style={styles.editProfileText}>Profili Düzenle</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </LinearGradient>
            </View>

            {/* ═══ STATS ═══ */}
            <View style={styles.statsRow}>
                <View style={styles.stat}>
                    <Text style={styles.statValue}>{favCount}</Text>
                    <Text style={styles.statLabel}>Favori</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                    <Text style={styles.statValue}>{ongoingCount}</Text>
                    <Text style={styles.statLabel}>Devam Eden</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                    <Text style={styles.statValue}>{completedCount}</Text>
                    <Text style={styles.statLabel}>Tamamlanan</Text>
                </View>
            </View>

            {/* ═══ FAVORITES ═══ */}
            <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>❤️ Favorilerim</Text>
                    {favorites.length > 4 && (
                        <Text style={styles.seeAllText}>Tümü →</Text>
                    )}
                </View>
                {favLoading ? (
                    <Text style={styles.loadingText}>Yükleniyor...</Text>
                ) : favorites.length === 0 ? (
                    <View style={styles.emptySection}>
                        <Ionicons name="heart-outline" size={40} color={COLORS.textLight} />
                        <Text style={styles.emptySectionText}>
                            Henüz favori yeriniz yok.
                        </Text>
                        <Text style={styles.emptySectionSubText}>
                            Keşfet ekranından beğendiğiniz yerleri favorilere ekleyin!
                        </Text>
                    </View>
                ) : (
                    <View style={styles.favGrid}>
                        {favorites.slice(0, 4).map((fav, index) => {
                            const place = fav.places;
                            if (!place) return null;
                            const imageUrl = getPlaceImage(place.name, place.image_url, place.category);

                            return (
                                <View
                                    key={fav.id}

                                    style={styles.favCardContainer}
                                >
                                    <View style={styles.favCard}>
                                        <Image
                                            source={{ uri: imageUrl }}
                                            style={styles.favImage}
                                            contentFit="cover"
                                            transition={300}
                                        />
                                        <LinearGradient
                                            colors={COLORS.gradient.card}
                                            style={styles.favGradient}
                                        />
                                        <View style={styles.favContent}>
                                            <Text style={styles.favName} numberOfLines={1}>
                                                {place.name}
                                            </Text>
                                            <Text style={styles.favCity} numberOfLines={1}>
                                                {place.cities?.name}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.favHeart}
                                            onPress={() => toggleFav(place.id)}
                                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                        >
                                            <Ionicons name="heart" size={16} color={COLORS.error} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}
            </View>

            {/* ═══ RECENT PLANS ═══ */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>🗺️ Son Gezi Planlarım</Text>
                {itineraries.length === 0 ? (
                    <View style={styles.emptySection}>
                        <Ionicons name="map-outline" size={40} color={COLORS.textLight} />
                        <Text style={styles.emptySectionText}>
                            Henüz gezi planınız yok.
                        </Text>
                    </View>
                ) : (
                    <View style={styles.itineraryList}>
                        {itineraries.slice(0, 5).map((itin, index) => (
                            <View
                                key={itin.id}

                            >
                                <TouchableOpacity
                                    style={styles.itineraryItem}
                                    onPress={() =>
                                        navigation.navigate('Saved', {
                                            screen: 'ItineraryDetail',
                                            params: { itineraryId: itin.id },
                                        })
                                    }
                                >
                                    <View style={styles.itinIconContainer}>
                                        <Ionicons
                                            name={itin.status === 'completed' ? 'checkmark-circle' : 'navigate'}
                                            size={20}
                                            color={itin.status === 'completed' ? COLORS.success : COLORS.primary}
                                        />
                                    </View>
                                    <View style={styles.itineraryInfo}>
                                        <Text style={styles.itineraryName}>
                                            {itin.cities?.name}
                                        </Text>
                                        <Text style={styles.itineraryMeta}>
                                            {itin.days} gün · {formatDate(itin.created_at)}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}
            </View>

            {/* ═══ LOGOUT ═══ */}
            <View style={styles.logoutSection}>
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
                    <Text style={styles.logoutText}>Çıkış Yap</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    contentContainer: { paddingBottom: SPACING.xxl },

    // ─── PROFILE HEADER ───
    profileHeader: {
        borderBottomLeftRadius: BORDER_RADIUS.xl,
        borderBottomRightRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
        marginBottom: SPACING.md,
    },
    profileGradient: {
        alignItems: 'center',
        paddingTop: SPACING.xxl + 16,
        paddingBottom: SPACING.xl,
        paddingHorizontal: SPACING.lg,
    },
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.sm,
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.4)',
    },
    avatarText: {
        fontSize: 32,
        fontFamily: 'PlayfairDisplay_700Bold',
        color: '#fff',
    },
    userName: {
        fontFamily: 'PlayfairDisplay_700Bold',
        fontSize: FONT_SIZES.xl,
        color: '#fff',
    },
    userEmail: {
        fontFamily: 'Inter_400Regular',
        fontSize: FONT_SIZES.sm,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    travelStyleBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 14,
        paddingVertical: 5,
        borderRadius: BORDER_RADIUS.full,
        marginTop: SPACING.sm,
    },
    travelStyleText: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: FONT_SIZES.xs,
        color: '#fff',
    },
    editProfileButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: SPACING.sm,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    editProfileText: {
        fontFamily: 'Inter_500Medium',
        fontSize: FONT_SIZES.xs,
        color: '#fff',
    },

    // ─── EDIT FORM ───
    editForm: { width: '100%', marginTop: SPACING.sm },
    input: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.sm,
        fontFamily: 'Inter_400Regular',
        fontSize: FONT_SIZES.md,
        color: '#fff',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        marginBottom: SPACING.sm,
    },
    styleLabel: {
        fontFamily: 'Inter_500Medium',
        fontSize: FONT_SIZES.sm,
        color: 'rgba(255,255,255,0.9)',
        marginBottom: SPACING.xs,
    },
    styleChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.xs,
        marginBottom: SPACING.sm,
    },
    styleChip: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    styleChipActive: {
        backgroundColor: '#fff',
        borderColor: '#fff',
    },
    styleChipText: {
        fontFamily: 'Inter_400Regular',
        fontSize: FONT_SIZES.xs,
        color: 'rgba(255,255,255,0.8)',
    },
    styleChipTextActive: {
        color: COLORS.primaryDark,
        fontFamily: 'Inter_600SemiBold',
    },
    editActions: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    editCancelBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.4)',
        alignItems: 'center',
    },
    editCancelText: {
        fontFamily: 'Inter_500Medium',
        fontSize: FONT_SIZES.sm,
        color: '#fff',
    },
    editSaveBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: '#fff',
        alignItems: 'center',
    },
    editSaveText: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: FONT_SIZES.sm,
        color: COLORS.primaryDark,
    },

    // ─── STATS ───
    statsRow: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.md,
        justifyContent: 'space-around',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    stat: { alignItems: 'center', flex: 1 },
    statValue: {
        fontFamily: 'PlayfairDisplay_700Bold',
        fontSize: FONT_SIZES.xl,
        color: COLORS.primary,
    },
    statLabel: {
        fontFamily: 'Inter_400Regular',
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 36,
        backgroundColor: COLORS.border,
    },

    // ─── SECTIONS ───
    section: {
        paddingHorizontal: SPACING.lg,
        marginBottom: SPACING.md,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    sectionTitle: {
        fontFamily: 'PlayfairDisplay_700Bold',
        fontSize: FONT_SIZES.lg,
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
    },
    seeAllText: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: FONT_SIZES.sm,
        color: COLORS.primary,
    },
    emptySection: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.xl,
        alignItems: 'center',
    },
    emptySectionText: {
        fontFamily: 'Inter_500Medium',
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginTop: SPACING.sm,
    },
    emptySectionSubText: {
        fontFamily: 'Inter_400Regular',
        fontSize: FONT_SIZES.xs,
        color: COLORS.textLight,
        marginTop: 4,
        textAlign: 'center',
    },
    loadingText: {
        fontFamily: 'Inter_400Regular',
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },

    // ─── FAVORITES GRID ───
    favGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    favCardContainer: {
        width: (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.sm) / 2,
    },
    favCard: {
        height: 140,
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
        position: 'relative',
    },
    favImage: {
        ...StyleSheet.absoluteFillObject,
    },
    favGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    favContent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: SPACING.sm,
    },
    favName: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: FONT_SIZES.sm,
        color: '#fff',
    },
    favCity: {
        fontFamily: 'Inter_400Regular',
        fontSize: FONT_SIZES.xs,
        color: 'rgba(255,255,255,0.8)',
    },
    favHeart: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 12,
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // ─── ITINERARIES ───
    itineraryList: { gap: SPACING.xs },
    itineraryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.sm + 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    itinIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: COLORS.primaryMuted,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.sm,
    },
    itineraryInfo: { flex: 1 },
    itineraryName: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
    },
    itineraryMeta: {
        fontFamily: 'Inter_400Regular',
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        marginTop: 2,
    },

    // ─── LOGOUT ───
    logoutSection: {
        paddingHorizontal: SPACING.lg,
        marginTop: SPACING.md,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1.5,
        borderColor: COLORS.error + '40',
        backgroundColor: COLORS.error + '08',
    },
    logoutText: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: FONT_SIZES.md,
        color: COLORS.error,
    },
});

export default ProfileScreen;
