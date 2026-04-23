import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import AuthScreen from '../screens/auth/AuthScreen';
import { useAuth } from '../contexts/AuthContext';

/**
 * Auth screen — Login ve Register tek ekranda tab ile geçiş yapılır.
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

    return <AuthScreen />;
};

export default AuthNavigator;
