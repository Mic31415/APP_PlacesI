import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface CardProps {
    children: ReactNode;
    style?: ViewStyle;
    elevated?: boolean;
    padding?: keyof typeof import('../../theme/spacing').spacing;
}

export const Card: React.FC<CardProps> = ({
    children,
    style,
    elevated = true,
    padding = 'lg',
}) => {
    const { theme, colorScheme } = useTheme();

    const cardStyle: ViewStyle = {
        backgroundColor: theme.colors.card[colorScheme],
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing[padding],
        ...(elevated && theme.shadows.md),
    };

    return <View style={[cardStyle, style]}>{children}</View>;
};
