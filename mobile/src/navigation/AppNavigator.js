import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import LoadingSpinner from '../components/common/LoadingSpinner';

const RootStack = createNativeStackNavigator();

/**
 * AppNavigator — Misafir Modu Destekli
 *
 * Uygulama her zaman MainNavigator ile açılır.
 * Giriş/Kayıt ekranları "AuthModal" adlı bir modal stack içinde
 * sunulur; korumalı herhangi bir işlemde bu route'a navigate edilir.
 *
 * Kullanıcı giriş yaparsa AuthNavigator'daki listener session'ı
 * günceller ve modal stack otomatik olarak kapanır.
 */
const AppNavigator = () => {
    const { isLoading } = useAuth();

    if (isLoading) {
        return <LoadingSpinner message="Uygulama yükleniyor..." />;
    }

    return (
        <NavigationContainer>
            <RootStack.Navigator screenOptions={{ headerShown: false }}>
                {/* Ana uygulama — misafirler de erişebilir */}
                <RootStack.Screen name="App" component={MainNavigator} />
                {/* Giriş / Kayıt — modal olarak üzerine açılır */}
                <RootStack.Screen
                    name="AuthModal"
                    component={AuthNavigator}
                    options={{
                        presentation: 'modal',
                        animation: 'slide_from_bottom',
                    }}
                />
            </RootStack.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigator;
