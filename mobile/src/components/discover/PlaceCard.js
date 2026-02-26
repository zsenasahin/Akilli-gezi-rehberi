import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../../constants/typography';
import { BORDER_RADIUS, SPACING } from '../../constants/layout';
import { getCategoryByKey } from '../../constants/categories';

const CARD_WIDTH = (Dimensions.get('window').width - SPACING.md * 3) / 2;

/**
 * Place card for the Discover screen.
 * Shows image, title, short description, category badge.
 *
 * @param {object}   place      – Place data from Supabase
 * @param {function} onPress    – Called when card is tapped
 * @param {boolean}  isFavorite – Whether this place is in user's favorites
 * @param {function} onFavoritePress – Called when heart icon is tapped
 */
const PlaceCard = ({ place, onPress, isFavorite = false, onFavoritePress }) => {
    const category = getCategoryByKey(place.category);

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={() => onPress(place)}
            activeOpacity={0.85}
        >
            {/* Image */}
            <View style={styles.imageContainer}>
                {place.image_url ? (
                    <Image
                        source={{ uri: place.image_url }}
                        style={styles.image}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={[styles.image, styles.placeholderImage]}>
                        <Ionicons name="image-outline" size={32} color={COLORS.textLight} />
                    </View>
                )}

                {/* Favorite heart */}
                {onFavoritePress && (
                    <TouchableOpacity
                        style={styles.heartButton}
                        onPress={() => onFavoritePress(place)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons
                            name={isFavorite ? 'heart' : 'heart-outline'}
                            size={20}
                            color={isFavorite ? COLORS.error : '#fff'}
                        />
                    </TouchableOpacity>
                )}

                {/* Category badge */}
                {category && (
                    <View style={[styles.categoryBadge, { backgroundColor: category.color + '20' }]}>
                        <Ionicons name={category.icon} size={10} color={category.color} />
                        <Text style={[styles.categoryText, { color: category.color }]}>
                            {category.label}
                        </Text>
                    </View>
                )}
            </View>

            {/* Content */}
            <View style={styles.content}>
                <Text style={styles.title} numberOfLines={2}>
                    {place.name}
                </Text>
                {place.short_description && (
                    <Text style={styles.description} numberOfLines={2}>
                        {place.short_description}
                    </Text>
                )}
                <View style={styles.meta}>
                    {place.entry_fee > 0 ? (
                        <Text style={styles.fee}>₺{place.entry_fee}</Text>
                    ) : (
                        <Text style={[styles.fee, { color: COLORS.success }]}>Ücretsiz</Text>
                    )}
                    <Text style={styles.dot}>·</Text>
                    <Text style={styles.duration}>{place.avg_duration}s</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        width: CARD_WIDTH,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        marginBottom: SPACING.md,
        overflow: 'hidden',

        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    imageContainer: {
        position: 'relative',
    },
    image: {
        width: '100%',
        height: CARD_WIDTH * 0.75,
        backgroundColor: COLORS.surfaceAlt,
    },
    placeholderImage: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    heartButton: {
        position: 'absolute',
        top: SPACING.sm,
        right: SPACING.sm,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryBadge: {
        position: 'absolute',
        bottom: SPACING.sm,
        left: SPACING.sm,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: BORDER_RADIUS.sm,
        gap: 4,
    },
    categoryText: {
        fontSize: 10,
        fontFamily: "Inter_600SemiBold",
    },
    content: {
        padding: SPACING.sm,
    },
    title: {
        fontSize: FONT_SIZES.sm,
        fontFamily: "Inter_600SemiBold",
        color: COLORS.textPrimary,
        lineHeight: 18,
    },
    description: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        marginTop: 4,
        lineHeight: 16,
    },
    meta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: SPACING.xs,
        gap: 4,
    },
    fee: {
        fontSize: FONT_SIZES.xs,
        fontFamily: "Inter_600SemiBold",
        color: COLORS.accent,
    },
    dot: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textLight,
    },
    duration: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
    },
});

export default PlaceCard;
