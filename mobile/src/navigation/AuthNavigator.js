import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import { COLORS } from '../constants/colors';

const Stack = createNativeStackNavigator();

/**
 * Auth stack – shown when the user is NOT logged in.
 */
const AuthNavigator = () => (
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

export default AuthNavigator;
