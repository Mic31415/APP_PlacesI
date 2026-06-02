import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { databaseService } from "../../services/DatabaseService";
import { getResponsiveValue, moderateScale } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

// One-tap starter maps shown on the empty Home screen so brand-new users
// aren't dropped onto a blank slate. Each template seeds a standard "exact"
// map (no region needed) that the user can immediately pin to.
//
// `icon` drives the chip UI (a MaterialCommunityIcons glyph — renders
// consistently across devices, unlike raw emoji which can fall back to
// "tofu" boxes). `emoji` is the label stored on the created map.
const TEMPLATES: { name: string; emoji: string; icon: string }[] = [
  { name: "Bucket List", emoji: "🎯", icon: "format-list-checks" },
  { name: "Restaurants", emoji: "🍜", icon: "silverware-fork-knife" },
  { name: "Cafés", emoji: "☕", icon: "coffee" },
  { name: "Countries to Visit", emoji: "✈️", icon: "airplane" },
  { name: "Beaches", emoji: "🏖️", icon: "beach" },
  { name: "Hometown", emoji: "🏠", icon: "home-city" },
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

  const handlePick = async (template: (typeof TEMPLATES)[number]) => {
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
    <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
      <Animated.Text
        entering={FadeInDown.duration(350).springify().damping(14)}
        style={[
          styles.heading,
          { color: theme.colors.text.secondary[colorScheme] },
        ]}
      >
        Quick start
      </Animated.Text>
      <View style={styles.grid}>
        {TEMPLATES.map((template, index) => (
          <Animated.View
            key={template.name}
            entering={FadeInDown.delay(120 + index * 70)
              .duration(350)
              .springify()
              .damping(14)}
            style={styles.chipWrap}
          >
            <TouchableOpacity
              activeOpacity={0.7}
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
              <View
                style={[
                  styles.iconTile,
                  { backgroundColor: theme.colors.primary + "1A" },
                ]}
              >
                <Icon
                  name={template.icon}
                  size={moderateScale(18)}
                  color={theme.colors.primary}
                />
              </View>
              <Text
                style={[
                  styles.chipLabel,
                  { color: theme.colors.text.primary[colorScheme] },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {template.name}
              </Text>
            </TouchableOpacity>
          </Animated.View>
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
    justifyContent: "space-between",
    rowGap: getResponsiveValue(10, 10, 12, 14),
    width: "100%",
  },
  // Each chip occupies one of two equal columns so the grid reads as a
  // tidy 2-up layout instead of a ragged, staggered cloud.
  chipWrap: {
    width: "48%",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: getResponsiveValue(10, 10, 11, 13),
    paddingHorizontal: getResponsiveValue(10, 10, 12, 14),
    gap: 10,
  },
  iconTile: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  chipLabel: {
    flex: 1,
    fontSize: moderateScale(13),
    fontFamily: "poppins_medium",
  },
});
