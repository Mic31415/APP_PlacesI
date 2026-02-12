import { View, TextInput, StyleSheet, TouchableOpacity, ViewStyle, Text, Image } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import FilterIcon from '../../assets/Icon/Filter.png';
import { moderateScale } from '../../utils/responsive';

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
                <Icon name="magnify" size={20} color={theme.colors.text.tertiary[colorScheme]} style={styles.searchIcon} />
                <TextInput
                    style={[
                        styles.input,
                        styles.inputText,
                        { color: theme.colors.text.primary[colorScheme] },
                    ]}
                    placeholder="Search by title"
                    placeholderTextColor={theme.colors.text.tertiary[colorScheme]}
                    value={value}
                    onChangeText={onChangeText}
                />
            </View>
            {onFilterPress && (
                <TouchableOpacity
                    onPress={onFilterPress}
                    style={[
                        styles.filterButton,
                        {
                            backgroundColor: theme.colors.background[colorScheme],
                            ...theme.shadows.md,
                        },
                    ]}
                >
                    <Image
                        source={FilterIcon}
                        style={[
                            styles.filterIcon,
                            { tintColor: theme.colors.text.primary[colorScheme] }
                        ]}
                    />
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        height: 50,
        borderRadius: 25,
        paddingHorizontal: 16,
        marginRight: 12, // Space between search and filter button
    },
    searchIcon: {
        fontSize: moderateScale(18),
        marginRight: 8,
    },
    input: {
        flex: 1,
        height: '100%',
    },
    filterButton: {
        height: 50,
        width: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterIcon: {
        width: 24,
        height: 24,
        resizeMode: 'contain',
    },
    inputText: {
        fontSize: moderateScale(16),
        fontWeight: '400',
        lineHeight: moderateScale(20),
        fontFamily: 'poppins_regular',
    },
});
