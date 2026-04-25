import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import AuthScreen from '../screens/auth/AuthScreen';
import PasswordResetScreen from '../screens/auth/PasswordResetScreen';
import { useAuth } from '../contexts/AuthContext';

const AuthStack = createNativeStackNavigator();

/**
 * Auth Navigator — Login, Register ve Password Reset ekranlarını yönetir.
 * Giriş başarılı olduğunda session değişir ve otomatik ana ekrana geçer.
 */
const AuthNavigator = () => {
    const { session } = useAuth();
    const navigation = useNavigation();

    // Kullanıcı giriş yapınca ana ekrana geç
    useEffect(() => {
        if (session) {
            navigation.goBack();
        }
    }, [session, navigation]);

    return (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
            <AuthStack.Screen name="Auth" component={AuthScreen} />
            <AuthStack.Screen 
                name="PasswordReset" 
                component={PasswordResetScreen}
                options={{ animation: 'slide_from_right' }}
            />
        </AuthStack.Navigator>
    );
};

export default AuthNavigator;
