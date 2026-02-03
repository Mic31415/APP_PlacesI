import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { NavigationContainer, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/ThemeContext';
import { MainTabParamList, RootStackParamList, HomeStackParamList } from '../types/navigation';
import { HomeScreen } from '../screens/home/HomeScreen';
import { CreateScreen } from '../screens/home/CreateScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';
import { MapViewScreen } from '../screens/map/MapViewScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// ...

import { CreatePinScreen } from '../screens/home/CreatePinScreen';

// ...

import { MapPickerScreen } from '../screens/map/MapPickerScreen';

const HomeStackNavigator = () => {
    return (
        <HomeStack.Navigator screenOptions={{ headerShown: false }}>
            <HomeStack.Screen name="MapList" component={HomeScreen} />
            <HomeStack.Screen name="MapView" component={MapViewScreen} />
            <HomeStack.Screen name="CreatePin" component={CreatePinScreen} />
            <HomeStack.Screen name="MapPicker" component={MapPickerScreen} />
        </HomeStack.Navigator>
    );
};

const TabNavigator = () => {
    const { theme, colorScheme } = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.text.tertiary[colorScheme],
                tabBarStyle: {
                    backgroundColor: theme.colors.card[colorScheme],
                    borderTopColor: theme.colors.border[colorScheme],
                    borderTopWidth: 0.5,
                    height: 60 + insets.bottom,
                    paddingBottom: insets.bottom,
                    paddingTop: 8,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '400',
                    lineHeight: 14,
                    fontFamily: 'poppins_regular',
                    marginBottom: 4,
                },
            }}
        >
            <Tab.Screen
                name="Home"
                component={HomeStackNavigator}
                options={({ route }) => {
                    const routeName = getFocusedRouteNameFromRoute(route) ?? 'MapList';
                    const hiddenRoutes = ['MapView', 'CreatePin', 'MapPicker'];
                    const isHidden = hiddenRoutes.includes(routeName);

                    return {
                        tabBarLabel: 'Maps',
                        tabBarIcon: ({ color, size }) => (
                            <Icon name="map-marker-multiple" color={color} size={size} />
                        ),
                        tabBarStyle: {
                            backgroundColor: theme.colors.card[colorScheme],
                            borderTopColor: theme.colors.border[colorScheme],
                            borderTopWidth: 0.5,
                            height: 60 + insets.bottom,
                            paddingBottom: insets.bottom,
                            paddingTop: 8,
                            display: isHidden ? 'none' : 'flex',
                        },
                    };
                }}
            />
            <Tab.Screen
                name="Create"
                component={CreateScreen}
                options={{
                    tabBarLabel: 'Create',
                    tabBarIcon: ({ color, size }) => (
                        <Icon name="plus-box" color={color} size={size} />
                    ),
                }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{
                    tabBarLabel: 'Settings',
                    tabBarIcon: ({ color, size }) => (
                        <Icon name="cog" color={color} size={size} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
};

export const AppNavigator: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [viewedOnboarding, setViewedOnboarding] = useState(false);

    useEffect(() => {
        checkOnboarding();
    }, []);

    const checkOnboarding = async () => {
        try {
            const value = await AsyncStorage.getItem('@onboarding_completed');
            if (value !== null) {
                setViewedOnboarding(true);
            }
        } catch (error) {
            console.log('Error @checkOnboarding: ', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={viewedOnboarding ? 'Main' : 'Onboarding'}>
                <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                <Stack.Screen name="Main" component={TabNavigator} />
            </Stack.Navigator>
        </NavigationContainer>
    );
};
