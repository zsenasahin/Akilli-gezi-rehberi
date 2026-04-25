import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import LoadingSpinner from '../components/common/LoadingSpinner';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';

const RootStack = createNativeStackNavigator();

/**
 * AppNavigator
 *
 * - Giriş yapılmışsa doğrudan ana uygulama açılır.
 * - Giriş yapılmamışsa onboarding ekranı gösterilir.
 * - Onboarding sonrası kullanıcı auth akışına geçer.
 */
const AppNavigator = () => {
    const { isLoading, session } = useAuth();

    if (isLoading) {
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
        <NavigationContainer linking={linking}>
            <RootStack.Navigator screenOptions={{ headerShown: false }}>
                {session ? (
                    <RootStack.Screen name="App" component={MainNavigator} />
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
                            options={{
                                animation: 'slide_from_bottom',
                            }}
                        />
                    </>
                )}
            </RootStack.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigator;
