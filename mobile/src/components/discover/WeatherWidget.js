/**
 * WeatherWidget — 5 günlük hava durumu kartı
 *
 * Open-Meteo API (ücretsiz, kayıtsız) üzerinden alınan verileri gösterir.
 * CityDetailScreen'e gömülür.
 */

import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/layout';
import { getWeatherForecast, getDayLabel } from '../../services/weatherService';

const WeatherWidget = ({ cityName }) => {
    const [forecast, setForecast] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!cityName) return;
        setLoading(true);
        getWeatherForecast(cityName).then(({ data, error: err }) => {
            if (err) setError(err);
            else setForecast(data);
            setLoading(false);
        });
    }, [cityName]);

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Ionicons name="partly-sunny-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.title}>Hava Durumu</Text>
                </View>
                <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 12 }} />
            </View>
        );
    }

    if (error || !forecast) return null;

    const today = forecast[0];
    const hasRainWarning = forecast.some(d => d.rainChance >= 60);

    return (
        <View style={styles.container}>
            {/* Başlık */}
            <View style={styles.header}>
                <Ionicons name="partly-sunny-outline" size={16} color={COLORS.primary} />
                <Text style={styles.title}>Hava Durumu</Text>
                <Text style={styles.cityBadge}>{cityName}</Text>
            </View>

            {/* Bugünkü hava — ön plana çıkar */}
            <View style={styles.todayRow}>
                <Text style={styles.todayEmoji}>{today.emoji}</Text>
                <View style={styles.todayInfo}>
                    <Text style={styles.todayLabel}>{today.label}</Text>
                    <Text style={styles.todayTemp}>
                        {today.tempMax}° <Text style={styles.todayTempMin}>/ {today.tempMin}°</Text>
                    </Text>
                </View>
                {today.rainChance > 0 && (
                    <View style={styles.rainBadge}>
                        <Ionicons name="rainy-outline" size={12} color={COLORS.info} />
                        <Text style={styles.rainText}>%{today.rainChance}</Text>
                    </View>
                )}
            </View>

            {/* Sonraki 4 gün */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.forecastRow}
            >
                {forecast.slice(1).map((day) => (
                    <View key={day.date} style={[
                        styles.dayCard,
                        day.rainChance >= 60 && styles.dayCardRainy,
                    ]}>
                        <Text style={styles.dayName}>{getDayLabel(day.date)}</Text>
                        <Text style={styles.dayEmoji}>{day.emoji}</Text>
                        <Text style={styles.dayTemp}>{day.tempMax}°</Text>
                        <Text style={styles.dayTempMin}>{day.tempMin}°</Text>
                        {day.rainChance >= 30 && (
                            <Text style={styles.dayRain}>💧{day.rainChance}%</Text>
                        )}
                    </View>
                ))}
            </ScrollView>

            {/* Yağmur uyarısı */}
            {hasRainWarning && (
                <View style={styles.warningBox}>
                    <Ionicons name="warning-outline" size={14} color={COLORS.warning} />
                    <Text style={styles.warningText}>
                        Önümüzdeki günlerde yağış bekleniyor. Kapalı mekânları da planınıza ekleyin!
                    </Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: SPACING.sm,
    },
    title: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
        flex: 1,
    },
    cityBadge: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
    },

    // Bugün
    todayRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        paddingBottom: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.divider,
        marginBottom: SPACING.sm,
    },
    todayEmoji: {
        fontSize: 36,
    },
    todayInfo: {
        flex: 1,
    },
    todayLabel: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
    },
    todayTemp: {
        fontFamily: FONTS.heading,
        fontSize: FONT_SIZES.xl,
        color: COLORS.textPrimary,
        marginTop: 2,
    },
    todayTempMin: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
    },
    rainBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: COLORS.info + '15',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.full,
    },
    rainText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.xs,
        color: COLORS.info,
    },

    // Sonraki günler
    forecastRow: {
        gap: SPACING.sm,
        paddingVertical: 4,
    },
    dayCard: {
        alignItems: 'center',
        backgroundColor: COLORS.surfaceAlt,
        borderRadius: BORDER_RADIUS.md,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.sm,
        minWidth: 60,
    },
    dayCardRainy: {
        backgroundColor: COLORS.info + '10',
        borderWidth: 1,
        borderColor: COLORS.info + '30',
    },
    dayName: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    dayEmoji: {
        fontSize: 22,
        marginBottom: 4,
    },
    dayTemp: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
    },
    dayTempMin: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
    },
    dayRain: {
        fontFamily: FONTS.body,
        fontSize: 10,
        color: COLORS.info,
        marginTop: 2,
    },

    // Uyarı
    warningBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
        backgroundColor: COLORS.warning + '12',
        borderRadius: BORDER_RADIUS.sm,
        padding: SPACING.sm,
        marginTop: SPACING.sm,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.warning,
    },
    warningText: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        flex: 1,
        lineHeight: 16,
    },
});

export default WeatherWidget;
