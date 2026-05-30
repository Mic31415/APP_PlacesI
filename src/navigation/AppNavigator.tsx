import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StatusBar } from 'react-native';
import { NavigationContainer, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/ThemeContext';
import { MainTabParamList, RootStackParamList, HomeStackParamList } from '../types/navigation';
import { HomeScreen } from '../screens/home/HomeScreen';
import { CreateScreen } from '../screens/home/CreateScreen'; // Corrected import path
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { StatsScreen } from '../screens/stats/StatsScreen';
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';
import { MapViewScreen } from '../screens/map/MapViewScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { CreatePinScreen } from '../screens/home/CreatePinScreen';
import { MapPickerScreen } from '../screens/map/MapPickerScreen';
import { GlobalSearchScreen } from '../screens/home/GlobalSearchScreen';
import { isTablet } from '../utils/responsive';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();

const HomeStackNavigator = () => {
    return (
        <HomeStack.Navigator screenOptions={{ headerShown: false }}>
            <HomeStack.Screen name="MapList" component={HomeScreen} />
            <HomeStack.Screen name="MapView" component={MapViewScreen} />
            <HomeStack.Screen name="CreatePin" component={CreatePinScreen} />
            <HomeStack.Screen name="MapPicker" component={MapPickerScreen} />
            <HomeStack.Screen name="GlobalSearch" component={GlobalSearchScreen} />
        </HomeStack.Navigator>
    );
};

const TabNavigator = () => {
    const { theme, colorScheme } = useTheme();
    const insets = useSafeAreaInsets();
    const tablet = isTablet();
    const tabBarHeight = (tablet ? 108 : 60) + insets.bottom;
    const tabBarPaddingTop = tablet ? 12 : 8;
    const tabBarPaddingBottom = insets.bottom + (tablet ? 10 : 0);
    const tabLabelSize = tablet ? 18 : 12;
    const tabLabelLineHeight = tablet ? 24 : 14;
    const tabLabelMarginBottom = tablet ? 8 : 4;
    const tabIconSize = tablet ? 34 : 24;
    const tabIconStyle = tablet ? {
        width: 48,
        height: 42,
        lineHeight: 42,
        textAlign: 'center' as const,
    } : undefined;

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.text.tertiary[colorScheme],
                tabBarLabelPosition: 'below-icon',
                tabBarStyle: {
                    backgroundColor: theme.colors.card[colorScheme],
                    borderTopColor: theme.colors.border[colorScheme],
                    borderTopWidth: 0.5,
                    height: tabBarHeight,
                    paddingBottom: tabBarPaddingBottom,
                    paddingTop: tabBarPaddingTop,
                },
                tabBarItemStyle: {
                    paddingTop: tablet ? 6 : 0,
                    paddingBottom: tablet ? 4 : 0,
                },
                tabBarLabelStyle: {
                    fontSize: tabLabelSize,
                    fontWeight: '400',
                    lineHeight: tabLabelLineHeight,
                    fontFamily: 'poppins_regular',
                    marginBottom: tabLabelMarginBottom,
                },
            }}
        >
            <Tab.Screen
                name="Home"
                component={HomeStackNavigator}
                options={({ route }) => {
                    const routeName = getFocusedRouteNameFromRoute(route) ?? 'MapList';
                    const hiddenRoutes = ['MapView', 'CreatePin', 'MapPicker', 'GlobalSearch'];
                    const isHidden = hiddenRoutes.includes(routeName);

                    return {
                        tabBarLabel: 'Maps',
                        tabBarIcon: ({ color }) => (
                            <Icon name="map-marker-multiple" color={color} size={tabIconSize} style={tabIconStyle} />
                        ),
                        tabBarStyle: {
                            backgroundColor: theme.colors.card[colorScheme],
                            borderTopColor: theme.colors.border[colorScheme],
                            borderTopWidth: 0.5,
                            height: tabBarHeight,
                            paddingBottom: tabBarPaddingBottom,
                            paddingTop: tabBarPaddingTop,
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
                    tabBarIcon: ({ color }) => (
                        <Icon name="plus-box" color={color} size={tabIconSize} style={tabIconStyle} />
                    ),
                }}
            />
            <Tab.Screen
                name="Stats"
                component={StatsScreen}
                options={{
                    tabBarLabel: 'Stats',
                    tabBarIcon: ({ color }) => (
                        <Icon name="chart-box" color={color} size={tabIconSize} style={tabIconStyle} />
                    ),
                }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{
                    tabBarLabel: 'Settings',
                    tabBarIcon: ({ color }) => (
                        <Icon name="cog" color={color} size={tabIconSize} style={tabIconStyle} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
};

export const AppNavigator: React.FC = () => {
    const { theme, colorScheme } = useTheme();
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
        <>
            <StatusBar
                barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
                backgroundColor={theme.colors.background[colorScheme]}
                translucent={false}
            />
            <NavigationContainer>
                <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={viewedOnboarding ? 'Main' : 'Onboarding'}>
                    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                    <Stack.Screen name="Main" component={TabNavigator} />
                </Stack.Navigator>
            </NavigationContainer>
        </>
    );
};
