import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Switch, Alert, KeyboardAvoidingView, Platform, TextInput,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/colors';
import { FONT_SIZES, FONTS } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/layout';
import { useAuth } from '../../contexts/AuthContext';
import { getCities } from '../../data/repositories/cityRepository';
import { getPlacesByCity } from '../../data/repositories/placeRepository';
import { createItinerary } from '../../data/repositories/itineraryRepository';
import { generateItinerary } from '../../domain/itineraryGenerator';
import ErrorMessage from '../../components/common/ErrorMessage';

const CATEGORY_COLORS = {
    'tarihi': '#8B5CF6',
    'müze': '#6366F1',
    'doğa': '#10B981',
    'park': '#84CC16',
    'dini': '#F59E0B',
    'restoran': '#EF4444',
    'kafe': '#F97316',
    'alışveriş': '#EC4899',
    'eğlence': '#3B82F6',
};

const STEP_LABELS = ['Şehir', 'Yerler', 'Süre', 'Konaklama'];

const TR_MONTHS = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];
const TR_DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

function formatDate(date) {
    return `${date.getDate()} ${TR_MONTHS[date.getMonth()]} ${date.getFullYear()} ${TR_DAYS[date.getDay()]}`;
}

export default function CreateItineraryScreen({ navigation }) {
    const { user } = useAuth();

    const [step, setStep] = useState(0);

    // Step 0
    const [cities, setCities] = useState([]);
    const [selectedCity, setSelectedCity] = useState(null);

    // Step 1
    const [places, setPlaces] = useState([]);
    const [selectedPlaces, setSelectedPlaces] = useState([]);
    const [autoSelect, setAutoSelect] = useState(true);

    // Step 2
    const [days, setDays] = useState(2);
    const [startDate, setStartDate] = useState(new Date());

    // Step 3
    const [hasAccommodation, setHasAccommodation] = useState(true);
    const [accommodationName, setAccommodationName] = useState('');

    // UI
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadCities();
    }, []);

    useEffect(() => {
        if (selectedCity) loadPlaces(selectedCity.id);
    }, [selectedCity]);

    const loadCities = async () => {
        setLoading(true);
        const { data, error: err } = await getCities();
        setLoading(false);
        if (err) { setError(err.message); return; }
        setCities(data || []);
    };

    const loadPlaces = async (cityId) => {
        setLoading(true);
        const { data, error: err } = await getPlacesByCity(cityId);
        setLoading(false);
        if (err) { setError(err.message); return; }
        setPlaces(data || []);
        setSelectedPlaces([]);
    };

    const togglePlace = useCallback((place) => {
        setSelectedPlaces(prev =>
            prev.find(p => p.id === place.id)
                ? prev.filter(p => p.id !== place.id)
                : [...prev, place]
        );
    }, []);

    const handleNext = () => {
        setError(null);
        if (step === 0 && !selectedCity) {
            setError('Lütfen bir şehir seçin.');
            return;
        }
        if (step === 1 && !autoSelect && selectedPlaces.length === 0) {
            setError('Lütfen en az bir yer seçin.');
            return;
        }
        if (step < 3) setStep(s => s + 1);
        else handleCreatePlan();
    };

    const handleBack = () => {
        setError(null);
        if (step > 0) setStep(s => s - 1);
    };

    const handleCreatePlan = async () => {
        const placesToUse = autoSelect ? places : selectedPlaces;
        if (placesToUse.length === 0) {
            setError('Plan oluşturmak için yer bulunamadı.');
            return;
        }
        setLoading(true);
        const result = generateItinerary(placesToUse, days, {});
        const { data: saved, error: saveError } = await createItinerary({
            userId: user.id,
            cityId: selectedCity.id,
            days,
            startDate: startDate.toISOString().split('T')[0],
            hasAccommodation,
            hasTransport: false,
            items: result.items,
        });
        setLoading(false);
        if (saveError) { setError(saveError.message); return; }
        navigation.replace('ItineraryDetail', { itineraryId: saved.id });
    };

    const adjustDate = (delta) => {
        const d = new Date(startDate);
        d.setDate(d.getDate() + delta);
        setStartDate(d);
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Yeni Plan</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Step Indicator */}
            <StepIndicator step={step} />

            {/* Error */}
            {error ? <ErrorMessage message={error} style={styles.errorBox} /> : null}

            {/* Content */}
            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {loading && step !== 3 ? (
                    <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
                ) : (
                    <>
                        {step === 0 && (
                            <StepCity
                                cities={cities}
                                selectedCity={selectedCity}
                                onSelect={setSelectedCity}
                            />
                        )}
                        {step === 1 && (
                            <StepPlaces
                                places={places}
                                selectedPlaces={selectedPlaces}
                                autoSelect={autoSelect}
                                onToggleAuto={setAutoSelect}
                                onTogglePlace={togglePlace}
                            />
                        )}
                        {step === 2 && (
                            <StepDuration
                                days={days}
                                onSelectDays={setDays}
                                startDate={startDate}
                                onAdjustDate={adjustDate}
                            />
                        )}
                        {step === 3 && (
                            <StepAccommodation
                                hasAccommodation={hasAccommodation}
                                onToggle={setHasAccommodation}
                                accommodationName={accommodationName}
                                onChangeName={setAccommodationName}
                                selectedCity={selectedCity}
                                days={days}
                                startDate={startDate}
                            />
                        )}
                    </>
                )}
            </ScrollView>

            {/* Bottom Nav */}
            <View style={styles.bottomNav}>
                {step > 0 ? (
                    <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                        <Ionicons name="chevron-back" size={18} color={COLORS.textSecondary} />
                        <Text style={styles.backBtnText}>Geri</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={{ flex: 1 }} />
                )}

                <TouchableOpacity onPress={handleNext} disabled={loading} style={styles.nextBtnWrapper}>
                    <LinearGradient
                        colors={COLORS.gradients.primary}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.nextBtn}
                    >
                        {loading && step === 3 ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Text style={styles.nextBtnText}>
                                    {step === 3 ? 'Plan Oluştur' : 'İleri'}
                                </Text>
                                {step < 3 && (
                                    <Ionicons name="chevron-forward" size={18} color="#fff" style={{ marginLeft: 4 }} />
                                )}
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StepIndicator({ step }) {
    return (
        <View style={styles.stepIndicator}>
            {STEP_LABELS.map((label, i) => {
                const isActive = i === step;
                const isDone = i < step;
                return (
                    <View key={i} style={styles.stepItem}>
                        <View style={[
                            styles.stepDot,
                            isActive && styles.stepDotActive,
                            isDone && styles.stepDotDone,
                        ]}>
                            {isDone
                                ? <Ionicons name="checkmark" size={12} color="#fff" />
                                : <View style={[
                                    styles.stepDotInner,
                                    isActive && styles.stepDotInnerActive,
                                ]} />
                            }
                        </View>
                        <Text style={[
                            styles.stepLabel,
                            isActive && styles.stepLabelActive,
                        ]}>{label}</Text>
                        {i < STEP_LABELS.length - 1 && (
                            <View style={[styles.stepLine, isDone && styles.stepLineDone]} />
                        )}
                    </View>
                );
            })}
        </View>
    );
}

function StepCity({ cities, selectedCity, onSelect }) {
    return (
        <View>
            <Text style={styles.stepTitle}>Nereye gidiyorsunuz?</Text>
            <View style={styles.cityGrid}>
                {cities.map(city => {
                    const isSelected = selectedCity?.id === city.id;
                    return (
                        <TouchableOpacity
                            key={city.id}
                            style={[styles.cityCard, isSelected && styles.cityCardSelected]}
                            onPress={() => onSelect(city)}
                            activeOpacity={0.75}
                        >
                            <Text style={[styles.cityName, isSelected && styles.cityNameSelected]}>
                                {city.name}
                            </Text>
                            {city.region ? (
                                <Text style={[styles.cityRegion, isSelected && styles.cityRegionSelected]}>
                                    {city.region}
                                </Text>
                            ) : null}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

function StepPlaces({ places, selectedPlaces, autoSelect, onToggleAuto, onTogglePlace }) {
    return (
        <View>
            <Text style={styles.stepTitle}>Gezilecek yerleri seçin</Text>

            <View style={styles.autoRow}>
                <View style={styles.autoRowLeft}>
                    <Ionicons name="flash" size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
                    <Text style={styles.autoLabel}>Otomatik Seç</Text>
                </View>
                <Switch
                    value={autoSelect}
                    onValueChange={onToggleAuto}
                    trackColor={{ false: COLORS.border, true: COLORS.primaryMuted }}
                    thumbColor={autoSelect ? COLORS.primary : COLORS.textLight}
                />
            </View>

            {autoSelect ? (
                <View style={styles.infoCard}>
                    <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.infoText}>En iyi yerler otomatik seçilecek</Text>
                </View>
            ) : (
                <>
                    <Text style={styles.selectedCount}>
                        {selectedPlaces.length} yer seçildi
                    </Text>
                    {places.map(place => {
                        const isChecked = !!selectedPlaces.find(p => p.id === place.id);
                        const catColor = CATEGORY_COLORS[place.category?.toLowerCase()] || COLORS.primary;
                        return (
                            <TouchableOpacity
                                key={place.id}
                                style={styles.placeRow}
                                onPress={() => onTogglePlace(place)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.placeInfo}>
                                    <Text style={styles.placeName}>{place.name}</Text>
                                    <View style={styles.placeMeta}>
                                        {place.category ? (
                                            <View style={[styles.categoryBadge, { backgroundColor: catColor + '22' }]}>
                                                <Text style={[styles.categoryText, { color: catColor }]}>
                                                    {place.category}
                                                </Text>
                                            </View>
                                        ) : null}
                                        {place.avg_duration ? (
                                            <Text style={styles.durationText}>~{place.avg_duration} dk</Text>
                                        ) : null}
                                    </View>
                                </View>
                                <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                                    {isChecked && <Ionicons name="checkmark" size={14} color="#fff" />}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </>
            )}
        </View>
    );
}

function StepDuration({ days, onSelectDays, startDate, onAdjustDate }) {
    return (
        <View>
            <Text style={styles.stepTitle}>Kaç gün kalacaksınız?</Text>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dayPickerRow}
            >
                {Array.from({ length: 14 }, (_, i) => i + 1).map(d => {
                    const isSelected = d === days;
                    return (
                        <TouchableOpacity
                            key={d}
                            style={[styles.dayCard, isSelected && styles.dayCardSelected]}
                            onPress={() => onSelectDays(d)}
                            activeOpacity={0.75}
                        >
                            <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}>{d}</Text>
                            <Text style={[styles.dayLabel, isSelected && styles.dayLabelSelected]}>gün</Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            <Text style={styles.sectionLabel}>Başlangıç Tarihi</Text>
            <View style={styles.dateRow}>
                <TouchableOpacity style={styles.dateBtn} onPress={() => onAdjustDate(-1)}>
                    <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.dateText}>{formatDate(startDate)}</Text>
                <TouchableOpacity style={styles.dateBtn} onPress={() => onAdjustDate(1)}>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

function StepAccommodation({ hasAccommodation, onToggle, accommodationName, onChangeName, selectedCity, days, startDate }) {
    return (
        <View>
            <Text style={styles.stepTitle}>Konaklama</Text>

            <View style={styles.autoRow}>
                <View style={styles.autoRowLeft}>
                    <Ionicons name="bed-outline" size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
                    <Text style={styles.autoLabel}>Konaklama bilgisi ekle</Text>
                </View>
                <Switch
                    value={hasAccommodation}
                    onValueChange={onToggle}
                    trackColor={{ false: COLORS.border, true: COLORS.primaryMuted }}
                    thumbColor={hasAccommodation ? COLORS.primary : COLORS.textLight}
                />
            </View>

            {hasAccommodation && (
                <TextInput
                    style={styles.textInput}
                    placeholder="Otel veya konaklama adı"
                    placeholderTextColor={COLORS.textLight}
                    value={accommodationName}
                    onChangeText={onChangeName}
                    returnKeyType="done"
                />
            )}

            {/* Summary card */}
            <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Plan Özeti</Text>
                <View style={styles.summaryRow}>
                    <Ionicons name="location-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.summaryText}>{selectedCity?.name || '—'}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.summaryText}>{days} gün · {formatDate(startDate)}</Text>
                </View>
                {hasAccommodation && accommodationName ? (
                    <View style={styles.summaryRow}>
                        <Ionicons name="bed-outline" size={16} color={COLORS.primary} />
                        <Text style={styles.summaryText}>{accommodationName}</Text>
                    </View>
                ) : null}
            </View>
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.xl,
        paddingBottom: SPACING.sm,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    closeBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontFamily: FONTS.bodyBold,
        fontSize: FONT_SIZES.lg,
        color: COLORS.textPrimary,
    },

    // Step indicator
    stepIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.md,
        backgroundColor: COLORS.surface,
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stepDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.surface,
    },
    stepDotActive: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primary,
    },
    stepDotDone: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primary,
    },
    stepDotInner: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.border,
    },
    stepDotInnerActive: {
        backgroundColor: '#fff',
    },
    stepLabel: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textLight,
        marginLeft: 4,
        marginRight: 4,
    },
    stepLabelActive: {
        color: COLORS.primary,
        fontFamily: FONTS.bodyMedium,
    },
    stepLine: {
        width: 20,
        height: 2,
        backgroundColor: COLORS.border,
        marginHorizontal: 2,
    },
    stepLineDone: {
        backgroundColor: COLORS.primary,
    },

    // Content
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: SPACING.md,
        paddingBottom: SPACING.xxl,
    },
    errorBox: {
        marginHorizontal: SPACING.md,
        marginTop: SPACING.sm,
    },

    // Step title
    stepTitle: {
        fontFamily: FONTS.heading,
        fontSize: FONT_SIZES.xl,
        color: COLORS.textPrimary,
        marginBottom: SPACING.lg,
    },

    // City grid
    cityGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    cityCard: {
        width: '47.5%',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        borderWidth: 2,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    cityCardSelected: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryMuted,
    },
    cityName: {
        fontFamily: FONTS.bodyBold,
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
    },
    cityNameSelected: {
        color: COLORS.primary,
    },
    cityRegion: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textLight,
        marginTop: 2,
    },
    cityRegionSelected: {
        color: COLORS.primaryDark,
    },

    // Auto row
    autoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    autoRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    autoLabel: {
        fontFamily: FONTS.bodyMedium,
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
    },

    // Info card
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primaryMuted,
        borderRadius: BORDER_RADIUS.sm,
        padding: SPACING.sm,
        marginTop: SPACING.xs,
        gap: SPACING.xs,
    },
    infoText: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.sm,
        color: COLORS.primary,
        marginLeft: SPACING.xs,
    },

    // Places
    selectedCount: {
        fontFamily: FONTS.bodyMedium,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        marginBottom: SPACING.sm,
    },
    placeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    placeInfo: {
        flex: 1,
    },
    placeName: {
        fontFamily: FONTS.bodyMedium,
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    placeMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    categoryBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: BORDER_RADIUS.full,
    },
    categoryText: {
        fontFamily: FONTS.bodyMedium,
        fontSize: FONT_SIZES.xs,
    },
    durationText: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textLight,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: SPACING.sm,
    },
    checkboxChecked: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },

    // Day picker
    dayPickerRow: {
        paddingVertical: SPACING.sm,
        gap: SPACING.sm,
        paddingHorizontal: 2,
    },
    dayCard: {
        width: 56,
        height: 72,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.surface,
        borderWidth: 2,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    dayCardSelected: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primary,
    },
    dayNumber: {
        fontFamily: FONTS.heading,
        fontSize: FONT_SIZES.xl,
        color: COLORS.textPrimary,
    },
    dayNumberSelected: {
        color: '#fff',
    },
    dayLabel: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textLight,
    },
    dayLabelSelected: {
        color: 'rgba(255,255,255,0.8)',
    },

    // Date row
    sectionLabel: {
        fontFamily: FONTS.bodyMedium,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        marginTop: SPACING.lg,
        marginBottom: SPACING.sm,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    dateBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dateText: {
        fontFamily: FONTS.bodyMedium,
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        flex: 1,
        textAlign: 'center',
    },

    // Accommodation
    textInput: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: SPACING.md,
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        marginTop: SPACING.sm,
        marginBottom: SPACING.md,
    },

    // Summary card
    summaryCard: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginTop: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
    summaryTitle: {
        fontFamily: FONTS.bodyBold,
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginBottom: SPACING.xs,
    },
    summaryText: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        marginLeft: SPACING.xs,
    },

    // Bottom nav
    bottomNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        flex: 1,
    },
    backBtnText: {
        fontFamily: FONTS.bodyMedium,
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        marginLeft: 4,
    },
    nextBtnWrapper: {
        flex: 1,
        alignItems: 'flex-end',
    },
    nextBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.sm + 2,
        paddingHorizontal: SPACING.lg,
        borderRadius: BORDER_RADIUS.full,
        minWidth: 120,
    },
    nextBtnText: {
        fontFamily: FONTS.bodyBold,
        fontSize: FONT_SIZES.md,
        color: '#fff',
    },
});
