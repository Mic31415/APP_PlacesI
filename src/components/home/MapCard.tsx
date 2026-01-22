import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../common/Card';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface MapCardProps {
    map: {
        id: string;
        name: string;
        emoji: string;
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
            <Card style={styles.card}>
                <View style={styles.emojiContainer}>
                    <Text style={styles.emoji}>{map.emoji}</Text>
                </View>
                <View style={styles.content}>
                    <Text
                        style={[
                            theme.typography.bodyBold,
                            { color: theme.colors.text.primary[colorScheme], marginBottom: 4 },
                        ]}
                        numberOfLines={1}
                    >
                        {map.name}
                    </Text>
                    <Text
                        style={[
                            theme.typography.caption,
                            { color: theme.colors.text.secondary[colorScheme] },
                        ]}
                    >
                        {map.type || 'Custom Map'} • {map.pinCount || 0} pins
                    </Text>
                </View>
                <Icon name="chevron-right" size={24} color={theme.colors.text.tertiary[colorScheme]} />
            </Card>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    emojiContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(0,0,0,0.05)',
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
});
