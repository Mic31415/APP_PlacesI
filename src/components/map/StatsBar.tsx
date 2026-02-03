import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { moderateScale } from '../../utils/responsive';

interface StatsBarProps {
    count: number;
    label?: string;
}

export const StatsBar: React.FC<StatsBarProps> = ({ count, label = 'places' }) => {
    const { theme, colorScheme } = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: theme.colors.card[colorScheme],
                    paddingBottom: insets.bottom > 0 ? insets.bottom : 16,
                    borderTopColor: theme.colors.border[colorScheme],
                    borderTopWidth: 1,
                },
            ]}
        >
            <Text
                style={[
                    styles.statsText,
                    { color: theme.colors.text.secondary[colorScheme], textAlign: 'center' },
                ]}
            >
                Found {count} {label}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 12,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statsText: {
        fontSize: moderateScale(12),
        fontWeight: '400',
        lineHeight: moderateScale(16),
        fontFamily: 'poppins_regular',
    },
});
