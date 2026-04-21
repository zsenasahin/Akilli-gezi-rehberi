import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONTS } from '../constants/typography';
import { SPACING, BORDER_RADIUS } from '../constants/layout';
import { useAuth } from '../contexts/AuthContext';

// Screens
import HomeScreen from '../screens/home/HomeScreen';
import CityDetailScreen from '../screens/discover/CityDetailScreen';
import CreateItineraryScreen from '../screens/itinerary/CreateItineraryScreen';
import ItineraryResultScreen from '../screens/itinerary/ItineraryResultScreen';
import SavedItinerariesScreen from '../screens/itinerary/SavedItinerariesScreen';
import ItineraryDetailScreen from '../screens/itinerary/ItineraryDetailScreen';
import FavoritesScreen from '../screens/favorites/FavoritesScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import MapScreen from '../screens/map/MapScreen';
import TravelAssistantScreen from '../screens/assistant/TravelAssistantScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const SavedStack = createNativeStackNavigator();
const FavoritesStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

// ─── Misafir Engeli — korumalı tab'larda gösterilir ────────────────────────
const GuestGate = ({ icon, title, description }) => {
    const navigation = useNavigation();
    return (
        <View style={guestStyles.container}>
            <View style={guestStyles.iconWrap}>
                <Ionicons name={icon} size={52} color={COLORS.primary} />
            </View>
            <Text style={guestStyles.title}>{title}</Text>
            <Text style={guestStyles.desc}>{description}</Text>
            <TouchableOpacity
                style={guestStyles.loginBtn}
                onPress={() => navigation.navigate('AuthModal')}
                activeOpacity={0.85}
            >
                <Ionicons name="log-in-outline" size={18} color="#fff" />
                <Text style={guestStyles.loginBtnText}>Giriş Yap</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={guestStyles.registerBtn}
                onPress={() => navigation.navigate('AuthModal', { screen: 'Register' })}
                activeOpacity={0.85}
            >
                <Text style={guestStyles.registerBtnText}>Hesabın yok mu? Kaydol</Text>
            </TouchableOpacity>
        </View>
    );
};

const GuestSaved = () => (
    <GuestGate
        icon="map-outline"
        title="Gezi Planların"
        description="Kişisel gezi planlarını görmek ve oluşturmak için giriş yapman gerekiyor."
    />
);
const GuestFavorites = () => (
    <GuestGate
        icon="heart-outline"
        title="Favorilerin"
        description="Beğendiğin yerleri favorilere eklemek için giriş yapman gerekiyor."
    />
);
const GuestProfile = () => (
    <GuestGate
        icon="person-outline"
        title="Profilin"
        description="Profilini görüntülemek ve kişiselleştirmek için giriş yapman gerekiyor."
    />
);

const guestStyles = StyleSheet.create({
    container: {
        flex: 1, backgroundColor: COLORS.background,
        justifyContent: 'center', alignItems: 'center',
        padding: SPACING.xl,
    },
    iconWrap: {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: COLORS.primaryMuted,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    title: {
        fontFamily: FONTS.heading,
        fontSize: 24, color: COLORS.textPrimary,
        marginBottom: SPACING.sm, textAlign: 'center',
    },
    desc: {
        fontFamily: FONTS.body, fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary, textAlign: 'center',
        lineHeight: 22, marginBottom: SPACING.xl,
    },
    loginBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: COLORS.primary,
        paddingVertical: 14, paddingHorizontal: 36,
        borderRadius: BORDER_RADIUS.lg,
        marginBottom: SPACING.sm,
        shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
    },
    loginBtnText: {
        fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.md, color: '#fff',
    },
    registerBtn: { paddingVertical: 10 },
    registerBtnText: {
        fontFamily: FONTS.body, fontSize: FONT_SIZES.sm,
        color: COLORS.primary, textDecorationLine: 'underline',
    },
});

const stackScreenOptions = {
    headerStyle: {
        backgroundColor: COLORS.surface,
    },
    headerTintColor: COLORS.textPrimary,
    headerTitleStyle: {
        fontFamily: FONTS.heading,
        fontSize: 18,
    },
    headerShadowVisible: false,
};

const HomeStackNavigator = () => (
    <HomeStack.Navigator screenOptions={stackScreenOptions}>
        <HomeStack.Screen
            name="HomeMain"
            component={HomeScreen}
            options={{ headerShown: false }}
        />
        <HomeStack.Screen
            name="CreateItinerary"
            component={CreateItineraryScreen}
            options={{ title: 'Gezi Planla' }}
        />
        <HomeStack.Screen
            name="ItineraryResult"
            component={ItineraryResultScreen}
            options={{ title: 'Gezi Planı' }}
        />
        <HomeStack.Screen
            name="MapScreen"
            component={MapScreen}
            options={{ headerShown: false }}
        />
        <HomeStack.Screen
            name="CityDetail"
            component={CityDetailScreen}
            options={{ headerShown: false }}
        />
        <HomeStack.Screen
            name="TravelAssistant"
            component={TravelAssistantScreen}
            options={{ headerShown: false }}
        />
        <HomeStack.Screen
            name="ItineraryDetail"
            component={ItineraryDetailScreen}
            options={{ headerShown: false }}
        />
        <HomeStack.Screen
            name="Saved"
            component={SavedItinerariesScreen}
            options={{ title: 'Planlarım' }}
        />
    </HomeStack.Navigator>
);


const SavedStackNavigator = () => {
    const { isGuest } = useAuth();
    if (isGuest) return <GuestSaved />;
    return (
        <SavedStack.Navigator screenOptions={stackScreenOptions}>
            <SavedStack.Screen
                name="SavedList"
                component={SavedItinerariesScreen}
                options={{ title: 'Planlarım' }}
            />
            <SavedStack.Screen
                name="ItineraryDetail"
                component={ItineraryDetailScreen}
                options={{ headerShown: false }}
            />
            <SavedStack.Screen
                name="TravelAssistant"
                component={TravelAssistantScreen}
                options={{ headerShown: false }}
            />
        </SavedStack.Navigator>
    );
};

