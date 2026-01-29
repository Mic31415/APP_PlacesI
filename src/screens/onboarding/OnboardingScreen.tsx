import React, { useRef, useState } from 'react';
import { View, StyleSheet, FlatList, Dimensions, Animated, Text, ImageSourcePropType } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { RootStackParamList } from '../../types/navigation';
import { Button } from '../../components/common';
import { OnboardingSlide } from './OnboardingSlide';

const { width, height } = Dimensions.get('window');

// Onboarding Data
const slides: { id: string; title: string; description: string; image: ImageSourcePropType }[] = [
    {
        id: '1',
        title: 'Track your World, One Pin at a Time',
        description: 'Track your world, one memory at a time.keep a personal log of all the amazing places you visit.',
        image: require('../../assets/Images/OnBoarding1.png'),
    },
    {
        id: '2',
        title: 'Create Custom Maps',
        description: 'Organize your places into custom maps like “Places I Eat”, “Dream Destinations”, or “Hiking Trails”.',
        image: require('../../assets/Images/OnBoarding2.png'),
    },
    {
        id: '3',
        title: 'Pin Your Memories',
        description: 'Drop pins, add photos, and write notes. Fully offline and private - your data stays with you.',
        image: require('../../assets/Images/OnBoarding3.png'),
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
                        outputRange: [10, 39, 10],
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
        <View
            style={[
                styles.container,
                { backgroundColor: theme.colors.background[colorScheme] },
            ]}
        >
            <View style={{ height: height * 0.6 }}>
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

            <View style={styles.bottomContainer}>

                <Paginator />

                <View style={styles.textContainer}>
                    <Text
                        style={[
                            theme.typography.h2,
                            {
                                color: theme.colors.text.primary[colorScheme],
                                textAlign: 'center',
                                marginBottom: 20,
                            },
                        ]}
                    >
                        {slides[currentIndex].title}
                    </Text>
                    <Text
                        style={[
                            theme.typography.body,
                            {
                                color: theme.colors.text.primary[colorScheme],
                                textAlign: 'center',
                            },
                        ]}
                    >
                        {slides[currentIndex].description}
                    </Text>
                </View>

                <View style={styles.footer}>
                    {currentIndex < slides.length - 1 ? (
                        <Button
                            title="Next"
                            onPress={scrollTo}
                            fullWidth
                        />
                    ) : (
                        <Button
                            title="Get Started"
                            onPress={completeOnboarding}
                            fullWidth
                        />
                    )}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    paginatorContainer: {
        flexDirection: 'row',
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    dot: {
        height: 8,
        borderRadius: 4,
        marginHorizontal: 4,
    },
    bottomContainer: {
        flex: 1,
        justifyContent: 'flex-start',
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    textContainer: {
        alignItems: 'center',
        marginBottom: 'auto',
    },
    footer: {
        paddingBottom: 40,
        width: '100%',
    },
});
