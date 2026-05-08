import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  Text,
  Image,
} from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import FilterIcon from "../../assets/Icon/Filter.png";
import {
  getResponsiveValue,
  getScreenDimensions,
  moderateScale,
} from "../../utils/responsive";
import { haptics } from "../../utils/haptics";

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
  const { isTablet } = getScreenDimensions();

  return (
    <View
      style={[
        styles.container,
        {
          top: insets.top + theme.spacing.md,
          paddingHorizontal: getResponsiveValue(
            theme.spacing.md,
            theme.spacing.md,
            theme.spacing.md,
            24,
          ),
        },
        isTablet && styles.tabletContainer,
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
        <Icon
          name="magnify"
          size={getResponsiveValue(20, 20, 22, 28)}
          color={theme.colors.text.tertiary[colorScheme]}
          style={styles.searchIcon}
        />
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
          onPress={() => {
            haptics.selection();
            onFilterPress();
          }}
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
              { tintColor: theme.colors.text.primary[colorScheme] },
            ]}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tabletContainer: {
    right: undefined,
    width: "100%",
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: getResponsiveValue(50, 50, 54, 64),
    borderRadius: getResponsiveValue(25, 25, 27, 32),
    paddingHorizontal: getResponsiveValue(16, 16, 18, 24),
    marginRight: getResponsiveValue(12, 12, 12, 16), // Space between search and filter button
  },
  searchIcon: {
    marginRight: getResponsiveValue(8, 8, 8, 12),
  },
  input: {
    flex: 1,
    height: "100%",
  },
  filterButton: {
    height: getResponsiveValue(50, 50, 54, 64),
    width: getResponsiveValue(50, 50, 54, 64),
    borderRadius: getResponsiveValue(25, 25, 27, 32),
    justifyContent: "center",
    alignItems: "center",
  },
  filterIcon: {
    width: getResponsiveValue(24, 24, 26, 32),
    height: getResponsiveValue(24, 24, 26, 32),
    resizeMode: "contain",
  },
  inputText: {
    fontSize: getResponsiveValue(
      moderateScale(16),
      moderateScale(16),
      moderateScale(16),
      24,
    ),
    fontWeight: "400",
    lineHeight: getResponsiveValue(
      moderateScale(20),
      moderateScale(20),
      moderateScale(20),
      30,
    ),
    fontFamily: "poppins_regular",
  },
});