const FavoritesStackNavigator = () => {
    const { isGuest } = useAuth();
    if (isGuest) return <GuestFavorites />;
    return (
        <FavoritesStack.Navigator screenOptions={stackScreenOptions}>
            <FavoritesStack.Screen
                name="FavoritesList"
                component={FavoritesScreen}
                options={{ headerShown: false }}
            />
        </FavoritesStack.Navigator>
    );
};

const ProfileStackNavigator = () => {
    const { isGuest } = useAuth();
    if (isGuest) return <GuestProfile />;
    return (
        <ProfileStack.Navigator screenOptions={stackScreenOptions}>
            <ProfileStack.Screen
                name="ProfileMain"
                component={ProfileScreen}
                options={{ headerShown: false }}
            />
            <ProfileStack.Screen
                name="TravelAssistant"
                component={TravelAssistantScreen}
                options={{ headerShown: false }}
            />
            <ProfileStack.Screen
                name="ItineraryDetail"
                component={ItineraryDetailScreen}
                options={{ headerShown: false }}
            />
            <ProfileStack.Screen
                name="Saved"
                component={SavedItinerariesScreen}
                options={{ title: 'Planlarım' }}
            />
        </ProfileStack.Navigator>
    );
};

// ─── Animasyonlu Tab ikon bileşeni ──────────────────────────────────────────
const AnimatedTabIcon = ({ name, focused, color, size = 22 }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const translateYAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (focused) {
            Animated.sequence([
                Animated.parallel([
                    Animated.spring(scaleAnim, {
                        toValue: 1.22,
                        useNativeDriver: true,
                        speed: 40,
                        bounciness: 14,
                    }),
                    Animated.timing(translateYAnim, {
                        toValue: -3,
                        duration: 150,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.spring(scaleAnim, {
                    toValue: 1.08,
                    useNativeDriver: true,
                    speed: 25,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 25 }),
                Animated.timing(translateYAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
            ]).start();
        }
    }, [focused]);

    return (
        <View style={tabIconStyles.container}>
            <Animated.View style={[
                tabIconStyles.iconWrap,
                focused && tabIconStyles.iconWrapActive,
                { transform: [{ scale: scaleAnim }, { translateY: translateYAnim }] },
            ]}>
                <Ionicons name={name} size={size} color={color} />
            </Animated.View>
            {focused && <View style={tabIconStyles.dot} />}
        </View>
    );
};

const tabIconStyles = StyleSheet.create({
    container: { alignItems: 'center', justifyContent: 'center', width: 44, height: 36 },
    iconWrap: { padding: 4, borderRadius: 10 },
    iconWrapActive: { backgroundColor: 'rgba(8,145,178,0.12)' },
    dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.primary, marginTop: 1 },
});

// ─── Tab Navigatör + Floating Assistant Wrapper ────────────────────────────
const TabsWithFloating = () => {
    const insets = useSafeAreaInsets();
    const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 8);
    const tabBarHeight = 56 + bottomPadding;

    return (
        <View style={styles.root}>
            <Tab.Navigator
                screenOptions={({ route }) => ({
                    headerShown: false,
                    tabBarActiveTintColor: COLORS.primary,
                    tabBarInactiveTintColor: COLORS.textLight,
                    tabBarStyle: {
                        backgroundColor: COLORS.tabBarBackground,
                        borderTopColor: COLORS.tabBarBorder,
                        borderTopWidth: 1,
                        paddingBottom: bottomPadding,
                        paddingTop: 8,
                        height: tabBarHeight,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: -2 },
                        shadowOpacity: 0.06,
                        shadowRadius: 8,
                        elevation: 8,
                    },
                    tabBarLabelStyle: {
                        fontFamily: FONTS.bodyMedium,
                        fontSize: 10,
                        marginTop: 2,
                    },
                    tabBarIcon: ({ focused, color, size }) => {
                        let iconName;
                        if (route.name === 'Home') iconName = focused ? 'home-sharp' : 'home-outline';
                        else if (route.name === 'Saved') iconName = focused ? 'bookmarks' : 'bookmarks-outline';
                        else if (route.name === 'Favorites') iconName = focused ? 'heart-circle' : 'heart-outline';
                        else if (route.name === 'Profile') iconName = focused ? 'person-circle' : 'person-outline';
                        return <AnimatedTabIcon name={iconName} focused={focused} color={color} size={22} />;
                    },
                })}
            >
                <Tab.Screen name="Home" component={HomeStackNavigator} options={{ tabBarLabel: 'Ana Sayfa' }} />
                <Tab.Screen name="Saved" component={SavedStackNavigator} options={{ tabBarLabel: 'Planlar' }} />
                <Tab.Screen name="Favorites" component={FavoritesStackNavigator} options={{ tabBarLabel: 'Favoriler' }} />
                <Tab.Screen name="Profile" component={ProfileStackNavigator} options={{ tabBarLabel: 'Profil' }} />
            </Tab.Navigator>
        </View>
    );
};

/**
 * Root navigatör — useNavigation'ın kullanılabilmesi için
 * TabsWithFloating'i bir Stack içinde sarıyoruz.
 */
const RootStack = createNativeStackNavigator();

const MainNavigator = () => (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Main" component={TabsWithFloating} />
        <RootStack.Screen name="TravelAssistant" component={TravelAssistantScreen} />
    </RootStack.Navigator>
);

const styles = StyleSheet.create({
    root: { flex: 1 },
});

export default MainNavigator;
