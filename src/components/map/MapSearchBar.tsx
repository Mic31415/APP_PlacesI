import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, ViewStyle, Text } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface MapSearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    onFilterPress?: () => void;
    style?: ViewStyle;
}

export const MapSearchBar: React.FC<MapSearchBarProps> = ({
    value,
    onChangeText,
    onFilterPress,
    style,
}) => {
    const { theme, colorScheme } = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <View
            style={[
                styles.container,
                {
                    top: insets.top + theme.spacing.md,
                    paddingHorizontal: theme.spacing.md,
                },
                style,
            ]}
        >
            <View
                style={[
                    styles.searchContainer,
                    {
                        backgroundColor: theme.colors.background[colorScheme],
                        ...theme.shadows.md,
                    },
                ]}
            >
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                    style={[
                        styles.input,
                        theme.typography.body,
                        { color: theme.colors.text.primary[colorScheme] },
                    ]}
                    placeholder="Search places..."
                    placeholderTextColor={theme.colors.text.tertiary[colorScheme]}
                    value={value}
                    onChangeText={onChangeText}
                />
                {onFilterPress && (
                    <TouchableOpacity onPress={onFilterPress} style={styles.filterButton}>
                        <Text style={{ fontSize: 20 }}>🌪️</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 10,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 50,
        borderRadius: 25,
        paddingHorizontal: 16,
    },
    searchIcon: {
        fontSize: 18,
        marginRight: 8,
    },
    input: {
        flex: 1,
        height: '100%',
    },
    filterButton: {
        padding: 8,
    },
});
