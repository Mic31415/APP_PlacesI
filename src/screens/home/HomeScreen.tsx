import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  Alert,
  TouchableOpacity,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import {
  BottomTabNavigationProp,
  useBottomTabBarHeight,
} from "@react-navigation/bottom-tabs";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useTheme } from "../../theme/ThemeContext";
import { ScreenHeader } from "../../components/common/ScreenHeader";
import { databaseService, MapData, TripData } from "../../services/DatabaseService";
import { MapCard } from "../../components/home/MapCard";
import { TripCard } from "../../components/home/TripCard";
import { StarterTemplates } from "../../components/home/StarterTemplates";
import { EmptyState } from "../../components/common/EmptyState";
import { FloatingButton } from "../../components/common/FloatingButton";
import { getResponsiveValue, moderateScale } from "../../utils/responsive";
import { MainTabParamList } from "../../types/navigation";
import { BannerAdView } from "../../components/ads/BannerAdView";
import { haptics } from "../../utils/haptics";

// Mock Data removed
// import { useFocusEffect } from '@react-navigation/native';
// import { databaseService, MapData } from '../../services/DatabaseService';

// ... imports

type HomeScreenNavigationProp = BottomTabNavigationProp<
  MainTabParamList,
  "Home"
>;

const SEARCH_ICON_SIZE = getResponsiveValue(24, 24, 26, 32);

