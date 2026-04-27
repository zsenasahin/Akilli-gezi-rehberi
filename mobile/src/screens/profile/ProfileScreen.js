import React, { useState, useCallback, useRef, useEffect } from 'react';
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
    Easing,
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
import { getCityVisitStats, getCityVisits } from '../../services/cityVisitService';

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

// ─── Fade in animation ──────────────────────────────────────────────────
const useFadeUp = (delay = 0) => {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        const timeout = setTimeout(() => {
            Animated.parallel([
                Animated.timing(opacity, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
                Animated.timing(translateY, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            ]).start();
        }, delay);
        return () => clearTimeout(timeout);
    }, []);

    return { opacity, transform: [{ translateY }] };
};

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
    // Şehir ziyaret istatistikleri
    const [visitedCount, setVisitedCount] = useState(0);
    const [wishlistCount, setWishlistCount] = useState(0);
    const [visitedCities, setVisitedCities] = useState([]);

    const headerAnim = useFadeUp(50);
    const statsAnim = useFadeUp(180);
    const itinAnim = useFadeUp(300);
    const settingsAnim = useFadeUp(420);

    const fetchData = useCallback(async () => {
        if (!user) return;
        const [profileResult, itineraryResult, visitStatsResult, visitsResult] = await Promise.all([
            getProfile(user.id),
            getItinerariesByUser(user.id),
            getCityVisitStats(user.id),
            getCityVisits(user.id),
        ]);
        if (profileResult.data) {
            setProfile(profileResult.data);
            setFullName(profileResult.data.full_name || '');
            setTravelStyle(normalizeTravelStyle(profileResult.data.travel_style));
            setBio(profileResult.data.bio || '');
            if (profileResult.data.avatar_url) setAvatarUri(profileResult.data.avatar_url);
        }
        if (itineraryResult.data) setItineraries(itineraryResult.data);
        // Ziyaret istatistikleri
        setVisitedCount(visitStatsResult.visitedCount || 0);
        setWishlistCount(visitStatsResult.wishlistCount || 0);
        // Gezilen şehirler listesi (status='visited')
        const visited = (visitsResult.data || []).filter(v => v.status === 'visited');
        setVisitedCities(visited);
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

    // ─── Rota paylaş ────────────────────────────────────────────────────────
    const handleShareItinerary = async (itin) => {
        try {
            await Share.share({
                message:
                    `🗺️ ${itin.cities?.name} Gezi Rotam\n\n` +
                    `📅 ${itin.days} günlük plan\n` +
                    `📍 ${itin.itinerary_items?.length || 0} yer\n` +
                    `🗓️ ${formatDate(itin.start_date)}\n\n` +
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
            <Animated.View style={headerAnim}>
                <LinearGradient
                    colors={['#0891B2', '#0E7490', '#14B8A6']}
                    style={styles.profileHeader}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    {/* Subtle pattern */}
                    <View style={styles.patternDot1} />
                    <View style={styles.patternDot2} />

                    {/* Edit toggle */}
                    <TouchableOpacity
                        style={styles.editToggle}
                        onPress={() => setEditing(!editing)}
                    >
                        <Ionicons name={editing ? 'close' : 'create-outline'} size={18} color="#fff" />
                    </TouchableOpacity>

                    {/* Avatar */}
                    <TouchableOpacity
                        style={styles.avatarWrapper}
                        onPress={editing ? handlePickAvatar : undefined}
                        activeOpacity={editing ? 0.8 : 1}
                    >
                        <View style={styles.avatarContainer}>
                            {avatarUri ? (
                                <SmartImage
                                    uri={avatarUri}
                                    style={styles.avatarImage}
                                    contentFit="cover"
                                />
                            ) : (
                                <Text style={styles.avatarInitials}>{initials}</Text>
                            )}
                        </View>
                        {editing && (
                            <View style={styles.avatarEditDot}>
                                <Ionicons name="camera" size={12} color="#fff" />
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* Info */}
                    {editing ? (
                        <View style={styles.editSection}>
                            <TextInput
                                style={styles.editInput}
                                value={fullName}
                                onChangeText={setFullName}
                                placeholder="Adınız Soyadınız"
                                placeholderTextColor="rgba(255,255,255,0.5)"
                            />
                            <TextInput
                                style={[styles.editInput, styles.editBioInput]}
                                value={bio}
                                onChangeText={setBio}
                                placeholder="Kendinizi kısaca tanıtın..."
                                placeholderTextColor="rgba(255,255,255,0.5)"
                                multiline
                                numberOfLines={2}
                            />

                            {/* Travel style chips */}
                            <Text style={styles.editLabel}>Seyahat Tarzı</Text>
                            <View style={styles.styleChipsRow}>
                                {TRAVEL_STYLES.map(s => (
                                    <TouchableOpacity
                                        key={s.value}
                                        style={[styles.styleChip, travelStyle === s.value && styles.styleChipSelected]}
                                        onPress={() => setTravelStyle(s.value)}
                                    >
                                        <Text style={styles.styleChipEmoji}>{s.emoji}</Text>
                                        <Text style={[
                                            styles.styleChipLabel,
                                            travelStyle === s.value && styles.styleChipLabelSelected,
                                        ]}>
                                            {s.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.editBtnRow}>
                                <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
                                    <Text style={styles.cancelBtnText}>İptal</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile}>
                                    <Text style={styles.saveBtnText}>Kaydet</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.infoBlock}>
                            <Text style={styles.userName}>{profile?.full_name || 'İsimsiz Gezgin'}</Text>
                            <Text style={styles.userEmail}>{user?.email}</Text>
                            {bio ? <Text style={styles.userBio}>{bio}</Text> : null}

                            {/* Badge + Style inline */}
                            <View style={styles.tagRow}>
                                <View style={[styles.tag, { backgroundColor: badge.color + '25' }]}>
                                    <Text style={styles.tagEmoji}>{badge.emoji}</Text>
                                    <Text style={[styles.tagLabel, { color: '#fff' }]}>{badge.label}</Text>
                                </View>
                                {selectedStyleObj && (
                                    <View style={styles.tag}>
                                        <Text style={styles.tagEmoji}>{selectedStyleObj.emoji}</Text>
                                        <Text style={[styles.tagLabel, { color: '#fff' }]}>{selectedStyleObj.label}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}
                </LinearGradient>
            </Animated.View>

            {/* ═══ INLINE STATS ═══ */}
            <Animated.View style={[styles.statsBar, statsAnim]}>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{completedCount}</Text>
                    <Text style={styles.statLabel}>Tamamlanan</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{ongoingCount}</Text>
                    <Text style={styles.statLabel}>Devam Eden</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{visitedCount}</Text>
                    <Text style={styles.statLabel}>Gezilen Şehir</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{wishlistCount}</Text>
                    <Text style={styles.statLabel}>Bucket List</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{favorites.length}</Text>
                    <Text style={styles.statLabel}>Favori</Text>
                </View>
            </Animated.View>

            {/* Türkiye ilerleme mesajı */}
            {visitedCount > 0 && (
                <Animated.View style={[styles.progressBar, statsAnim]}>
                    <Text style={styles.progressText}>
                        🇹🇷 Türkiye'nin <Text style={styles.progressHighlight}>%{Math.round(visitedCount / 81 * 100)}'ini</Text> gezdim! ({visitedCount}/81 il)
                    </Text>
                </Animated.View>
            )}

            {/* ═══ ŞEHİR HARİTAM ═══ */}
            <Animated.View style={[styles.section, itinAnim]}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>🗺️ Şehir Haritam</Text>
                </View>
                {visitedCities.length === 0 ? (
                    <View style={styles.emptyVisit}>
                        <Text style={styles.emptyVisitText}>Henüz şehir gezmediniz.</Text>
                        <Text style={styles.emptyVisitSub}>Şehir kartlarındaki ✓ butonuyla işaretleyin!</Text>
                    </View>
                ) : (
                    <View style={styles.visitedChips}>
                        {visitedCities.map((v) => (
                            <TouchableOpacity
                                key={v.city_id}
                                style={styles.visitedChip}
                                onPress={() => {
                                    // city_id'den şehir adını bul — navigation için basit obje
                                    navigation.navigate('CityDetail', { city: { id: v.city_id, name: v.city_name || String(v.city_id) } });
                                }}
                                activeOpacity={0.75}
                            >
                                <Text style={styles.visitedChipText}>✓ {v.city_name || `Şehir ${v.city_id}`}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </Animated.View>

            {/* ═══ GEZİ ROTALARI ═══ */}
            {itineraries.length > 0 && (
                <Animated.View style={[styles.section, itinAnim]}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Rotalarım</Text>
                        <TouchableOpacity onPress={openSavedPlans} style={styles.seeAllBtn}>
                            <Text style={styles.seeAllText}>Tümünü Gör</Text>
                            <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
                        </TouchableOpacity>
                    </View>

                    {itineraries.slice(0, 5).map((itin, index) => {
                        const isCompleted = itin.status === 'completed';
                        return (
                            <TouchableOpacity
                                key={itin.id}
                                style={styles.routeRow}
                                onPress={() => navigation.navigate('ItineraryDetail', { itineraryId: itin.id })}
                                activeOpacity={0.7}
                            >
                                <View style={[
                                    styles.routeIndicator,
                                    { backgroundColor: isCompleted ? COLORS.success : COLORS.primary },
                                ]} />
                                <View style={styles.routeInfo}>
                                    <Text style={styles.routeCity}>{itin.cities?.name || 'Bilinmeyen'}</Text>
                                    <Text style={styles.routeMeta}>
                                        {itin.days} gün · {itin.itinerary_items?.length || 0} yer · {formatDate(itin.start_date)}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.routeShareBtn}
                                    onPress={(e) => {
                                        e.stopPropagation?.();
                                        handleShareItinerary(itin);
                                    }}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Ionicons name="share-outline" size={16} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                                <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
                            </TouchableOpacity>
                        );
                    })}
                </Animated.View>
            )}

            {/* ═══ MENÜ ═══ */}
            <Animated.View style={[styles.section, settingsAnim]}>
                <Text style={styles.sectionTitle}>Hesap</Text>

                {[
                    {
                        icon: 'create-outline',
                        label: 'Profili Düzenle',
                        onPress: () => setEditing(true),
                    },
                    {
                        icon: 'heart-outline',
                        label: 'Favorilerim',
                        subtitle: `${favorites.length} mekan`,
                        onPress: () => navigation.navigate('Favorites'),
                    },
                    {
                        icon: 'map-outline',
                        label: 'Kayıtlı Rotalar',
                        subtitle: `${itineraries.length} rota`,
                        onPress: openSavedPlans,
                    },
                    {
                        icon: 'chatbubble-ellipses-outline',
                        label: 'Yardım & Destek',
                        onPress: () => navigation.navigate('TravelAssistant', { context: {} }),
                    },
                ].map((item, i, arr) => (
                    <TouchableOpacity
                        key={item.label}
                        style={[styles.menuRow, i < arr.length - 1 && styles.menuRowBorder]}
                        onPress={item.onPress}
                        activeOpacity={0.7}
                    >
                        <View style={styles.menuLeft}>
                            <View style={styles.menuIconWrap}>
                                <Ionicons name={item.icon} size={18} color={COLORS.primary} />
                            </View>
                            <View>
                                <Text style={styles.menuLabel}>{item.label}</Text>
                                {item.subtitle && (
                                    <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                                )}
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
                    </TouchableOpacity>
                ))}
            </Animated.View>

            {/* ═══ ÇIKIŞ ═══ */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Text style={styles.logoutText}>Çıkış Yap</Text>
            </TouchableOpacity>

            <Text style={styles.version}>Akıllı Gezi Rehberi v1.0</Text>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    contentContainer: { paddingBottom: 100 },

    // ─── Header ───
    profileHeader: {
        paddingTop: Platform.OS === 'ios' ? 64 : 44,
        paddingBottom: SPACING.xl,
        paddingHorizontal: SPACING.lg,
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    patternDot1: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: 'rgba(255,255,255,0.04)',
        top: -40,
        right: -60,
    },
    patternDot2: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.03)',
        bottom: -20,
        left: -30,
    },

    editToggle: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        right: SPACING.lg,
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: 'rgba(255,255,255,0.18)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },

    // Avatar
    avatarWrapper: {
        position: 'relative',
        marginBottom: SPACING.sm,
    },
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2.5,
        borderColor: 'rgba(255,255,255,0.4)',
        overflow: 'hidden',
    },
    avatarImage: { width: '100%', height: '100%' },
    avatarInitials: {
        fontFamily: FONTS.heading,
        fontSize: 32,
        color: '#fff',
    },
    avatarEditDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },

    // Info block
    infoBlock: {
        alignItems: 'center',
        gap: 3,
    },
    userName: {
        fontFamily: FONTS.heading,
        fontSize: 20,
        color: '#fff',
        letterSpacing: -0.3,
    },
    userEmail: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: 'rgba(255,255,255,0.65)',
    },
    userBio: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.sm,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
        marginTop: 4,
        paddingHorizontal: SPACING.lg,
        lineHeight: 20,
    },
    tagRow: {
        flexDirection: 'row',
        gap: SPACING.xs,
        marginTop: SPACING.sm,
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.full,
    },
    tagEmoji: { fontSize: 12 },
    tagLabel: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: 10,
    },

    // Edit section
    editSection: {
        width: '100%',
        gap: SPACING.sm,
    },
    editInput: {
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: BORDER_RADIUS.md,
        paddingHorizontal: SPACING.md,
        paddingVertical: 10,
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.md,
        color: '#fff',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    editBioInput: {
        minHeight: 50,
        textAlignVertical: 'top',
    },
    editLabel: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.xs,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    styleChipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.xs,
    },
    styleChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    styleChipSelected: {
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderColor: '#fff',
    },
    styleChipEmoji: { fontSize: 13 },
    styleChipLabel: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: 'rgba(255,255,255,0.7)',
    },
    styleChipLabelSelected: {
        color: '#fff',
        fontFamily: FONTS.bodySemiBold,
    },
    editBtnRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
        marginTop: 4,
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 11,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: 'rgba(255,255,255,0.12)',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    cancelBtnText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.sm,
        color: '#fff',
    },
    saveBtn: {
        flex: 2,
        paddingVertical: 11,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: 'rgba(255,255,255,0.9)',
        alignItems: 'center',
    },
    saveBtnText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.sm,
        color: COLORS.primary,
    },

    // ─── Stats Bar ───
    statsBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        marginHorizontal: SPACING.lg,
        marginTop: -16,
        borderRadius: BORDER_RADIUS.lg,
        paddingVertical: SPACING.sm + 4,
        paddingHorizontal: SPACING.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 6,
        marginBottom: SPACING.lg,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontFamily: FONTS.heading,
        fontSize: 20,
        color: COLORS.textPrimary,
        letterSpacing: -0.3,
    },
    statLabel: {
        fontFamily: FONTS.body,
        fontSize: 10,
        color: COLORS.textSecondary,
        marginTop: 1,
    },
    statDivider: {
        width: 1,
        height: 28,
        backgroundColor: COLORS.divider,
    },

    // ─── Sections ───
    section: {
        paddingHorizontal: SPACING.lg,
        marginBottom: SPACING.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    sectionTitle: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
        letterSpacing: -0.2,
    },
    seeAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    seeAllText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.xs,
        color: COLORS.primary,
    },

    // ─── Route Rows ───
    routeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        paddingVertical: SPACING.sm + 2,
        paddingHorizontal: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.xs,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    routeIndicator: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: SPACING.sm,
    },
    routeInfo: {
        flex: 1,
    },
    routeCity: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
    },
    routeMeta: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        marginTop: 1,
    },
    routeShareBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.xs,
    },

    // ─── Menu ───
    menuRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.surface,
        paddingVertical: SPACING.sm + 4,
        paddingHorizontal: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.xs,
    },
    menuRowBorder: {},
    menuLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    menuIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: COLORS.primaryMuted,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuLabel: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
    },
    menuSubtitle: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        marginTop: 1,
    },

    // ─── Logout ───
    // ─── Progress ───
    progressBar: {
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.md,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.md,
        paddingVertical: 10,
        paddingHorizontal: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    progressText: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    progressHighlight: {
        fontFamily: FONTS.bodySemiBold,
        color: COLORS.primary,
    },

    // ─── Şehir Haritam ───
    emptyVisit: {
        alignItems: 'center',
        paddingVertical: SPACING.md,
    },
    emptyVisitText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    emptyVisitSub: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textLight,
        marginTop: 4,
    },
    visitedChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.xs,
    },
    visitedChip: {
        backgroundColor: COLORS.success + '18',
        borderWidth: 1,
        borderColor: COLORS.success + '40',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: BORDER_RADIUS.full,
    },
    visitedChipText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.xs,
        color: COLORS.success,
    },

    logoutBtn: {
        alignItems: 'center',
        marginHorizontal: SPACING.lg,
        paddingVertical: 14,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.error + '08',
        borderWidth: 1,
        borderColor: COLORS.error + '20',
        marginBottom: SPACING.md,
    },
    logoutText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.sm,
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
