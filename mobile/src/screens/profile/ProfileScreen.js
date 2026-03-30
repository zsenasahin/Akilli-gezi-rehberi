import React, { useState, useCallback, useRef } from 'react';
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
    Animated,
    Platform,
    Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import SmartImage from '../../components/common/SmartImage';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SCREEN } from '../../constants/layout';
import { useAuth } from '../../contexts/AuthContext';
import { getProfile, updateProfile } from '../../services/profileService';
import { getItinerariesByUser } from '../../services/itineraryService';
import { signOut } from '../../services/authService';
import useFavorites from '../../hooks/useFavorites';
import { formatDate } from '../../utils/formatters';
import { ProfileSkeleton } from '../../components/common/SkeletonLoader';

const SCREEN_WIDTH = Dimensions.get('window').width;

const TRAVEL_STYLES = [
    { value: 'cultural', label: 'Kültürel', emoji: '🏛️' },
    { value: 'adventure', label: 'Macera', emoji: '🧗' },
    { value: 'relaxed', label: 'Rahat', emoji: '🌴' },
    { value: 'gastronomy', label: 'Gastronomi', emoji: '🍽️' },
    { value: 'nature', label: 'Doğa', emoji: '🌿' },
    { value: 'photography', label: 'Fotoğraf', emoji: '📸' },
];

const LEGACY_TR_STYLE_TO_VALUE = {
    Kültürel: 'cultural',
    Macera: 'adventure',
    Rahat: 'relaxed',
    Gastronomi: 'gastronomy',
    Doğa: 'nature',
    Fotoğraf: 'photography',
};

const normalizeTravelStyle = (style) => LEGACY_TR_STYLE_TO_VALUE[style] || style || '';

const BADGE_THRESHOLDS = [
    { min: 0, label: 'Kaşif Adayı', emoji: '🌱', color: '#6B7280' },
    { min: 1, label: 'Gezgin', emoji: '🗺️', color: '#0891B2' },
    { min: 3, label: 'Seyyah', emoji: '🧭', color: '#7C3AED' },
    { min: 5, label: 'Maceracı', emoji: '⛺', color: '#EA580C' },
    { min: 10, label: 'Usta Gezgin', emoji: '🏆', color: '#D97706' },
];

const getBadge = (count) =>
    BADGE_THRESHOLDS.slice().reverse().find(b => count >= b.min) || BADGE_THRESHOLDS[0];

