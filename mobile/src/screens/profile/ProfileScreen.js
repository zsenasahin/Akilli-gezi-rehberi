import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Platform,
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
import { getProfile, updateProfile } from '../../services/profileService';
import { getItinerariesByUser } from '../../services/itineraryService';
import { signOut } from '../../services/authService';
import useFavorites from '../../hooks/useFavorites';
import { ProfileSkeleton } from '../../components/common/SkeletonLoader';
import { getJournalBooks } from '../../services/journalStore';
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

const ProfileScreen = ({ navigation }) => {
    const { user } = useAuth();
    const { favorites } = useFavorites();
    const { theme } = useThemePreference();

    const fadeAnim = useRef(new Animated.Value(0)).current;

    const [profile, setProfile] = useState(null);
    const [itineraries, setItineraries] = useState([]);
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [editing, setEditing] = useState(false);

    const [fullName, setFullName] = useState('');
    const [travelStyle, setTravelStyle] = useState('');
    const [bio, setBio] = useState('');
    const [coverUri, setCoverUri] = useState(null);
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

        const [profileRes, itinerariesRes, journalBooks] = await Promise.all([
            getProfile(user.id),
            getItinerariesByUser(user.id),
            getJournalBooks(user.id),
        ]);

        const nextProfile = profileRes.data || null;
        const nextItineraries = itinerariesRes.data || [];

        setProfile(nextProfile);
        setItineraries(nextItineraries);
        setBooks(journalBooks || []);
        setFullName(nextProfile?.full_name || '');
        setTravelStyle(normalizeStyle(nextProfile?.travel_style));
        setBio(nextProfile?.bio || '');
        setCoverUri(nextProfile?.cover_url || null);

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

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('İzin Gerekli', 'Galeri izni olmadan görsel seçilemiyor.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [16, 10],
            quality: 0.9,
        });

        if (result.canceled || !result.assets?.[0]?.uri) return;

        const nextUri = result.assets[0].uri;
        setCoverUri(nextUri);
        await updateProfile(user.id, { cover_url: nextUri });
    };

    const handleSave = async () => {
        const { data, error } = await updateProfile(user.id, {
            full_name: fullName,
            travel_style: travelStyle,
            bio,
            cover_url: coverUri,
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

    const totalPages = books.reduce((sum, book) => sum + (book.pages?.length || 0), 0);
    const travelStats = buildTravelStats(itineraries);
    const completedPlans = travelStats.completedPlans;
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
                    <View style={[styles.heroCard, { backgroundColor: theme.colors.surface }]}>
                        <View style={styles.coverWrap}>
                            {coverUri ? (
                                <SmartImage uri={coverUri} style={styles.coverImage} contentFit="cover" />
                            ) : (
                                <SmartImage source={DEFAULT_COVER} style={styles.coverImage} contentFit="cover" />
                            )}
                            <LinearGradient colors={['rgba(11,18,16,0.16)', 'rgba(11,18,16,0.8)']} style={styles.coverOverlay} />
                            <View style={styles.heroTopRow}>
                                <TouchableOpacity style={styles.heroIconBtn} onPress={() => editing ? pickImage() : setEditing(true)} activeOpacity={0.85}>
                                    <Ionicons name={editing ? 'image-outline' : 'create-outline'} size={18} color="#fff" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.heroIconBtn} onPress={() => navigation.navigate('ProfileMenu')} activeOpacity={0.85}>
                                    <Ionicons name="menu-outline" size={22} color="#fff" />
                                </TouchableOpacity>
                            </View>

                        </View>

                        <View style={[styles.profileInfoCard, { backgroundColor: theme.key === 'dark' ? 'rgba(23,33,30,0.96)' : 'rgba(255,255,255,0.96)', borderColor: theme.key === 'dark' ? theme.colors.border : 'rgba(255,255,255,0.85)' }]}>
                            {editing ? (
                                <View style={styles.editPanel}>
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
                            ) : (
                                <View style={styles.identityBlock}>
                                    <View style={styles.nameRow}>
                                        <Text style={[styles.profileName, { color: theme.colors.text }]}>{profileName}</Text>
                                        <TouchableOpacity style={styles.smallEditBtn} onPress={() => setEditing(true)} activeOpacity={0.82}>
                                            <Ionicons name="create-outline" size={15} color={COLORS.primaryDark} />
                                        </TouchableOpacity>
                                    </View>
                                    <Text style={[styles.profileBio, { color: theme.colors.textSecondary }]}>{bio || 'Kendini, gezi tarzını ve bir sonraki rotanı birkaç cümleyle anlat.'}</Text>
                                    <View style={styles.badgeRow}>
                                        <LinearGradient colors={['#DDF2E9', '#F6FAF7']} style={styles.badgePill}>
                                            <Ionicons name="sparkles-outline" size={13} color={COLORS.primaryDark} />
                                            <Text style={styles.badgeTxt}>{styleLabel}</Text>
                                        </LinearGradient>
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>

                    <View style={[styles.statsPanel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                        <View style={styles.statsHeader}>
                            <Text style={[styles.statsTitle, { color: theme.colors.text }]}>Seyahat özeti</Text>
                            <Text style={[styles.statsMeta, { color: theme.colors.primary }]}>Türkiye hedefi %{visitedRatio}</Text>
                        </View>
                        <View style={[styles.progressTrack, { backgroundColor: theme.colors.pill }]}>
                            <View style={[styles.progressFill, { width: `${Math.max(8, visitedRatio)}%`, backgroundColor: theme.colors.primary }]} />
                        </View>
                        <Text style={[styles.progressCaption, { color: theme.colors.textSecondary }]}>{cityCollection.length} / 81 şehir görüldü</Text>

                        <View style={styles.statGrid}>
                            <InlineStat label="Gezilen şehir" value={cityCollection.length} icon="location-outline" theme={theme} />
                            <InlineStat label="Favori" value={favorites.length} icon="heart-outline" theme={theme} />
                            <InlineStat label="Plan" value={itineraries.length} icon="map-outline" theme={theme} />
                            <InlineStat label="Sayfa" value={totalPages} icon="document-text-outline" theme={theme} />
                        </View>
                    </View>

                    <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                        <View style={styles.sectionHeader}>
                            <View>
                                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Defterlerin</Text>
                                <Text style={[styles.sectionSub, { color: theme.colors.textSecondary }]}>Defterlerine tek yerden dön</Text>
                            </View>
                            <TouchableOpacity style={styles.inlineBtn} onPress={() => navigation.navigate('Journal')}>
                                <Text style={styles.inlineBtnTxt}>Aç</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.journalSummary}>
                            <View style={[styles.journalCount, { backgroundColor: theme.colors.surfaceSoft }]}>
                                <Text style={[styles.journalValue, { color: theme.colors.text }]}>{books.length}</Text>
                                <Text style={[styles.journalLabel, { color: theme.colors.textSecondary }]}>defter</Text>
                            </View>
                            <View style={[styles.journalCount, { backgroundColor: theme.colors.surfaceSoft }]}>
                                <Text style={[styles.journalValue, { color: theme.colors.text }]}>{totalPages}</Text>
                                <Text style={[styles.journalLabel, { color: theme.colors.textSecondary }]}>sayfa</Text>
                            </View>
                            <View style={[styles.journalCount, { backgroundColor: theme.colors.surfaceSoft }]}>
                                <Text style={[styles.journalValue, { color: theme.colors.text }]}>{completedPlans}</Text>
                                <Text style={[styles.journalLabel, { color: theme.colors.textSecondary }]}>tamamlanan plan</Text>
                            </View>
                        </View>
                    </View>

                    <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                        <View style={styles.sectionHeader}>
                            <View>
                                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Rozetlerin</Text>
                                <Text style={[styles.sectionSub, { color: theme.colors.textSecondary }]}>Kazandığın madalyalar burada görünür</Text>
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
            <Ionicons name={icon} size={16} color={theme.colors.primary} />
        </View>
        <View style={styles.statText}>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{value}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
        </View>
    </View>
);

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F5F6F1' },
    container: { flex: 1, backgroundColor: '#F5F6F1' },
    content: { paddingBottom: 110 },
    heroCard: { marginHorizontal: SPACING.md, marginTop: Platform.OS === 'ios' ? SPACING.md : SPACING.sm, borderRadius: 28, overflow: 'hidden', backgroundColor: '#fff' },
    coverWrap: { height: 230, position: 'relative' },
    coverImage: { width: '100%', height: '100%' },
    coverOverlay: { ...StyleSheet.absoluteFillObject },
    heroTopRow: { position: 'absolute', top: 16, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
    heroIconBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },

    profileInfoCard: { marginTop: -48, marginHorizontal: 16, marginBottom: 16, padding: 18, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.96)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)' },
    identityBlock: { alignItems: 'center' },
    nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    profileName: { fontFamily: FONTS.heading, fontSize: 27, color: '#13231C', textAlign: 'center' },
    smallEditBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF2EC' },
    profileBio: { marginTop: 10, fontFamily: FONTS.body, fontSize: 14, lineHeight: 20, color: '#33423C', textAlign: 'center' },
    badgeRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 14 },
    badgePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#EAF2EC' },
    badgeTxt: { fontFamily: FONTS.bodySemiBold, fontSize: 12, color: COLORS.primaryDark },
    editPanel: { gap: 10 },
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
    statsPanel: { marginHorizontal: SPACING.md, marginTop: SPACING.md, borderRadius: 24, padding: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6ECE7' },
    statsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
    statsTitle: { fontFamily: FONTS.bodySemiBold, fontSize: 18, color: '#13231C' },
    statsMeta: { fontFamily: FONTS.bodySemiBold, fontSize: 13, color: COLORS.primaryDark },
    progressTrack: { height: 9, borderRadius: 999, backgroundColor: '#E7EEE9', marginTop: 14, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 999, backgroundColor: COLORS.primaryDark },
    progressCaption: { marginTop: 10, fontFamily: FONTS.body, fontSize: 13, color: '#66746E' },
    statGrid: { marginTop: 18, gap: 12 },
    statItem: { flexDirection: 'row', alignItems: 'center' },
    statIconWrap: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#EDF4EF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    statText: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
    statValue: { fontFamily: FONTS.heading, fontSize: 24, color: '#13231C' },
    statLabel: { fontFamily: FONTS.body, fontSize: 13, color: '#66746E' },
    sectionCard: { marginHorizontal: SPACING.md, marginTop: SPACING.md, borderRadius: 24, padding: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6ECE7' },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    sectionTitle: { fontFamily: FONTS.bodySemiBold, fontSize: 18, color: '#13231C' },
    sectionSub: { marginTop: 2, fontFamily: FONTS.body, fontSize: 12, color: '#66746E' },
    inlineBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#EDF4EF' },
    inlineBtnTxt: { fontFamily: FONTS.bodySemiBold, fontSize: 12, color: COLORS.primaryDark },
    journalSummary: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    journalCount: { flex: 1, paddingVertical: 10, borderRadius: 18, backgroundColor: '#F7FAF8', alignItems: 'center' },
    journalValue: { fontFamily: FONTS.heading, fontSize: 24, color: '#13231C' },
    journalLabel: { marginTop: 4, fontFamily: FONTS.body, fontSize: 12, color: '#66746E', textAlign: 'center' },
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
