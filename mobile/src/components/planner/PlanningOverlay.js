import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import LottieView from 'lottie-react-native';
import Animated, { FadeIn, FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/layout';
import { createThemedStyles } from '../../utils/themedStyles';

const MESSAGES = [
    'Yakın yerler bölgelere ayrılıyor…',
    'Günlere en uygun dağılım aranıyor…',
    'Kapanış saatleri kontrol ediliyor…',
    'En kısa rota hesaplanıyor…',
    'Öğle arası yerleştiriliyor…',
];

/** Plan hazırlanırken gösterilen animasyonlu tam ekran katman. */
export default function PlanningOverlay({ visible, cityName }) {
    const [messageIndex, setMessageIndex] = useState(0);

    useEffect(() => {
        if (!visible) { setMessageIndex(0); return undefined; }
        const timer = setInterval(() => setMessageIndex(index => (index + 1) % MESSAGES.length), 1100);
        return () => clearInterval(timer);
    }, [visible]);

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
            <View style={styles.backdrop}>
                <Animated.View entering={FadeIn.duration(300)} style={styles.card}>
                    <LottieView
                        source={require('../../../assets/animations/Travel is fun.json')}
                        autoPlay
                        loop
                        style={styles.animation}
                    />
                    <Text style={styles.title}>{cityName ? `${cityName} planın hazırlanıyor` : 'Planın hazırlanıyor'}</Text>
                    <Animated.Text
                        key={messageIndex}
                        entering={FadeInUp.duration(300)}
                        exiting={FadeOutUp.duration(200)}
                        style={styles.message}
                    >
                        {MESSAGES[messageIndex]}
                    </Animated.Text>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = createThemedStyles(() => ({
    backdrop: { flex: 1, backgroundColor: 'rgba(21,27,18,0.55)', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
    card: {
        width: '100%', maxWidth: 340,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        alignItems: 'center',
    },
    animation: { width: 200, height: 160 },
    title: { fontFamily: FONTS.heading, fontSize: FONT_SIZES.lg, color: COLORS.textPrimary, marginTop: SPACING.sm, textAlign: 'center' },
    message: { fontFamily: FONTS.body, fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: SPACING.xs, textAlign: 'center' },
}));
