import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import LottieView from 'lottie-react-native';
import { FONTS, FONT_SIZES } from '../../constants/typography';

const { width, height } = Dimensions.get('window');

export default function OnboardingScreen({ navigation }) {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const fadeTop     = useRef(new Animated.Value(0)).current;
  const slideTop    = useRef(new Animated.Value(-20)).current;
  const fadeBottom  = useRef(new Animated.Value(0)).current;
  const slideBottom = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(350),
      Animated.parallel([
        Animated.timing(fadeTop,  { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.spring(slideTop, { toValue: 0, tension: 65, friction: 12, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.sequence([
      Animated.delay(600),
      Animated.parallel([
        Animated.timing(fadeBottom,  { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.spring(slideBottom, { toValue: 0, tension: 65, friction: 12, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Tren animasyonu — tam ekran */}
      <LottieView
        source={require('../../../assets/animations/Background Full Screen-Train.json')}
        autoPlay
        loop
        style={styles.bgLottie}
        resizeMode="cover"
      />

      {/* Üst ve alt kısımları hafifçe karartır, ortayı açık bırakır */}
      <LinearGradient
        colors={[
          'rgba(8,12,28,0.72)',
          'rgba(8,12,28,0.0)',
          'rgba(8,12,28,0.0)',
          'rgba(8,12,28,0.55)',
        ]}
        locations={[0, 0.28, 0.65, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ── ÜST: Badge + Başlık + Alt yazı ── */}
      <Animated.View
        style={[
          styles.topContent,
          { opacity: fadeTop, transform: [{ translateY: slideTop }] },
        ]}
      >
        {/* Badge */}
        <View style={styles.badge}>
          <Ionicons name="airplane" size={11} color="rgba(255,255,255,0.75)" />
          <Text style={styles.badgeText}>AKILLI GEZİ REHBERİ</Text>
        </View>

        {/* Başlık */}
        <Text style={styles.title}>Türkiye'yi{'\n'}Keşfet</Text>

        {/* Alt yazı */}
        <Text style={styles.subtitle}>
          81 il, binlerce yer, sonsuz macera.{'\n'}Rotanı oluştur, yola çık.
        </Text>
      </Animated.View>

      {/* ── ALT: Buton ── */}
      <Animated.View
        style={[
          styles.bottomContent,
          { opacity: fadeBottom, transform: [{ translateY: slideBottom }] },
        ]}
      >
        <TouchableOpacity
          style={styles.startBtn}
          onPress={() => navigation.replace('Auth')}
          activeOpacity={0.82}
        >
          <BlurView intensity={55} tint="light" style={styles.blurWrap}>
            <View style={styles.btnInner}>
              <Text style={styles.startBtnText}>Başla</Text>
              <View style={styles.arrowWrap}>
                <Ionicons name="arrow-forward" size={18} color="rgba(8,12,28,0.85)" />
              </View>
            </View>
          </BlurView>
        </TouchableOpacity>

        <Text style={styles.note}>Ücretsiz · Kayıt gerekmez</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C1020',
  },

  bgLottie: {
    position: 'absolute',
    width,
    height,
    top: 0,
    left: 0,
  },

  // ── ÜST İÇERİK ──
  topContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'ios' ? 66 : 48,
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 22,
  },
  badgeText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1.3,
  },

  title: {
    fontFamily: FONTS.bodyBold,
    fontSize: 52,
    color: '#FFFFFF',
    lineHeight: 60,
    marginBottom: 14,
    letterSpacing: -1.5,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },

  subtitle: {
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.md,
    color: 'rgba(255,255,255,0.62)',
    lineHeight: 24,
  },

  // ── ALT İÇERİK ──
  bottomContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 50 : 34,
    alignItems: 'center',
  },

  // Glassmorphism buton — gölgesiz, temiz
  startBtn: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  blurWrap: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 18,
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 19,
    paddingHorizontal: 26,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  startBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.lg,
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  arrowWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  note: {
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 14,
    letterSpacing: 0.3,
  },
});
