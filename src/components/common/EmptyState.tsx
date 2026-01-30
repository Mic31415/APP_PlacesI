import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Button } from './Button';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { moderateScale } from '../../utils/responsive';

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
                size={70}
                color={theme.colors.text.tertiary[colorScheme]}
                style={{ marginBottom: 16 }}
            />
            <Text
                style={[
                    styles.title,
                    { color: theme.colors.text.primary[colorScheme] },
                ]}
            >
                {title}
            </Text>
            <Text
                style={[
                    styles.description,
                    { color: theme.colors.text.secondary[colorScheme] },
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
        fontSize: moderateScale(64),
        marginBottom: 16,
    },
    title: {
        textAlign: 'center',
        marginBottom: 8,
        fontSize: moderateScale(20),
        fontWeight: '600',
    },
    description: {
        textAlign: 'center',
        marginBottom: 24,
        maxWidth: 300,
        fontSize: moderateScale(14),
        fontWeight: '400',
    }
});
