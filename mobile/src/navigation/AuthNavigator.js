import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';

const Stack = createNativeStackNavigator();

/**
 * Auth modal stack — Login ve Register ekranlarını içerir.
 * Giriş başarılı olduğunda session değişir ve modal otomatik kapanır.
 */
const AuthNavigator = () => {
    const { session } = useAuth();
    const navigation = useNavigation();

    // Kullanıcı giriş yapınca modal'ı kapat
    useEffect(() => {
        if (session) {
            navigation.goBack();
        }
    }, [session, navigation]);

    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: COLORS.background },
            }}
        >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Navigator>
    );
};

export default AuthNavigator;
