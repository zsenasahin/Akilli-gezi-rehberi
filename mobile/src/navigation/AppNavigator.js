import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { COLORS } from '../constants/colors';
import { useThemePreference } from '../contexts/ThemeContext';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import LoadingSpinner from '../components/common/LoadingSpinner';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import { hasCompletedOnboarding } from '../utils/onboardingStorage';

const RootStack = createNativeStackNavigator();

// Tema değişiminde navigator yeniden oluşturulurken kullanıcının ekranı korunur.
let savedNavigationState;

const AppNavigator = () => {
    const { isLoading, session } = useAuth();
    const { theme } = useThemePreference();
    const [onboardingReady, setOnboardingReady] = useState(false);
    const [skipOnboarding, setSkipOnboarding] = useState(false);

    useEffect(() => {
        let mounted = true;
        hasCompletedOnboarding()
            .then((done) => {
                if (mounted) {
                    setSkipOnboarding(done);
                    setOnboardingReady(true);
                }
            })
            .catch(() => {
                if (mounted) {
                    setSkipOnboarding(false);
                    setOnboardingReady(true);
                }
            });
        return () => {
            mounted = false;
        };
    }, []);

    if (isLoading || !onboardingReady) {
        return <LoadingSpinner message="Uygulama yükleniyor..." />;
    }

    const linking = {
        prefixes: ['smarttravelguide://'],
        config: {
            screens: {
                App: {
                    screens: {
                        Home: {
                            screens: {
                                ItineraryDetail: 'itinerary/:itineraryId',
                            },
                        },
                        Saved: {
                            screens: {
                                ItineraryDetail: 'itinerary/:itineraryId',
                            },
                        },
                    },
                },
            },
        },
    };

    return (
        <NavigationContainer
            linking={linking}
            theme={navigationTheme(theme.isDark)}
            initialState={savedNavigationState}
            onStateChange={(state) => { savedNavigationState = state; }}
        >
            <RootStack.Navigator screenOptions={{ headerShown: false }}>
                {session ? (
                    <RootStack.Screen name="App" component={MainNavigator} />
                ) : skipOnboarding ? (
                    <RootStack.Screen
                        name="Auth"
                        component={AuthNavigator}
                        options={{ animation: 'fade' }}
                    />
                ) : (
                    <>
                        <RootStack.Screen
                            name="Onboarding"
                            component={OnboardingScreen}
                            options={{ animation: 'fade' }}
                        />
                        <RootStack.Screen
                            name="Auth"
                            component={AuthNavigator}
                            options={{ animation: 'slide_from_bottom' }}
                        />
                    </>
                )}
            </RootStack.Navigator>
        </NavigationContainer>
    );
};

// Ekran geçişlerinde beyaz/siyah parlama olmaması için gezinme teması da paletten gelir.
const navigationTheme = (isDark) => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
        ...base,
        colors: {
            ...base.colors,
            primary: COLORS.primary,
            background: COLORS.background,
            card: COLORS.surface,
            text: COLORS.textPrimary,
            border: COLORS.border,
        },
    };
};

export default AppNavigator;
