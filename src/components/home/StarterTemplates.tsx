import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { databaseService } from "../../services/DatabaseService";
import { getResponsiveValue, moderateScale } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";
import Animated, { FadeIn } from "react-native-reanimated";

// One-tap starter maps shown on the empty Home screen so brand-new users
// aren't dropped onto a blank slate. Each template just seeds a standard
// "exact" map (no region needed) that the user can immediately pin to.
const TEMPLATES: { name: string; emoji: string }[] = [
  { name: "Bucket List", emoji: "🎯" },
  { name: "Restaurants", emoji: "🍜" },
  { name: "Cafés", emoji: "☕" },
  { name: "Countries to Visit", emoji: "✈️" },
  { name: "Beaches", emoji: "🏖️" },
  { name: "Hometown", emoji: "🏠" },
];

interface StarterTemplatesProps {
  // Called after a template map is created so the parent can reload its list.
  onCreated: () => void;
}

export const StarterTemplates: React.FC<StarterTemplatesProps> = ({
  onCreated,
}) => {
  const { theme, colorScheme } = useTheme();
  // Guard against double-taps creating duplicate maps.
  const [creating, setCreating] = useState(false);

  const handlePick = async (template: { name: string; emoji: string }) => {
    if (creating) return;
    setCreating(true);
    haptics.selection();
    try {
      await databaseService.createMap({
        name: template.name,
        emoji: template.emoji,
        type: "exact",
      });
      haptics.success();
      onCreated();
    } catch (error) {
      console.error("Failed to create starter map:", error);
      haptics.error();
    } finally {
      setCreating(false);
    }
  };

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      style={styles.container}
    >
      <Text
        style={[
          styles.heading,
          { color: theme.colors.text.secondary[colorScheme] },
        ]}
      >
        Quick start
      </Text>
      <View style={styles.grid}>
        {TEMPLATES.map((template) => (
          <TouchableOpacity
            key={template.name}
            activeOpacity={0.8}
            disabled={creating}
            onPress={() => handlePick(template)}
            style={[
              styles.chip,
              {
                backgroundColor: theme.colors.surface[colorScheme],
                borderColor: theme.colors.border[colorScheme],
              },
            ]}
          >
            <Text style={styles.chipEmoji}>{template.emoji}</Text>
            <Text
              style={[
                styles.chipLabel,
                { color: theme.colors.text.primary[colorScheme] },
              ]}
              numberOfLines={1}
            >
              {template.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingHorizontal: 24,
    marginTop: 8,
  },
  heading: {
    fontSize: moderateScale(13),
    fontFamily: "poppins_medium",
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: getResponsiveValue(10, 10, 12, 14),
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: getResponsiveValue(10, 10, 11, 14),
    paddingHorizontal: getResponsiveValue(14, 14, 16, 20),
    gap: 8,
  },
  chipEmoji: {
    fontSize: moderateScale(16),
  },
  chipLabel: {
    fontSize: moderateScale(13),
    fontFamily: "poppins_medium",
  },
});
