import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import SmartImage from '../../components/common/SmartImage';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { SPACING } from '../../constants/layout';
import { useAuth } from '../../contexts/AuthContext';
import { getProfile, updateProfile, uploadProfileMedia } from '../../services/profileService';
import { getItinerariesByUser } from '../../services/itineraryService';
import { signOut } from '../../services/authService';
import useFavorites from '../../hooks/useFavorites';
import { ProfileSkeleton } from '../../components/common/SkeletonLoader';
import { buildBadges, buildTravelStats } from '../../services/achievementService';
import { useThemePreference } from '../../contexts/ThemeContext';

const DEFAULT_COVER = require('../../../assets/doga.jpg');

const TRAVEL_STYLES = [
    { value: 'cultural', label: 'Kültürel' },
    { value: 'adventure', label: 'Macera' },
    { value: 'relaxed', label: 'Rahat' },
    { value: 'gastronomy', label: 'Gastronomi' },
    { value: 'nature', label: 'Doğa' },
    { value: 'photography', label: 'Fotoğraf' },
];

const LEGACY = { Kültürel: 'cultural', Macera: 'adventure', Rahat: 'relaxed', Gastronomi: 'gastronomy', Doğa: 'nature', Fotoğraf: 'photography' };
const normalizeStyle = (value) => LEGACY[value] || value || '';
const getInitials = (name = '') => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'SG';
    return parts.slice(0, 2).map((part) => part[0]?.toLocaleUpperCase('tr-TR')).join('');
};