export const HomeScreen: React.FC = () => {
  const { theme, colorScheme } = useTheme();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const tabBarHeight = useBottomTabBarHeight();
  const [maps, setMaps] = useState<MapData[]>([]);
  const [trips, setTrips] = useState<TripData[]>([]);
  const [tab, setTab] = useState<"maps" | "trips">("maps");
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [bannerHeight, setBannerHeight] = useState(0);
  const floatingGap = bannerHeight > 0 ? getResponsiveValue(20, 20, 22, 26) : 0;
  const floatingButtonSize = getResponsiveValue(56, 80, 60, 80);
  const fabBottomOffset = bannerHeight + floatingGap;
  const listBottomPadding =
    bannerHeight + tabBarHeight + floatingButtonSize + floatingGap;

  const loadData = useCallback(async () => {
    try {
      const [fetchedMaps, fetchedTrips] = await Promise.all([
        databaseService.getMaps(),
        databaseService.getTrips(),
      ]);
      setMaps(fetchedMaps);
      setTrips(fetchedTrips);

      // Trigger animations after data is loaded
      setTimeout(() => {
        setShouldAnimate(true);
      }, 100);
    } catch (error) {
      console.error("Failed to load home data:", error);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      // Reset animation state when screen comes into focus
      setShouldAnimate(false);
      loadData();

      return () => {
        // Reset on blur
        setShouldAnimate(false);
      };
    }, [loadData]),
  );

  // Responsive Layout: 1 column on mobile, 2 on tablet
  const numColumns = getResponsiveValue(1, 1, 1, 2);

  const handleFabPress = () => {
    if (tab === "trips") {
      // @ts-ignore — CreateTrip lives on the Home stack.
      navigation.navigate("CreateTrip");
    } else {
      // Navigate to Create Tab
      navigation.navigate("Create");
    }
  };

  const handleTripPress = (trip: TripData) => {
    // @ts-ignore — TripItinerary lives on the Home stack.
    navigation.navigate("TripItinerary", { tripId: trip.id });
  };

  const handleDeleteTrip = useCallback(
    (trip: TripData) => {
      Alert.alert(
        "Delete Trip",
        `Are you sure you want to delete "${trip.name}"? This cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                await databaseService.deleteTrip(trip.id);
                setTrips((prev) => prev.filter((t) => t.id !== trip.id));
              } catch (error) {
                console.error("Failed to delete trip:", error);
                Alert.alert("Error", "Failed to delete trip.");
              }
            },
          },
        ],
        { userInterfaceStyle: colorScheme === "dark" ? "dark" : "light" },
      );
    },
    [],
  );

  const handleOpenSearch = () => {
    haptics.selection();
    // @ts-ignore — GlobalSearch lives on the Home stack; the tab nav prop
    // doesn't infer it directly.
    navigation.navigate("GlobalSearch");
  };

  const handleOpenNearMe = () => {
    haptics.selection();
    // @ts-ignore — NearMe lives on the Home stack; the tab nav prop
    // doesn't infer it directly.
    navigation.navigate("NearMe");
  };

  const handleMapPress = (map: MapData) => {
    // @ts-ignore
    navigation.navigate("MapView", {
      mapId: map.id,
      mapName: map.name,
      emoji: map.emoji,
    });
  };

  const handleDeleteMap = useCallback(
    (map: MapData) => {
      Alert.alert(
        "Delete Map",
        `Are you sure you want to delete "${map.name}"? This cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                await databaseService.deleteMap(map.id);
                // Optimistic update or refresh
                const updatedMaps = maps.filter((m) => m.id !== map.id);
                setMaps(updatedMaps);
              } catch (error) {
                console.error("Failed to delete map:", error);
                Alert.alert("Error", "Failed to delete map.");
              }
            },
          },
        ],
        { userInterfaceStyle: colorScheme === "dark" ? "dark" : "light" },
      );
    },
    [maps],
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background[colorScheme] },
      ]}
    >
      <ScreenHeader
        centerComponent={
          <Text
            style={[
              styles.headerText,
              { color: theme.colors.text.primary[colorScheme] },
            ]}
          >
            {tab === "trips" ? "My Trips" : "My Maps"}
          </Text>
        }
        rightComponent={
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={handleOpenNearMe}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Places near me"
            >
              <Icon
                name="near-me"
                size={SEARCH_ICON_SIZE}
                color={theme.colors.text.primary[colorScheme]}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleOpenSearch}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Search all pins"
            >
              <Icon
                name="magnify"
                size={SEARCH_ICON_SIZE}
                color={theme.colors.text.primary[colorScheme]}
              />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Maps | Trips toggle */}
      <View style={styles.segmentWrap}>
        <View style={[styles.segment, { backgroundColor: theme.colors.surface[colorScheme] }]}>
          {(["maps", "trips"] as const).map((t) => {
            const active = tab === t;
            return (
              <TouchableOpacity
                key={t}
                style={[
                  styles.segmentBtn,
                  active && { backgroundColor: theme.colors.card[colorScheme] },
                ]}
                onPress={() => {
                  if (tab === t) return;
                  haptics.selection();
                  setTab(t);
                  // Replay the stagger entrance for the newly shown list.
                  setShouldAnimate(false);
                  setTimeout(() => setShouldAnimate(true), 50);
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.segmentText,
                    {
                      color: active
                        ? theme.colors.primary
                        : theme.colors.text.secondary[colorScheme],
                    },
                  ]}
                >
                  {t === "maps" ? "Maps" : "Trips"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {tab === "maps" ? (
        <FlatList
          data={maps}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <MapCard
              map={item}
              onPress={() => handleMapPress(item)}
              onLongPress={() => handleDeleteMap(item)}
              style={{ flex: 1, margin: theme.spacing.sm }}
              index={index}
              shouldAnimate={shouldAnimate}
            />
          )}
          numColumns={numColumns}
          key={numColumns} // Force re-render on column change
          contentContainerStyle={{
            padding: theme.spacing.sm,
            paddingBottom: listBottomPadding,
            flexGrow: 1, // Allow container to fill space
            justifyContent: maps.length === 0 ? "center" : "flex-start", // Center only when empty
          }}
          ListEmptyComponent={
            <View>
              <EmptyState
                icon="map-marker-plus"
                title="Start your first map"
                description="Pick a starter below, or tap + to create your own."
              />
              <StarterTemplates onCreated={loadData} />
            </View>
          }
        />
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <TripCard
              trip={item}
              onPress={() => handleTripPress(item)}
              onLongPress={() => handleDeleteTrip(item)}
              style={{ flex: 1, margin: theme.spacing.sm }}
              index={index}
              shouldAnimate={shouldAnimate}
            />
          )}
          contentContainerStyle={{
            padding: theme.spacing.sm,
            paddingBottom: listBottomPadding,
            flexGrow: 1,
            justifyContent: trips.length === 0 ? "center" : "flex-start",
          }}
          ListEmptyComponent={
            <EmptyState
              icon="bag-suitcase"
              title="Plan your first trip"
              description="Create a trip with dates, then build a day-by-day itinerary. Tap + to start."
            />
          }
        />
      )}

      <FloatingButton
        onPress={handleFabPress}
        bottomOffset={fabBottomOffset}
      />
      <BannerAdView onHeightChange={setBannerHeight} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerText: {
    fontWeight: "600",
    fontFamily: "poppins_bold",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: getResponsiveValue(16, 16, 18, 22),
  },
  segmentWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  segment: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: getResponsiveValue(8, 8, 9, 12),
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentText: {
    fontSize: moderateScale(14),
    fontFamily: "poppins_medium",
  },
});