const ProfileScreen = ({ navigation }) => {
    const { user } = useAuth();
    const { favorites, loading: favLoading } = useFavorites();

    const [profile, setProfile] = useState(null);
    const [itineraries, setItineraries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [editing, setEditing] = useState(false);
    const [fullName, setFullName] = useState('');
    const [travelStyle, setTravelStyle] = useState('');
    const [avatarUri, setAvatarUri] = useState(null);
    const [bio, setBio] = useState('');

    // Animasyon
    const headerScale = useRef(new Animated.Value(1)).current;

    const fetchData = useCallback(async () => {
        if (!user) return;
        const [profileResult, itineraryResult] = await Promise.all([
            getProfile(user.id),
            getItinerariesByUser(user.id),
        ]);
        if (profileResult.data) {
            setProfile(profileResult.data);
            setFullName(profileResult.data.full_name || '');
            setTravelStyle(normalizeTravelStyle(profileResult.data.travel_style));
            setBio(profileResult.data.bio || '');
            if (profileResult.data.avatar_url) setAvatarUri(profileResult.data.avatar_url);
        }
        if (itineraryResult.data) setItineraries(itineraryResult.data);
        setLoading(false);
        setRefreshing(false);
    }, [user]);

    useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

    // ─── Profil fotoğrafı seçimi ────────────────────────────────────────────
    const handlePickAvatar = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('İzin Gerekli', 'Fotoğraf seçmek için galeri iznine ihtiyacımız var.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (!result.canceled && result.assets?.[0]?.uri) {
            setAvatarUri(result.assets[0].uri);
            // Profili güncelle (avatar_url olarak local URI — gerçek uygulamada storage'a yüklenir)
            await updateProfile(user.id, { avatar_url: result.assets[0].uri });
        }
    };

    // ─── Profil kaydet ──────────────────────────────────────────────────────
    const handleSaveProfile = async () => {
        if (!user?.id) {
            Alert.alert('Hata', 'Profil güncellemek için tekrar giriş yapın.');
            return;
        }
        const { error } = await updateProfile(user.id, {
            full_name: fullName,
            travel_style: travelStyle,
            bio,
        });
        if (error) {
            Alert.alert('Hata', error.message || 'Profil güncellenirken hata oluştu.');
        } else {
            setProfile(prev => ({ ...prev, full_name: fullName, travel_style: travelStyle, bio }));
            setEditing(false);
        }
    };

    // ─── Profili paylaş ─────────────────────────────────────────────────────
    const handleShareProfile = async () => {
        const completedCount = itineraries.filter(i => i.status === 'completed').length;
        const badge = getBadge(completedCount);
        const styleLabel =
            TRAVEL_STYLES.find(s => s.value === normalizeTravelStyle(travelStyle))?.label || 'Belirtilmemiş';
        try {
            await Share.share({
                message:
                    `🗺️ Akıllı Gezi Rehberi'nde ${fullName || 'Bir Gezginin'} profilim!\n\n` +
                    `${badge.emoji} Rozet: ${badge.label}\n` +
                    `✅ Tamamlanan Gezi: ${completedCount}\n` +
                    `❤️ Favoriler: ${favorites.length}\n` +
                    `🎒 Seyahat Tarzı: ${styleLabel}\n\n` +
                    `Türkiye'yi birlikte keşfedelim! 🇹🇷`,
                title: 'Profilimi Paylaş',
            });
        } catch (e) { /* ignore */ }
    };

    // ─── Gezi planını paylaş ────────────────────────────────────────────────
    const handleShareItinerary = async (itin) => {
        try {
            await Share.share({
                message:
                    `🗺️ ${itin.cities?.name} Gezi Planım — Akıllı Gezi Rehberi\n\n` +
                    `📅 ${itin.days} günlük plan\n` +
                    `📍 ${itin.itinerary_items?.length || 0} yer\n` +
                    `${formatDate(itin.start_date)} tarihinde başlıyor\n\n` +
                    `Akıllı Gezi Rehberi ile harika rotalar oluştur! 🇹🇷`,
            });
        } catch (e) { /* ignore */ }
    };

    // ─── Çıkış yap ──────────────────────────────────────────────────────────
    const handleLogout = () => {
        Alert.alert('Çıkış Yap', 'Çıkış yapmak istediğinize emin misiniz?', [
            { text: 'İptal', style: 'cancel' },
            { text: 'Çıkış Yap', style: 'destructive', onPress: async () => { await signOut(); } },
        ]);
    };

    const openSavedPlans = () => {
        try {
            navigation.navigate('Saved');
        } catch {
            navigation.getParent?.()?.navigate('Saved');
        }
    };

    if (loading) return <ProfileSkeleton />;

    const completedCount = itineraries.filter(i => i.status === 'completed').length;
    const ongoingCount = itineraries.filter(i => i.status === 'ongoing').length;
    const badge = getBadge(completedCount);
    const initials = (fullName || user?.email || '?')[0].toUpperCase();
    const selectedStyleObj = TRAVEL_STYLES.find(s => s.value === normalizeTravelStyle(travelStyle));

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => { setRefreshing(true); fetchData(); }}
                    tintColor={COLORS.primary}
                />
            }
        >
            {/* ═══ PROFILE HEADER ═══ */}
            <LinearGradient
                colors={['#0891B2', '#0E7490', '#14B8A6']}
                style={styles.profileHeader}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                {/* Arka plan desen — soyut daireler */}
                <View style={styles.bgCircle1} />
                <View style={styles.bgCircle2} />

                {/* Üst butonlar */}
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.headerAction} onPress={handleShareProfile}>
                        <Ionicons name="share-outline" size={20} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerAction} onPress={() => setEditing(!editing)}>
                        <Ionicons name={editing ? 'close' : 'create-outline'} size={20} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Avatar */}
                <TouchableOpacity style={styles.avatarWrapper} onPress={editing ? handlePickAvatar : undefined} activeOpacity={editing ? 0.8 : 1}>
                    <View style={styles.avatarContainer}>
                        {avatarUri ? (
                            <SmartImage
                                uri={avatarUri}
                                style={styles.avatarImage}
                                contentFit="cover"
                            />
                        ) : (
                            <Text style={styles.avatarText}>{initials}</Text>
                        )}
                    </View>
                    {editing && (
                        <View style={styles.avatarEditBadge}>
                            <Ionicons name="camera" size={14} color="#fff" />
                        </View>
                    )}
                </TouchableOpacity>

                {/* Rozet */}
                <View style={[styles.badgeChip, { backgroundColor: badge.color + '30', borderColor: badge.color + '60' }]}>
                    <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
                    <Text style={[styles.badgeLabel, { color: '#fff' }]}>{badge.label}</Text>
                </View>

                {/* Form veya isim göster */}
                {editing ? (
                    <View style={styles.editForm}>
                        <TextInput
                            style={styles.editInput}
                            value={fullName}
                            onChangeText={setFullName}
                            placeholder="Adınız Soyadınız"
                            placeholderTextColor="rgba(255,255,255,0.5)"
                        />
                        <TextInput
                            style={[styles.editInput, styles.editInputBio]}
                            value={bio}
                            onChangeText={setBio}
                            placeholder="Kendinizi tanıtın..."
                            placeholderTextColor="rgba(255,255,255,0.5)"
                            multiline
                            numberOfLines={2}
                        />
                        <Text style={styles.styleLabel}>Seyahat Tarzı</Text>
                        <View style={styles.styleChips}>
                            {TRAVEL_STYLES.map(s => (
                                <TouchableOpacity
                                    key={s.value}
                                    style={[styles.styleChip, travelStyle === s.value && styles.styleChipActive]}
                                    onPress={() => setTravelStyle(s.value)}
                                >
                                    <Text>{s.emoji}</Text>
                                    <Text style={[styles.styleChipText, travelStyle === s.value && styles.styleChipTextActive]}>
                                        {s.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={styles.editActions}>
                            <TouchableOpacity style={styles.editCancelBtn} onPress={() => setEditing(false)}>
                                <Text style={styles.editCancelText}>İptal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.editSaveBtn} onPress={handleSaveProfile}>
                                <Ionicons name="checkmark" size={16} color="#fff" />
                                <Text style={styles.editSaveText}>Kaydet</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <View style={styles.nameBlock}>
                        <Text style={styles.userName}>{profile?.full_name || 'Adınızı ekleyin'}</Text>
                        <Text style={styles.userEmail}>{user?.email}</Text>
                        {bio ? <Text style={styles.userBio}>{bio}</Text> : null}
                        {selectedStyleObj && (
                            <View style={styles.travelStyleChip}>
                                <Text>{selectedStyleObj.emoji}</Text>
                                <Text style={styles.travelStyleText}>{selectedStyleObj.label}</Text>
                            </View>
                        )}
                    </View>
                )}
            </LinearGradient>

            {/* ═══ STATS ═══ */}
            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{completedCount}</Text>
                    <Text style={styles.statLabel}>Tamamlanan</Text>
                    <Text style={styles.statEmoji}>✅</Text>
                </View>
                <View style={[styles.statCard, styles.statCardHighlight]}>
                    <Text style={[styles.statNumber, { color: '#fff' }]}>{ongoingCount}</Text>
                    <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.8)' }]}>Devam Eden</Text>
                    <Text style={styles.statEmoji}>🔄</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{favorites.length}</Text>
                    <Text style={styles.statLabel}>Favoriler</Text>
                    <Text style={styles.statEmoji}>❤️</Text>
                </View>
            </View>

            {/* ═══ HIZLI ERİŞİM ═══ */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Hızlı Erişim</Text>
                <View style={styles.quickActions}>
                    <TouchableOpacity
                        style={styles.quickAction}
                        onPress={() => navigation.navigate('TravelAssistant', { context: {} })}
                    >
                        <View style={[styles.quickActionIcon, { backgroundColor: COLORS.primaryMuted }]}>
                            <Ionicons name="sparkles" size={22} color={COLORS.primary} />
                        </View>
                        <Text style={styles.quickActionLabel}>AI Asistan</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.quickAction}
                        onPress={() => navigation.navigate('Favorites')}
                    >
                        <View style={[styles.quickActionIcon, { backgroundColor: '#FEE2E2' }]}>
                            <Ionicons name="heart" size={22} color="#EF4444" />
                        </View>
                        <Text style={styles.quickActionLabel}>Favorilerim</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.quickAction}
                        onPress={openSavedPlans}
                    >
                        <View style={[styles.quickActionIcon, { backgroundColor: COLORS.success + '20' }]}>
                            <Ionicons name="map-outline" size={22} color={COLORS.success} />
                        </View>
                        <Text style={styles.quickActionLabel}>Planlarım</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.quickAction}
                        onPress={handleShareProfile}
                    >
                        <View style={[styles.quickActionIcon, { backgroundColor: '#F3E8FF' }]}>
                            <Ionicons name="share-social" size={22} color="#7C3AED" />
                        </View>
                        <Text style={styles.quickActionLabel}>Paylaş</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* ═══ SON GEZİLER ═══ */}
            {itineraries.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Gezi Planlarım</Text>
                        <TouchableOpacity onPress={openSavedPlans} style={styles.seeAllBtn}>
                            <Text style={styles.seeAllText}>Tümü</Text>
                            <Ionicons name="arrow-forward" size={13} color={COLORS.primary} />
                        </TouchableOpacity>
                    </View>
                    {itineraries.slice(0, 4).map(itin => {
                        const isCompleted = itin.status === 'completed';
                        return (
                            <TouchableOpacity
                                key={itin.id}
                                style={styles.itinCard}
                                onPress={() => navigation.navigate('ItineraryDetail', { itineraryId: itin.id })}
                                activeOpacity={0.88}
                            >
                                <LinearGradient
                                    colors={isCompleted ? [COLORS.success + '15', COLORS.success + '05'] : [COLORS.primaryMuted, 'transparent']}
                                    style={styles.itinCardGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    <View style={styles.itinCardLeft}>
                                        <View style={[styles.itinStatusDot, { backgroundColor: isCompleted ? COLORS.success : COLORS.primary }]} />
                                    </View>
                                    <View style={styles.itinCardBody}>
                                        <Text style={styles.itinCardCity}>{itin.cities?.name}</Text>
                                        <Text style={styles.itinCardMeta}>
                                            {itin.days} gün · {itin.itinerary_items?.length || 0} yer · {formatDate(itin.start_date)}
                                        </Text>
                                    </View>
                                    <View style={styles.itinCardActions}>
                                        <TouchableOpacity
                                            style={styles.itinShareBtn}
                                            onPress={() => handleShareItinerary(itin)}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                            <Ionicons name="share-outline" size={15} color={COLORS.textSecondary} />
                                        </TouchableOpacity>
                                        <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
                                    </View>
                                </LinearGradient>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}

            {/* ═══ AYARLAR ═══ */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Hesap</Text>
                <View style={styles.settingsCard}>
                    {[
                        { icon: 'person-outline', label: 'Profili Düzenle', onPress: () => setEditing(true) },
                        { icon: 'share-social-outline', label: 'Profili Paylaş', onPress: handleShareProfile },
                        { icon: 'shield-checkmark-outline', label: 'Gizlilik', onPress: () => Alert.alert('Gizlilik', 'Verileriniz yalnızca size aitti.') },
                        { icon: 'help-circle-outline', label: 'Yardım & Destek', onPress: () => navigation.navigate('TravelAssistant', { context: {} }) },
                    ].map((item, i, arr) => (
                        <TouchableOpacity
                            key={item.label}
                            style={[styles.settingsRow, i < arr.length - 1 && styles.settingsRowBorder]}
                            onPress={item.onPress}
                            activeOpacity={0.7}
                        >
                            <View style={styles.settingsRowLeft}>
                                <Ionicons name={item.icon} size={20} color={COLORS.primary} />
                                <Text style={styles.settingsRowText}>{item.label}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Çıkış */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={18} color={COLORS.error} />
                <Text style={styles.logoutText}>Çıkış Yap</Text>
            </TouchableOpacity>

            <Text style={styles.version}>Akıllı Gezi Rehberi v1.0</Text>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    contentContainer: { paddingBottom: 100 },

    // ─── Header / Hero ───
    profileHeader: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: SPACING.xl,
        paddingHorizontal: SPACING.lg,
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    bgCircle1: {
        position: 'absolute', width: 200, height: 200,
        borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.06)',
        top: -50, right: -60,
    },
    bgCircle2: {
        position: 'absolute', width: 150, height: 150,
        borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.05)',
        bottom: -40, left: -40,
    },
    headerActions: {
        flexDirection: 'row',
        gap: SPACING.sm,
        alignSelf: 'flex-end',
        marginBottom: SPACING.sm,
    },
    headerAction: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', alignItems: 'center',
    },

    // Avatar
    avatarWrapper: { position: 'relative', marginBottom: SPACING.sm },
    avatarContainer: {
        width: 90, height: 90, borderRadius: 45,
        backgroundColor: 'rgba(255,255,255,0.25)',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)',
        overflow: 'hidden',
    },
    avatarImage: { width: '100%', height: '100%' },
    avatarText: {
        fontFamily: FONTS.heading,
        fontSize: 36, color: '#fff',
    },
    avatarEditBadge: {
        position: 'absolute', bottom: 2, right: 2,
        width: 26, height: 26, borderRadius: 13,
        backgroundColor: COLORS.primary,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#fff',
    },

    // Rozet
    badgeChip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 12, paddingVertical: 4,
        borderRadius: BORDER_RADIUS.full,
        borderWidth: 1, marginBottom: SPACING.sm,
    },
    badgeEmoji: { fontSize: 14 },
    badgeLabel: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.xs },

    // İsim bloğu
    nameBlock: { alignItems: 'center', gap: 4 },
    userName: {
        fontFamily: FONTS.heading,
        fontSize: 22, color: '#fff', letterSpacing: -0.3,
    },
    userEmail: {
        fontFamily: FONTS.body, fontSize: FONT_SIZES.xs,
        color: 'rgba(255,255,255,0.75)',
    },
    userBio: {
        fontFamily: FONTS.body, fontSize: FONT_SIZES.sm,
        color: 'rgba(255,255,255,0.85)', textAlign: 'center',
        marginTop: 4, paddingHorizontal: SPACING.md,
        lineHeight: 20,
    },
    travelStyleChip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12, paddingVertical: 4,
        borderRadius: BORDER_RADIUS.full, marginTop: 6,
    },
    travelStyleText: {
        fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.xs, color: '#fff',
    },

    // Edit form
    editForm: { width: '100%', gap: SPACING.sm },
    editInput: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: BORDER_RADIUS.lg,
        paddingHorizontal: SPACING.md,
        paddingVertical: 10,
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.md,
        color: '#fff',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.25)',
    },
    editInputBio: { minHeight: 60, textAlignVertical: 'top' },
    styleLabel: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.sm, color: 'rgba(255,255,255,0.9)',
        marginTop: 4,
    },
    styleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
    styleChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    },
    styleChipActive: {
        backgroundColor: 'rgba(255,255,255,0.35)',
        borderColor: '#fff',
    },
    styleChipText: {
        fontFamily: FONTS.body, fontSize: FONT_SIZES.xs, color: 'rgba(255,255,255,0.8)',
    },
    styleChipTextActive: { color: '#fff', fontFamily: FONTS.bodySemiBold },
    editActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: 4 },
    editCancelBtn: {
        flex: 1, paddingVertical: 12,
        borderRadius: BORDER_RADIUS.lg,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    },
    editCancelText: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.sm, color: '#fff' },
    editSaveBtn: {
        flex: 2, flexDirection: 'row', gap: 6,
        paddingVertical: 12,
        borderRadius: BORDER_RADIUS.lg,
        backgroundColor: 'rgba(255,255,255,0.9)',
        alignItems: 'center', justifyContent: 'center',
    },
    editSaveText: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.sm, color: COLORS.primary },

    // ─── Stats ───
    statsRow: {
        flexDirection: 'row',
        marginHorizontal: SPACING.lg,
        marginTop: -20,
        gap: SPACING.sm,
        marginBottom: SPACING.md,
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.sm,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    statCardHighlight: {
        backgroundColor: COLORS.primary,
    },
    statNumber: {
        fontFamily: FONTS.heading,
        fontSize: 24, color: COLORS.textPrimary,
        letterSpacing: -0.5,
    },
    statLabel: {
        fontFamily: FONTS.body, fontSize: 10,
        color: COLORS.textSecondary, marginTop: 1,
    },
    statEmoji: { fontSize: 16, marginTop: 2 },

    // ─── Sections ───
    section: {
        paddingHorizontal: SPACING.lg,
        marginBottom: SPACING.lg,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    sectionTitle: {
        fontFamily: FONTS.bodyBold,
        fontSize: FONT_SIZES.lg,
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
        letterSpacing: -0.4,
    },
    seeAllBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: COLORS.primaryMuted,
        paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: BORDER_RADIUS.full,
    },
    seeAllText: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.xs, color: COLORS.primary },

    // ─── Hızlı Erişim ───
    quickActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: SPACING.xs,
    },
    quickAction: { alignItems: 'center', flex: 1 },
    quickActionIcon: {
        width: 52, height: 52, borderRadius: 16,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 6,
    },
    quickActionLabel: {
        fontFamily: FONTS.body, fontSize: 10, color: COLORS.textSecondary,
        textAlign: 'center',
    },

    // ─── İtinerary Kartları ───
    itinCard: {
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
        marginBottom: SPACING.xs + 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    itinCardGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.sm + 2,
        backgroundColor: COLORS.surface,
    },
    itinCardLeft: { marginRight: SPACING.sm },
    itinStatusDot: { width: 8, height: 8, borderRadius: 4 },
    itinCardBody: { flex: 1 },
    itinCardCity: {
        fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.sm, color: COLORS.textPrimary,
    },
    itinCardMeta: {
        fontFamily: FONTS.body, fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 1,
    },
    itinCardActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
    itinShareBtn: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: COLORS.surfaceAlt,
        justifyContent: 'center', alignItems: 'center',
    },

    // ─── Ayarlar ───
    settingsCard: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    settingsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm + 2,
    },
    settingsRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: COLORS.divider,
    },
    settingsRowLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    settingsRowText: {
        fontFamily: FONTS.body, fontSize: FONT_SIZES.md, color: COLORS.textPrimary,
    },

    // ─── Çıkış ───
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        marginHorizontal: SPACING.lg,
        paddingVertical: 14,
        borderRadius: BORDER_RADIUS.lg,
        backgroundColor: COLORS.error + '10',
        borderWidth: 1,
        borderColor: COLORS.error + '30',
        marginBottom: SPACING.md,
    },
    logoutText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.md,
        color: COLORS.error,
    },
    version: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textLight,
        textAlign: 'center',
        marginBottom: SPACING.xl,
    },
});

export default ProfileScreen;
