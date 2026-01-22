import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getResponsiveValue, scaleFont } from '../../utils/responsive';

const { width } = Dimensions.get('window');

interface OnboardingSlideProps {
    item: {
        id: string;
        title: string;
        description: string;
        image: any; // Placeholder for now, can be ImageSourcePropType
        emoji: string;
    };
}

export const OnboardingSlide: React.FC<OnboardingSlideProps> = ({ item }) => {
    const { theme, colorScheme } = useTheme();

    return (
        <View style={[styles.container, { width }]}>
            <View style={styles.imageContainer}>
                {/* Using Emoji as placeholder for image since we don't have assets yet */}
                <Text style={{ fontSize: 100 }}>{item.emoji}</Text>
            </View>
            <View style={styles.content}>
                <Text
                    style={[
                        theme.typography.h1,
                        { color: theme.colors.text.primary[colorScheme], textAlign: 'center', marginBottom: theme.spacing.md },
                    ]}
                >
                    {item.title}
                </Text>
                <Text
                    style={[
                        theme.typography.body,
                        { color: theme.colors.text.secondary[colorScheme], textAlign: 'center', paddingHorizontal: theme.spacing.xl },
                    ]}
                >
                    {item.description}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    imageContainer: {
        flex: 0.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 0.3,
        alignItems: 'center',
    },
});
