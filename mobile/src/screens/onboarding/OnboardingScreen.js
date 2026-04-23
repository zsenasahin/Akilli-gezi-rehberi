import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useFonts, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import SwipeToUnlock from '../../components/common/SwipeToUnlock';
import GlassmorphismCard from '../../components/common/GlassmorphismCard';
import { COLORS, SPACING } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

const ONBOARDING_DATA = [
  {
    tag: 'KEŞİF ZAMANI',
    title: 'Doğanın İçine Gir',
    subtitle: 'Keşfedilmemiş rotaları bul, doğayla bütünleş',
  },
  {
    tag: 'HAZIR MISIN?',
    title: 'Maceraya Başla',
    subtitle: 'Harita, rota ve rehberlik hep yanında',
    showIcons: true,
  },
  {
    tag: 'HEMEN BAŞLA',
    title: 'Rotanı Oluştur, Yola Çık.',
    subtitle: 'Kişiselleştirilmiş seyahat deneyimi',
    showSwipe: true,
  },
];

export default function OnboardingScreen({ navigation }) {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold,
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);

  if (!fontsLoaded) {
    return null;
  }

  const handleSwipeComplete = () => {
    navigation.replace('Auth');
  };

  const renderItem = ({ item }) => (
    <View style={styles.slide}>
      <View style={styles.content}>
        <Text style={styles.tag}>{item.tag}</Text>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>

        {item.showIcons && (
          <View style={styles.iconRow}>
            {['🗺️', '🧭', '🌲'].map((icon, i) => (
              <GlassmorphismCard key={i} style={styles.iconCard}>
                <Text style={styles.iconText}>{icon}</Text>
              </GlassmorphismCard>
            ))}
          </View>
        )}

        {item.showSwipe && (
          <SwipeToUnlock onComplete={handleSwipeComplete} />
        )}
      </View>
    </View>
  );

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {ONBOARDING_DATA.map((_, index) => {
        const inputRange = [
          (index - 1) * width,
          index * width,
          (index + 1) * width,
        ];

        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [8, 24, 8],
          extrapolate: 'clamp',
        });

        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.3, 1, 0.3],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                width: dotWidth,
                opacity,
              },
            ]}
          />
        );
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background Image */}
      <Image
        source={require('../../../assets/doga.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      {/* Gradient Overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0, 0, 0, 0.7)']}
        style={styles.gradient}
      />

      {/* Tree Silhouettes */}
      <View style={styles.treeSilhouettes}>
        <View style={[styles.tree, styles.tree1]} />
        <View style={[styles.tree, styles.tree2]} />
        <View style={[styles.tree, styles.tree3]} />
      </View>

      {/* Content */}
      <Animated.FlatList
        ref={flatListRef}
        data={ONBOARDING_DATA}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, index) => index.toString()}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      />

      {/* Dots Indicator */}
      {renderDots()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundDarkStart,
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  treeSilhouettes: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
  },
  tree: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
  },
  tree1: {
    width: 60,
    height: 150,
  },
  tree2: {
    width: 80,
    height: 180,
  },
  tree3: {
    width: 70,
    height: 160,
  },
  slide: {
    width,
    height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    marginBottom: 100,
  },
  tag: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: COLORS.primaryAccent,
    letterSpacing: 2,
    marginBottom: SPACING.md,
  },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 36,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.md,
    lineHeight: 44,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
  iconRow: {
    flexDirection: 'row',
    marginTop: SPACING.xl,
    gap: SPACING.md,
  },
  iconCard: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 32,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 80,
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primaryAccent,
  },
});
