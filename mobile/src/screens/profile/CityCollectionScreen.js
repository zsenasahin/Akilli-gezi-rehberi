import React, { useCallback, useState } from 'react';
import {
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { SPACING } from '../../constants/layout';
import { getItinerariesByUser } from '../../services/itineraryService';
import { useAuth } from '../../contexts/AuthContext';
import { getCityImages } from '../../services/cityImageService';
import { useThemePreference } from '../../contexts/ThemeContext';

const CityCollectionScreen = ({ navigation }) => {
    const { user } = useAuth();
    const { theme } = useThemePreference();
    const [cities, setCities] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

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

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
                <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.colors.surfaceSoft }]} onPress={() => navigation.goBack()} activeOpacity={0.82}>
                    <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
                </TouchableOpacity>
                <View>
                    <Text style={[styles.title, { color: theme.colors.text }]}>Sehir koleksiyonum</Text>
                    <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{cities.length} sehir birikti</Text>
                </View>
            </View>
            <FlatList
                data={cities}
                keyExtractor={(item) => item.cityName}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadCities(); }} tintColor={theme.colors.primary} />}
                ListEmptyComponent={<Text style={[styles.empty, { color: theme.colors.textSecondary }]}>Henuz koleksiyonuna eklenen bir sehir yok.</Text>}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: SPACING.md, paddingTop: 10, paddingBottom: 12 },
    backBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
    title: { fontFamily: FONTS.heading, fontSize: 26 },
    subtitle: { marginTop: 3, fontFamily: FONTS.body, fontSize: 13 },
    list: { padding: SPACING.md, paddingBottom: 110, gap: 12 },
    card: { borderRadius: 22, overflow: 'hidden', borderWidth: 1 },
    image: { width: '100%', height: 168 },
    cardContent: { padding: 16 },
    cityName: { fontFamily: FONTS.bodySemiBold, fontSize: 18 },
    meta: { marginTop: 6, fontFamily: FONTS.body, fontSize: 13 },
    empty: { paddingHorizontal: SPACING.md, paddingTop: 30, fontFamily: FONTS.body, fontSize: 14 },
});

export default CityCollectionScreen;
