import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useTheme } from "../../theme/ThemeContext";
import { haptics } from "../../utils/haptics";

interface RatingPickerProps {
  value: number;
  onValueChange: (rating: number) => void;
  size?: number;
}

export const RatingPicker: React.FC<RatingPickerProps> = ({
  value,
  onValueChange,
  size = 32,
}) => {
  const { theme, colorScheme } = useTheme();

  return (
    <View style={styles.container}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => {
            haptics.selection();
            onValueChange(star);
          }}
          activeOpacity={0.7}
          style={styles.star}
        >
          <Icon
            name={star <= value ? "star" : "star-outline"}
            size={size}
            color={
              star <= value
                ? "#FFD700"
                : theme.colors.text.tertiary[colorScheme]
            } // Gold for active
          />
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  star: {
    marginRight: 8,
  },
});
