import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/layout';
import { getPlaceImage } from '../../constants/placeImages';
// import { GEMINI_API_KEY } from '../../config/secrets'; // Artık kullanılmıyor

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - SPACING.lg * 3) / 2;

const getCategoryIcon = (category) => {
    const map = {
        historical: 'library',
        museum: 'color-palette',
        nature: 'leaf',
        religious: 'business',
        shopping: 'bag-handle',
        beach: 'sunny',
        park: 'flower',
        restaurant: 'restaurant',
        cafe: 'cafe',
    };
    return map[category] || 'location';
};

export default function PlaceSelectionCard({ place, selected, onPress }) {
    const [showModal, setShowModal] = useState(false);
    const [aiDescription, setAiDescription] = useState('');
    const [loadingDescription, setLoadingDescription] = useState(false);
    const imageUrl = getPlaceImage(place.name, place.image_url, place.category);

    // Wikipedia API ile açıklama getir
    const fetchAIDescription = async () => {
        if (aiDescription) return; // Zaten varsa tekrar çekme
        
        setLoadingDescription(true);
        try {
            // Önce sayfa var mı kontrol et
            const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(place.name)}`;
            
            const response = await fetch(searchUrl);
            
            if (!response.ok) {
                // Türkçe Wikipedia dene
                const trSearchUrl = `https://tr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(place.name)}`;
                const trResponse = await fetch(trSearchUrl);
                
                if (!trResponse.ok) {
                    throw new Error('Wikipedia sayfası bulunamadı');
                }
                
                const trData = await trResponse.json();
                const description = trData.extract || trData.description || 'Bu gezi yeri hakkında detaylı bilgi bulunamadı.';
                setAiDescription(description.length > 200 ? description.substring(0, 200) + '...' : description);
                return;
            }
            
            const data = await response.json();
            const description = data.extract || data.description || 'Bu gezi yeri hakkında detaylı bilgi bulunamadı.';
            
            // Açıklamayı kısalt ve Türkçe'ye çevirmeyi dene
            let shortDescription = description.length > 200 ? description.substring(0, 200) + '...' : description;
            
            // Basit Türkçe çeviri önerisi (gerçek uygulamada translation API kullanılabilir)
            if (shortDescription.includes('is a') || shortDescription.includes('was')) {
                shortDescription = shortDescription.replace(/is a/g, 'bir').replace(/was/g, 'idi').replace(/museum/g, 'müze').replace(/church/g, 'kilise').replace(/mosque/g, 'cami');
            }
            
            setAiDescription(shortDescription);
        } catch (error) {
            console.error('Wikipedia API hatası:', error.message);
            // Fallback açıklama
            setAiDescription('Bu gezi yeri, şehrin önemli turistik noktalarından biridir. Ziyaretçiler için çeşitli aktiviteler sunmaktadır.');
        } finally {
            setLoadingDescription(false);
        }
    };

    // Modal açıldığında açıklama getir
    useEffect(() => {
        if (showModal && !aiDescription) {
            fetchAIDescription();
        }
    }, [showModal]);

    return (
        <>
            <TouchableOpacity
                style={[styles.card, selected && styles.cardSelected]}
                onPress={onPress}
                onLongPress={() => setShowModal(true)}
                activeOpacity={0.7}
            >
                <Image
                    source={{ uri: imageUrl }}
                    style={styles.image}
                    contentFit="cover"
                    transition={300}
                />
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.6)']}
                    style={styles.gradient}
                />

                {/* Kategori Badge */}
                <View style={styles.categoryBadge}>
                    <Ionicons name={getCategoryIcon(place.category)} size={12} color="#fff" />
                </View>

                {/* Seçim İşareti */}
                {selected && (
                    <View style={styles.checkmark}>
                        <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                    </View>
                )}

                {/* Bilgi Butonu */}
                <TouchableOpacity
                    style={styles.infoButton}
                    onPress={(e) => {
                        e.stopPropagation();
                        setShowModal(true);
                    }}
                >
                    <Ionicons name="information-circle" size={20} color="#fff" />
                </TouchableOpacity>

                {/* İçerik */}
                <View style={styles.content}>
                    <Text style={styles.name} numberOfLines={2}>{place.name}</Text>
                    <View style={styles.meta}>
                        <View style={styles.metaItem}>
                            <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.8)" />
                            <Text style={styles.metaText}>{place.avg_duration}s</Text>
                        </View>
                        {place.entry_fee > 0 ? (
                            <View style={styles.metaItem}>
                                <Ionicons name="cash-outline" size={12} color="rgba(255,255,255,0.8)" />
                                <Text style={styles.metaText}>₺{place.entry_fee}</Text>
                            </View>
                        ) : (
                            <View style={styles.freeBadge}>
                                <Text style={styles.freeText}>Ücretsiz</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.rating}>
                        <Ionicons name="star" size={12} color="#FCD34D" />
                        <Text style={styles.ratingText}>{place.popularity_score}</Text>
                    </View>
                </View>
            </TouchableOpacity>

            {/* Detay Modal */}
            <Modal
                visible={showModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowModal(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowModal(false)}
                >
                    <View style={styles.modalContent}>
                        <Image
                            source={{ uri: imageUrl }}
                            style={styles.modalImage}
                            contentFit="cover"
                        />
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.8)']}
                            style={styles.modalGradient}
                        />

                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setShowModal(false)}
                        >
                            <Ionicons name="close-circle" size={32} color="#fff" />
                        </TouchableOpacity>

                        <ScrollView style={styles.modalInfo}>
                            <Text style={styles.modalTitle}>{place.name}</Text>
                            
                            <View style={styles.modalMeta}>
                                <View style={styles.modalMetaItem}>
                                    <Ionicons name={getCategoryIcon(place.category)} size={16} color={COLORS.primary} />
                                    <Text style={styles.modalMetaText}>{place.category}</Text>
                                </View>
                                <View style={styles.modalMetaItem}>
                                    <Ionicons name="time-outline" size={16} color={COLORS.primary} />
                                    <Text style={styles.modalMetaText}>{place.avg_duration} saat</Text>
                                </View>
                                <View style={styles.modalMetaItem}>
                                    <Ionicons name="star" size={16} color="#FCD34D" />
                                    <Text style={styles.modalMetaText}>{place.popularity_score}</Text>
                                </View>
                            </View>

                            {/* Açıklama */}
                            {loadingDescription ? (
                                <View style={styles.aiDescriptionContainer}>
                                    <View style={styles.aiDescriptionLoading}>
                                        <ActivityIndicator size="small" color={COLORS.primary} />
                                        <Text style={styles.aiDescriptionLoadingText}>Açıklama yükleniyor...</Text>
                                    </View>
                                </View>
                            ) : aiDescription ? (
                                <View style={styles.aiDescriptionContainer}>
                                    <Text style={styles.modalDescription}>{aiDescription}</Text>
                                </View>
                            ) : null}

                            <View style={styles.modalDetails}>
                                <View style={styles.detailRow}>
                                    <Ionicons name="cash-outline" size={18} color={COLORS.textSecondary} />
                                    <Text style={styles.detailLabel}>Giriş Ücreti:</Text>
                                    <Text style={styles.detailValue}>
                                        {place.entry_fee > 0 ? `₺${place.entry_fee}` : 'Ücretsiz'}
                                    </Text>
                                </View>
                                {place.opening_hours && (
                                    <View style={styles.detailRow}>
                                        <Ionicons name="time-outline" size={18} color={COLORS.textSecondary} />
                                        <Text style={styles.detailLabel}>Açılış Saatleri:</Text>
                                        <Text style={styles.detailValue}>{place.opening_hours}</Text>
                                    </View>
                                )}
                            </View>

                            <TouchableOpacity
                                style={[styles.selectButton, selected && styles.selectButtonSelected]}
                                onPress={() => {
                                    onPress();
                                    setShowModal(false);
                                }}
                            >
                                <Ionicons 
                                    name={selected ? "checkmark-circle" : "add-circle"} 
                                    size={20} 
                                    color="#fff" 
                                />
                                <Text style={styles.selectButtonText}>
                                    {selected ? 'Seçildi' : 'Plana Ekle'}
                                </Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    card: {
        width: CARD_WIDTH,
        height: 180,
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
        marginBottom: SPACING.sm,
        backgroundColor: COLORS.surface,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    cardSelected: {
        borderWidth: 2,
        borderColor: '#10B981',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    gradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 100,
    },
    categoryBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkmark: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#fff',
        borderRadius: 14,
    },
    infoButton: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: SPACING.sm,
    },
    name: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: 13,
        color: '#fff',
        marginBottom: 4,
        lineHeight: 16,
    },
    meta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 2,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    metaText: {
        fontFamily: FONTS.body,
        fontSize: 11,
        color: 'rgba(255,255,255,0.9)',
    },
    freeBadge: {
        backgroundColor: '#10B981',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    freeText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: 10,
        color: '#fff',
    },
    rating: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    ratingText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: 11,
        color: '#fff',
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '85%',
        overflow: 'hidden',
    },
    modalImage: {
        width: '100%',
        height: 200,
    },
    modalGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 200,
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
    },
    modalInfo: {
        padding: SPACING.lg,
    },
    modalTitle: {
        fontFamily: FONTS.heading,
        fontSize: 24,
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
    },
    modalMeta: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
        marginBottom: SPACING.md,
    },
    modalMetaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: COLORS.primaryMuted,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: BORDER_RADIUS.full,
    },
    modalMetaText: {
        fontFamily: FONTS.bodyMedium,
        fontSize: 13,
        color: COLORS.primary,
    },
    aiDescriptionContainer: {
        backgroundColor: COLORS.primaryMuted,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.primary,
    },
    aiDescriptionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: SPACING.xs,
    },
    aiDescriptionTitle: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: 13,
        color: COLORS.primary,
    },
    aiDescriptionLoading: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    aiDescriptionLoadingText: {
        fontFamily: FONTS.body,
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    modalDescription: {
        fontFamily: FONTS.body,
        fontSize: 14,
        color: COLORS.textSecondary,
        lineHeight: 22,
        marginBottom: SPACING.md,
    },
    modalDetails: {
        gap: SPACING.sm,
        marginBottom: SPACING.lg,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    detailLabel: {
        fontFamily: FONTS.bodyMedium,
        fontSize: 14,
        color: COLORS.textSecondary,
        flex: 1,
    },
    detailValue: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: 14,
        color: COLORS.textPrimary,
    },
    selectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: COLORS.primary,
        paddingVertical: 14,
        borderRadius: BORDER_RADIUS.lg,
    },
    selectButtonSelected: {
        backgroundColor: '#10B981',
    },
    selectButtonText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: 16,
        color: '#fff',
    },
});
