import React from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { SPACING } from '../../constants/layout';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const TOP_EXPANDED = SCREEN_HEIGHT * 0.32;
const TOP_COMPACT = SCREEN_HEIGHT * 0.12;

/**
 * Üstte tam genişlik fotoğraf, altta opak beyaz form kartı.
 */
export default function AuthFormLayout({
  imageSource,
  keyboardVisible = false,
  children,
  statusBarStyle,
}) {
  const insets = useSafeAreaInsets();
  const topHeight = keyboardVisible ? TOP_COMPACT : TOP_EXPANDED;
  const barStyle = statusBarStyle ?? (keyboardVisible ? 'dark' : 'light');

  return (
    <View style={styles.container}>
      <StatusBar style={barStyle} />

      <View style={[styles.topSection, { height: topHeight }]}>
        <Image source={imageSource} style={styles.heroImage} resizeMode="cover" />
        <LinearGradient
          colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.45)']}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.bottomWrap}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <View style={styles.card}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + SPACING.xl },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  topSection: {
    width: '100%',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  bottomWrap: {
    flex: 1,
    marginTop: -28,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 12,
    overflow: 'hidden',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
  },
});
