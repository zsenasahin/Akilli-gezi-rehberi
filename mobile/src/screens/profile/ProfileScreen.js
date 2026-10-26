import React, { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { getCityImages } from '../../services/cityImageService';
import { useAuth } from '../../contexts/AuthContext';
import { getProfile, updateProfile, uploadProfileMedia } from '../../services/profileService';
import { getItinerariesByUser } from '../../services/itineraryService';
import useFavorites from '../../hooks/useFavorites';
import { ProfileSkeleton } from '../../components/common/SkeletonLoader';
import { buildBadges, buildTravelStats } from '../../services/achievementService';
import { useThemePreference } from '../../contexts/ThemeContext';
import { createThemedStyles } from '../../utils/themedStyles';

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

    const AVATAR_CACHE_KEY = `avatar_url_${user?.id}`;

    // Sayfa yüklenir yüklenmez önbelleğten avatar'i göster (ağ geç olsa bile)
    useEffect(() => {
        AsyncStorage.getItem(AVATAR_CACHE_KEY).then(cached => {
            if (cached) setAvatarUri(cached);
        });
    }, [AVATAR_CACHE_KEY]);

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

        // Avatar: DB'deki URL varsa önce onu al ve önbelleğe yaz
        const dbAvatar = nextProfile?.avatar_url || null;
        if (dbAvatar) {
            setAvatarUri(dbAvatar);
            AsyncStorage.setItem(`avatar_url_${user?.id}`, dbAvatar).catch(() => {});
        }

        const cityMap = nextItineraries.reduce((acc, itinerary) => {
            const cityName = itinerary?.cities?.name;
            if (!cityName) return acc;
            if (!acc[cityName]) {
                acc[cityName] = {
                    cityName,
                    region: itinerary?.cities?.region || null,
                    imageUrl: itinerary?.cities?.image_url || null,
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
            console.error('[Profile] Upload hatası:', error);
            Alert.alert('Yükleme Hatası', error.message || 'Görsel yüklenemedi.');
            fetchData();
            return;
        }

        const column = kind === 'avatar' ? 'avatar_url' : 'cover_url';
        const publicUrl = data.publicUrl;
        console.log('[Profile] Yükleme başarılı:', publicUrl);

        const { error: updateError } = await updateProfile(user.id, { [column]: publicUrl });
        if (updateError) {
            console.error('[Profile] DB güncelleme hatası:', updateError);
            Alert.alert('Hata', updateError.message || 'Profil görseli kaydedilemedi.');
            fetchData();
            return;
        }

        if (kind === 'avatar') {
            setAvatarUri(publicUrl);
            // AsyncStorage'a kaydet — sayfa yenilenince anında gösterilir
            await AsyncStorage.setItem(AVATAR_CACHE_KEY, publicUrl);
        } else {
            setCoverUri(publicUrl);
        }
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

    if (loading) return <ProfileSkeleton />;

    const travelStats = buildTravelStats(itineraries);
    const styleLabel = TRAVEL_STYLES.find((item) => item.value === normalizeStyle(travelStyle))?.label || 'Tarz seçilmedi';
    const profileName = profile?.full_name || 'İsimsiz Gezgin';
    const visitedRatio = Math.min(100, Math.round((cityCollection.length / 81) * 100));
    const allEarned = badges.filter((badge) => badge.earned);
    const earnedBadges = allEarned.slice(0, 4);
    const nextBadge = badges.find((badge) => !badge.earned);
    const activePlans = itineraries.filter((item) => item.status !== 'completed').length;

    const quickActions = [
        { key: 'saved', label: 'Planlarım', meta: activePlans ? `${activePlans} aktif plan` : 'Rotalarını gör', icon: 'map', route: 'Saved', tint: '#4F6342' },
        { key: 'favorites', label: 'Favoriler', meta: `${favorites.length} yer`, icon: 'heart', route: 'Favorites', tint: '#B5523B' },
        { key: 'collection', label: 'Koleksiyon', meta: `${cityCollection.length} şehir`, icon: 'images', route: 'CityCollection', tint: '#5A7D8C' },
        { key: 'badges', label: 'Rozetler', meta: `${allEarned.length}/${badges.length} kazanıldı`, icon: 'ribbon', route: 'Badges', tint: '#B8893A' },
    ];

    return (
        <View style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
            <StatusBar barStyle="light-content" />
            <ScrollView
                style={[styles.container, { backgroundColor: theme.colors.background }]}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={COLORS.primaryDark} />}
            >
                <Animated.View style={{ opacity: fadeAnim }}>
                    {/* ── Kapak ── */}
                    <View style={styles.coverWrap}>
                        <SmartImage
                            {...(coverUri ? { uri: coverUri } : { source: DEFAULT_COVER })}
                            style={styles.coverImage}
                            contentFit="cover"
                        />
                        <LinearGradient colors={['rgba(11,18,16,0.45)', 'rgba(11,18,16,0.05)', 'rgba(11,18,16,0.55)']} style={styles.coverOverlay} />
                        <SafeAreaView edges={['top']} style={styles.heroTopRow}>
                            <TouchableOpacity style={styles.heroIconBtn} onPress={() => showMediaOptions('cover')} activeOpacity={0.85} accessibilityLabel="Kapak fotoğrafını değiştir">
                                <Ionicons name="image-outline" size={18} color="#fff" />
                            </TouchableOpacity>
                            <View style={styles.heroActionGroup}>
                                <TouchableOpacity style={styles.heroIconBtn} onPress={() => setEditing((value) => !value)} activeOpacity={0.85} accessibilityLabel="Profili düzenle">
                                    <Ionicons name={editing ? 'close-outline' : 'create-outline'} size={20} color="#fff" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.heroIconBtn} onPress={() => navigation.navigate('ProfileMenu')} activeOpacity={0.85} accessibilityLabel="Menü">
                                    <Ionicons name="settings-outline" size={19} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </SafeAreaView>
                    </View>

                    {/* ── Kimlik kartı ── */}
                    <View style={[styles.identityCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                        <TouchableOpacity style={[styles.avatarWrap, { borderColor: theme.colors.surface }]} onPress={() => showMediaOptions('avatar')} activeOpacity={0.86}>
                            {avatarUri ? (
                                <SmartImage uri={avatarUri} style={styles.avatarImage} contentFit="cover" />
                            ) : (
                                <LinearGradient colors={[theme.colors.primary, '#303D29']} style={styles.avatarFallback}>
                                    <Text style={styles.avatarInitials}>{getInitials(profileName)}</Text>
                                </LinearGradient>
                            )}
                            <View style={styles.avatarCamera}>
                                <Ionicons name="camera" size={13} color="#fff" />
                            </View>
                        </TouchableOpacity>

                        <Text style={[styles.profileName, { color: theme.colors.text }]} numberOfLines={1}>{profileName}</Text>
                        <View style={[styles.badgePill, { backgroundColor: theme.colors.pill }]}>
                            <Ionicons name="sparkles" size={12} color={theme.colors.primary} />
                            <Text style={[styles.badgeTxt, { color: theme.colors.primary }]}>{styleLabel}</Text>
                        </View>
                        <Text style={[styles.profileBio, { color: theme.colors.textSecondary }]}>
                            {bio || 'Kendini, gezi tarzını ve bir sonraki rotanı birkaç cümleyle anlat.'}
                        </Text>

                        <View style={[styles.statGrid, { borderTopColor: theme.colors.border }]}>
                            <InlineStat label="Şehir" value={cityCollection.length} theme={theme} />
                            <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
                            <InlineStat label="Plan" value={itineraries.length} theme={theme} />
                            <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
                            <InlineStat label="Km" value={travelStats.totalCompletedDistance} theme={theme} />
                            <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
                            <InlineStat label="Rozet" value={allEarned.length} theme={theme} />
                        </View>
                    </View>

                    {editing && (
                        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Profili düzenle</Text>
                            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Ad soyad</Text>
                            <TextInput value={fullName} onChangeText={setFullName} placeholder="Ad soyad" placeholderTextColor={theme.colors.textLight} style={[styles.editInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSoft }]} />
                            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Hakkımda</Text>
                            <TextInput value={bio} onChangeText={setBio} placeholder="Kısa bir biyografi" placeholderTextColor={theme.colors.textLight} style={[styles.editInput, styles.bioInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSoft }]} multiline maxLength={180} />
                            <Text style={[styles.counter, { color: theme.colors.textLight }]}>{bio.length}/180</Text>
                            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Gezi tarzı</Text>
                            <View style={styles.styleList}>
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
                            </View>
                            <View style={styles.editActions}>
                                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setEditing(false)}><Text style={styles.secondaryBtnTxt}>Vazgeç</Text></TouchableOpacity>
                                <TouchableOpacity style={styles.primaryBtn} onPress={handleSave}><Text style={styles.primaryBtnTxt}>Kaydet</Text></TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* ── Hızlı erişim ── */}
                    <View style={styles.quickGrid}>
                        {quickActions.map((action) => (
                            <TouchableOpacity
                                key={action.key}
                                style={[styles.quickTile, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                                onPress={() => navigation.navigate(action.route)}
                                activeOpacity={0.85}
                            >
                                <View style={[styles.quickIcon, { backgroundColor: `${action.tint}1F` }]}>
                                    <Ionicons name={action.icon} size={18} color={action.tint} />
                                </View>
                                <Text style={[styles.quickLabel, { color: theme.colors.text }]}>{action.label}</Text>
                                <Text style={[styles.quickMeta, { color: theme.colors.textSecondary }]} numberOfLines={1}>{action.meta}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* ── Türkiye hedefi ── */}
                    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                        <View style={styles.statsHeader}>
                            <View style={styles.goalTitleRow}>
                                <Text style={styles.goalEmoji}>🇹🇷</Text>
                                <View>
                                    <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Türkiye hedefi</Text>
                                    <Text style={[styles.sectionSub, { color: theme.colors.textSecondary }]}>{cityCollection.length} / 81 şehir keşfedildi</Text>
                                </View>
                            </View>
                            <Text style={[styles.goalPercent, { color: theme.colors.primary }]}>%{visitedRatio}</Text>
                        </View>
                        <View style={[styles.progressTrack, { backgroundColor: theme.colors.pill }]}>
                            <LinearGradient
                                colors={COLORS.gradients.primary}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[styles.progressFill, { width: `${Math.max(4, visitedRatio)}%` }]}
                            />
                        </View>
                        <View style={styles.goalFacts}>
                            <GoalFact icon="checkmark-done-outline" value={travelStats.completedPlans} label="tamamlanan plan" theme={theme} />
                            <GoalFact icon="navigate-outline" value={`${travelStats.totalCompletedDistance} km`} label="gezilen yol" theme={theme} />
                        </View>
                    </View>

                    {/* ── Son şehirler ── */}
                    {cityCollection.length > 0 && (
                        <View style={styles.section}>
                            <View style={[styles.sectionHeader, styles.sectionHeaderPadded]}>
                                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Son şehirlerin</Text>
                                <TouchableOpacity style={styles.inlineBtn} onPress={() => navigation.navigate('CityCollection')}>
                                    <Text style={styles.inlineBtnTxt}>Tümü</Text>
                                </TouchableOpacity>
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cityRow}>
                                {cityCollection.slice(0, 8).map((city) => {
                                    const images = getCityImages(city.cityName, city.region);
                                    return (
                                        <View key={city.cityName} style={styles.cityCard}>
                                            <SmartImage
                                                thumbnail
                                                uri={city.imageUrl || images.card}
                                                fallbackUri={images.fallbackCard}
                                                style={styles.cityImage}
                                                contentFit="cover"
                                            />
                                            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.72)']} style={styles.coverOverlay} />
                                            <View style={styles.cityText}>
                                                <Text style={styles.cityName} numberOfLines={1}>{city.cityName}</Text>
                                                <Text style={styles.cityMeta}>{city.planCount} plan</Text>
                                            </View>
                                        </View>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    )}

                    {/* ── Rozetler ── */}
                    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                        <View style={styles.sectionHeader}>
                            <View>
                                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Rozetlerin</Text>
                                <Text style={[styles.sectionSub, { color: theme.colors.textSecondary }]}>{allEarned.length} / {badges.length} rozet kazanıldı</Text>
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
                                        <Text style={[styles.medalLabel, { color: theme.colors.text }]} numberOfLines={2}>{badge.label}</Text>
                                    </View>
                                ))}
                            </View>
                        ) : null}
                        {nextBadge ? (
                            <View style={[styles.nextBadge, { backgroundColor: theme.colors.surfaceSoft }]}>
                                <View style={[styles.nextBadgeIcon, { borderColor: theme.colors.border }]}>
                                    <Ionicons name={nextBadge.icon} size={16} color={theme.colors.textSecondary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.nextBadgeTitle, { color: theme.colors.text }]}>Sıradaki: {nextBadge.label}</Text>
                                    <Text style={[styles.nextBadgeText, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                                        {nextBadge.description || 'Bir şehir planını tamamlayarak rozet kazanabilirsin.'}
                                    </Text>
                                </View>
                            </View>
                        ) : null}
                    </View>

                </Animated.View>
            </ScrollView>
        </View>
    );
};

const InlineStat = ({ label, value, theme }) => (
    <View style={styles.statItem}>
        <Text style={[styles.statValue, { color: theme.colors.text }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
    </View>
);

const GoalFact = ({ icon, value, label, theme }) => (
    <View style={[styles.goalFact, { backgroundColor: theme.colors.surfaceSoft }]}>
        <Ionicons name={icon} size={16} color={theme.colors.primary} />
        <View>
            <Text style={[styles.goalFactValue, { color: theme.colors.text }]}>{value}</Text>
            <Text style={[styles.goalFactLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
        </View>
    </View>
);

const CARD_SHADOW = {
    shadowColor: '#1B1F1C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
};

const styles = createThemedStyles(() => ({
    safeArea: { flex: 1, backgroundColor: COLORS.background },
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { paddingBottom: 120 },

    coverWrap: { height: 230, position: 'relative' },
    coverImage: { width: '100%', height: '100%' },
    coverOverlay: { ...StyleSheet.absoluteFill },
    heroTopRow: { position: 'absolute', top: 0, left: 16, right: 16, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
    heroActionGroup: { flexDirection: 'row', gap: 10 },
    heroIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(15,26,22,0.34)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },

    identityCard: {
        marginHorizontal: SPACING.md,
        marginTop: -64,
        borderRadius: 24,
        borderWidth: 1,
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.md,
        ...CARD_SHADOW,
    },
    avatarWrap: { width: 96, height: 96, borderRadius: 48, borderWidth: 4, marginTop: -48, backgroundColor: '#303D29' },
    avatarImage: { width: '100%', height: '100%', borderRadius: 48 },
    avatarFallback: { width: '100%', height: '100%', borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
    avatarInitials: { fontFamily: FONTS.heading, fontSize: 30, color: '#fff' },
    avatarCamera: { position: 'absolute', right: -2, bottom: 2, width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.surface },
    profileName: { marginTop: 10, fontFamily: FONTS.heading, fontSize: 24, color: COLORS.textPrimary, textAlign: 'center' },
    badgePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, marginTop: 6 },
    badgeTxt: { fontFamily: FONTS.bodySemiBold, fontSize: 12 },
    profileBio: { marginTop: 10, maxWidth: 320, fontFamily: FONTS.body, fontSize: 14, lineHeight: 20, textAlign: 'center' },

    statGrid: { alignSelf: 'stretch', marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center' },
    statItem: { flex: 1, alignItems: 'center' },
    statDivider: { width: 1, height: 28 },
    statValue: { fontFamily: FONTS.heading, fontSize: 20, lineHeight: 24 },
    statLabel: { fontFamily: FONTS.body, fontSize: 11, marginTop: 1 },

    card: {
        marginHorizontal: SPACING.md,
        marginTop: SPACING.md,
        borderRadius: 20,
        borderWidth: 1,
        padding: SPACING.md,
        ...CARD_SHADOW,
    },
    cardTitle: { fontFamily: FONTS.bodySemiBold, fontSize: 16, color: COLORS.textPrimary },
    fieldLabel: { fontFamily: FONTS.bodyMedium, fontSize: 12, marginTop: 12, marginBottom: 6 },
    editInput: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, fontFamily: FONTS.body, fontSize: 14 },
    bioInput: { minHeight: 88, textAlignVertical: 'top' },
    counter: { alignSelf: 'flex-end', fontFamily: FONTS.body, fontSize: 11, marginTop: 4 },
    styleList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    styleChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border },
    styleChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    styleChipTxt: { fontFamily: FONTS.bodyMedium, fontSize: 12, color: COLORS.textPrimary },
    styleChipTxtActive: { color: '#fff' },
    editActions: { flexDirection: 'row', gap: 10, marginTop: SPACING.md },
    secondaryBtn: { flex: 1, borderRadius: 14, backgroundColor: COLORS.surfaceAlt, paddingVertical: 13, alignItems: 'center' },
    secondaryBtnTxt: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: COLORS.textPrimary },
    primaryBtn: { flex: 1.3, borderRadius: 14, backgroundColor: COLORS.primary, paddingVertical: 13, alignItems: 'center' },
    primaryBtnTxt: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: '#fff' },

    quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginHorizontal: SPACING.md, marginTop: SPACING.md },
    quickTile: { width: '48.5%', flexGrow: 1, flexBasis: '46%', borderRadius: 18, borderWidth: 1, padding: 14, ...CARD_SHADOW },
    quickIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    quickLabel: { fontFamily: FONTS.bodySemiBold, fontSize: 14 },
    quickMeta: { fontFamily: FONTS.body, fontSize: 12, marginTop: 2 },

    statsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
    goalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    goalEmoji: { fontSize: 26 },
    goalPercent: { fontFamily: FONTS.heading, fontSize: 22 },
    progressTrack: { height: 10, borderRadius: 999, marginTop: 14, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 999 },
    goalFacts: { flexDirection: 'row', gap: 10, marginTop: 14 },
    goalFact: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
    goalFactValue: { fontFamily: FONTS.bodyBold, fontSize: 15 },
    goalFactLabel: { fontFamily: FONTS.body, fontSize: 11 },

    section: { marginTop: SPACING.lg },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    sectionHeaderPadded: { paddingHorizontal: SPACING.md, marginBottom: 10 },
    sectionTitle: { fontFamily: FONTS.bodySemiBold, fontSize: 17, color: COLORS.textPrimary },
    sectionSub: { marginTop: 2, fontFamily: FONTS.body, fontSize: 12, color: COLORS.textSecondary },
    inlineBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: COLORS.primaryMuted },
    inlineBtnTxt: { fontFamily: FONTS.bodySemiBold, fontSize: 12, color: COLORS.primary },

    cityRow: { gap: 10, paddingHorizontal: SPACING.md },
    cityCard: { width: 132, height: 160, borderRadius: 18, overflow: 'hidden', backgroundColor: COLORS.surfaceAlt },
    cityImage: { ...StyleSheet.absoluteFill },
    cityText: { position: 'absolute', left: 12, right: 12, bottom: 12 },
    cityName: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: '#fff' },
    cityMeta: { fontFamily: FONTS.body, fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

    medalRow: { flexDirection: 'row', gap: 6 },
    medalItem: { flex: 1, maxWidth: '25%', alignItems: 'center' },
    medalOuter: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
    medalInner: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    medalLabel: { marginTop: 8, fontFamily: FONTS.bodySemiBold, fontSize: 11, textAlign: 'center' },
    nextBadge: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 12, marginTop: 14 },
    nextBadgeIcon: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
    nextBadgeTitle: { fontFamily: FONTS.bodySemiBold, fontSize: 13 },
    nextBadgeText: { fontFamily: FONTS.body, fontSize: 12, marginTop: 2, lineHeight: 17 },

}));

export default ProfileScreen;
