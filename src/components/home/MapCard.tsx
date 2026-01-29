import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../common/Card';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { moderateScale } from '../../utils/responsive';

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
}

export const MapCard: React.FC<MapCardProps> = ({ map, onPress, onLongPress, style }) => {
    const { theme, colorScheme } = useTheme();

    return (
        <TouchableOpacity
            onPress={onPress}
            onLongPress={onLongPress}
            activeOpacity={0.7}
            style={style}
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
                        {map.type || 'Custom Map'}  |  {map.pinCount || 0} pins
                    </Text>
                </View>
                <Icon name="chevron-right" size={30} color={theme.colors.text.tertiary[colorScheme]} />
            </View>
        </TouchableOpacity>
    );
};

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
        fontSize: 32,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    mapName: {
        fontSize: moderateScale(16),
        fontWeight: '600',
        marginBottom: 4
    },
    mapType: {
        fontSize: moderateScale(14),
        fontWeight: '400',
    },
});
