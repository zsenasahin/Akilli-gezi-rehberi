import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Alert, RefreshControl, Animated, Platform, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import SmartImage from '../../components/common/SmartImage';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/layout';
import { useAuth } from '../../contexts/AuthContext';
import { getProfile, updateProfile } from '../../services/profileService';
import { getItinerariesByUser } from '../../services/itineraryService';
import { signOut } from '../../services/authService';
import useFavorites from '../../hooks/useFavorites';
import { ProfileSkeleton } from '../../components/common/SkeletonLoader';
import { getCityVisitStats } from '../../services/cityVisitService';

const TRAVEL_STYLES = [
    { value: 'cultural',    label: 'Kültürel',    emoji: '🏛️' },
    { value: 'adventure',   label: 'Macera',       emoji: '🧗' },
    { value: 'relaxed',     label: 'Rahat',        emoji: '🌴' },
    { value: 'gastronomy',  label: 'Gastronomi',   emoji: '🍽️' },
    { value: 'nature',      label: 'Doğa',         emoji: '🌿' },
    { value: 'photography', label: 'Fotoğraf',     emoji: '📸' },
];

const LEGACY = { Kültürel: 'cultural', Macera: 'adventure', Rahat: 'relaxed', Gastronomi: 'gastronomy', Doğa: 'nature', Fotoğraf: 'photography' };
const normalize = (s) => LEGACY[s] || s || '';

const BADGES = [
    { min: 0,  label: 'Kaşif Adayı',  emoji: '🌱', color: '#6B7280' },
    { min: 1,  label: 'Gezgin',        emoji: '🗺️', color: '#0891B2' },
    { min: 3,  label: 'Seyyah',        emoji: '🧭', color: '#7C3AED' },
    { min: 5,  label: 'Maceracı',      emoji: '⛺', color: '#EA580C' },
    { min: 10, label: 'Usta Gezgin',   emoji: '🏆', color: '#D97706' },
];
const getBadge = (n) => BADGES.slice().reverse().find(b => n >= b.min) || BADGES[0];

