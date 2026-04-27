import React, { useState, useEffect } from 'react';
import {
    TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { getCityVisitStatus, toggleCityVisit } from '../../services/cityVisitService';

/**
 * VisitToggle — Şehir ziyaret durumu toggle bileşeni.
 *
 * Durum döngüsü: none → visited → wishlist → none
 *
 * @param {number}  cityId
 * @param {string}  cityName
 * @param {string}  userId
 * @param {boolean} compact  - true: CityCard'da küçük ikon, false: tam buton
 */
const STATUS_CYCLE = { none: 'visited', visited: 'wishlist', wishlist: 'none' };

const STATUS_CONFIG = {
    none:     { color: '#94A3B8', icon: 'bookmark-outline', label: 'Ekle' },
    visited:  { color: '#22C55E', icon: 'checkmark-circle', label: 'Gittim ✓' },
    wishlist: { color: '#EF4444', icon: 'heart',            label: 'Gitmek İstiyorum ♡' },
};

const VisitToggle = ({ cityId, cityName, userId, compact = false }) => {
    const [status, setStatus] = useState('none');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!userId || !cityId) return;
        getCityVisitStatus(userId, cityId).then(({ status: s }) => {
            setStatus(s || 'none');
        });
    }, [userId, cityId]);

    const handlePress = async () => {
        if (!userId) {
            Alert.alert('Giriş Gerekli', 'Şehirleri işaretlemek için giriş yapmalısınız.');
            return;
        }

        const nextStatus = STATUS_CYCLE[status];
        const prevStatus = status;

        // Optimistic update
        setStatus(nextStatus);
        setLoading(true);

        const { status: resultStatus, error } = await toggleCityVisit(
            userId,
            cityId,
            nextStatus === 'none' ? prevStatus : nextStatus  // 'none' → mevcut status ile sil
        );

        setLoading(false);

        if (error) {
            // Rollback
            setStatus(prevStatus);
            Alert.alert('Hata', 'İşlem gerçekleştirilemedi. Lütfen tekrar deneyin.');
            return;
        }

        setStatus(resultStatus || 'none');
    };

    const config = STATUS_CONFIG[status] || STATUS_CONFIG.none;

    if (compact) {
        return (
            <TouchableOpacity
                style={[styles.compactBtn, { borderColor: config.color }]}
                onPress={handlePress}
                activeOpacity={0.75}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
                {loading ? (
                    <ActivityIndicator size="small" color={config.color} />
                ) : (
                    <Ionicons name={config.icon} size={16} color={config.color} />
                )}
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            style={[styles.fullBtn, { borderColor: config.color, backgroundColor: config.color + '18' }]}
            onPress={handlePress}
            activeOpacity={0.8}
        >
            {loading ? (
                <ActivityIndicator size="small" color={config.color} />
            ) : (
                <>
                    <Ionicons name={config.icon} size={16} color={config.color} />
                    <Text style={[styles.fullBtnText, { color: config.color }]}>{config.label}</Text>
                </>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    compactBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 1.5,
        backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1.5,
    },
    fullBtnText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.sm,
    },
});

export default VisitToggle;
