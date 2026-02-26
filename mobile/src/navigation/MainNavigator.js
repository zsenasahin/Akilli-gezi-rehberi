import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONTS } from '../constants/typography';

// Screens
import HomeScreen from '../screens/home/HomeScreen';
import DiscoverScreen from '../screens/discover/DiscoverScreen';
import CreateItineraryScreen from '../screens/itinerary/CreateItineraryScreen';
import ItineraryResultScreen from '../screens/itinerary/ItineraryResultScreen';
import SavedItinerariesScreen from '../screens/itinerary/SavedItinerariesScreen';
import ItineraryDetailScreen from '../screens/itinerary/ItineraryDetailScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import MapScreen from '../screens/map/MapScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const SavedStack = createNativeStackNavigator();
const DiscoverStack = createNativeStackNavigator();

const stackScreenOptions = {
    headerStyle: {
        backgroundColor: COLORS.surface,
    },
    headerTintColor: COLORS.textPrimary,
    headerTitleStyle: {
        fontFamily: 'PlayfairDisplay_700Bold',
        fontSize: 18,
    },
    headerShadowVisible: false,
};

/**
 * Home stack – trip planning flow:
 *   Home → Create Itinerary → Itinerary Result
 */
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
    </HomeStack.Navigator>
);

/**
 * Discover stack – browsing places
 */
const DiscoverStackNavigator = () => (
    <DiscoverStack.Navigator screenOptions={stackScreenOptions}>
        <DiscoverStack.Screen
            name="DiscoverMain"
            component={DiscoverScreen}
            options={{ headerShown: false }}
        />
    </DiscoverStack.Navigator>
);

/**
 * Saved stack – itinerary list + detail
 */
const SavedStackNavigator = () => (
    <SavedStack.Navigator screenOptions={stackScreenOptions}>
        <SavedStack.Screen
            name="SavedList"
            component={SavedItinerariesScreen}
            options={{ title: 'Planlarım' }}
        />
        <SavedStack.Screen
            name="ItineraryDetail"
            component={ItineraryDetailScreen}
            options={{ title: 'Plan Detayları' }}
        />
    </SavedStack.Navigator>
);

/**
 * Main tab navigator – shown when the user IS logged in.
 * Tabs: Ana Sayfa, Keşfet, Planlar, Profil
 * Matching v0 design – clean bottom tabs with active indicator
 */
const MainNavigator = () => (
    <Tab.Navigator
        screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: COLORS.primary,
            tabBarInactiveTintColor: COLORS.textLight,
            tabBarStyle: {
                backgroundColor: COLORS.tabBarBackground,
                borderTopColor: COLORS.tabBarBorder,
                borderTopWidth: 1,
                paddingBottom: 8,
                paddingTop: 8,
                height: 64,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 8,
            },
            tabBarLabelStyle: {
                fontFamily: 'Inter_500Medium',
                fontSize: 11,
                marginTop: 2,
            },
            tabBarIcon: ({ focused, color, size }) => {
                let iconName;
                if (route.name === 'Home') {
                    iconName = focused ? 'home' : 'home-outline';
                } else if (route.name === 'Discover') {
                    iconName = focused ? 'compass' : 'compass-outline';
                } else if (route.name === 'Saved') {
                    iconName = focused ? 'map' : 'map-outline';
                } else if (route.name === 'Profile') {
                    iconName = focused ? 'person' : 'person-outline';
                }
                return <Ionicons name={iconName} size={22} color={color} />;
            },
        })}
    >
        <Tab.Screen
            name="Home"
            component={HomeStackNavigator}
            options={{ tabBarLabel: 'Ana Sayfa' }}
        />
        <Tab.Screen
            name="Discover"
            component={DiscoverStackNavigator}
            options={{ tabBarLabel: 'Keşfet' }}
        />
        <Tab.Screen
            name="Saved"
            component={SavedStackNavigator}
            options={{ tabBarLabel: 'Planlar' }}
        />
        <Tab.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
                tabBarLabel: 'Profil',
                headerShown: false,
            }}
        />
    </Tab.Navigator>
);

export default MainNavigator;
