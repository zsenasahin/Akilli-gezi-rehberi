import React, { useRef, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, Platform,
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
 * Gezi planlama ve rota oluşturma → CreateItineraryScreen'de yapılır.
 * Bu ekran yalnızca CityDetail veya PlaceCard'dan "Haritada Göster" ile açılır.
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
                // Belirli bir yere odaklan
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
                    // Şehir merkezi
                    sendCommand({ action: 'flyTo', lat: cityCenter.lat, lng: cityCenter.lng, zoom: 13 });
                    if (places && places.length > 0) {
                        sendCommand({ action: 'setPlaces', places });
                    }
                }
            }
        } catch { /* ignore */ }
    }, [focusLat, focusLng, viewItem, cityCenter, places, sendCommand]);

    const leafletHtml = generateLeafletHtml(cityCenter, 13);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    📍 {viewItem?.name || cityName}
                </Text>
                <TouchableOpacity
                    style={styles.planBtn}
                    onPress={() => navigation.navigate('CreateItinerary', { preselectedCity: city })}
                >
                    <Ionicons name="map-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.planBtnText}>Plan Yap</Text>
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

            {/* Alt bilgi çubuğu */}
            {viewItem?.name && (
                <View style={styles.infoBar}>
                    <Ionicons name="location" size={16} color={COLORS.primary} />
                    <Text style={styles.infoText} numberOfLines={1}>{viewItem.name}</Text>
                    {focusLat && focusLng && (
                        <Text style={styles.infoCoord}>
                            {focusLat.toFixed(4)}, {focusLng.toFixed(4)}
                        </Text>
                    )}
                </View>
            )}
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
        borderBottomWidth: 1, borderBottomColor: COLORS.divider,
    },
    backBtn: { padding: 4 },
    headerTitle: {
        flex: 1, fontFamily: 'PlayfairDisplay_700Bold',
        fontSize: FONT_SIZES.lg, color: COLORS.textPrimary,
    },
    planBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: COLORS.primaryMuted,
        paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: BORDER_RADIUS.full,
    },
    planBtnText: { fontSize: FONT_SIZES.sm, fontFamily: 'Inter_600SemiBold', color: COLORS.primary },
    map: { flex: 1 },
    mapLoading: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center', alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    loadingText: { marginTop: SPACING.sm, fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
    infoBar: {
        flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
        paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
        backgroundColor: COLORS.surface,
        borderTopWidth: 1, borderTopColor: COLORS.divider,
    },
    infoText: { flex: 1, fontSize: FONT_SIZES.sm, fontFamily: 'Inter_500Medium', color: COLORS.textPrimary },
    infoCoord: { fontSize: FONT_SIZES.xs, color: COLORS.textLight },
});

export default MapScreen;
