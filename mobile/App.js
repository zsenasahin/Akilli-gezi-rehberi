import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { PlayfairDisplay_500Medium, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import LoadingSpinner from './src/components/common/LoadingSpinner';

/**
 * Root component – wraps the entire app in:
 *   1. GestureHandlerRootView (required by react-native-gesture-handler on Android)
 *   2. Font loading (Inter + Playfair Display)
 *   3. AuthProvider (session/user state for all screens)
 */
export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    PlayfairDisplay_500Medium,
    PlayfairDisplay_700Bold,
  });

  if (!fontsLoaded) {
    return <LoadingSpinner message="Yükleniyor..." />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <StatusBar style="light" />
        <AppNavigator />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
