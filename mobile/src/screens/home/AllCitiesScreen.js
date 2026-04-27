import React, { useState, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Platform,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SmartImage from '../../components/common/SmartImage';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/layout';
import { getCityImages } from '../../services/cityImageService';
import { useRequireAuth } from '../../contexts/AuthContext';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CITY_CARD_WIDTH = (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.sm) / 2;

const REGION_COLORS = {
    'Tümü': COLORS.primary,
    'Marmara': '#6366F1',
    'Ege': '#0891B2',
    'Akdeniz': '#F59E0B',
    'İç Anadolu': '#84CC16',
    'Karadeniz': '#10B981',
    'Doğu Anadolu': '#8B5CF6',
    'Güneydoğu Anadolu': '#EF4444',
};

export default function AllCitiesScreen({ navigation, route }) {
    const { cities = [] } = route.params || {};
    const insets = useSafeAreaInsets();
    const requireAuth = useRequireAuth(navigation);

    const [searchQuery, setSearchQuery] = useState('');
    const [activeRegion, setActiveRegion] = useState('Tümü');

    const regions = useMemo(() => {
        const unique = [...new Set(cities.map(c => c.region))];
        return ['Tümü', ...unique];
    }, [cities]);

    const filteredCities = useMemo(() => {
        let result = cities;
        if (activeRegion !== 'Tümü') {
            result = result.filter(c => c.region === activeRegion);
        }
        if (searchQuery.trim().length > 0) {
            const q = searchQuery.trim().toLowerCase();
            result = result.filter(c =>
                c.name.toLowerCase().includes(q) ||
                c.region.toLowerCase().includes(q)
            );
        }
        return result;
    }, [cities, activeRegion, searchQuery]);

    return (
        <View style={[styles.root, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => navigation.goBack()}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Tüm Şehirler</Text>
                <View style={styles.headerCount}>
                    <Text style={styles.headerCountText}>{filteredCities.length}</Text>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
            >
                {/* Arama */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Şehir veya bölge ara..."
                        placeholderTextColor={COLORS.textLight}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        returnKeyType="search"
                        clearButtonMode="while-editing"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Bölge filtreleri */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.regionFilters}
                >
                    {regions.map((region) => {
                        const isActive = activeRegion === region;
                        const dotColor = REGION_COLORS[region] || COLORS.primary;
                        return (
                            <TouchableOpacity
                                key={region}
                                style={[
                                    styles.regionChip,
                                    isActive && styles.regionChipActive,
                                    isActive && { borderColor: dotColor + '60', backgroundColor: dotColor + '12' },
                                ]}
                                onPress={() => setActiveRegion(region)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.regionDot, { backgroundColor: dotColor }]} />
                                <Text style={[
                                    styles.regionText,
                                    isActive && styles.regionTextActive,
                                    isActive && { color: dotColor },
                                ]}>
                                    {region}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Grid */}
                {filteredCities.length === 0 ? (
                    <View style={styles.empty}>
                        <Ionicons name="search-outline" size={40} color={COLORS.textLight} />
                        <Text style={styles.emptyTitle}>Sonuç bulunamadı</Text>
                        <Text style={styles.emptyText}>Farklı bir arama terimi veya bölge deneyin</Text>
                    </View>
                ) : (
                    <View style={styles.cityGrid}>
                        {filteredCities.map((city) => {
                            const images = getCityImages(city.name, city.region);
                            return (
                                <CityCard
                                    key={city.id}
                                    city={city}
                                    images={images}
                                    onPress={() => navigation.navigate('CityDetail', { city })}
                                    onPlanPress={() => {
                                        if (!requireAuth('Gezi planı oluşturmak için giriş yapmalısınız.')) return;
                                        navigation.navigate('CreateItinerary', { preselectedCity: city });
                                    }}
                                />
                            );
                        })}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const CityCard = React.memo(({ city, images, onPress, onPlanPress }) => (
    <View style={styles.cityCard}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onPress} activeOpacity={0.9}>
            <SmartImage
                uri={images.card}
                fallbackUri="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&h=300&fit=crop&q=80"
                style={styles.cityCardImage}
                contentFit="cover"
                transition={500}
            />
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.85)']}
                style={StyleSheet.absoluteFill}
            />
            <View style={styles.cityCardContent}>
                <Text style={styles.cityCardName}>{city.name}</Text>
                <Text style={styles.cityCardRegion}>{city.region}</Text>
            </View>
            <TouchableOpacity
                style={styles.cityPlanBtn}
                onPress={onPlanPress}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Ionicons name="add" size={14} color="#fff" />
            </TouchableOpacity>
        </TouchableOpacity>
    </View>
));

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        backgroundColor: COLORS.background,
        gap: SPACING.sm,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        flex: 1,
        fontFamily: FONTS.heading,
        fontSize: FONT_SIZES.xl,
        color: COLORS.textPrimary,
        letterSpacing: -0.5,
    },
    headerCount: {
        backgroundColor: COLORS.primaryMuted,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.full,
    },
    headerCountText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.xs,
        color: COLORS.primary,
    },
    content: {
        padding: SPACING.md,
        paddingBottom: SPACING.xxl,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        paddingHorizontal: SPACING.md,
        paddingVertical: Platform.OS === 'ios' ? 12 : 6,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: SPACING.sm,
    },
    searchInput: {
        flex: 1,
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        paddingVertical: 0,
    },
    regionFilters: {
        gap: 8,
        paddingBottom: SPACING.md,
    },
    regionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    regionChipActive: {
        backgroundColor: COLORS.primary + '12',
        borderColor: COLORS.primary + '40',
    },
    regionDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    regionText: {
        fontFamily: FONTS.bodyMedium,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
    },
    regionTextActive: {
        color: COLORS.primary,
        fontFamily: FONTS.bodySemiBold,
    },
    cityGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
        justifyContent: 'space-between',
    },
    cityCard: {
        width: CITY_CARD_WIDTH,
        height: 160,
        borderRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 4,
    },
    cityCardImage: {
        ...StyleSheet.absoluteFillObject,
    },
    cityCardContent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: SPACING.sm + 2,
    },
    cityCardName: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.md,
        color: '#fff',
        letterSpacing: -0.3,
    },
    cityCardRegion: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: 'rgba(255,255,255,0.78)',
        marginTop: 1,
    },
    cityPlanBtn: {
        position: 'absolute',
        top: SPACING.xs + 2,
        right: SPACING.xs + 2,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(8,145,178,0.88)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    empty: {
        alignItems: 'center',
        paddingVertical: SPACING.xxl,
        gap: SPACING.sm,
    },
    emptyTitle: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
    },
    emptyText: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
});
