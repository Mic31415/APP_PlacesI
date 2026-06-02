import React, { useEffect } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { getResponsiveValue, moderateScale } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";
import { TripData } from "../../services/DatabaseService";
import { formatDateRange, dayCount } from "../../utils/tripDates";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
} from "react-native-reanimated";

interface TripCardProps {
  trip: TripData;
  onPress: () => void;
  onLongPress?: () => void;
  style?: any;
  index?: number;
  shouldAnimate?: boolean;
}

export const TripCard: React.FC<TripCardProps> = React.memo(
  ({ trip, onPress, onLongPress, style, index = 0, shouldAnimate = true }) => {
    const { theme, colorScheme } = useTheme();

    const opacity = useSharedValue(0);
    const translateY = useSharedValue(30);
    const scale = useSharedValue(1);

    useEffect(() => {
      if (shouldAnimate) {
        const delay = Math.min(index * 50, 500);
        opacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
        translateY.value = withDelay(delay, withSpring(0, { damping: 12, stiffness: 100 }));
      } else {
        opacity.value = 0;
        translateY.value = 30;
      }
    }, [shouldAnimate, index]);

    const animatedStyle = useAnimatedStyle(() => ({
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }, { scale: scale.value }],
    }));

    const days = dayCount(trip.startDate, trip.endDate);
    const stops = trip.stopCount || 0;
    const subtitle = `${formatDateRange(trip.startDate, trip.endDate)}  ·  ${stops} ${
      stops === 1 ? "stop" : "stops"
    }`;

    return (
      <Animated.View style={[style, animatedStyle]}>
        <Pressable
          onPress={() => {
            haptics.selection();
            onPress();
          }}
          onLongPress={() => {
            haptics.impactMedium();
            onLongPress?.();
          }}
          onPressIn={() => {
            scale.value = withSpring(0.97, { damping: 10 });
          }}
          onPressOut={() => {
            scale.value = withSpring(1, { damping: 10 });
          }}
        >
          <View style={[styles.card, { backgroundColor: theme.colors.surface[colorScheme] }]}>
            <View style={[styles.emojiContainer, { backgroundColor: theme.colors.innerSurface[colorScheme] }]}>
              <Text style={styles.emoji}>{trip.emoji}</Text>
            </View>
            <View style={styles.content}>
              <Text
                style={[styles.tripName, { color: theme.colors.text.primary[colorScheme] }]}
                numberOfLines={1}
              >
                {trip.name}
              </Text>
              <Text
                style={[styles.subtitle, { color: theme.colors.text.secondary[colorScheme] }]}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
              <Text style={[styles.dayBadge, { color: theme.colors.text.tertiary[colorScheme] }]}>
                {days} {days === 1 ? "day" : "days"}
              </Text>
            </View>
            <Icon
              name="chevron-right"
              size={getResponsiveValue(30, 30, 32, 36)}
              color={theme.colors.text.tertiary[colorScheme]}
            />
          </View>
        </Pressable>
      </Animated.View>
    );
  },
);

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
  },
  emojiContainer: {
    width: getResponsiveValue(80, 80, 84, 100),
    height: getResponsiveValue(80, 80, 84, 100),
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  emoji: {
    fontSize: getResponsiveValue(moderateScale(40), moderateScale(40), moderateScale(40), 64),
    lineHeight: getResponsiveValue(moderateScale(48), moderateScale(48), moderateScale(48), 78),
    textAlign: "center",
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  tripName: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    marginBottom: 4,
    fontFamily: "poppins_semibold",
  },
  subtitle: {
    fontSize: moderateScale(13),
    fontFamily: "poppins_regular",
  },
  dayBadge: {
    fontSize: moderateScale(12),
    fontFamily: "poppins_regular",
    marginTop: 2,
  },
});
