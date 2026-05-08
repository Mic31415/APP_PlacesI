import React, { useEffect } from "react";
import { Pressable, StyleSheet, ViewStyle } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { getResponsiveValue } from "../../utils/responsive";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
} from "react-native-reanimated";
import { haptics } from "../../utils/haptics";

interface FloatingButtonProps {
  onPress: () => void;
  icon?: string;
  style?: ViewStyle;
}

export const FloatingButton: React.FC<FloatingButtonProps> = ({
  onPress,
  icon = "plus",
  style,
}) => {
  const { theme, colorScheme } = useTheme();
  const insets = useSafeAreaInsets();

  // Entrance animation
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(50);

  // Press animation
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    // Entrance animation with delay
    opacity.value = withDelay(400, withTiming(1, { duration: 300 }));
    translateY.value = withDelay(400, withSpring(0, { damping: 15 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { translateY: translateY.value },
        { scale: scale.value },
        { rotate: `${rotation.value}deg` },
      ],
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 10 });
  };

  const handlePressOut = () => {
    // Bounce back with rotation
    scale.value = withSequence(
      withSpring(1.1, { damping: 10 }),
      withSpring(1, { damping: 10 }),
    );
    rotation.value = withSequence(
      withSpring(90, { damping: 15 }),
      withSpring(0, { damping: 15 }),
    );
  };

  const handlePress = () => {
    haptics.impactMedium();
    onPress();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.primary,
          marginBottom: insets.bottom + theme.spacing.md,
          marginRight: theme.spacing.md,
          ...theme.shadows.lg,
        },
        style,
        animatedStyle,
      ]}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.pressable}
      >
        <Icon
          name={icon}
          size={getResponsiveValue(28, 28, 30, 50)}
          color="#FFFFFF"
        />
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: getResponsiveValue(56, 56, 60, 80),
    height: getResponsiveValue(56, 56, 60, 80),
    borderRadius: getResponsiveValue(28, 28, 30, 40),
    zIndex: 999,
  },
  pressable: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
});
