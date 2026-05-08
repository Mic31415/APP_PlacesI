import React, { useState, useCallback } from "react";
import { View, StyleSheet, FlatList, Text, Alert } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useTheme } from "../../theme/ThemeContext";
import { ScreenHeader } from "../../components/common/ScreenHeader";
import { databaseService, MapData } from "../../services/DatabaseService";
import { MapCard } from "../../components/home/MapCard";
import { EmptyState } from "../../components/common/EmptyState";
import { FloatingButton } from "../../components/common/FloatingButton";
import { getResponsiveValue } from "../../utils/responsive";
import { MainTabParamList } from "../../types/navigation";
import { BannerAdView } from "../../components/ads/BannerAdView";

// Mock Data removed
// import { useFocusEffect } from '@react-navigation/native';
// import { databaseService, MapData } from '../../services/DatabaseService';

// ... imports

type HomeScreenNavigationProp = BottomTabNavigationProp<
  MainTabParamList,
  "Home"
>;

export const HomeScreen: React.FC = () => {
  const { theme, colorScheme } = useTheme();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  // Initialize with empty array
  const [maps, setMaps] = useState<MapData[]>([]);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      const loadMaps = async () => {
        try {
          const fetchedMaps = await databaseService.getMaps();
          setMaps(fetchedMaps);

          // Trigger animations after data is loaded
          setTimeout(() => {
            setShouldAnimate(true);
          }, 100);
        } catch (error) {
          console.error("Failed to load maps:", error);
        }
      };

      // Reset animation state when screen comes into focus
      setShouldAnimate(false);
      loadMaps();

      return () => {
        // Reset on blur
        setShouldAnimate(false);
      };
    }, []),
  );

  // Responsive Layout: 1 column on mobile, 2 on tablet
  const numColumns = getResponsiveValue(1, 1, 2, 2);

  const handleCreateMap = () => {
    // Navigate to Create Tab
    navigation.navigate("Create");
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
            My Maps
          </Text>
        }
      />

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
          paddingBottom: 80,
          flexGrow: 1, // Allow container to fill space
          justifyContent: maps.length === 0 ? "center" : "flex-start", // Center only when empty
        }}
        ListEmptyComponent={
          <EmptyState
            title="No Maps Yet"
            description="Create your first map to start pinning your favorite places!"
          />
        }
      />

      <FloatingButton onPress={handleCreateMap} />
      <BannerAdView />
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
});
