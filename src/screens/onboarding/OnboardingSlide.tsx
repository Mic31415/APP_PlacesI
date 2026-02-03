import React, { useEffect } from 'react';
import { View, StyleSheet, Image, Dimensions, ImageSourcePropType } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface OnboardingSlideProps {
    item: {
        id: string;
        image: ImageSourcePropType;
    };
    index: number;
    currentIndex: number;
}

export const OnboardingSlide: React.FC<OnboardingSlideProps> = ({ item, index, currentIndex }) => {
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(20);

    useEffect(() => {
        // Animate when this becomes the current slide
        if (index === currentIndex) {
            opacity.value = withTiming(1, { duration: 300 });
            translateY.value = withSpring(0, { damping: 15 });
        } else {
            // Reset when not current
            opacity.value = 0;
            translateY.value = 20;
        }
    }, [currentIndex, index]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
            transform: [{ translateY: translateY.value }],
        };
    });

    return (
        <View style={[styles.container, { width }]}>
            <Animated.Image
                source={item.image}
                style={[styles.image, { width, resizeMode: 'cover' }, animatedStyle]}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden', // Ensure image doesn't bleed if rounded needed
    },
    image: {
        flex: 1,
        height: '100%',
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
    },
});