const ProfileScreen = ({ navigation }) => {
    const { user } = useAuth();
    const { favorites } = useFavorites();
    const { theme } = useThemePreference();

    const fadeAnim = useRef(new Animated.Value(0)).current;

    const [profile, setProfile] = useState(null);
    const [itineraries, setItineraries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [editing, setEditing] = useState(false);

    const [fullName, setFullName] = useState('');
    const [travelStyle, setTravelStyle] = useState('');
    const [bio, setBio] = useState('');
    const [coverUri, setCoverUri] = useState(null);
    const [avatarUri, setAvatarUri] = useState(null);
    const [cityCollection, setCityCollection] = useState([]);
    const [badges, setBadges] = useState([]);

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 420,
            useNativeDriver: true,
        }).start();
    }, [fadeAnim]);

    const fetchData = useCallback(async () => {
        if (!user) return;

        const [profileRes, itinerariesRes] = await Promise.all([
            getProfile(user.id),
            getItinerariesByUser(user.id),
        ]);

        const nextProfile = profileRes.data || null;
        const nextItineraries = itinerariesRes.data || [];

        setProfile(nextProfile);
        setItineraries(nextItineraries);
        setFullName(nextProfile?.full_name || '');
        setTravelStyle(normalizeStyle(nextProfile?.travel_style));
        setBio(nextProfile?.bio || '');
        setCoverUri(nextProfile?.cover_url || null);
        setAvatarUri(nextProfile?.avatar_url || null);

        const cityMap = nextItineraries.reduce((acc, itinerary) => {
            const cityName = itinerary?.cities?.name;
            if (!cityName) return acc;
            if (!acc[cityName]) {
                acc[cityName] = {
                    cityName,
                    latestDate: itinerary.created_at || null,
                    planCount: 0,
                };
            }
            acc[cityName].planCount += 1;
            if ((itinerary.created_at || '') > (acc[cityName].latestDate || '')) {
                acc[cityName].latestDate = itinerary.created_at;
            }
            return acc;
        }, {});

        setCityCollection(
            Object.values(cityMap).sort((a, b) => (b.latestDate || '').localeCompare(a.latestDate || ''))
        );
        setBadges(buildBadges(nextItineraries).badges);
        setLoading(false);
        setRefreshing(false);
    }, [user]);

    useFocusEffect(useCallback(() => {
        fetchData();
    }, [fetchData]));

    const pickProfileMedia = async (kind) => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('İzin Gerekli', 'Galeri izni olmadan görsel seçilemiyor.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 0.9,
        });

        if (result.canceled || !result.assets?.[0]?.uri) return;

        const asset = result.assets[0];
        if (kind === 'avatar') setAvatarUri(asset.uri);
        else setCoverUri(asset.uri);

        const { data, error } = await uploadProfileMedia(user.id, asset, kind);
        if (error) {
            Alert.alert('Yükleme Hatası', error.message || 'Görsel yüklenemedi.');
            fetchData();
            return;
        }

        const column = kind === 'avatar' ? 'avatar_url' : 'cover_url';
        const publicUrl = data.publicUrl;
        const { error: updateError } = await updateProfile(user.id, { [column]: publicUrl });
        if (updateError) {
            Alert.alert('Hata', updateError.message || 'Profil görseli kaydedilemedi.');
            fetchData();
            return;
        }

        if (kind === 'avatar') setAvatarUri(publicUrl);
        else setCoverUri(publicUrl);
    };

    const removeProfileMedia = async (kind) => {
        const column = kind === 'avatar' ? 'avatar_url' : 'cover_url';
        const { error } = await updateProfile(user.id, { [column]: null });
        if (error) {
            Alert.alert('Hata', error.message || 'Görsel kaldırılamadı.');
            return;
        }
        if (kind === 'avatar') setAvatarUri(null);
        else setCoverUri(null);
    };

    const showMediaOptions = (kind) => {
        const isAvatar = kind === 'avatar';
        const hasImage = isAvatar ? Boolean(avatarUri) : Boolean(coverUri);
        const title = isAvatar ? 'Profil fotoğrafı' : 'Kapak fotoğrafı';
        const actions = [
            { text: 'Yeni fotoğraf seç', onPress: () => pickProfileMedia(kind) },
        ];

        if (hasImage) {
            actions.push({
                text: 'Fotoğrafı kaldır',
                style: 'destructive',
                onPress: () => removeProfileMedia(kind),
            });
        }

        actions.push({ text: 'Vazgeç', style: 'cancel' });
        Alert.alert(title, 'Ne yapmak istersin?', actions);
    };

    const handleSave = async () => {
        const { data, error } = await updateProfile(user.id, {
            full_name: fullName,
            travel_style: travelStyle,
            bio,
            cover_url: coverUri,
            avatar_url: avatarUri,
        });

        if (error) {
            Alert.alert('Hata', error.message || 'Profil güncellenemedi.');
            return;
        }

        setProfile(data || {
            ...profile,
            full_name: fullName,
            travel_style: travelStyle,
            bio,
            cover_url: coverUri,
            avatar_url: avatarUri,
        });
        setEditing(false);
    };

    const handleLogout = () => {
        Alert.alert('Çıkış Yap', 'Oturumu kapatmak istediğine emin misin?', [
            { text: 'İptal', style: 'cancel' },
            { text: 'Çıkış Yap', style: 'destructive', onPress: async () => { await signOut(); } },
        ]);
    };

    if (loading) return <ProfileSkeleton />;

    const travelStats = buildTravelStats(itineraries);
    const styleLabel = TRAVEL_STYLES.find((item) => item.value === normalizeStyle(travelStyle))?.label || 'Tarz seçilmedi';
    const profileName = profile?.full_name || 'İsimsiz Gezgin';
    const visitedRatio = Math.min(100, Math.round((cityCollection.length / 81) * 100));
    const earnedBadges = badges.filter((badge) => badge.earned).slice(0, 4);

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <StatusBar barStyle="light-content" />
            <ScrollView
                style={[styles.container, { backgroundColor: theme.colors.background }]}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={COLORS.primaryDark} />}
            >
                <Animated.View style={{ opacity: fadeAnim }}>
                    <View style={styles.coverWrap}>
                        {coverUri ? (
                            <SmartImage uri={coverUri} style={styles.coverImage} contentFit="cover" />
                        ) : (
                            <SmartImage source={DEFAULT_COVER} style={styles.coverImage} contentFit="cover" />
                        )}
                        <LinearGradient colors={['rgba(11,18,16,0.06)', 'rgba(11,18,16,0.62)']} style={styles.coverOverlay} />
                        <View style={styles.heroTopRow}>
                            <TouchableOpacity style={styles.heroIconBtn} onPress={() => showMediaOptions('cover')} activeOpacity={0.85}>
                                <Ionicons name="image-outline" size={18} color="#fff" />
                            </TouchableOpacity>
                            <View style={styles.heroActionGroup}>
                                <TouchableOpacity style={styles.heroIconBtn} onPress={() => setEditing((value) => !value)} activeOpacity={0.85}>
                                    <Ionicons name={editing ? 'close-outline' : 'create-outline'} size={20} color="#fff" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.heroIconBtn} onPress={() => navigation.navigate('ProfileMenu')} activeOpacity={0.85}>
                                    <Ionicons name="menu-outline" size={22} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    <View style={styles.profileMain}>
                        <TouchableOpacity style={[styles.avatarWrap, { borderColor: theme.colors.background }]} onPress={() => showMediaOptions('avatar')} activeOpacity={0.86}>
                            {avatarUri ? (
                                <SmartImage uri={avatarUri} style={styles.avatarImage} contentFit="cover" />
                            ) : (
                                <LinearGradient colors={[theme.colors.primary, '#17372D']} style={styles.avatarFallback}>
                                    <Text style={styles.avatarInitials}>{getInitials(profileName)}</Text>
                                </LinearGradient>
                            )}
                            <View style={styles.avatarCamera}>
                                <Ionicons name="camera-outline" size={14} color="#fff" />
                            </View>
                        </TouchableOpacity>

                        <Text style={[styles.profileName, { color: theme.colors.text }]}>{profileName}</Text>
                        <Text style={[styles.profileBio, { color: theme.colors.textSecondary }]}>{bio || 'Kendini, gezi tarzını ve bir sonraki rotanı birkaç cümleyle anlat.'}</Text>
                        <View style={styles.badgeRow}>
                            <View style={[styles.badgePill, { backgroundColor: theme.colors.pill }]}> 
                                <Ionicons name="sparkles-outline" size={13} color={theme.colors.primary} />
                                <Text style={[styles.badgeTxt, { color: theme.colors.primary }]}>{styleLabel}</Text>
                            </View>
                        </View>

                        <View style={styles.statGrid}>
                            <InlineStat label="Şehir" value={cityCollection.length} icon="location-outline" theme={theme} />
                            <InlineStat label="Favori" value={favorites.length} icon="heart-outline" theme={theme} />
                            <InlineStat label="Plan" value={itineraries.length} icon="map-outline" theme={theme} />
                            <InlineStat label="Rozet" value={earnedBadges.length} icon="ribbon-outline" theme={theme} />
                        </View>
                    </View>

                    {editing && (
                        <View style={[styles.editPanel, { borderColor: theme.colors.border }]}> 
                            <TextInput value={fullName} onChangeText={setFullName} placeholder="Ad soyad" placeholderTextColor="#6B7280" style={styles.editInput} />
                            <TextInput value={bio} onChangeText={setBio} placeholder="Kısa bir biyografi" placeholderTextColor="#6B7280" style={[styles.editInput, styles.bioInput]} multiline maxLength={180} />
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.styleList}>
                                {TRAVEL_STYLES.map((item) => (
                                    <TouchableOpacity
                                        key={item.value}
                                        style={[styles.styleChip, travelStyle === item.value && styles.styleChipActive]}
                                        onPress={() => setTravelStyle(item.value)}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={[styles.styleChipTxt, travelStyle === item.value && styles.styleChipTxtActive]}>{item.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            <View style={styles.editActions}>
                                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setEditing(false)}><Text style={styles.secondaryBtnTxt}>Vazgeç</Text></TouchableOpacity>
                                <TouchableOpacity style={styles.primaryBtn} onPress={handleSave}><Text style={styles.primaryBtnTxt}>Kaydet</Text></TouchableOpacity>
                            </View>
                        </View>
                    )}

                    <View style={styles.progressSection}>
                        <View style={styles.statsHeader}>
                            <Text style={[styles.statsTitle, { color: theme.colors.text }]}>Türkiye hedefi</Text>
                            <Text style={[styles.statsMeta, { color: theme.colors.primary }]}>%{visitedRatio}</Text>
                        </View>
                        <View style={[styles.progressTrack, { backgroundColor: theme.colors.pill }]}> 
                            <View style={[styles.progressFill, { width: `${Math.max(8, visitedRatio)}%`, backgroundColor: theme.colors.primary }]} />
                        </View>
                        <Text style={[styles.progressCaption, { color: theme.colors.textSecondary }]}>{cityCollection.length} / 81 şehir görüldü</Text>
                    </View>

                    <View style={[styles.flatSection, { borderTopColor: theme.colors.border }]}> 
                        <View style={styles.sectionHeader}>
                            <View>
                                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Rozetlerin</Text>
                                <Text style={[styles.sectionSub, { color: theme.colors.textSecondary }]}>Kazandığın modern rozetler</Text>
                            </View>
                            <TouchableOpacity style={styles.inlineBtn} onPress={() => navigation.navigate('Badges')}>
                                <Text style={styles.inlineBtnTxt}>Tümü</Text>
                            </TouchableOpacity>
                        </View>
                        {earnedBadges.length ? (
                            <View style={styles.medalRow}>
                                {earnedBadges.map((badge) => (
                                    <View key={badge.key} style={styles.medalItem}>
                                        <View style={[styles.medalOuter, { backgroundColor: badge.ring }]}>
                                            <View style={[styles.medalInner, { backgroundColor: badge.color }]}>
                                                <Ionicons name={badge.icon} size={20} color="#fff" />
                                            </View>
                                        </View>
                                        <Text style={[styles.medalLabel, { color: theme.colors.text }]}>{badge.label}</Text>
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <Text style={[styles.emptyTxt, { color: theme.colors.textSecondary }]}>İlk rozetin için bir şehir planını tamamlaman yeterli.</Text>
                        )}
                    </View>

                    <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
                        <Ionicons name="log-out-outline" size={18} color={COLORS.error} />
                        <Text style={styles.logoutTxt}>Çıkış yap</Text>
                    </TouchableOpacity>
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
};

const InlineStat = ({ label, value, icon, theme }) => (
    <View style={styles.statItem}>
        <View style={[styles.statIconWrap, { backgroundColor: theme.colors.pill }]}>
            <Ionicons name={icon} size={15} color={theme.colors.primary} />
        </View>
        <View>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{value}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
        </View>
    </View>
);

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F5F6F1' },
    container: { flex: 1, backgroundColor: '#F5F6F1' },
    content: { paddingBottom: 110 },
    coverWrap: { height: 205, position: 'relative' },
    coverImage: { width: '100%', height: '100%' },
    coverOverlay: { ...StyleSheet.absoluteFillObject },
    heroTopRow: { position: 'absolute', top: 16, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
    heroActionGroup: { flexDirection: 'row', gap: 10 },
    heroIconBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(15,26,22,0.34)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },
    profileMain: { alignItems: 'center', paddingHorizontal: SPACING.md, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(143,168,158,0.22)' },
    avatarWrap: { width: 104, height: 104, borderRadius: 52, borderWidth: 4, marginTop: -52, overflow: 'visible', backgroundColor: '#17372D' },
    avatarImage: { width: '100%', height: '100%', borderRadius: 52 },
    avatarFallback: { width: '100%', height: '100%', borderRadius: 52, alignItems: 'center', justifyContent: 'center' },
    avatarInitials: { fontFamily: FONTS.heading, fontSize: 30, color: '#fff' },
    avatarCamera: { position: 'absolute', right: -2, bottom: 4, width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primaryDark, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
    profileName: { fontFamily: FONTS.heading, fontSize: 27, color: '#13231C', textAlign: 'center' },
    profileBio: { marginTop: 8, maxWidth: 310, fontFamily: FONTS.body, fontSize: 14, lineHeight: 20, color: '#33423C', textAlign: 'center' },
    badgeRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 14 },
    badgePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#EAF2EC' },
    badgeTxt: { fontFamily: FONTS.bodySemiBold, fontSize: 12, color: COLORS.primaryDark },
    editPanel: { gap: 10, marginHorizontal: SPACING.md, paddingTop: 4, paddingBottom: 18, borderBottomWidth: 1 },
    editInput: { borderRadius: 16, borderWidth: 1, borderColor: '#D6DFD8', backgroundColor: '#FBFCFB', paddingHorizontal: 14, paddingVertical: 11, fontFamily: FONTS.body, fontSize: 14, color: '#13231C' },
    bioInput: { minHeight: 92, textAlignVertical: 'top' },
    styleList: { gap: 8, paddingTop: 2, paddingBottom: 2 },
    styleChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#EEF3EF', borderWidth: 1, borderColor: '#D6DFD8' },
    styleChipActive: { backgroundColor: '#17372D', borderColor: '#17372D' },
    styleChipTxt: { fontFamily: FONTS.bodyMedium, fontSize: 12, color: '#43514B' },
    styleChipTxtActive: { color: '#fff' },
    editActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
    secondaryBtn: { flex: 1, borderRadius: 14, backgroundColor: '#EEF3EF', paddingVertical: 12, alignItems: 'center' },
    secondaryBtnTxt: { fontFamily: FONTS.bodySemiBold, fontSize: 13, color: '#2F3D37' },
    primaryBtn: { flex: 1.3, borderRadius: 14, backgroundColor: '#17372D', paddingVertical: 12, alignItems: 'center' },
    primaryBtnTxt: { fontFamily: FONTS.bodySemiBold, fontSize: 13, color: '#fff' },
    progressSection: { paddingHorizontal: SPACING.md, paddingTop: 20, paddingBottom: 18 },
    statsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
    statsTitle: { fontFamily: FONTS.bodySemiBold, fontSize: 18, color: '#13231C' },
    statsMeta: { fontFamily: FONTS.bodySemiBold, fontSize: 13, color: COLORS.primaryDark },
    progressTrack: { height: 9, borderRadius: 999, backgroundColor: '#E7EEE9', marginTop: 14, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 999, backgroundColor: COLORS.primaryDark },
    progressCaption: { marginTop: 10, fontFamily: FONTS.body, fontSize: 13, color: '#66746E' },
    statGrid: { width: '100%', marginTop: 18, flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    statItem: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
    statIconWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    statValue: { fontFamily: FONTS.heading, fontSize: 20, color: '#13231C', lineHeight: 23 },
    statLabel: { marginTop: -1, fontFamily: FONTS.body, fontSize: 11, color: '#66746E' },
    flatSection: { paddingHorizontal: SPACING.md, paddingTop: 18, paddingBottom: 18, borderTopWidth: 1 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    sectionTitle: { fontFamily: FONTS.bodySemiBold, fontSize: 18, color: '#13231C' },
    sectionSub: { marginTop: 2, fontFamily: FONTS.body, fontSize: 12, color: '#66746E' },
    inlineBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#EDF4EF' },
    inlineBtnTxt: { fontFamily: FONTS.bodySemiBold, fontSize: 12, color: COLORS.primaryDark },
    medalRow: { flexDirection: 'row', justifyContent: 'flex-start', gap: 10, flexWrap: 'wrap' },
    medalItem: { width: '23%', alignItems: 'center' },
    medalOuter: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
    medalInner: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    medalLabel: { marginTop: 8, fontFamily: FONTS.bodySemiBold, fontSize: 11, textAlign: 'center' },
    emptyTxt: { fontFamily: FONTS.body, fontSize: 13, lineHeight: 19, color: '#66746E' },
    logoutBtn: { marginHorizontal: SPACING.md, marginTop: SPACING.md, borderRadius: 18, backgroundColor: '#FFF4F4', borderWidth: 1, borderColor: '#F6D5D5', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
    logoutTxt: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: COLORS.error },
});

export default ProfileScreen;