const ProfileScreen = ({ navigation }) => {
    const { user } = useAuth();
    const { favorites } = useFavorites();

    const [profile, setProfile]         = useState(null);
    const [itineraries, setItineraries] = useState([]);
    const [loading, setLoading]         = useState(true);
    const [refreshing, setRefreshing]   = useState(false);
    const [editing, setEditing]         = useState(false);
    const [fullName, setFullName]       = useState('');
    const [travelStyle, setTravelStyle] = useState('');
    const [avatarUri, setAvatarUri]     = useState(null);
    const [bio, setBio]                 = useState('');
    const [visitedCount, setVisitedCount]   = useState(0);
    const [wishlistCount, setWishlistCount] = useState(0);

    // Fade-in animation
    const fadeAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }, []);

    const fetchData = useCallback(async () => {
        if (!user) return;
        const [profileRes, itinRes, statsRes] = await Promise.all([
            getProfile(user.id),
            getItinerariesByUser(user.id),
            getCityVisitStats(user.id),
        ]);
        if (profileRes.data) {
            const p = profileRes.data;
            setProfile(p);
            setFullName(p.full_name || '');
            setTravelStyle(normalize(p.travel_style));
            setBio(p.bio || '');
            if (p.avatar_url) setAvatarUri(p.avatar_url);
        }
        if (itinRes.data) setItineraries(itinRes.data);
        setVisitedCount(statsRes.visitedCount || 0);
        setWishlistCount(statsRes.wishlistCount || 0);
        setLoading(false);
        setRefreshing(false);
    }, [user]);

    useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

    const handlePickAvatar = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('İzin Gerekli', 'Galeri iznine ihtiyacımız var.'); return; }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
        if (!result.canceled && result.assets?.[0]?.uri) {
            setAvatarUri(result.assets[0].uri);
            await updateProfile(user.id, { avatar_url: result.assets[0].uri });
        }
    };

    const handleSave = async () => {
        const { error } = await updateProfile(user.id, { full_name: fullName, travel_style: travelStyle, bio });
        if (error) { Alert.alert('Hata', error.message); return; }
        setProfile(p => ({ ...p, full_name: fullName, travel_style: travelStyle, bio }));
        setEditing(false);
    };

    const handleLogout = () => {
        Alert.alert('Çıkış Yap', 'Emin misiniz?', [
            { text: 'İptal', style: 'cancel' },
            { text: 'Çıkış Yap', style: 'destructive', onPress: async () => { await signOut(); } },
        ]);
    };

    if (loading) return <ProfileSkeleton />;

    const completedCount = itineraries.filter(i => i.status === 'completed').length;
    const badge = getBadge(visitedCount);
    const initials = (fullName || user?.email || '?')[0].toUpperCase();
    const styleObj = TRAVEL_STYLES.find(s => s.value === normalize(travelStyle));
    const travelPct = Math.round(visitedCount / 81 * 100);

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={COLORS.primary} />}
        >
            <Animated.View style={{ opacity: fadeAnim }}>

                {/* ── HEADER ── */}
                <LinearGradient colors={['#0C1A2E', '#0E3A5C', '#0891B2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
                    {/* Edit button */}
                    <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(!editing)}>
                        <Ionicons name={editing ? 'close' : 'create-outline'} size={18} color="rgba(255,255,255,0.85)" />
                    </TouchableOpacity>

                    {/* Avatar */}
                    <TouchableOpacity onPress={editing ? handlePickAvatar : undefined} activeOpacity={editing ? 0.8 : 1} style={styles.avatarWrap}>
                        <View style={styles.avatar}>
                            {avatarUri
                                ? <SmartImage uri={avatarUri} style={styles.avatarImg} contentFit="cover" />
                                : <Text style={styles.avatarInitials}>{initials}</Text>
                            }
                        </View>
                        {editing && <View style={styles.avatarCam}><Ionicons name="camera" size={12} color="#fff" /></View>}
                    </TouchableOpacity>

                    {editing ? (
                        <View style={styles.editForm}>
                            <TextInput style={styles.editInput} value={fullName} onChangeText={setFullName} placeholder="Ad Soyad" placeholderTextColor="rgba(255,255,255,0.4)" />
                            <TextInput style={[styles.editInput, { minHeight: 48, textAlignVertical: 'top' }]} value={bio} onChangeText={setBio} placeholder="Kısa bio..." placeholderTextColor="rgba(255,255,255,0.4)" multiline />
                            <Text style={styles.editLabel}>Seyahat Tarzı</Text>
                            <View style={styles.styleRow}>
                                {TRAVEL_STYLES.map(s => (
                                    <TouchableOpacity key={s.value} style={[styles.styleChip, travelStyle === s.value && styles.styleChipOn]} onPress={() => setTravelStyle(s.value)}>
                                        <Text style={styles.styleEmoji}>{s.emoji}</Text>
                                        <Text style={[styles.styleLabel, travelStyle === s.value && { color: '#fff', fontFamily: FONTS.bodySemiBold }]}>{s.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <View style={styles.editBtns}>
                                <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}><Text style={styles.cancelTxt}>İptal</Text></TouchableOpacity>
                                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}><Text style={styles.saveTxt}>Kaydet</Text></TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.nameBlock}>
                            <Text style={styles.name}>{profile?.full_name || 'İsimsiz Gezgin'}</Text>
                            <Text style={styles.email}>{user?.email}</Text>
                            {bio ? <Text style={styles.bioTxt}>{bio}</Text> : null}
                            <View style={styles.tagRow}>
                                <View style={[styles.tag, { backgroundColor: badge.color + '30' }]}>
                                    <Text style={styles.tagTxt}>{badge.emoji} {badge.label}</Text>
                                </View>
                                {styleObj && (
                                    <View style={styles.tag}>
                                        <Text style={styles.tagTxt}>{styleObj.emoji} {styleObj.label}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}
                </LinearGradient>

                {/* ── STATS GRID ── */}
                <View style={styles.statsGrid}>
                    <StatCard value={visitedCount} label="Gezilen Şehir" icon="location" color="#22C55E" />
                    <StatCard value={wishlistCount} label="Bucket List" icon="heart" color="#EF4444" />
                    <StatCard value={completedCount} label="Tamamlanan Plan" icon="checkmark-circle" color={COLORS.primary} />
                    <StatCard value={favorites.length} label="Favori Yer" icon="bookmark" color="#F59E0B" />
                </View>

                {/* Türkiye progress */}
                {visitedCount > 0 && (
                    <View style={styles.progressCard}>
                        <View style={styles.progressHeader}>
                            <Text style={styles.progressLabel}>🇹🇷 Türkiye'yi Keşfet</Text>
                            <Text style={styles.progressPct}>%{travelPct}</Text>
                        </View>
                        <View style={styles.progressTrack}>
                            <View style={[styles.progressFill, { width: `${travelPct}%` }]} />
                        </View>
                        <Text style={styles.progressSub}>{visitedCount} / 81 il gezildi</Text>
                    </View>
                )}

                {/* ── MENÜ ── */}
                <View style={styles.menuSection}>
                    <MenuItem icon="heart-outline" label="Favorilerim" sub={`${favorites.length} mekan`} color="#EF4444" onPress={() => navigation.navigate('Favorites')} />
                    <MenuItem icon="map-outline" label="Gezi Planlarım" sub={`${itineraries.length} plan`} color={COLORS.primary} onPress={() => navigation.navigate('Saved')} />
                    <MenuItem icon="chatbubble-ellipses-outline" label="Yardım & Destek" color="#8B5CF6" onPress={() => navigation.navigate('TravelAssistant', { context: {} })} />
                </View>

                {/* ── ÇIKIŞ ── */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
                    <Ionicons name="log-out-outline" size={18} color={COLORS.error} />
                    <Text style={styles.logoutTxt}>Çıkış Yap</Text>
                </TouchableOpacity>

                <Text style={styles.version}>Akıllı Gezi Rehberi v1.0</Text>
            </Animated.View>
        </ScrollView>
    );
};

// ─── Alt bileşenler ──────────────────────────────────────────────────────────
const StatCard = ({ value, label, icon, color }) => (
    <View style={styles.statCard}>
        <View style={[styles.statIcon, { backgroundColor: color + '18' }]}>
            <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);

const MenuItem = ({ icon, label, sub, color, onPress }) => (
    <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.7}>
        <View style={[styles.menuIcon, { backgroundColor: color + '15' }]}>
            <Ionicons name={icon} size={18} color={color} />
        </View>
        <View style={styles.menuInfo}>
            <Text style={styles.menuLabel}>{label}</Text>
            {sub && <Text style={styles.menuSub}>{sub}</Text>}
        </View>
        <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { paddingBottom: 100 },

    // Header
    header: {
        paddingTop: Platform.OS === 'ios' ? 64 : 44,
        paddingBottom: SPACING.xl,
        paddingHorizontal: SPACING.lg,
        alignItems: 'center',
    },
    editBtn: {
        position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, right: SPACING.lg,
        width: 34, height: 34, borderRadius: 17,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center', alignItems: 'center', zIndex: 10,
    },
    avatarWrap: { position: 'relative', marginBottom: SPACING.sm },
    avatar: {
        width: 88, height: 88, borderRadius: 44,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)', overflow: 'hidden',
    },
    avatarImg: { width: '100%', height: '100%' },
    avatarInitials: { fontFamily: FONTS.heading, fontSize: 34, color: '#fff' },
    avatarCam: {
        position: 'absolute', bottom: 0, right: 0,
        width: 26, height: 26, borderRadius: 13,
        backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#fff',
    },
    nameBlock: { alignItems: 'center', gap: 4 },
    name: { fontFamily: FONTS.heading, fontSize: 22, color: '#fff', letterSpacing: -0.3 },
    email: { fontFamily: FONTS.body, fontSize: FONT_SIZES.xs, color: 'rgba(255,255,255,0.6)' },
    bioTxt: { fontFamily: FONTS.body, fontSize: FONT_SIZES.sm, color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginTop: 4, paddingHorizontal: SPACING.lg, lineHeight: 20 },
    tagRow: { flexDirection: 'row', gap: SPACING.xs, marginTop: SPACING.sm, flexWrap: 'wrap', justifyContent: 'center' },
    tag: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: BORDER_RADIUS.full },
    tagTxt: { fontFamily: FONTS.bodySemiBold, fontSize: 11, color: '#fff' },

    // Edit form
    editForm: { width: '100%', gap: SPACING.sm },
    editInput: {
        backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: BORDER_RADIUS.md,
        paddingHorizontal: SPACING.md, paddingVertical: 10,
        fontFamily: FONTS.body, fontSize: FONT_SIZES.md, color: '#fff',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    },
    editLabel: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.xs, color: 'rgba(255,255,255,0.75)' },
    styleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
    styleChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: BORDER_RADIUS.full,
        backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    },
    styleChipOn: { backgroundColor: 'rgba(255,255,255,0.28)', borderColor: '#fff' },
    styleEmoji: { fontSize: 13 },
    styleLabel: { fontFamily: FONTS.body, fontSize: FONT_SIZES.xs, color: 'rgba(255,255,255,0.7)' },
    editBtns: { flexDirection: 'row', gap: SPACING.sm, marginTop: 4 },
    cancelBtn: { flex: 1, paddingVertical: 11, borderRadius: BORDER_RADIUS.md, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    cancelTxt: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.sm, color: '#fff' },
    saveBtn: { flex: 2, paddingVertical: 11, borderRadius: BORDER_RADIUS.md, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center' },
    saveTxt: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.sm, color: COLORS.primary },

    // Stats grid — 2x2
    statsGrid: {
        flexDirection: 'row', flexWrap: 'wrap',
        marginHorizontal: SPACING.md, marginTop: SPACING.md,
        gap: SPACING.sm,
    },
    statCard: {
        width: '47.5%', backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg, padding: SPACING.md,
        alignItems: 'flex-start',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    },
    statIcon: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.sm },
    statValue: { fontFamily: FONTS.heading, fontSize: 26, color: COLORS.textPrimary, letterSpacing: -0.5 },
    statLabel: { fontFamily: FONTS.body, fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },

    // Progress
    progressCard: {
        marginHorizontal: SPACING.md, marginTop: SPACING.sm,
        backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
    progressLabel: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.sm, color: COLORS.textPrimary },
    progressPct: { fontFamily: FONTS.heading, fontSize: FONT_SIZES.lg, color: COLORS.primary },
    progressTrack: { height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },
    progressSub: { fontFamily: FONTS.body, fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 6 },

    // Menu
    menuSection: { marginHorizontal: SPACING.md, marginTop: SPACING.md, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
    menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
    menuIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm },
    menuInfo: { flex: 1 },
    menuLabel: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.sm, color: COLORS.textPrimary },
    menuSub: { fontFamily: FONTS.body, fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 1 },

    // Logout
    logoutBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        marginHorizontal: SPACING.md, marginTop: SPACING.md,
        paddingVertical: 14, borderRadius: BORDER_RADIUS.lg,
        backgroundColor: COLORS.error + '08', borderWidth: 1, borderColor: COLORS.error + '20',
    },
    logoutTxt: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.sm, color: COLORS.error },
    version: { fontFamily: FONTS.body, fontSize: FONT_SIZES.xs, color: COLORS.textLight, textAlign: 'center', marginTop: SPACING.md, marginBottom: SPACING.xl },
});

export default ProfileScreen;
