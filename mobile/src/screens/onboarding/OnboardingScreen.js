import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { AUTH_IMAGES } from '../../constants/authAssets';
import { markOnboardingCompleted } from '../../utils/onboardingStorage';

export default function OnboardingScreen({ navigation }) {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const fadeTop = useRef(new Animated.Value(0)).current;
  const slideTop = useRef(new Animated.Value(-20)).current;
  const fadeBottom = useRef(new Animated.Value(0)).current;
  const slideBottom = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(fadeTop, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.spring(slideTop, { toValue: 0, tension: 65, friction: 12, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.sequence([
      Animated.delay(500),
      Animated.parallel([
        Animated.timing(fadeBottom, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.spring(slideBottom, { toValue: 0, tension: 65, friction: 12, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ImageBackground
        source={AUTH_IMAGES.onboardingHero}
        style={styles.bg}
        resizeMode="cover"
      >
        <LinearGradient
          colors={[
            'rgba(15, 20, 18, 0.55)',
            'rgba(15, 20, 18, 0.1)',
            'rgba(15, 20, 18, 0.35)',
            'rgba(15, 20, 18, 0.82)',
          ]}
          locations={[0, 0.35, 0.62, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        <Animated.View
          style={[
            styles.topContent,
            { opacity: fadeTop, transform: [{ translateY: slideTop }] },
          ]}
        >
          <View style={styles.badge}>
            <Ionicons name="airplane" size={11} color="rgba(255,255,255,0.85)" />
            <Text style={styles.badgeText}>AKILLI GEZİ REHBERİ</Text>
          </View>

          <Text style={styles.title}>Türkiye'yi{'\n'}Keşfet</Text>

          <Text style={styles.subtitle}>
            81 il, binlerce yer, sonsuz macera.{'\n'}Rotanı oluştur, yola çık.
          </Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.bottomContent,
            { opacity: fadeBottom, transform: [{ translateY: slideBottom }] },
          ]}
        >
          <TouchableOpacity
            style={styles.startBtn}
            onPress={async () => {
              await markOnboardingCompleted();
              navigation.replace('Auth');
            }}
            activeOpacity={0.88}
          >
            <Text style={styles.startBtnText}>Başla</Text>
            <View style={styles.arrowWrap}>
              <Ionicons name="arrow-forward" size={18} color="#1E2E28" />
            </View>
          </TouchableOpacity>

          <Text style={styles.note}>Ücretsiz · Hemen başla</Text>
        </Animated.View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a221e',
  },
  bg: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  topContent: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'ios' ? 66 : 48,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 22,
  },
  badgeText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 1.3,
  },
  title: {
    fontFamily: FONTS.bodyBold,
    fontSize: 52,
    color: '#FFFFFF',
    lineHeight: 60,
    marginBottom: 14,
    letterSpacing: -1.5,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.md,
    color: 'rgba(255,255,255,0.78)',
    lineHeight: 24,
  },
  bottomContent: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 50 : 34,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 8,
  },
  startBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.lg,
    color: '#1E2E28',
    letterSpacing: 0.3,
  },
  arrowWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  note: {
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    marginTop: 14,
    letterSpacing: 0.3,
  },
});
