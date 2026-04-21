/**
 * WeatherWidget — Premium glassmorphism 5 günlük hava durumu kartı
 *
 * Open-Meteo API (ücretsiz, kayıtsız) üzerinden alınan verileri gösterir.
 * CityDetailScreen'e gömülür.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, ActivityIndicator, Animated, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/layout';
import { getWeatherForecast, getDayLabel } from '../../services/weatherService';

// Hava durumuna göre gradient renkleri - daha canlı ve modern
const getWeatherGradient = (emoji) => {
    if (emoji === '☀️') return ['#F59E0B', '#EF4444', '#DC2626'];
    if (emoji === '⛅' || emoji === '🌤️') return ['#38BDF8', '#3B82F6', '#6366F1'];
    if (emoji === '☁️') return ['#94A3B8', '#64748B', '#475569'];
    if (emoji === '🌧️' || emoji === '🌦️') return ['#60A5FA', '#3B82F6', '#1D4ED8'];
    if (emoji === '⛈️') return ['#6366F1', '#4F46E5', '#4338CA'];
    if (emoji === '❄️') return ['#93C5FD', '#60A5FA', '#3B82F6'];
    return ['#38BDF8', '#3B82F6', '#6366F1'];
};

// Hava durumu ikonu
const getWeatherIcon = (emoji) => {
    if (emoji === '☀️') return 'sunny';
    if (emoji === '⛅' || emoji === '🌤️') return 'partly-sunny';
    if (emoji === '☁️') return 'cloudy';
    if (emoji === '🌧️' || emoji === '🌦️') return 'rainy';
    if (emoji === '⛈️') return 'thunderstorm';
    if (emoji === '❄️') return 'snow';
    return 'partly-sunny';
};

const WeatherWidget = ({ cityName }) => {
    const [forecast, setForecast] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        if (!cityName) return;
        setLoading(true);
        getWeatherForecast(cityName).then(({ data, error: err }) => {
            if (err) setError(err);
            else setForecast(data);
            setLoading(false);

            // Animasyon
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 500,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 500,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
            ]).start();
        });
    }, [cityName]);

    if (loading) {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={['#38BDF8', '#3B82F6', '#6366F1']}
                    style={styles.gradientBg}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={styles.glassOverlay} />
                    <View style={styles.loadingContent}>
                        <View style={styles.loadingIconWrap}>
                            <Ionicons name="cloud-outline" size={28} color="#fff" />
                        </View>
                        <Text style={styles.loadingText}>Hava durumu yükleniyor...</Text>
                        <ActivityIndicator size="small" color="rgba(255,255,255,0.9)" style={{ marginTop: 12 }} />
                    </View>
                </LinearGradient>
            </View>
        );
    }

    if (error || !forecast) return null;

    const today = forecast[0];
    const hasRainWarning = forecast.some(d => d.rainChance >= 60);
    const gradient = getWeatherGradient(today.emoji);
    const weatherIcon = getWeatherIcon(today.emoji);

    return (
        <Animated.View style={[
            styles.container,
            {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
            }
        ]}>
            <LinearGradient
                colors={gradient}
                style={styles.gradientBg}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                {/* Glass overlay effect */}
                <View style={styles.glassOverlay} />

                {/* Decorative circles */}
                <View style={styles.decorCircle1} />
                <View style={styles.decorCircle2} />

                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <View style={styles.locationBadge}>
                            <Ionicons name="location" size={12} color="#fff" />
                            <Text style={styles.cityName}>{cityName}</Text>
                        </View>
                    </View>
                    <View style={styles.dateBadge}>
                        <Text style={styles.dateText}>Bugün</Text>
                    </View>
                </View>

                {/* Today's weather — large display */}
                <View style={styles.todaySection}>
                    <View style={styles.todayMain}>
                        <View style={styles.iconWrapper}>
                            <Ionicons name={weatherIcon} size={64} color="#fff" />
                        </View>
                        <View style={styles.tempWrapper}>
                            <Text style={styles.todayTemp}>{today.tempMax}°</Text>
                            <Text style={styles.todayTempMin}>/{today.tempMin}°</Text>
                        </View>
                    </View>

                    <View style={styles.todayDetails}>
                        <View style={styles.weatherBadge}>
                            <Text style={styles.weatherLabel}>{today.label}</Text>
                        </View>

                        <View style={styles.statsRow}>
                            {today.rainChance > 0 && (
                                <View style={styles.statItem}>
                                    <Ionicons name="water" size={16} color="rgba(255,255,255,0.9)" />
                                    <Text style={styles.statValue}>{today.rainChance}%</Text>
                                    <Text style={styles.statLabel}>Yağış</Text>
                                </View>
                            )}
                            {today.windSpeed && (
                                <View style={styles.statItem}>
                                    <Ionicons name="leaf" size={16} color="rgba(255,255,255,0.9)" />
                                    <Text style={styles.statValue}>{today.windSpeed}</Text>
                                    <Text style={styles.statLabel}>km/s</Text>
                                </View>
                            )}
                            <View style={styles.statItem}>
                                <Ionicons name="thermometer" size={16} color="rgba(255,255,255,0.9)" />
                                <Text style={styles.statValue}>{Math.round((today.tempMax + today.tempMin) / 2)}°</Text>
                                <Text style={styles.statLabel}>Ortalama</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* 4-day forecast */}
                <View style={styles.forecastSection}>
                    <View style={styles.forecastHeader}>
                        <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.7)" />
                        <Text style={styles.forecastTitle}>5 Günlük Tahmin</Text>
                    </View>
                    <View style={styles.forecastRow}>
                        {forecast.slice(1).map((day, index) => (
                            <View
                                key={day.date}
                                style={[
                                    styles.dayItem,
                                    index === 0 && styles.dayItemFirst
                                ]}
                            >
                                <Text style={styles.dayName}>{getDayLabel(day.date)}</Text>
                                <View style={styles.dayIconWrap}>
                                    <Ionicons
                                        name={getWeatherIcon(day.emoji)}
                                        size={24}
                                        color="#fff"
                                    />
                                </View>
                                <View style={styles.dayTemps}>
                                    <Text style={styles.dayTempMax}>{day.tempMax}°</Text>
                                    <Text style={styles.dayTempMin}>{day.tempMin}°</Text>
                                </View>
                                {day.rainChance >= 40 && (
                                    <View style={styles.dayRainBadge}>
                                        <Ionicons name="water" size={10} color="rgba(255,255,255,0.9)" />
                                        <Text style={styles.dayRainText}>{day.rainChance}%</Text>
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                </View>

                {/* Rain warning */}
                {hasRainWarning && (
                    <View style={styles.warningBox}>
                        <View style={styles.warningIconWrap}>
                            <Ionicons name="umbrella" size={16} color="#fff" />
                        </View>
                        <Text style={styles.warningText}>
                            Yağış bekleniyor - kapalı mekan alternatifleri planlamayı unutma!
                        </Text>
                    </View>
                )}
            </LinearGradient>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.lg,
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 12,
    },
    gradientBg: {
        padding: SPACING.lg,
        position: 'relative',
        overflow: 'hidden',
    },
    glassOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },

    // Decorative elements
    decorCircle1: {
        position: 'absolute',
        top: -40,
        right: -40,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    decorCircle2: {
        position: 'absolute',
        bottom: -30,
        left: -30,
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },

    // Loading
    loadingContent: {
        alignItems: 'center',
        paddingVertical: SPACING.xl,
    },
    loadingIconWrap: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    loadingText: {
        fontFamily: FONTS.bodyMedium,
        fontSize: FONT_SIZES.sm,
        color: 'rgba(255,255,255,0.9)',
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.md,
        zIndex: 1,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    locationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: BORDER_RADIUS.full,
    },
    cityName: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.sm,
        color: '#fff',
        letterSpacing: 0.3,
    },
    dateBadge: {
        backgroundColor: 'rgba(0,0,0,0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.full,
    },
    dateText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: 11,
        color: 'rgba(255,255,255,0.9)',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // Today
    todaySection: {
        marginBottom: SPACING.lg,
        zIndex: 1,
    },
    todayMain: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    iconWrapper: {
        width: 100,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 28,
        marginRight: SPACING.md,
    },
    tempWrapper: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    todayTemp: {
        fontFamily: FONTS.heading,
        fontSize: 72,
        color: '#fff',
        letterSpacing: -3,
        lineHeight: 80,
    },
    todayTempMin: {
        fontFamily: FONTS.bodyMedium,
        fontSize: FONT_SIZES.xl,
        color: 'rgba(255,255,255,0.6)',
        marginLeft: 2,
    },
    todayDetails: {
        gap: SPACING.sm,
    },
    weatherBadge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: BORDER_RADIUS.full,
    },
    weatherLabel: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.sm,
        color: '#fff',
    },
    statsRow: {
        flexDirection: 'row',
        gap: SPACING.lg,
    },
    statItem: {
        alignItems: 'center',
        gap: 2,
    },
    statValue: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.md,
        color: '#fff',
    },
    statLabel: {
        fontFamily: FONTS.body,
        fontSize: 10,
        color: 'rgba(255,255,255,0.7)',
    },

    // Forecast
    forecastSection: {
        backgroundColor: 'rgba(0,0,0,0.15)',
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        zIndex: 1,
    },
    forecastHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: SPACING.sm,
    },
    forecastTitle: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.xs,
        color: 'rgba(255,255,255,0.7)',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    forecastRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    dayItem: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: SPACING.xs,
    },
    dayItemFirst: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: BORDER_RADIUS.md,
        marginHorizontal: -4,
        paddingHorizontal: 4,
    },
    dayName: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: 11,
        color: 'rgba(255,255,255,0.8)',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    dayIconWrap: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    dayTemps: {
        alignItems: 'center',
    },
    dayTempMax: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.sm,
        color: '#fff',
    },
    dayTempMin: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: 'rgba(255,255,255,0.5)',
    },
    dayRainBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: BORDER_RADIUS.full,
        marginTop: 4,
    },
    dayRainText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: 9,
        color: '#fff',
    },

    // Warning
    warningBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginTop: SPACING.md,
        zIndex: 1,
    },
    warningIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    warningText: {
        fontFamily: FONTS.bodyMedium,
        fontSize: FONT_SIZES.xs,
        color: 'rgba(255,255,255,0.95)',
        flex: 1,
        lineHeight: 18,
    },
});

export default WeatherWidget;
