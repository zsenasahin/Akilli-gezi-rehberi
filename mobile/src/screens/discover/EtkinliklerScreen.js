/**
 * EtkinliklerScreen — Türkiye geneli kültürel etkinlikler
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, Linking, Animated, Platform,
    TextInput, Modal, ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/layout';
import { getEtkinlikler } from '../../services/etkinlikService';

const SCREEN_W = require('react-native').Dimensions.get('window').width;
const BASE_URL = 'https://www.kulturportali.gov.tr';

const TUR_COLORS = {
    'Sergi': { bg: '#EDE9FE', text: '#7C3AED' },
    'Konser': { bg: '#FEF3C7', text: '#D97706' },
    'Tiyatro': { bg: '#FCE7F3', text: '#DB2777' },
    'Festival': { bg: '#D1FAE5', text: '#059669' },
    'Yarışma': { bg: '#DBEAFE', text: '#2563EB' },
    'Sempozyum': { bg: '#F3F4F6', text: '#374151' },
    'Konferans': { bg: '#F3F4F6', text: '#374151' },
};

function getTurStyle(tur) {
    return TUR_COLORS[tur] || { bg: COLORS.primaryMuted, text: COLORS.primary };
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&h=400&fit=crop&q=80';

export default function EtkinliklerScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const filterIl = route?.params?.il || null;

    const [etkinlikler, setEtkinlikler] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [sayfa, setSayfa] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(null);

    const loadEtkinlikler = useCallback(async (page = 1, append = false) => {
        if (page === 1) setLoading(true);
        else setLoadingMore(true);

        const { data, error: err } = await getEtkinlikler({ sayi: 12, sira: String(page) });

        if (err) setError(err);
        else {
            setEtkinlikler(prev => append ? [...prev, ...data] : data);
            setHasMore(data.length === 12);
        }

        setLoading(false);
        setLoadingMore(false);
    }, []);

    useEffect(() => { loadEtkinlikler(1); }, []);

    const loadMore = () => {
        if (loadingMore || !hasMore) return;
        const next = sayfa + 1;
        setSayfa(next);
        loadEtkinlikler(next, true);
    };

    const filtered = search.trim()
        ? etkinlikler.filter(e =>
            e.baslik.toLowerCase().includes(search.toLowerCase()) ||
            e.il?.toLowerCase().includes(search.toLowerCase()) ||
            e.tur?.toLowerCase().includes(search.toLowerCase())
        )
        : etkinlikler;

    const renderItem = ({ item, index }) => {
        const turStyle = getTurStyle(item.tur);
        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.88}
                onPress={() => setSelected(item)}
            >
                {/* Fotoğraf */}
                <View style={styles.cardImageWrap}>
                    <Image
                        source={{ uri: item.imageUrl || FALLBACK_IMAGE }}
                        style={styles.cardImage}
                        contentFit="cover"
                        transition={300}
                    />
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.5)']}
                        style={StyleSheet.absoluteFillObject}
                    />
                    {/* Tarih badge */}
                    <View style={styles.dateBadge}>
                        <Text style={styles.dateBadgeDay}>{item.gun}</Text>
                        <Text style={styles.dateBadgeMonth}>{item.ay}</Text>
                    </View>
                    {/* Tür badge */}
                    <View style={[styles.turBadge, { backgroundColor: turStyle.bg }]}>
                        <Text style={[styles.turBadgeText, { color: turStyle.text }]}>{item.tur}</Text>
                    </View>
                </View>

                {/* İçerik */}
                <View style={styles.cardBody}>
                    <Text style={styles.cardTitle} numberOfLines={2}>{item.baslik}</Text>
                    <View style={styles.cardMeta}>
                        <Ionicons name="location-outline" size={13} color={COLORS.textSecondary} />
                        <Text style={styles.cardMetaText} numberOfLines={1}>{item.il}</Text>
                    </View>
                    {item.aciklama ? (
                        <Text style={styles.cardDesc} numberOfLines={2}>{item.aciklama}</Text>
                    ) : null}
                    <View style={styles.cardFooter}>
                        <Ionicons name="calendar-outline" size={12} color={COLORS.textSecondary} />
                        <Text style={styles.cardDate} numberOfLines={1}>{item.baslangic}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Etkinlikler</Text>
                    <Text style={styles.headerSub}>Kültür Portalı</Text>
                </View>
                <View style={{ width: 36 }} />
            </View>

            {/* Arama */}
            <View style={styles.searchBar}>
                <Ionicons name="search" size={16} color={COLORS.textSecondary} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Etkinlik, şehir veya tür ara..."
                    placeholderTextColor={COLORS.textSecondary}
                    value={search}
                    onChangeText={setSearch}
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch('')}>
                        <Ionicons name="close-circle" size={16} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Etkinlikler yükleniyor...</Text>
                </View>
            ) : error ? (
                <View style={styles.center}>
                    <Ionicons name="wifi-outline" size={48} color={COLORS.textSecondary} />
                    <Text style={styles.errorText}>Bağlantı hatası</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={() => loadEtkinlikler(1)}>
                        <Text style={styles.retryText}>Tekrar Dene</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(_, i) => String(i)}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.3}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text style={styles.emptyEmoji}>🎭</Text>
                            <Text style={styles.emptyText}>Etkinlik bulunamadı</Text>
                        </View>
                    }
                    ListFooterComponent={
                        loadingMore ? (
                            <View style={styles.footerLoader}>
                                <ActivityIndicator size="small" color={COLORS.primary} />
                            </View>
                        ) : null
                    }
                />
            )}

            {/* Detay Modal */}
            <Modal
                visible={!!selected}
                animationType="slide"
                transparent
                onRequestClose={() => setSelected(null)}
            >
                {selected && (
                    <View style={styles.modalOverlay}>
                        <TouchableOpacity style={styles.modalBackdrop} onPress={() => setSelected(null)} />
                        <View style={styles.modalSheet}>
                            {/* Hero */}
                            <View style={styles.modalHero}>
                                <Image
                                    source={{ uri: selected.imageUrl || FALLBACK_IMAGE }}
                                    style={styles.modalHeroImage}
                                    contentFit="cover"
                                    transition={300}
                                />
                                <LinearGradient
                                    colors={['transparent', 'rgba(0,0,0,0.65)']}
                                    style={StyleSheet.absoluteFillObject}
                                />
                                <TouchableOpacity style={styles.modalClose} onPress={() => setSelected(null)}>
                                    <Ionicons name="close" size={20} color="#fff" />
                                </TouchableOpacity>
                                <View style={styles.modalHeroBadge}>
                                    <View style={[styles.turBadge, { backgroundColor: getTurStyle(selected.tur).bg }]}>
                                        <Text style={[styles.turBadgeText, { color: getTurStyle(selected.tur).text }]}>{selected.tur}</Text>
                                    </View>
                                </View>
                            </View>

                            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                                <Text style={styles.modalTitle}>{selected.baslik}</Text>

                                {/* Tarih */}
                                <View style={styles.modalInfoRow}>
                                    <View style={styles.modalInfoIcon}>
                                        <Ionicons name="calendar" size={16} color={COLORS.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.modalInfoLabel}>Tarih</Text>
                                        <Text style={styles.modalInfoValue}>{selected.baslangic}</Text>
                                        {selected.bitis && selected.bitis !== selected.baslangic && (
                                            <Text style={styles.modalInfoSub}>→ {selected.bitis}</Text>
                                        )}
                                    </View>
                                </View>

                                {/* Şehir */}
                                {selected.il ? (
                                    <View style={styles.modalInfoRow}>
                                        <View style={styles.modalInfoIcon}>
                                            <Ionicons name="location" size={16} color={COLORS.accent} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.modalInfoLabel}>Şehir</Text>
                                            <Text style={styles.modalInfoValue}>{selected.il}</Text>
                                        </View>
                                    </View>
                                ) : null}

                                {/* Adres */}
                                {selected.adres ? (
                                    <View style={styles.modalInfoRow}>
                                        <View style={styles.modalInfoIcon}>
                                            <Ionicons name="map-outline" size={16} color={COLORS.textSecondary} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.modalInfoLabel}>Adres</Text>
                                            <Text style={styles.modalInfoValue}>{selected.adres}</Text>
                                        </View>
                                    </View>
                                ) : null}

                                {/* Açıklama */}
                                {selected.aciklama ? (
                                    <View style={styles.modalDesc}>
                                        <Text style={styles.modalDescText}>{selected.aciklama}</Text>
                                    </View>
                                ) : null}

                                {/* Butonlar */}
                                <View style={styles.modalActions}>
                                    {selected.url ? (
                                        <TouchableOpacity
                                            style={styles.modalActionBtn}
                                            onPress={() => Linking.openURL(selected.url)}
                                        >
                                            <Ionicons name="open-outline" size={18} color="#fff" />
                                            <Text style={styles.modalActionText}>Detayları Gör</Text>
                                        </TouchableOpacity>
                                    ) : null}
                                    {selected.lokasyon ? (
                                        <TouchableOpacity
                                            style={[styles.modalActionBtn, styles.modalActionBtnSecondary]}
                                            onPress={() => Linking.openURL(selected.lokasyon)}
                                        >
                                            <Ionicons name="navigate-outline" size={18} color={COLORS.primary} />
                                            <Text style={[styles.modalActionText, { color: COLORS.primary }]}>Haritada Gör</Text>
                                        </TouchableOpacity>
                                    ) : null}
                                </View>

                                <View style={{ height: 32 }} />
                            </ScrollView>
                        </View>
                    </View>
                )}
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },

    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: SPACING.md, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    backBtn: { width: 36, height: 36, justifyContent: 'center' },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.lg, color: COLORS.textPrimary },
    headerSub: { fontFamily: FONTS.body, fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 1 },

    searchBar: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        marginHorizontal: SPACING.md, marginVertical: SPACING.sm,
        backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
        paddingHorizontal: SPACING.md, paddingVertical: 10,
        borderWidth: 1, borderColor: COLORS.border,
    },
    searchInput: {
        flex: 1, fontFamily: FONTS.body, fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary, padding: 0,
    },

    list: { paddingHorizontal: SPACING.md, paddingBottom: 40 },

    card: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        marginBottom: SPACING.md,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    cardImageWrap: { height: 180, position: 'relative' },
    cardImage: { ...StyleSheet.absoluteFillObject },
    dateBadge: {
        position: 'absolute', top: SPACING.sm, left: SPACING.sm,
        backgroundColor: '#fff', borderRadius: BORDER_RADIUS.md,
        paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
    },
    dateBadgeDay: { fontFamily: FONTS.bodySemiBold, fontSize: 18, color: COLORS.primary, lineHeight: 22 },
    dateBadgeMonth: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.textSecondary, textTransform: 'uppercase' },
    turBadge: {
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: BORDER_RADIUS.full,
    },
    turBadgeText: { fontFamily: FONTS.bodySemiBold, fontSize: 11 },
    cardBody: { padding: SPACING.md },
    cardTitle: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.md, color: COLORS.textPrimary, marginBottom: 6, letterSpacing: -0.2 },
    cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
    cardMetaText: { fontFamily: FONTS.body, fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, flex: 1 },
    cardDesc: { fontFamily: FONTS.body, fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 8 },
    cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    cardDate: { fontFamily: FONTS.body, fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },

    turBadge: {
        position: 'absolute', bottom: SPACING.sm, right: SPACING.sm,
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: BORDER_RADIUS.full,
    },

    center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
    loadingText: { fontFamily: FONTS.body, fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 12 },
    errorText: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.md, color: COLORS.textPrimary, marginTop: 12 },
    retryBtn: { marginTop: 16, backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: BORDER_RADIUS.full },
    retryText: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.sm, color: '#fff' },
    emptyEmoji: { fontSize: 48, marginBottom: 12 },
    emptyText: { fontFamily: FONTS.body, fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
    footerLoader: { paddingVertical: 20, alignItems: 'center' },

    // Modal
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    modalSheet: {
        backgroundColor: COLORS.background,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        maxHeight: '90%', overflow: 'hidden',
    },
    modalHero: { height: 220, position: 'relative' },
    modalHeroImage: { ...StyleSheet.absoluteFillObject },
    modalClose: {
        position: 'absolute', top: 16, right: 16,
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center', alignItems: 'center',
    },
    modalHeroBadge: { position: 'absolute', bottom: 12, right: 12 },
    modalBody: { padding: SPACING.lg },
    modalTitle: {
        fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.xl,
        color: COLORS.textPrimary, marginBottom: SPACING.md, letterSpacing: -0.5,
    },
    modalInfoRow: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 12,
        marginBottom: SPACING.sm,
        paddingBottom: SPACING.sm,
        borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    modalInfoIcon: {
        width: 32, height: 32, borderRadius: 10,
        backgroundColor: COLORS.surface,
        justifyContent: 'center', alignItems: 'center',
    },
    modalInfoLabel: { fontFamily: FONTS.body, fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginBottom: 2 },
    modalInfoValue: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.sm, color: COLORS.textPrimary },
    modalInfoSub: { fontFamily: FONTS.body, fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
    modalDesc: {
        backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md, marginTop: SPACING.sm,
    },
    modalDescText: { fontFamily: FONTS.body, fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, lineHeight: 22 },
    modalActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg },
    modalActionBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, backgroundColor: COLORS.primary,
        paddingVertical: 12, borderRadius: BORDER_RADIUS.lg,
    },
    modalActionBtnSecondary: {
        backgroundColor: COLORS.primaryMuted,
    },
    modalActionText: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.sm, color: '#fff' },
});
