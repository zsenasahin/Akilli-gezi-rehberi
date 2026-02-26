import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import LoadingSpinner from '../components/common/LoadingSpinner';

/**
 * Root navigator – switches between Auth and Main stacks
 * based on the user's authentication state.
 */
const AppNavigator = () => {
    const { session, isLoading } = useAuth();

    // Show a loading screen while checking for an existing session
    if (isLoading) {
        return <LoadingSpinner message="Uygulama yükleniyor..." />;
    }

    return (
        <NavigationContainer>
            {session ? <MainNavigator /> : <AuthNavigator />}
        </NavigationContainer>
    );
};

export default AppNavigator;
