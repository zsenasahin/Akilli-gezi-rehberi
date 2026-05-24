import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import { FONTS } from '../../constants/typography';
import { SPACING } from '../../constants/layout';
import { getItinerariesByUser } from '../../services/itineraryService';
import { useAuth } from '../../contexts/AuthContext';
import { getCityImages } from '../../services/cityImageService';
import { useThemePreference } from '../../contexts/ThemeContext';
import { generateCityCollectionMapHtml } from '../../utils/turkeyMapHtml';

const CityCollectionScreen = ({ navigation }) => {
    const { user } = useAuth();
    const { theme } = useThemePreference();
    const [cities, setCities] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [viewMode, setViewMode] = useState('list');
    const [mapLoaded, setMapLoaded] = useState(false);
    const contentAnim = useRef(new Animated.Value(1)).current;
    const buttonScale = useRef(new Animated.Value(1)).current;

    const mapHtml = useMemo(
        () => generateCityCollectionMapHtml(cities, theme.key),
        [cities, theme.key]
    );

    const loadCities = useCallback(async () => {
        if (!user) return;
        const { data } = await getItinerariesByUser(user.id);
        const cityMap = (data || []).reduce((acc, itinerary) => {
            const cityName = itinerary?.cities?.name;
            if (!cityName) return acc;
            if (!acc[cityName]) {
                acc[cityName] = {
                    cityName,
                    planCount: 0,
                    completedCount: 0,
                    createdAt: itinerary.created_at,
                };
            }
            acc[cityName].planCount += 1;
            if (itinerary.status === 'completed') {
                acc[cityName].completedCount += 1;
            }
            if ((itinerary.created_at || '') > (acc[cityName].createdAt || '')) {
                acc[cityName].createdAt = itinerary.created_at;
            }
            return acc;
        }, {});
        setCities(Object.values(cityMap).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')));
        setRefreshing(false);
    }, [user]);

    useFocusEffect(useCallback(() => {
        loadCities();
    }, [loadCities]));

    const toggleViewMode = useCallback(() => {
        const nextMode = viewMode === 'list' ? 'map' : 'list';

        Animated.sequence([
            Animated.timing(buttonScale, {
                toValue: 0.94,
                duration: 90,
                useNativeDriver: true,
            }),
            Animated.spring(buttonScale, {
                toValue: 1,
                friction: 5,
                tension: 90,
                useNativeDriver: true,
            }),
        ]).start();

        Animated.timing(contentAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
        }).start(() => {
            setViewMode(nextMode);
            if (nextMode === 'map') setMapLoaded(false);
            Animated.spring(contentAnim, {
                toValue: 1,
                friction: 8,
                tension: 70,
                useNativeDriver: true,
            }).start();
        });
    }, [buttonScale, contentAnim, viewMode]);

    const handleMapMessage = useCallback((event) => {
        try {
            const msg = JSON.parse(event.nativeEvent.data);
            if (msg.type === 'mapReady') setMapLoaded(true);
        } catch { /* ignore */ }
    }, []);

    const renderItem = ({ item }) => {
        const image = getCityImages(item.cityName);
        return (
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Image source={{ uri: image.card }} style={styles.image} contentFit="cover" />
                <View style={styles.cardContent}>
                    <Text style={[styles.cityName, { color: theme.colors.text }]}>{item.cityName}</Text>
                    <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>
                        {item.planCount} plan • {item.completedCount} tamamlanan
                    </Text>
                </View>
            </View>
        );
    };

    const animatedContentStyle = {
        opacity: contentAnim,
        transform: [{
            translateY: contentAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [12, 0],
            }),
        }],
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
                <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.colors.surfaceSoft }]} onPress={() => navigation.goBack()} activeOpacity={0.82}>
                    <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
                </TouchableOpacity>
                <View style={styles.headerText}>
                    <Text numberOfLines={1} style={[styles.title, { color: theme.colors.text }]}>Şehir koleksiyonum</Text>
                    <Text numberOfLines={1} style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{cities.length} şehir birikti</Text>
                </View>
                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                    <TouchableOpacity
                        style={[styles.toggleBtn, { backgroundColor: theme.colors.pill, borderColor: theme.colors.border }]}
                        onPress={toggleViewMode}
                        activeOpacity={0.82}
                    >
                        <Ionicons
                            name={viewMode === 'list' ? 'map-outline' : 'list-outline'}
                            size={16}
                            color={theme.colors.primary}
                        />
                        <Text numberOfLines={1} style={[styles.toggleText, { color: theme.colors.primary }]}>
                            {viewMode === 'list' ? 'Haritada gör' : 'Listede gör'}
                        </Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
            {viewMode === 'list' ? (
                <Animated.View style={[styles.content, animatedContentStyle]}>
                    <FlatList
                        data={cities}
                        keyExtractor={(item) => item.cityName}
                        renderItem={renderItem}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadCities(); }} tintColor={theme.colors.primary} />}
                        ListEmptyComponent={<Text style={[styles.empty, { color: theme.colors.textSecondary }]}>Henüz koleksiyonuna eklenen bir şehir yok.</Text>}
                    />
                </Animated.View>
            ) : (
                <Animated.View style={[styles.content, styles.mapContent, animatedContentStyle]}>
                    <View style={styles.mapHeader}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#E76F51' }]} />
                            <Text numberOfLines={1} style={[styles.legendText, { color: theme.colors.textSecondary }]}>Gezilen şehirler</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: theme.key === 'dark' ? '#52625C' : '#B8C4BD' }]} />
                            <Text numberOfLines={1} style={[styles.legendText, { color: theme.colors.textSecondary }]}>Diğer şehirler</Text>
                        </View>
                    </View>
                    <WebView
                        source={{ html: mapHtml }}
                        style={styles.map}
                        onMessage={handleMapMessage}
                        javaScriptEnabled
                        domStorageEnabled
                        scrollEnabled={false}
                    />
                    {!mapLoaded && (
                        <View style={[styles.loadingOverlay, { backgroundColor: theme.colors.background }]}>
                            <ActivityIndicator size="large" color={theme.colors.primary} />
                            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Harita hazırlanıyor...</Text>
                        </View>
                    )}
                </Animated.View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SPACING.md, paddingTop: 10, paddingBottom: 12 },
    backBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
    headerText: { flex: 1 },
    title: { fontFamily: FONTS.heading, fontSize: 26 },
    subtitle: { marginTop: 3, fontFamily: FONTS.body, fontSize: 13 },
    toggleBtn: { height: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
    toggleText: { fontFamily: FONTS.bodySemiBold, fontSize: 12 },
    content: { flex: 1 },
    list: { padding: SPACING.md, paddingBottom: 110, gap: 12 },
    card: { borderRadius: 22, overflow: 'hidden', borderWidth: 1 },
    image: { width: '100%', height: 168 },
    cardContent: { padding: 16 },
    cityName: { fontFamily: FONTS.bodySemiBold, fontSize: 18 },
    meta: { marginTop: 6, fontFamily: FONTS.body, fontSize: 13 },
    empty: { paddingHorizontal: SPACING.md, paddingTop: 30, fontFamily: FONTS.body, fontSize: 14 },
    mapContent: { paddingHorizontal: 0, paddingBottom: 92 },
    mapHeader: { minHeight: 44, paddingHorizontal: SPACING.md, marginTop: 6, marginBottom: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontFamily: FONTS.body, fontSize: 12 },
    map: { flex: 1 },
    loadingOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 10 },
    loadingText: { fontFamily: FONTS.body, fontSize: 13 },
});

export default CityCollectionScreen;
