import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../../constants/typography';
import { BORDER_RADIUS, SPACING } from '../../constants/layout';
import { getCategoryByKey } from '../../constants/categories';
import { formatCurrency, formatDuration } from '../../utils/formatters';
import Button from '../common/Button';

const SCREEN_WIDTH = Dimensions.get('window').width;

/**
 * Place detail modal content (used inside a bottom sheet).
 *
 * @param {object}   place           – Full place data
 * @param {boolean}  isFavorite      – Whether in user's favorites
 * @param {function} onFavoritePress – Toggle favorite
 * @param {function} onClose         – Close the modal
 */
const PlaceDetailModal = ({ place, isFavorite, onFavoritePress, onClose }) => {
    if (!place) return null;

    const category = getCategoryByKey(place.category);

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
        >
            {/* Close handle */}
            <View style={styles.handleBar} />

            {/* Image */}
            {place.image_url ? (
                <Image
                    source={{ uri: place.image_url }}
                    style={styles.image}
                    resizeMode="cover"
                />
            ) : (
                <View style={[styles.image, styles.placeholderImage]}>
                    <Ionicons name="image-outline" size={48} color={COLORS.textLight} />
                </View>
            )}

            {/* Title & Category */}
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <Text style={styles.title}>{place.name}</Text>
                    <TouchableOpacity
                        onPress={() => onFavoritePress?.(place)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons
                            name={isFavorite ? 'heart' : 'heart-outline'}
                            size={26}
                            color={isFavorite ? COLORS.error : COLORS.textLight}
                        />
                    </TouchableOpacity>
                </View>

                {/* City name */}
                {place.cities?.name && (
                    <View style={styles.cityRow}>
                        <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
                        <Text style={styles.cityName}>{place.cities.name}</Text>
                    </View>
                )}

                {/* Category badge */}
                {category && (
                    <View style={[styles.categoryBadge, { backgroundColor: category.color + '15' }]}>
                        <Ionicons name={category.icon} size={14} color={category.color} />
                        <Text style={[styles.categoryLabel, { color: category.color }]}>
                            {category.label}
                        </Text>
                    </View>
                )}
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
                <View style={styles.stat}>
                    <Ionicons name="time-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.statValue}>{formatDuration(place.avg_duration)}</Text>
                    <Text style={styles.statLabel}>Süre</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                    <Ionicons name="cash-outline" size={18} color={COLORS.accent} />
                    <Text style={styles.statValue}>
                        {place.entry_fee > 0 ? formatCurrency(place.entry_fee) : 'Ücretsiz'}
                    </Text>
                    <Text style={styles.statLabel}>Giriş Ücreti</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                    <Ionicons name="star-outline" size={18} color={COLORS.warning} />
                    <Text style={styles.statValue}>{place.popularity_score}</Text>
                    <Text style={styles.statLabel}>Popülerlik</Text>
                </View>
            </View>

            {/* Description */}
            {place.description && (
                <View style={styles.descriptionSection}>
                    <Text style={styles.sectionTitle}>Hakkında</Text>
                    <Text style={styles.description}>{place.description}</Text>
                </View>
            )}

            {/* Source */}
            {place.source && (
                <Text style={styles.source}>Kaynak: {place.source}</Text>
            )}

            {/* Favorite button */}
            <Button
                title={isFavorite ? 'Favorilerden Çıkar ❤️' : 'Favorilere Ekle 🤍'}
                onPress={() => onFavoritePress?.(place)}
                variant={isFavorite ? 'outline' : 'primary'}
                style={styles.favoriteButton}
            />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.surface,
    },
    contentContainer: {
        paddingBottom: SPACING.xxl,
    },
    handleBar: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.border,
        alignSelf: 'center',
        marginTop: SPACING.sm,
        marginBottom: SPACING.md,
    },
    image: {
        width: SCREEN_WIDTH,
        height: 220,
        backgroundColor: COLORS.surfaceAlt,
    },
    placeholderImage: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        padding: SPACING.md,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    title: {
        fontSize: FONT_SIZES.xl,
        fontFamily: "Inter_700Bold",
        color: COLORS.textPrimary,
        flex: 1,
        marginRight: SPACING.sm,
    },
    cityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: SPACING.xs,
    },
    cityName: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: BORDER_RADIUS.full,
        marginTop: SPACING.sm,
    },
    categoryLabel: {
        fontSize: FONT_SIZES.xs,
        fontFamily: "Inter_600SemiBold",
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        backgroundColor: COLORS.surfaceAlt,
        borderRadius: BORDER_RADIUS.lg,
    },
    stat: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        fontSize: FONT_SIZES.sm,
        fontFamily: "Inter_700Bold",
        color: COLORS.textPrimary,
        marginTop: 4,
    },
    statLabel: {
        fontSize: 10,
        color: COLORS.textLight,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 36,
        backgroundColor: COLORS.border,
    },
    descriptionSection: {
        padding: SPACING.md,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.lg,
        fontFamily: "Inter_600SemiBold",
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
    },
    description: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        lineHeight: 24,
    },
    source: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textLight,
        marginHorizontal: SPACING.md,
        marginBottom: SPACING.md,
        fontStyle: 'italic',
    },
    favoriteButton: {
        marginHorizontal: SPACING.md,
        marginTop: SPACING.sm,
    },
});

export default PlaceDetailModal;
