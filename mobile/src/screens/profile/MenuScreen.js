import React, { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    Alert,
    Linking,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import SmartImage from '../../components/common/SmartImage';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { SPACING } from '../../constants/layout';
import { useAuth } from '../../contexts/AuthContext';
import { THEME_OPTIONS, useThemePreference } from '../../contexts/ThemeContext';
import { getProfile } from '../../services/profileService';
import { signOut } from '../../services/authService';
import { createThemedStyles } from '../../utils/themedStyles';

// "Profil" satırı kaldırıldı: menü zaten profil ekranından açılıyor ve satır
// kullanıcıyı geldiği ekrana geri götürüyordu.
const SECTIONS = [
    {
        title: 'Gezilerim',
        items: [
            { key: 'saved', label: 'Planlarım', meta: 'Oluşturduğun rotalar', icon: 'map-outline', route: 'Saved', tint: '#4F6342' },
            { key: 'favorites', label: 'Favorilerim', meta: 'Kaydettiğin yerler', icon: 'heart-outline', route: 'Favorites', tint: '#B5523B' },
            { key: 'collection', label: 'Şehir koleksiyonum', meta: 'Gittiğin şehirler tek yerde', icon: 'images-outline', route: 'CityCollection', tint: '#5A7D8C' },
            { key: 'badges', label: 'Rozetlerim', meta: 'Kilometre ve şehir rozetleri', icon: 'ribbon-outline', route: 'Badges', tint: '#B8893A' },
        ],
    },
    {
        title: 'Uygulama',
        items: [
            { key: 'theme', label: 'Görünüm', icon: 'contrast-outline', route: 'ThemeSettings', tint: '#6E5A47' },
            { key: 'password', label: 'Şifre güncelle', meta: 'Hesap güvenliğini yönet', icon: 'key-outline', route: 'PasswordReset', tint: '#5E655F' },
        ],
    },
    {
        title: 'Hakkında',
        items: [
            { key: 'sources', label: 'Veri kaynakları', meta: 'Kültür Portalı, Wikipedia, OpenStreetMap', icon: 'library-outline', action: 'sources', tint: '#5A7D8C' },
            { key: 'kp', label: 'Kültür Portalı', meta: 'kulturportali.gov.tr', icon: 'open-outline', url: 'https://www.kulturportali.gov.tr', tint: '#8B6B4E' },
        ],
    },
];

const MenuScreen = ({ navigation }) => {
    const { theme, preference } = useThemePreference();
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [avatarUri, setAvatarUri] = useState(null);

    useFocusEffect(useCallback(() => {
        if (!user?.id) return;
        AsyncStorage.getItem(`avatar_url_${user.id}`).then((cached) => cached && setAvatarUri(cached)).catch(() => {});
        getProfile(user.id).then(({ data }) => {
            setProfile(data || null);
            if (data?.avatar_url) setAvatarUri(data.avatar_url);
        });
    }, [user?.id]));

    const themeLabel = THEME_OPTIONS.find((option) => option.key === preference)?.label || 'Sistem';
    const name = profile?.full_name || 'İsimsiz Gezgin';
    const version = Constants.expoConfig?.version || '1.0.0';

    const handlePress = (item) => {
        if (item.route) { navigation.navigate(item.route); return; }
        if (item.url) { Linking.openURL(item.url); return; }
        if (item.action === 'sources') {
            Alert.alert(
                'Veri kaynakları',
                'Gezilecek yerler, etkinlikler ve turizm aktiviteleri T.C. Kültür ve Turizm Bakanlığı Kültür Portalı\'ndan; eksik tanıtım metinleri ve görseller Wikipedia\'dan; restoran ve harita verileri OpenStreetMap\'ten alınır.',
            );
        }
    };

    const handleLogout = () => {
        Alert.alert('Çıkış Yap', 'Oturumu kapatmak istediğine emin misin?', [
            { text: 'İptal', style: 'cancel' },
            { text: 'Çıkış Yap', style: 'destructive', onPress: async () => { await signOut(); } },
        ]);
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.colors.pill }]} onPress={() => navigation.goBack()} activeOpacity={0.82} accessibilityLabel="Geri">
                        <Ionicons name="chevron-back" size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: theme.colors.text }]}>Ayarlar</Text>
                    <View style={styles.headerSpacer} />
                </View>

                {/* Profil kartı */}
                <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.goBack()}>
                    <LinearGradient colors={COLORS.gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.profileCard}>
                        {avatarUri ? (
                            <SmartImage uri={avatarUri} style={styles.avatar} contentFit="cover" />
                        ) : (
                            <View style={[styles.avatar, styles.avatarFallback]}>
                                <Ionicons name="person" size={24} color="#fff" />
                            </View>
                        )}
                        <View style={styles.profileText}>
                            <Text style={styles.profileName} numberOfLines={1}>{name}</Text>
                            <Text style={styles.profileEmail} numberOfLines={1}>{user?.email || ''}</Text>
                        </View>
                        <View style={styles.profileChevron}>
                            <Ionicons name="chevron-forward" size={18} color="#fff" />
                        </View>
                    </LinearGradient>
                </TouchableOpacity>

                {SECTIONS.map((section) => (
                    <View key={section.title} style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>{section.title.toLocaleUpperCase('tr-TR')}</Text>
                        <View style={[styles.list, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                            {section.items.map((item, index) => (
                                <TouchableOpacity
                                    key={item.key}
                                    style={[styles.row, index > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.border }]}
                                    onPress={() => handlePress(item)}
                                    activeOpacity={0.82}
                                >
                                    <View style={[styles.iconWrap, { backgroundColor: `${item.tint}1F` }]}>
                                        <Ionicons name={item.icon} size={18} color={item.tint} />
                                    </View>
                                    <View style={styles.textWrap}>
                                        <Text style={[styles.label, { color: theme.colors.text }]}>{item.label}</Text>
                                        <Text style={[styles.meta, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                                            {item.key === 'theme' ? `${themeLabel} tema` : item.meta}
                                        </Text>
                                    </View>
                                    <Ionicons name={item.url ? 'open-outline' : 'chevron-forward'} size={17} color={theme.colors.textLight} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ))}

                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
                    <Ionicons name="log-out-outline" size={18} color={COLORS.error} />
                    <Text style={styles.logoutTxt}>Çıkış yap</Text>
                </TouchableOpacity>

                <Text style={[styles.footer, { color: theme.colors.textLight }]}>Akıllı Gezi Rehberi · sürüm {version}</Text>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = createThemedStyles(() => ({
    safeArea: { flex: 1, backgroundColor: COLORS.background },
    container: { flex: 1 },
    content: { paddingHorizontal: SPACING.md, paddingTop: 6, paddingBottom: 120 },
    header: { paddingVertical: 12, marginBottom: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    headerSpacer: { width: 40, height: 40 },
    title: { fontFamily: FONTS.heading, fontSize: 22 },

    profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 22, padding: 16 },
    avatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' },
    avatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
    profileText: { flex: 1 },
    profileName: { fontFamily: FONTS.bodyBold, fontSize: 17, color: '#fff' },
    profileEmail: { fontFamily: FONTS.body, fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    profileChevron: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },

    section: { marginTop: SPACING.lg },
    sectionTitle: { fontFamily: FONTS.bodySemiBold, fontSize: 11, letterSpacing: 1.1, marginBottom: 8, marginLeft: 6 },
    list: { borderRadius: 20, paddingHorizontal: 14, borderWidth: 1 },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
    iconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    textWrap: { flex: 1, paddingRight: 10 },
    label: { fontFamily: FONTS.bodySemiBold, fontSize: 15 },
    meta: { marginTop: 2, fontFamily: FONTS.body, fontSize: 12 },

    logoutBtn: { marginTop: SPACING.lg, borderRadius: 16, backgroundColor: 'rgba(181,82,59,0.08)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
    logoutTxt: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: COLORS.error },
    footer: { textAlign: 'center', fontFamily: FONTS.body, fontSize: 12, marginTop: SPACING.md },
}));

export default MenuScreen;
