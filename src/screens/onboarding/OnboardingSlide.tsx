import React from 'react';
import { View, StyleSheet, Image, Dimensions, ImageSourcePropType } from 'react-native';

const { width } = Dimensions.get('window');

interface OnboardingSlideProps {
    item: {
        id: string;
        image: ImageSourcePropType;
    };
}

export const OnboardingSlide: React.FC<OnboardingSlideProps> = ({ item }) => {
    return (
        <View style={[styles.container, { width }]}>
            <Image
                source={item.image}
                style={[styles.image, { width, resizeMode: 'cover' }]}
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
