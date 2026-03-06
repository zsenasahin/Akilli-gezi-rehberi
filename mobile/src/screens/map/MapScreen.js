import React, { useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, Platform, Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONT_SIZES } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/layout';
import { getCityCenter } from '../../constants/cities';
import { generateLeafletHtml } from '../../utils/leafletHtml';

/**
 * MapScreen — Sadece harita görüntüleme modu.
 *
 * Params:
 *   city         – { id, name }
 *   focusLat     – gösterilecek konumun enlemi
 *   focusLng     – gösterilecek konumun boylamı
 *   viewItem     – { name } gösterilecek yer adı
 *   places       – (opsiyonel) haritada işaretlenecek yer listesi
 */
const MapScreen = ({ route, navigation }) => {
    const { city, focusLat, focusLng, viewItem, places } = route.params || {};
    const cityName = city?.name || 'İstanbul';
    const cityCenter = getCityCenter(cityName);
    const webViewRef = useRef(null);

    const sendCommand = useCallback((cmd) => {
        webViewRef.current?.postMessage(JSON.stringify(cmd));
    }, []);

    const handleWebViewMessage = useCallback((event) => {
        try {
            const msg = JSON.parse(event.nativeEvent.data);
            if (msg.type === 'mapReady') {
                if (focusLat && focusLng) {
                    sendCommand({ action: 'flyTo', lat: focusLat, lng: focusLng, zoom: 16 });
                    sendCommand({
                        action: 'setPlaces',
                        places: [{
                            id: 'focus',
                            name: viewItem?.name || 'Seçilen Yer',
                            lat: focusLat,
                            lng: focusLng,
                        }],
                    });
                } else {
                    sendCommand({ action: 'flyTo', lat: cityCenter.lat, lng: cityCenter.lng, zoom: 13 });
                    if (places && places.length > 0) {
                        sendCommand({ action: 'setPlaces', places });
                    }
                }
            }
        } catch { /* ignore */ }
    }, [focusLat, focusLng, viewItem, cityCenter, places, sendCommand]);

    // ─── Google Maps Deep Link ────────────────────────────────────────────────
    const openInGoogleMaps = useCallback(() => {
        let url;

        if (focusLat && focusLng) {
            // Tek yer — o konuma yol tarifi
            const label = encodeURIComponent(viewItem?.name || 'Seçilen Yer');
            url = `https://www.google.com/maps/dir/?api=1&destination=${focusLat},${focusLng}&travelmode=walking`;
        } else if (places && places.length > 1) {
            // Çoklu yer — Google Maps rota (waypoints max 8 destekler)
            const origin = `${places[0].lat},${places[0].lng}`;
            const destination = `${places[places.length - 1].lat},${places[places.length - 1].lng}`;
            const mid = places.slice(1, -1).slice(0, 8);
            const waypoints = mid.map(p => `${p.lat},${p.lng}`).join('|');
            url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ''}&travelmode=walking`;
        } else if (places && places.length === 1) {
            url = `https://www.google.com/maps/dir/?api=1&destination=${places[0].lat},${places[0].lng}&travelmode=walking`;
        } else {
            url = `https://www.google.com/maps/search/?api=1&query=${cityCenter.lat},${cityCenter.lng}`;
        }

        Linking.openURL(url).catch(() => {
            Linking.openURL(`https://maps.google.com/?q=${cityCenter.lat},${cityCenter.lng}`);
        });
    }, [focusLat, focusLng, viewItem, places, cityCenter]);

    const leafletHtml = generateLeafletHtml(cityCenter, 13);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    📍 {viewItem?.name || cityName}
                </Text>
                <TouchableOpacity style={styles.googleMapsBtn} onPress={openInGoogleMaps} activeOpacity={0.85}>
                    <Ionicons name="navigate" size={15} color="#fff" />
                    <Text style={styles.googleMapsBtnText}>Yol Tarifi</Text>
                </TouchableOpacity>
            </View>

            {/* Harita */}
            <WebView
                ref={webViewRef}
                source={{ html: leafletHtml }}
                style={styles.map}
                onMessage={handleWebViewMessage}
                javaScriptEnabled
                domStorageEnabled
                startInLoadingState
                renderLoading={() => (
                    <View style={styles.mapLoading}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.loadingText}>Harita yükleniyor...</Text>
                    </View>
                )}
            />

            {/* Alt bilgi / Google Maps linki */}
            <View style={styles.infoBar}>
                <Ionicons name="location" size={16} color={COLORS.primary} />
                <Text style={styles.infoText} numberOfLines={1}>
                    {viewItem?.name || cityName}
                </Text>
                <TouchableOpacity onPress={openInGoogleMaps} style={styles.infoMapsBtn}>
                    <Ionicons name="logo-google" size={12} color={COLORS.primary} />
                    <Text style={styles.infoMapsBtnText}>Maps'te Aç</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
        flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
        paddingHorizontal: SPACING.md,
        paddingTop: Platform.OS === 'ios' ? 52 : SPACING.md,
        paddingBottom: SPACING.sm,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    backBtn: { padding: 4 },
    headerTitle: {
        flex: 1, fontFamily: 'PlayfairDisplay_700Bold',
        fontSize: FONT_SIZES.lg, color: COLORS.textPrimary,
    },
    googleMapsBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: COLORS.primary,
        paddingHorizontal: 12, paddingVertical: 7,
        borderRadius: BORDER_RADIUS.full,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3, shadowRadius: 4,
        elevation: 3,
    },
    googleMapsBtnText: {
        fontSize: FONT_SIZES.xs, fontFamily: 'Inter_600SemiBold', color: '#fff',
    },
    map: { flex: 1 },
    mapLoading: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center', alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    loadingText: { marginTop: SPACING.sm, fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
    infoBar: {
        flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
        paddingHorizontal: SPACING.md, paddingVertical: 10,
        backgroundColor: COLORS.surface,
        borderTopWidth: 1, borderTopColor: COLORS.border,
    },
    infoText: {
        flex: 1, fontSize: FONT_SIZES.sm,
        fontFamily: 'Inter_500Medium', color: COLORS.textPrimary,
    },
    infoMapsBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: COLORS.primaryMuted,
        paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: BORDER_RADIUS.full,
    },
    infoMapsBtnText: {
        fontSize: FONT_SIZES.xs, fontFamily: 'Inter_600SemiBold', color: COLORS.primary,
    },
});

export default MapScreen;
