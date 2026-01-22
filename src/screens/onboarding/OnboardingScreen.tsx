import React, { useRef, useState } from 'react';
import { View, StyleSheet, FlatList, Dimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { RootStackParamList } from '../../types/navigation';
import { Button } from '../../components/common';
import { OnboardingSlide } from './OnboardingSlide';

const { width } = Dimensions.get('window');

// Onboarding Data
const slides = [
    {
        id: '1',
        title: 'Welcome to Places I...',
        description: 'Track your world, one memory at a time. Keep a personal log of all the amazing places you visit.',
        emoji: '🌎',
        image: null,
    },
    {
        id: '2',
        title: 'Create Custom Maps',
        description: 'Organize your places into custom maps like "Places I Eat", "Dream Destinations", or "Hiking Trails".',
        emoji: '🗺️',
        image: null,
    },
    {
        id: '3',
        title: 'Pin Your Memories',
        description: 'Drop pins, add photos, and write notes. Fully offline and private - your data stays with you.',
        emoji: '📍',
        image: null,
    },
];

type OnboardingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

export const OnboardingScreen: React.FC = () => {
    const { theme, colorScheme } = useTheme();
    const navigation = useNavigation<OnboardingScreenNavigationProp>();
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;
    const slidesRef = useRef<FlatList>(null);

    const viewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems && viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    const scrollTo = () => {
        if (currentIndex < slides.length - 1) {
            slidesRef.current?.scrollToIndex({ index: currentIndex + 1 });
        } else {
            completeOnboarding();
        }
    };

    const completeOnboarding = async () => {
        try {
            await AsyncStorage.setItem('@onboarding_completed', 'true');
            navigation.replace('Main');
        } catch (err) {
            console.log('Error @setItem: ', err);
        }
    };

    const Paginator = () => {
        return (
            <View style={styles.paginatorContainer}>
                {slides.map((_, i) => {
                    const inputRange = [(i - 1) * width, i * width, (i + 1) * width];

                    const dotWidth = scrollX.interpolate({
                        inputRange,
                        outputRange: [10, 20, 10],
                        extrapolate: 'clamp',
                    });

                    const opacity = scrollX.interpolate({
                        inputRange,
                        outputRange: [0.3, 1, 0.3],
                        extrapolate: 'clamp',
                    });

                    return (
                        <Animated.View
                            key={i.toString()}
                            style={[
                                styles.dot,
                                {
                                    width: dotWidth,
                                    opacity,
                                    backgroundColor: theme.colors.primary,
                                },
                            ]}
                        />
                    );
                })}
            </View>
        );
    };

    return (
        <SafeAreaView
            style={[
                styles.container,
                { backgroundColor: theme.colors.background[colorScheme] },
            ]}
        >
            <View style={{ flex: 3 }}>
                <FlatList
                    data={slides}
                    renderItem={({ item }) => <OnboardingSlide item={item} />}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    pagingEnabled
                    bounces={false}
                    keyExtractor={(item) => item.id}
                    onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
                        useNativeDriver: false,
                    })}
                    scrollEventThrottle={32}
                    onViewableItemsChanged={viewableItemsChanged}
                    viewabilityConfig={viewConfig}
                    ref={slidesRef}
                />
            </View>

            <Paginator />

            <View style={styles.footer}>
                <View style={styles.buttonContainer}>
                    {currentIndex < slides.length - 1 ? (
                        <View style={styles.rowButtons}>
                            <Button
                                title="Skip"
                                onPress={completeOnboarding}
                                variant="text"
                                style={{ marginRight: 'auto' }}
                            />
                            <Button
                                title="Next"
                                onPress={scrollTo}
                                style={{ minWidth: 120 }}
                            />
                        </View>
                    ) : (
                        <Button
                            title="Get Started"
                            onPress={completeOnboarding}
                            fullWidth
                        />
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    paginatorContainer: {
        flexDirection: 'row',
        height: 64,
    },
    dot: {
        height: 10,
        borderRadius: 5,
        marginHorizontal: 8,
    },
    footer: {
        flex: 1,
        width: '100%',
        paddingHorizontal: 20,
        justifyContent: 'center',
    },
    buttonContainer: {
        marginBottom: 20,
    },
    rowButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
    }
});
