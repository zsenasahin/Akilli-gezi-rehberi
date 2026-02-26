import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Alert,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/layout';
import { useAuth } from '../../contexts/AuthContext';
import { saveItinerary } from '../../services/itineraryService';
import { formatCurrency, formatDuration } from '../../utils/formatters';
import DayCard from '../../components/itinerary/DayCard';
import Button from '../../components/common/Button';
import ErrorMessage from '../../components/common/ErrorMessage';

/**
 * Displays the generated itinerary and allows the user to save it.
 */
const ItineraryResultScreen = ({ route, navigation }) => {
    const { city, days, totalBudget, plan, totalCost, totalHours } = route.params;
    const { user } = useAuth();

    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState(null);

    const handleSave = async () => {
        if (!user) {
            setError('Kaydetmek için giriş yapmış olmalısınız.');
            return;
        }

        setSaving(true);
        setError(null);

        const { error: saveError } = await saveItinerary({
            user_id: user.id,
            city_id: city.id,
            days,
            total_budget: totalBudget,
            plan, // Stored as JSONB in Supabase
        });

        setSaving(false);

        if (saveError) {
            setError('Plan kaydedilirken hata oluştu: ' + saveError.message);
            return;
        }

        setSaved(true);
        Alert.alert('Başarılı! ✅', 'Gezi planınız kaydedildi.', [
            { text: 'Tamam' },
        ]);
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
        >
            {/* Summary header */}
            <View style={styles.summaryCard}>
                <Text style={styles.cityName}>📍 {city.name}</Text>

                <View style={styles.statsRow}>
                    <View style={styles.stat}>
                        <Text style={styles.statValue}>{days}</Text>
                        <Text style={styles.statLabel}>Gün</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.stat}>
                        <Text style={styles.statValue}>{formatCurrency(totalCost)}</Text>
                        <Text style={styles.statLabel}>Tahmini Maliyet</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.stat}>
                        <Text style={styles.statValue}>{totalHours}h</Text>
                        <Text style={styles.statLabel}>Toplam Süre</Text>
                    </View>
                </View>

                {totalBudget > 0 && (
                    <Text style={styles.budgetNote}>
                        Bütçe: {formatCurrency(totalBudget)} · Kalan:{' '}
                        {formatCurrency(totalBudget - totalCost)}
                    </Text>
                )}
            </View>

            {/* Error */}
            {error && <ErrorMessage message={error} />}

            {/* Day-by-day plan */}
            {plan.map((dayPlan) => (
                <DayCard key={dayPlan.day} dayPlan={dayPlan} />
            ))}

            {/* Save button */}
            <Button
                title={saved ? 'Kaydedildi ✅' : 'Planı Kaydet 💾'}
                onPress={handleSave}
                loading={saving}
                disabled={saved}
                variant={saved ? 'outline' : 'primary'}
                style={styles.saveButton}
            />

            <Button
                title="Yeni Plan Oluştur"
                onPress={() => navigation.goBack()}
                variant="outline"
                style={styles.newPlanButton}
            />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    contentContainer: {
        padding: SPACING.md,
        paddingBottom: SPACING.xxl,
    },
    summaryCard: {
        backgroundColor: COLORS.primary,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.md,
    },
    cityName: {
        fontSize: FONT_SIZES.xl,
        fontFamily: "PlayfairDisplay_700Bold",
        color: COLORS.textOnPrimary,
        marginBottom: SPACING.md,
        textAlign: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    stat: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        fontSize: FONT_SIZES.lg,
        fontFamily: "PlayfairDisplay_700Bold",
        color: COLORS.textOnPrimary,
    },
    statLabel: {
        fontSize: FONT_SIZES.xs,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    budgetNote: {
        textAlign: 'center',
        color: 'rgba(255,255,255,0.85)',
        fontSize: FONT_SIZES.xs,
        marginTop: SPACING.md,
    },
    saveButton: {
        marginTop: SPACING.sm,
    },
    newPlanButton: {
        marginTop: SPACING.sm,
    },
});

export default ItineraryResultScreen;
