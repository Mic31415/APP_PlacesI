import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../common/Card';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { moderateScale } from '../../utils/responsive';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withDelay
} from 'react-native-reanimated';

interface MapCardProps {
    map: {
        id: string;
        name: string;
        emoji: string;
        pinCount?: number;
        type?: string;
    };
    onPress: () => void;
    onLongPress?: () => void;
    style?: any;
    index?: number; // For stagger animation
    shouldAnimate?: boolean; // Control when to trigger animation
}

export const MapCard: React.FC<MapCardProps> = React.memo(({ map, onPress, onLongPress, style, index = 0, shouldAnimate = true }) => {
    const { theme, colorScheme } = useTheme();

    // Animation values for entrance
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(30);

    // Animation values for press feedback
    const scale = useSharedValue(1);

    // Entrance animation - triggers when shouldAnimate changes to true
    useEffect(() => {
        if (shouldAnimate) {
            const delay = Math.min(index * 50, 500); // Max 10 items animated (500ms max delay)

            opacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
            translateY.value = withDelay(delay, withSpring(0, { damping: 12, stiffness: 100 }));
        } else {
            // Reset to initial state
            opacity.value = 0;
            translateY.value = 30;
        }
    }, [shouldAnimate, index]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
            transform: [
                { translateY: translateY.value },
                { scale: scale.value }
            ],
        };
    });

    const handlePressIn = () => {
        scale.value = withSpring(0.97, { damping: 10 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 10 });
    };

    return (
        <Animated.View style={[style, animatedStyle]}>
            <Pressable
                onPress={onPress}
                onLongPress={onLongPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
            >
                <View style={[styles.card, { backgroundColor: theme.colors.surface[colorScheme] }]}>
                    <View style={[styles.emojiContainer, { backgroundColor: theme.colors.innerSurface[colorScheme] }]}>
                        <Text style={styles.emoji}>{map.emoji}</Text>
                    </View>
                    <View style={styles.content}>
                        <Text
                            style={[
                                styles.mapName,
                                { color: theme.colors.text.primary[colorScheme], },
                            ]}
                            numberOfLines={1}
                        >
                            {map.name}
                        </Text>
                        <Text
                            style={[
                                styles.mapType,
                                { color: theme.colors.text.secondary[colorScheme] },
                            ]}
                        >
                            {map.type || 'Custom Map'}    |     {map.pinCount || 0} pins
                        </Text>
                    </View>
                    <Icon name="chevron-right" size={30} color={theme.colors.text.tertiary[colorScheme]} />
                </View>
            </Pressable>
        </Animated.View>
    );
});

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 12,
    },
    emojiContainer: {
        width: 80,
        height: 80,
        borderRadius: 8,
        backgroundColor: 'rgba(0,0,0,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    emoji: {
        fontSize: moderateScale(40),
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    mapName: {
        fontSize: moderateScale(16),
        fontWeight: '600',
        marginBottom: 4,
        fontFamily: 'poppins_semibold',
    },
    mapType: {
        fontSize: moderateScale(14),
        fontWeight: '400',
        fontFamily: 'poppins_regular',
    },
});
