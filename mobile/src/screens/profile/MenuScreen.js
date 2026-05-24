import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FONTS } from '../../constants/typography';
import { SPACING } from '../../constants/layout';
import { useThemePreference } from '../../contexts/ThemeContext';

const MENU_ITEMS = [
    { key: 'profile', label: 'Profil', meta: 'Bilgilerin ve seyahat istatistiklerin', icon: 'person-outline', route: 'ProfileMain' },
    { key: 'favorites', label: 'Favorilerim', meta: 'Kaydettiğin yerler', icon: 'heart-outline', route: 'Favorites' },
    { key: 'saved', label: 'Planlarım', meta: 'Oluşturduğun rotalar', icon: 'map-outline', route: 'Saved' },
    { key: 'collection', label: 'Şehir koleksiyonum', meta: 'Gittiğin şehirler tek yerde', icon: 'images-outline', route: 'CityCollection' },
    { key: 'badges', label: 'Rozetlerim', meta: 'Kilometre ve şehir rozetleri', icon: 'ribbon-outline', route: 'Badges' },
    { key: 'password', label: 'Şifre güncelle', meta: 'Hesap güvenliğini yönet', icon: 'key-outline', route: 'PasswordReset' },
    { key: 'theme', label: 'Tema değiştir', meta: 'Görünüm tercihlerini seç', icon: 'contrast-outline', route: 'ThemeSettings' },
];

const MenuScreen = ({ navigation }) => {
    const { theme } = useThemePreference();

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.colors.pill }]} onPress={() => navigation.goBack()} activeOpacity={0.82}>
                        <Ionicons name="chevron-back" size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: theme.colors.text }]}>Menü</Text>
                    <View style={styles.headerSpacer} />
                </View>

                <View style={[styles.list, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    {MENU_ITEMS.map((item, index) => (
                        <TouchableOpacity
                            key={item.key}
                            style={[styles.row, index === 0 && styles.firstRow]}
                            onPress={() => navigation.navigate(item.route)}
                            activeOpacity={0.82}
                        >
                            <View style={[styles.iconWrap, { backgroundColor: theme.colors.pill }]}>
                                <Ionicons name={item.icon} size={19} color={theme.colors.primary} />
                            </View>
                            <View style={styles.textWrap}>
                                <Text style={[styles.label, { color: theme.colors.text }]}>{item.label}</Text>
                                <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>{item.meta}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F5F6F1' },
    container: { flex: 1, backgroundColor: '#F5F6F1' },
    content: { paddingHorizontal: SPACING.md, paddingTop: 6, paddingBottom: 120 },
    header: { paddingVertical: 12, paddingHorizontal: 4, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    headerSpacer: { width: 40, height: 40 },
    title: { fontFamily: FONTS.heading, fontSize: 28 },
    list: {
        borderRadius: 24,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#E5EBE7',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: '#EEF2EF',
    },
    firstRow: { borderTopWidth: 0 },
    iconWrap: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EAF2EC',
        marginRight: 14,
    },
    textWrap: { flex: 1, paddingRight: 10 },
    label: { fontFamily: FONTS.bodySemiBold, fontSize: 15 },
    meta: { marginTop: 3, fontFamily: FONTS.body, fontSize: 12 },
});

export default MenuScreen;
