import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Button } from './Button';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface EmptyStateProps {
    title: string;
    description: string;
    icon?: string;
    actionLabel?: string;
    onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    title,
    description,
    icon = 'map-marker-off',
    actionLabel,
    onAction,
}) => {
    const { theme, colorScheme } = useTheme();

    return (
        <View style={styles.container}>
            <Icon
                name={icon}
                size={64}
                color={theme.colors.text.tertiary[colorScheme]}
                style={{ marginBottom: 16 }}
            />
            <Text
                style={[
                    theme.typography.h2,
                    { color: theme.colors.text.primary[colorScheme], textAlign: 'center', marginBottom: 8 },
                ]}
            >
                {title}
            </Text>
            <Text
                style={[
                    theme.typography.body,
                    { color: theme.colors.text.secondary[colorScheme], textAlign: 'center', marginBottom: 24, maxWidth: 300 },
                ]}
            >
                {description}
            </Text>
            {actionLabel && onAction && (
                <Button title={actionLabel} onPress={onAction} />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    emoji: {
        fontSize: 64,
        marginBottom: 16,
    },
});
