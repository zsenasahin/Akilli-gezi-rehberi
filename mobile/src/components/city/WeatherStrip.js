import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/layout';
import { getWeatherForecast, getDayLabel, formatWeatherDate } from '../../services/weatherService';
import { createThemedStyles } from '../../utils/themedStyles';

/** Şehir için 5 günlük hava tahmini (Open-Meteo, ücretsiz, anahtarsız). */
export default function WeatherStrip({ cityName }) {
    const [forecast, setForecast] = useState(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let active = true;
        setForecast(null);
        setFailed(false);
        getWeatherForecast(cityName).then(({ data }) => {
            if (!active) return;
            if (data?.length) setForecast(data); else setFailed(true);
        });
        return () => { active = false; };
    }, [cityName]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="partly-sunny-outline" size={18} color={COLORS.primary} />
                <Text style={styles.title}>Hava Durumu</Text>
                <Text style={styles.source}>5 gün</Text>
            </View>
            {!forecast && !failed && <ActivityIndicator color={COLORS.primary} style={{ marginVertical: SPACING.md }} />}
            {failed && <Text style={styles.error}>Hava durumu şu an alınamadı.</Text>}
            {forecast && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                    {forecast.map((day, index) => (
                        <Animated.View key={day.date} entering={FadeInRight.delay(index * 60)} style={[styles.day, index === 0 && styles.today]}>
                            <Text style={[styles.dayLabel, index === 0 && styles.todayText]}>{getDayLabel(day.date)}</Text>
                            <Text style={styles.dayDate}>{formatWeatherDate(day.date)}</Text>
                            <Text style={styles.emoji}>{day.emoji}</Text>
                            <Text style={styles.temp}>{day.tempMax}° <Text style={styles.tempMin}>{day.tempMin}°</Text></Text>
                            {day.rainChance > 0 && (
                                <View style={styles.rain}>
                                    <Ionicons name="water-outline" size={10} color={COLORS.info} />
                                    <Text style={styles.rainText}>%{day.rainChance}</Text>
                                </View>
                            )}
                        </Animated.View>
                    ))}
                </ScrollView>
            )}
        </View>
    );
}

const styles = createThemedStyles(() => ({
    container: {
        marginHorizontal: SPACING.md,
        marginBottom: SPACING.md,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingVertical: SPACING.md,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: SPACING.md, marginBottom: SPACING.sm },
    title: { flex: 1, fontFamily: FONTS.bodyBold, fontSize: FONT_SIZES.md, color: COLORS.textPrimary },
    source: { fontFamily: FONTS.body, fontSize: FONT_SIZES.xs, color: COLORS.textLight },
    error: { fontFamily: FONTS.body, fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, paddingHorizontal: SPACING.md },
    row: { paddingHorizontal: SPACING.md, gap: SPACING.sm },
    day: {
        width: 70, alignItems: 'center',
        backgroundColor: COLORS.surfaceAlt,
        borderRadius: BORDER_RADIUS.md,
        paddingVertical: SPACING.sm,
    },
    today: { backgroundColor: COLORS.primaryMuted },
    dayLabel: { fontFamily: FONTS.bodyBold, fontSize: FONT_SIZES.xs, color: COLORS.textPrimary },
    todayText: { color: COLORS.primary },
    dayDate: { fontFamily: FONTS.body, fontSize: 10, color: COLORS.textSecondary, marginTop: 1 },
    emoji: { fontSize: 22, marginVertical: 4 },
    temp: { fontFamily: FONTS.bodyBold, fontSize: FONT_SIZES.sm, color: COLORS.textPrimary },
    tempMin: { fontFamily: FONTS.body, color: COLORS.textSecondary },
    rain: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
    rainText: { fontFamily: FONTS.body, fontSize: 10, color: COLORS.info },
}));
