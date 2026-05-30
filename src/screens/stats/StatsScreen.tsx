import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import ViewShot, { captureRef } from "react-native-view-shot";
import Share from "react-native-share";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useTheme } from "../../theme/ThemeContext";
import { ScreenHeader } from "../../components/common/ScreenHeader";
import { databaseService } from "../../services/DatabaseService";
import { computeTravelStats, TravelStats } from "../../utils/travelStats";
import { getResponsiveValue, moderateScale } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";

export const StatsScreen: React.FC = () => {
  const { theme, colorScheme } = useTheme();
  const shotRef = useRef<ViewShot>(null);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TravelStats | null>(null);

  // Recompute every time the tab gains focus so it reflects newly-added pins.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        setLoading(true);
        const pins = await databaseService.getAllPins();
        if (!active) return;
        setStats(computeTravelStats(pins));
        setLoading(false);
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  const handleShare = async () => {
    if (!stats || stats.totalPlaces === 0) return;
    haptics.selection();
    try {
      const uri = await captureRef(shotRef, { format: "png", quality: 0.95 });
      await Share.open({
        title: "My Travel Stats",
        message: `I've pinned ${stats.visitedCount} places across ${stats.countryCount} countries and ${stats.cityCount} cities with Places I 🌍`,
        url: uri,
      });
    } catch (e) {
      // user dismissed the share sheet or capture failed — nothing to do
    }
  };

  const renderBody = () => {
    if (loading) {
      return (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      );
    }

    if (!stats || stats.totalPlaces === 0) {
      return (
        <View style={styles.centerFill}>
          <Icon
            name="earth"
            size={getResponsiveValue(64, 64, 72, 90)}
            color={theme.colors.text.tertiary[colorScheme]}
          />
          <Text
            style={[
              styles.emptyText,
              { color: theme.colors.text.tertiary[colorScheme] },
            ]}
          >
            Start pinning places to see your travel stats — countries, cities,
            and how much of the world you've explored.
          </Text>
        </View>
      );
    }

    const tile = (label: string, value: number, icon: string) => (
      <View
        style={[
          styles.tile,
          { backgroundColor: theme.colors.surface[colorScheme] },
        ]}
      >
        <Icon name={icon} size={getResponsiveValue(22, 22, 24, 30)} color={theme.colors.primary} />
        <Text style={[styles.tileValue, { color: theme.colors.text.primary[colorScheme] }]}>
          {value}
        </Text>
        <Text style={[styles.tileLabel, { color: theme.colors.text.secondary[colorScheme] }]}>
          {label}
        </Text>
      </View>
    );

    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Shareable hero card */}
        <ViewShot ref={shotRef} options={{ format: "png", quality: 0.95 }}>
          <View
            style={[
              styles.heroCard,
              {
                backgroundColor: theme.colors.card[colorScheme],
                ...theme.shadows.md,
              },
            ]}
          >
            <Text style={[styles.heroTitle, { color: theme.colors.text.primary[colorScheme] }]}>
              My Travel Footprint
            </Text>

            <View style={styles.tileRow}>
              {tile(stats.visitedCount === 1 ? "Place" : "Places", stats.visitedCount, "map-marker-check")}
              {tile(stats.countryCount === 1 ? "Country" : "Countries", stats.countryCount, "flag-variant")}
              {tile(stats.cityCount === 1 ? "City" : "Cities", stats.cityCount, "city")}
            </View>

            <View style={styles.splitRow}>
              <View style={styles.splitItem}>
                <Icon name="check-circle" size={getResponsiveValue(15, 15, 16, 20)} color={theme.colors.success} />
                <Text style={[styles.splitText, { color: theme.colors.text.secondary[colorScheme] }]}>
                  Been here {stats.visitedCount}
                </Text>
              </View>
              <View style={styles.splitItem}>
                <Icon name="star-outline" size={getResponsiveValue(15, 15, 16, 20)} color={theme.colors.primary} />
                <Text style={[styles.splitText, { color: theme.colors.text.secondary[colorScheme] }]}>
                  Want to go {stats.wishlistCount}
                </Text>
              </View>
            </View>

            <Text style={[styles.brand, { color: theme.colors.text.tertiary[colorScheme] }]}>
              Places I
            </Text>
          </View>
        </ViewShot>

        {/* % of world */}
        <View style={[styles.card, { backgroundColor: theme.colors.card[colorScheme], ...theme.shadows.sm }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: theme.colors.text.primary[colorScheme] }]}>
              World explored
            </Text>
            <Text style={[styles.percentText, { color: theme.colors.primary }]}>
              {stats.percentWorld}%
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: theme.colors.surface[colorScheme] }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: theme.colors.primary, width: `${Math.max(2, stats.percentWorld)}%` },
              ]}
            />
          </View>
          <Text style={[styles.cardSub, { color: theme.colors.text.tertiary[colorScheme] }]}>
            {stats.countryCount} of ~195 countries
          </Text>
        </View>

        {/* Highlights */}
        {(stats.topCountry || stats.topCity || stats.fiveStarCount > 0) && (
          <View style={[styles.card, { backgroundColor: theme.colors.card[colorScheme], ...theme.shadows.sm }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text.primary[colorScheme], marginBottom: 8 }]}>
              Highlights
            </Text>
            {stats.topCountry && (
              <HighlightRow
                icon="flag-variant"
                label="Most-visited country"
                value={`${stats.topCountry.country} (${stats.topCountry.count})`}
              />
            )}
            {stats.topCity && (
              <HighlightRow
                icon="city"
                label="Most-visited city"
                value={`${stats.topCity.city} (${stats.topCity.count})`}
              />
            )}
            {stats.fiveStarCount > 0 && (
              <HighlightRow
                icon="star"
                label="5-star places"
                value={`${stats.fiveStarCount}`}
              />
            )}
          </View>
        )}

        {/* Countries (passport) */}
        {stats.countries.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.colors.card[colorScheme], ...theme.shadows.sm }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text.primary[colorScheme], marginBottom: 8 }]}>
              {stats.countries.length === 1 ? "Your country" : "Your countries"}
            </Text>
            {stats.countries.map((c) => (
              <View key={c.country} style={styles.countryRow}>
                <Text style={[styles.countryName, { color: theme.colors.text.primary[colorScheme] }]} numberOfLines={1}>
                  {c.country}
                </Text>
                <View style={[styles.countBadge, { backgroundColor: theme.colors.primary + "1F" }]}>
                  <Text style={[styles.countBadgeText, { color: theme.colors.primary }]}>{c.count}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Share */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleShare}
          style={[styles.shareBtn, { backgroundColor: theme.colors.primary }]}
        >
          <Icon name="share-variant" size={getResponsiveValue(18, 18, 20, 24)} color="#fff" />
          <Text style={styles.shareBtnText}>Share my stats</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background[colorScheme] }]}>
      <ScreenHeader
        centerComponent={
          <Text style={[styles.headerText, { color: theme.colors.text.primary[colorScheme] }]}>
            Travel Stats
          </Text>
        }
        rightComponent={
          <TouchableOpacity
            onPress={handleShare}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Share my stats"
          >
            <Icon
              name="share-variant"
              size={getResponsiveValue(22, 22, 24, 30)}
              color={theme.colors.text.primary[colorScheme]}
            />
          </TouchableOpacity>
        }
      />
      {renderBody()}
    </View>
  );
};

