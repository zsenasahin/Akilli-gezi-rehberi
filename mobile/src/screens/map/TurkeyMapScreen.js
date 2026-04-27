import React, { useRef, useCallback, useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ActivityIndicator,
    TouchableOpacity, Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/layout';
import { useAuth } from '../../contexts/AuthContext';
import { getCityVisits } from '../../services/cityVisitService';
import { generateTurkeyMapHtml } from '../../utils/turkeyMapHtml';
import { getCities } from '../../services/cityService';

const LOAD_TIMEOUT_MS = 10000;

const TurkeyMapScreen = ({ navigation }) => {
    const { user, isGuest } = useAuth();
    const insets = useSafeAreaInsets();
    const webViewRef = useRef(null);

    const [htmlContent, setHtmlContent] = useState('');
    const [mapLoaded, setMapLoaded] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [cities, setCities] = useState([]);
    const timeoutRef = useRef(null);

    // Şehir listesini bir kez yükle
    useEffect(() => {
        getCities().then(({ data }) => {
            if (data) setCities(data);
        });
    }, []);

    const loadMap = useCallback(async () => {
        setMapLoaded(false);
        setLoadError(false);

        let visitedNames = [];
        let wishlistNames = [];

        if (user && !isGuest) {
            const { data } = await getCityVisits(user.id);
            // city_id → şehir adı eşleştirmesi
            const cityMap = {};
            cities.forEach(c => { cityMap[c.id] = c.name; });
            (data || []).forEach(v => {
                const name = cityMap[v.city_id];
                if (!name) return;
                if (v.status === 'visited') visitedNames.push(name);
                else if (v.status === 'wishlist') wishlistNames.push(name);
            });
        }

        const html = generateTurkeyMapHtml(visitedNames, wishlistNames);
        setHtmlContent(html);

        // 10 saniyelik timeout
        timeoutRef.current = setTimeout(() => {
            if (!mapLoaded) setLoadError(true);
        }, LOAD_TIMEOUT_MS);
    }, [user, isGuest, cities]);

    useFocusEffect(
        useCallback(() => {
            if (cities.length > 0) loadMap();
            return () => {
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
            };
        }, [loadMap, cities])
    );

    const handleMessage = useCallback((event) => {
        try {
            const msg = JSON.parse(event.nativeEvent.data);
            if (msg.type === 'mapReady') {
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                setMapLoaded(true);
            } else if (msg.type === 'markerClick') {
                const { name, lat, lng } = msg.data;
                // cities listesinden tam city objesini bul
                const city = cities.find(c => c.name === name) || { name, lat, lng };
                navigation.navigate('CityDetail', { city });
            }
        } catch { /* ignore */ }
    }, [cities, navigation]);

    const handleRetry = () => {
        setLoadError(false);
        loadMap();
    };

    if (loadError) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Ionicons name="map-outline" size={52} color={COLORS.textLight} />
                <Text style={styles.errorTitle}>Harita yüklenemedi</Text>
                <Text style={styles.errorSub}>İnternet bağlantınızı kontrol edin</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
                    <Text style={styles.retryBtnText}>Yeniden Dene</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + SPACING.xs }]}>
                <Text style={styles.headerTitle}>Türkiye Haritası</Text>
                <View style={styles.legend}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
                        <Text style={styles.legendText}>Gittim</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                        <Text style={styles.legendText}>Listede</Text>
                    </View>
                </View>
            </View>

            {/* Harita */}
            {htmlContent ? (
                <WebView
                    ref={webViewRef}
                    source={{ html: htmlContent }}
                    style={styles.map}
                    onMessage={handleMessage}
                    javaScriptEnabled
                    domStorageEnabled
                    onLoadEnd={() => {
                        // mapReady mesajı gelene kadar bekle
                    }}
                />
            ) : (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Harita hazırlanıyor...</Text>
                </View>
            )}

            {/* Yükleniyor overlay */}
            {htmlContent && !mapLoaded && !loadError && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Harita yükleniyor...</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.sm },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.sm,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerTitle: {
        fontFamily: FONTS.heading,
        fontSize: FONT_SIZES.lg,
        color: COLORS.textPrimary,
    },
    legend: { flexDirection: 'row', gap: SPACING.sm },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
    },

    map: { flex: 1 },

    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    loadingText: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        marginTop: SPACING.xs,
    },

    errorTitle: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.lg,
        color: COLORS.textPrimary,
    },
    errorSub: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    retryBtn: {
        marginTop: SPACING.sm,
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.xl,
        paddingVertical: 12,
        borderRadius: BORDER_RADIUS.lg,
    },
    retryBtnText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.sm,
        color: '#fff',
    },
});

export default TurkeyMapScreen;
