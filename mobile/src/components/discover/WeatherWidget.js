/**
 * WeatherWidget — Premium 5 günlük hava durumu kartı
 *
 * Open-Meteo API (ücretsiz, kayıtsız) üzerinden alınan verileri gösterir.
 * CityDetailScreen'e gömülür.
 */

import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ActivityIndicator, ScrollView, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/layout';
import { getWeatherForecast, getDayLabel } from '../../services/weatherService';

const SCREEN_W = Dimensions.get('window').width;

// Hava durumuna göre gradient renkleri
const getWeatherGradient = (emoji) => {
    if (emoji === '☀️') return ['#FF9A56', '#FF6B35'];
    if (emoji === '⛅' || emoji === '🌤️') return ['#4DA0E8', '#3578C4'];
    if (emoji === '☁️') return ['#8E9AAF', '#6B7A8D'];
    if (emoji === '🌧️' || emoji === '🌦️') return ['#5B86A9', '#3D6580'];
    if (emoji === '⛈️') return ['#4A5568', '#2D3748'];
    if (emoji === '❄️') return ['#A8D8EA', '#77A5C8'];
    return ['#4DA0E8', '#3578C4'];
};

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
                <LinearGradient
                    colors={['#4DA0E8', '#3578C4']}
                    style={styles.gradientBg}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={styles.loadingContent}>
                        <Ionicons name="partly-sunny-outline" size={20} color="rgba(255,255,255,0.7)" />
                        <Text style={styles.loadingText}>Hava durumu yükleniyor...</Text>
                        <ActivityIndicator size="small" color="#fff" style={{ marginTop: 8 }} />
                    </View>
                </LinearGradient>
            </View>
        );
    }

    if (error || !forecast) return null;

    const today = forecast[0];
    const hasRainWarning = forecast.some(d => d.rainChance >= 60);
    const gradient = getWeatherGradient(today.emoji);

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={gradient}
                style={styles.gradientBg}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Ionicons name="location" size={12} color="rgba(255,255,255,0.8)" />
                        <Text style={styles.cityName}>{cityName}</Text>
                    </View>
                    <View style={styles.weatherLabel}>
                        <Text style={styles.weatherLabelText}>{today.label}</Text>
                    </View>
                </View>

                {/* Today's weather — large display */}
                <View style={styles.todaySection}>
                    <View style={styles.todayLeft}>
                        <Text style={styles.todayEmoji}>{today.emoji}</Text>
                    </View>
                    <View style={styles.todayCenter}>
                        <Text style={styles.todayTemp}>{today.tempMax}°</Text>
                        <Text style={styles.todayTempMin}>/ {today.tempMin}°</Text>
                    </View>
                    <View style={styles.todayRight}>
                        {today.rainChance > 0 && (
                            <View style={styles.rainInfo}>
                                <Ionicons name="water" size={14} color="rgba(255,255,255,0.9)" />
                                <Text style={styles.rainPercent}>%{today.rainChance}</Text>
                            </View>
                        )}
                        {today.windSpeed && (
                            <View style={styles.windInfo}>
                                <Ionicons name="speedometer-outline" size={13} color="rgba(255,255,255,0.7)" />
                                <Text style={styles.windText}>{today.windSpeed} km/s</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* 4-day forecast */}
                <View style={styles.forecastRow}>
                    {forecast.slice(1).map((day) => (
                        <View key={day.date} style={styles.dayItem}>
                            <Text style={styles.dayName}>{getDayLabel(day.date)}</Text>
                            <Text style={styles.dayEmoji}>{day.emoji}</Text>
                            <Text style={styles.dayTempMax}>{day.tempMax}°</Text>
                            <Text style={styles.dayTempMin}>{day.tempMin}°</Text>
                            {day.rainChance >= 40 && (
                                <View style={styles.dayRainBadge}>
                                    <Text style={styles.dayRainText}>💧{day.rainChance}%</Text>
                                </View>
                            )}
                        </View>
                    ))}
                </View>

                {/* Rain warning */}
                {hasRainWarning && (
                    <View style={styles.warningBox}>
                        <Ionicons name="umbrella-outline" size={14} color="#fff" />
                        <Text style={styles.warningText}>
                            Yağış bekleniyor — kapalı mekân planlamayı unutma!
                        </Text>
                    </View>
                )}
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.md,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
    },
    gradientBg: {
        padding: SPACING.md + 4,
    },

    // Loading
    loadingContent: {
        alignItems: 'center',
        paddingVertical: SPACING.lg,
    },
    loadingText: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.sm,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 6,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.md,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    cityName: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.sm,
        color: '#fff',
        letterSpacing: 0.3,
    },
    weatherLabel: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: BORDER_RADIUS.full,
    },
    weatherLabelText: {
        fontFamily: FONTS.body,
        fontSize: 11,
        color: 'rgba(255,255,255,0.9)',
    },

    // Today
    todaySection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    todayLeft: {
        marginRight: SPACING.sm,
    },
    todayEmoji: {
        fontSize: 52,
    },
    todayCenter: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    todayTemp: {
        fontFamily: FONTS.heading,
        fontSize: 48,
        color: '#fff',
        letterSpacing: -2,
    },
    todayTempMin: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.lg,
        color: 'rgba(255,255,255,0.6)',
        marginLeft: 4,
    },
    todayRight: {
        alignItems: 'flex-end',
        gap: 6,
    },
    rainInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,255,255,0.18)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.full,
    },
    rainPercent: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: 12,
        color: '#fff',
    },
    windInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    windText: {
        fontFamily: FONTS.body,
        fontSize: 11,
        color: 'rgba(255,255,255,0.7)',
    },

    // Divider
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginBottom: SPACING.sm + 2,
    },

    // Forecast
    forecastRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    dayItem: {
        flex: 1,
        alignItems: 'center',
        gap: 3,
    },
    dayName: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: 11,
        color: 'rgba(255,255,255,0.7)',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    dayEmoji: {
        fontSize: 24,
        marginVertical: 2,
    },
    dayTempMax: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.sm,
        color: '#fff',
    },
    dayTempMin: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: 'rgba(255,255,255,0.55)',
    },
    dayRainBadge: {
        marginTop: 2,
    },
    dayRainText: {
        fontFamily: FONTS.body,
        fontSize: 10,
        color: 'rgba(255,255,255,0.8)',
    },

    // Warning
    warningBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.sm,
        marginTop: SPACING.sm + 2,
    },
    warningText: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: 'rgba(255,255,255,0.9)',
        flex: 1,
        lineHeight: 16,
    },
});

export default WeatherWidget;