const HighlightRow: React.FC<{ icon: string; label: string; value: string }> = ({
  icon,
  label,
  value,
}) => {
  const { theme, colorScheme } = useTheme();
  return (
    <View style={styles.highlightRow}>
      <Icon name={icon} size={getResponsiveValue(18, 18, 20, 24)} color={theme.colors.text.secondary[colorScheme]} />
      <Text style={[styles.highlightLabel, { color: theme.colors.text.secondary[colorScheme] }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.highlightValue, { color: theme.colors.text.primary[colorScheme] }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerText: {
    fontSize: getResponsiveValue(moderateScale(20), moderateScale(20), moderateScale(20), 30),
    fontFamily: "poppins_bold",
    fontWeight: "600",
  },
  centerFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    textAlign: "center",
    fontSize: getResponsiveValue(moderateScale(14), moderateScale(14), moderateScale(14), 20),
    fontFamily: "poppins_regular",
    lineHeight: getResponsiveValue(22, 22, 22, 30),
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  heroCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: getResponsiveValue(moderateScale(18), moderateScale(18), moderateScale(19), 26),
    fontFamily: "poppins_bold",
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  tileRow: {
    flexDirection: "row",
    gap: 10,
  },
  tile: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
  },
  tileValue: {
    marginTop: 6,
    fontSize: getResponsiveValue(moderateScale(22), moderateScale(22), moderateScale(24), 34),
    fontFamily: "poppins_bold",
    fontWeight: "700",
  },
  tileLabel: {
    marginTop: 2,
    fontSize: getResponsiveValue(moderateScale(12), moderateScale(12), moderateScale(12), 17),
    fontFamily: "poppins_regular",
  },
  splitRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginTop: 16,
  },
  splitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  splitText: {
    fontSize: getResponsiveValue(moderateScale(13), moderateScale(13), moderateScale(13), 18),
    fontFamily: "poppins_medium",
  },
  brand: {
    marginTop: 16,
    textAlign: "center",
    fontSize: getResponsiveValue(moderateScale(11), moderateScale(11), moderateScale(12), 16),
    fontFamily: "poppins_medium",
    letterSpacing: 1,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontSize: getResponsiveValue(moderateScale(15), moderateScale(15), moderateScale(16), 22),
    fontFamily: "poppins_bold",
    fontWeight: "600",
  },
  cardSub: {
    marginTop: 8,
    fontSize: getResponsiveValue(moderateScale(12), moderateScale(12), moderateScale(13), 17),
    fontFamily: "poppins_regular",
  },
  percentText: {
    fontSize: getResponsiveValue(moderateScale(20), moderateScale(20), moderateScale(22), 30),
    fontFamily: "poppins_bold",
    fontWeight: "700",
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    marginTop: 12,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  highlightRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 10,
  },
  highlightLabel: {
    flex: 1,
    fontSize: getResponsiveValue(moderateScale(13), moderateScale(13), moderateScale(14), 19),
    fontFamily: "poppins_regular",
  },
  highlightValue: {
    fontSize: getResponsiveValue(moderateScale(13), moderateScale(13), moderateScale(14), 19),
    fontFamily: "poppins_medium",
    maxWidth: "50%",
  },
  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  countryName: {
    flex: 1,
    fontSize: getResponsiveValue(moderateScale(14), moderateScale(14), moderateScale(15), 20),
    fontFamily: "poppins_regular",
  },
  countBadge: {
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    alignItems: "center",
    marginLeft: 12,
  },
  countBadgeText: {
    fontSize: getResponsiveValue(moderateScale(12), moderateScale(12), moderateScale(13), 17),
    fontFamily: "poppins_bold",
    fontWeight: "600",
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  shareBtnText: {
    color: "#fff",
    fontSize: getResponsiveValue(moderateScale(15), moderateScale(15), moderateScale(16), 22),
    fontFamily: "poppins_bold",
    fontWeight: "600",
  },
});
