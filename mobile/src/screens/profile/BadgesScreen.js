import React, { useCallback, useState } from 'react';
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { getItinerariesByUser } from '../../services/itineraryService';
import { buildBadges } from '../../services/achievementService';
import { FONTS } from '../../constants/typography';
import { SPACING } from '../../constants/layout';
import { useThemePreference } from '../../contexts/ThemeContext';
import ConfettiOverlay from '../../components/common/ConfettiOverlay';
import BadgeEarnedModal from '../../components/common/BadgeEarnedModal';

const BadgeMedal = ({ badge, theme }) => (
    <View style={[styles.badgeCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, opacity: badge.earned ? 1 : 0.52 }]}>
        <View style={[styles.medalRing, { backgroundColor: badge.ring }]}>
            <View style={[styles.medalCore, { backgroundColor: badge.color }]}>
                <Ionicons name={badge.icon} size={24} color="#fff" />
            </View>
            <View style={[styles.ribbonLeft, { backgroundColor: badge.color }]} />
            <View style={[styles.ribbonRight, { backgroundColor: badge.color }]} />
        </View>
        <Text style={[styles.badgeLabel, { color: theme.colors.text }]}>{badge.label}</Text>
        <Text style={[styles.badgeMeta, { color: theme.colors.textSecondary }]}>{badge.description}</Text>
    </View>
);

const BadgesScreen = ({ navigation }) => {
    const { user } = useAuth();
    const { theme } = useThemePreference();
    const [badges, setBadges] = useState([]);
    const [stats, setStats] = useState({ completedPlans: 0, completedCities: 0, totalCompletedDistance: 0 });
    const [refreshing, setRefreshing] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [pendingBadge, setPendingBadge] = useState(null);
    const [newlyEarnedBadge, setNewlyEarnedBadge] = useState(null);
    const [prevEarnedCount, setPrevEarnedCount] = useState(null);

    const loadBadges = useCallback(async () => {
        if (!user) return;
        const { data } = await getItinerariesByUser(user.id);
        const next = buildBadges(data || []);
        setBadges(next.badges);
        setStats(next.stats);
        setRefreshing(false);

        const earned = next.badges.filter(b => b.earned);
        const earnedCount = earned.length;
        
        if (prevEarnedCount !== null && earnedCount > prevEarnedCount) {
            // En son kazanılan rozeti bul (basitçe sonuncusu)
            setPendingBadge(earned[earnedCount - 1]);
            setShowConfetti(true);
        }
        setPrevEarnedCount(earnedCount);
    }, [user, prevEarnedCount]);

    useFocusEffect(useCallback(() => {
        loadBadges();
    }, [loadBadges]));

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.colors.surfaceSoft }]} onPress={() => navigation.goBack()} activeOpacity={0.82}>
                    <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
                </TouchableOpacity>
                <View>
                    <Text style={[styles.title, { color: theme.colors.text }]}>Rozetlerim</Text>
                    <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                        {badges.filter((item) => item.earned).length} / {badges.length} kazanıldı
                    </Text>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadBadges(); }} tintColor={theme.colors.primary} />}
            >
                <View style={[styles.summary, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <SummaryStat value={stats.completedPlans} label="Tamamlanan plan" theme={theme} />
                    <SummaryStat value={stats.completedCities} label="Gezilen şehir" theme={theme} />
                    <SummaryStat value={`${stats.totalCompletedDistance} km`} label="Toplam rota" theme={theme} />
                </View>

                <View style={styles.grid}>
                    {badges.map((badge) => (
                        <BadgeMedal key={badge.key} badge={badge} theme={theme} />
                    ))}
                </View>
            </ScrollView>
            <ConfettiOverlay 
                visible={showConfetti} 
                onAnimationFinish={() => {
                    setShowConfetti(false);
                    if (pendingBadge) {
                        setNewlyEarnedBadge(pendingBadge);
                        setPendingBadge(null);
                    }
                }} 
            />
            <BadgeEarnedModal
                visible={!!newlyEarnedBadge}
                badge={newlyEarnedBadge}
                onClose={() => setNewlyEarnedBadge(null)}
                onAction={() => setNewlyEarnedBadge(null)}
            />
        </SafeAreaView>
    );
};

const SummaryStat = ({ value, label, theme }) => (
    <View style={styles.summaryItem}>
        <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{value}</Text>
        <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: SPACING.md, paddingTop: 10, paddingBottom: 12 },
    backBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
    title: { fontFamily: FONTS.heading, fontSize: 26 },
    subtitle: { marginTop: 3, fontFamily: FONTS.body, fontSize: 13 },
    content: { padding: SPACING.md, paddingBottom: 120 },
    summary: { flexDirection: 'row', justifyContent: 'space-between', borderWidth: 1, borderRadius: 24, padding: 18, marginBottom: 16 },
    summaryItem: { flex: 1, alignItems: 'center' },
    summaryValue: { fontFamily: FONTS.heading, fontSize: 24, textAlign: 'center' },
    summaryLabel: { marginTop: 4, fontFamily: FONTS.body, fontSize: 12, textAlign: 'center' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 14 },
    badgeCard: { width: '47.8%', borderRadius: 22, borderWidth: 1, paddingVertical: 18, paddingHorizontal: 14, alignItems: 'center' },
    medalRing: { width: 82, height: 82, borderRadius: 41, alignItems: 'center', justifyContent: 'center', marginBottom: 14, position: 'relative' },
    medalCore: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
    ribbonLeft: { position: 'absolute', bottom: -12, left: 20, width: 16, height: 26, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, transform: [{ rotate: '10deg' }] },
    ribbonRight: { position: 'absolute', bottom: -12, right: 20, width: 16, height: 26, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, transform: [{ rotate: '-10deg' }] },
    badgeLabel: { fontFamily: FONTS.bodySemiBold, fontSize: 15, textAlign: 'center' },
    badgeMeta: { marginTop: 6, fontFamily: FONTS.body, fontSize: 12, lineHeight: 17, textAlign: 'center' },
});

export default BadgesScreen;
