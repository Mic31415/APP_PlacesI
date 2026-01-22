import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenHeaderProps {
    title: string;
    rightAction?: React.ReactNode;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, rightAction }) => {
    const { theme, colorScheme } = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: theme.colors.background[colorScheme],
                    paddingTop: insets.top + theme.spacing.md,
                    paddingBottom: theme.spacing.md,
                    paddingHorizontal: theme.spacing.lg,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.colors.border[colorScheme],
                },
            ]}
        >
            <View style={styles.content}>
                <Text
                    style={[
                        theme.typography.h1,
                        { color: theme.colors.text.primary[colorScheme] },
                    ]}
                >
                    {title}
                </Text>
                {rightAction && <View style={styles.rightAction}>{rightAction}</View>}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    content: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    rightAction: {
        justifyContent: 'center',
    },
});
