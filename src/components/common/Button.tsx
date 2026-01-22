import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    ViewStyle,
    TextStyle,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text';
export type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: ButtonVariant;
    size?: ButtonSize;
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    size = 'medium',
    disabled = false,
    loading = false,
    fullWidth = false,
    style,
}) => {
    const { theme, colorScheme } = useTheme();

    const getButtonStyle = (): ViewStyle => {
        const baseStyle: ViewStyle = {
            borderRadius: theme.borderRadius.md,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
        };

        // Size styles
        const sizeStyles: Record<ButtonSize, ViewStyle> = {
            small: {
                paddingVertical: theme.spacing.sm,
                paddingHorizontal: theme.spacing.md,
                minHeight: 36,
            },
            medium: {
                paddingVertical: theme.spacing.md,
                paddingHorizontal: theme.spacing.lg,
                minHeight: 44,
            },
            large: {
                paddingVertical: theme.spacing.lg,
                paddingHorizontal: theme.spacing.xl,
                minHeight: 52,
            },
        };

        // Variant styles
        const variantStyles: Record<ButtonVariant, ViewStyle> = {
            primary: {
                backgroundColor: theme.colors.primary,
            },
            secondary: {
                backgroundColor: theme.colors.secondary,
            },
            outline: {
                backgroundColor: 'transparent',
                borderWidth: 1.5,
                borderColor: theme.colors.primary,
            },
            text: {
                backgroundColor: 'transparent',
            },
        };

        return {
            ...baseStyle,
            ...sizeStyles[size],
            ...variantStyles[variant],
            ...(fullWidth && { width: '100%' }),
            ...(disabled && { opacity: 0.5 }),
        };
    };

    const getTextStyle = (): TextStyle => {
        const baseTextStyle: TextStyle = {
            ...theme.typography.button,
        };

        const sizeTextStyles: Record<ButtonSize, TextStyle> = {
            small: { fontSize: 15 },
            medium: { fontSize: 17 },
            large: { fontSize: 19 },
        };

        const variantTextStyles: Record<ButtonVariant, TextStyle> = {
            primary: { color: '#FFFFFF' },
            secondary: { color: '#FFFFFF' },
            outline: { color: theme.colors.primary },
            text: { color: theme.colors.primary },
        };

        return {
            ...baseTextStyle,
            ...sizeTextStyles[size],
            ...variantTextStyles[variant],
        };
    };

    return (
        <TouchableOpacity
            style={[getButtonStyle(), style]}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.7}
        >
            {loading ? (
                <ActivityIndicator
                    color={variant === 'primary' || variant === 'secondary' ? '#FFFFFF' : theme.colors.primary}
                    size="small"
                />
            ) : (
                <Text style={getTextStyle()}>{title}</Text>
            )}
        </TouchableOpacity>
    );
};
