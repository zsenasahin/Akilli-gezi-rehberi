import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider, useThemePreference } from './src/contexts/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import LoadingSpinner from './src/components/common/LoadingSpinner';
import { initPrefetch } from './src/services/prefetchService';

/**
 * Root component – wraps the entire app in:
 *   1. GestureHandlerRootView (required by react-native-gesture-handler on Android)
 *   2. SafeAreaProvider (provides safe area insets to all screens)
 *   3. Font loading (Inter + Playfair Display)
 *   4. AuthProvider (session/user state for all screens)
 */
export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  React.useEffect(() => {
    initPrefetch();
  }, []);

  if (!fontsLoaded) {
    return <LoadingSpinner message="Yükleniyor..." />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ThemeProvider>
            <ThemedApp />
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Tema değişince tüm ağaç yeniden çizilir (key), böylece temalı stiller yeni
 * renkleri alır. Gezinme durumu AppNavigator içinde saklandığı için kullanıcı
 * bulunduğu ekranda kalır.
 */
function ThemedApp() {
  const { theme } = useThemePreference();
  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <AppNavigator key={theme.key} />
    </>
  );
}
