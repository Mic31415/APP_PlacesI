import React from 'react';
import { TouchableOpacity, StyleSheet, Text, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface FloatingButtonProps {
    onPress: () => void;
    icon?: string;
    style?: ViewStyle;
}

export const FloatingButton: React.FC<FloatingButtonProps> = ({ onPress, icon = 'plus', style }) => {
    const { theme, colorScheme } = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.8}
            style={[
                styles.container,
                {
                    backgroundColor: theme.colors.primary,
                    marginBottom: insets.bottom + theme.spacing.md,
                    marginRight: theme.spacing.md,
                    ...theme.shadows.lg,
                },
                style,
            ]}
        >
            <Icon name={icon} size={28} color="#FFFFFF" />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
    },
    icon: {
        fontSize: 28,
        fontWeight: 'bold',
    },
});
