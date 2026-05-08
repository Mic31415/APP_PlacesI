import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useTheme } from "../../theme/ThemeContext";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { MainTabParamList } from "../../types/navigation";
import { databaseService } from "../../services/DatabaseService";
import { EmojiPickerModal } from "../../components/common/EmojiPickerModal";
import { InterstitialAdService } from "../../services/InterstitialAdService";
// Removed GooglePlacesAutocomplete
import { AppConfig } from "../../config";
import { getResponsiveValue, moderateScale } from "../../utils/responsive";
import { ScreenHeader } from "../../components/common/ScreenHeader";
import { haptics } from "../../utils/haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";

type CreateScreenNavigationProp = BottomTabNavigationProp<
  MainTabParamList,
  "Create"
>;

interface PlacePrediction {
  description: string;
  place_id: string;
}

export const CreateScreen: React.FC = () => {
  const { theme, colorScheme } = useTheme();
  const navigation = useNavigation<CreateScreenNavigationProp>();
  const { top, bottom } = useSafeAreaInsets();

  const [mapName, setMapName] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("🗺️");
  const [mapType, setMapType] = useState<"country" | "state" | "exact">(
    "exact",
  );
  const [initialRegion, setInitialRegion] = useState<string | undefined>(
    undefined,
  );
  const [emojiModalVisible, setEmojiModalVisible] = useState(false);
  const [previousEmoji, setPreviousEmoji] = useState("🗺️");

  // Manual Autocomplete State
  const [query, setQuery] = useState<string>("");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const searchDebounce = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const handleSearch = (text: string) => {
    setQuery(text);

    if (searchDebounce.current) {
      clearTimeout(searchDebounce.current);
    }

    if (text.length < 3) {
      setPredictions([]);
      return;
    }

    searchDebounce.current = setTimeout(async () => {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          text,
        )}&key=${AppConfig.GOOGLE_PLACES_API_KEY}&language=en&types=(regions)`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === "OK") {
          setPredictions(
            data.predictions.map((p: any) => ({
              description: p.description,
              place_id: p.place_id,
            })),
          );
        } else {
          setPredictions([]);
        }
      } catch (error) {
        console.error("Autocomplete error:", error);
        setPredictions([]);
      }
    }, 500);
  };

  const onPlaceSelected = async (placeId: string, description: string) => {
    setQuery(description);
    setPredictions([]);

    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${AppConfig.GOOGLE_PLACES_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK") {
        const { lat, lng } = data.result.geometry.location;
        let region = {
          latitude: lat,
          longitude: lng,
          latitudeDelta: mapType === "country" ? 10 : 2,
          longitudeDelta: mapType === "country" ? 10 : 2,
        };

        if (data.result.geometry.viewport) {
          const { northeast, southwest } = data.result.geometry.viewport;
          region = {
            latitude: (northeast.lat + southwest.lat) / 2,
            longitude: (northeast.lng + southwest.lng) / 2,
            latitudeDelta: Math.abs(northeast.lat - southwest.lat) * 1.1,
            longitudeDelta: Math.abs(northeast.lng - southwest.lng) * 1.1,
          };
        }

        setInitialRegion(JSON.stringify(region));
      }
    } catch (error) {
      console.error("Details error:", error);
      Alert.alert("Error", "Could not fetch location details.");
    }
  };

  // Animation values for form fields (sequential entrance)
  const mapNameOpacity = useSharedValue(0);
  const mapNameTranslateX = useSharedValue(-20);

  const emojiOpacity = useSharedValue(0);
  const emojiTranslateX = useSharedValue(-20);
  const emojiScale = useSharedValue(1); // For pulse animation

  const mapTypeOpacity = useSharedValue(0);
  const mapTypeTranslateX = useSharedValue(-20);

  const buttonOpacity = useSharedValue(0);
  const buttonTranslateX = useSharedValue(-20);

  // Animation value for button press
  const buttonScale = useSharedValue(1);

  // Trigger animations on screen focus
  useFocusEffect(
    React.useCallback(() => {
      // Reset animations
      mapNameOpacity.value = 0;
      mapNameTranslateX.value = -20;
      emojiOpacity.value = 0;
      emojiTranslateX.value = -20;
      mapTypeOpacity.value = 0;
      mapTypeTranslateX.value = -20;
      buttonOpacity.value = 0;
      buttonTranslateX.value = -20;

      // Sequential entrance animations
      setTimeout(() => {
        // Map Name (0ms delay)
        mapNameOpacity.value = withTiming(1, { duration: 250 });
        mapNameTranslateX.value = withTiming(0, { duration: 250 });

        // Emoji (80ms delay)
        setTimeout(() => {
          emojiOpacity.value = withTiming(1, { duration: 250 });
          emojiTranslateX.value = withTiming(0, { duration: 250 });
        }, 80);

        // Map Type (160ms delay)
        setTimeout(() => {
          mapTypeOpacity.value = withTiming(1, { duration: 250 });
          mapTypeTranslateX.value = withTiming(0, { duration: 250 });
        }, 160);

        // Button (240ms delay)
        setTimeout(() => {
          buttonOpacity.value = withTiming(1, { duration: 250 });
          buttonTranslateX.value = withTiming(0, { duration: 250 });
        }, 240);
      }, 100);

      return () => {
        // Cleanup on unfocus
        mapNameOpacity.value = 0;
        emojiOpacity.value = 0;
        mapTypeOpacity.value = 0;
        buttonOpacity.value = 0;
      };
    }, []),
  );

  // Trigger emoji pulse when emoji changes
  useEffect(() => {
    if (selectedEmoji !== previousEmoji) {
      emojiScale.value = withSequence(withSpring(1.2, { damping: 10 }));
      setPreviousEmoji(selectedEmoji);
    }
  }, [selectedEmoji]);

  const mapNameAnimatedStyle = useAnimatedStyle(() => ({
    opacity: mapNameOpacity.value,
    transform: [{ translateX: mapNameTranslateX.value }],
  }));

  const emojiSectionAnimatedStyle = useAnimatedStyle(() => ({
    opacity: emojiOpacity.value,
    transform: [{ translateX: emojiTranslateX.value }],
  }));

  const emojiPulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: emojiScale.value }],
  }));

  const mapTypeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: mapTypeOpacity.value,
    transform: [{ translateX: mapTypeTranslateX.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [
      { translateX: buttonTranslateX.value },
      { scale: buttonScale.value },
    ],
  }));

  const handleCancel = () => {
    haptics.selection();
    // Find 'Home' tab and navigate
    navigation.navigate("Home");
    // Or reset form
    setMapName("");
    setSelectedEmoji("🗺️");
    setMapType("exact");
    setInitialRegion(undefined);
  };

  const handleCreate = async () => {
    if (!mapName.trim()) {
      Alert.alert("Required", "Please enter a map name", undefined, {
        userInterfaceStyle: colorScheme === "dark" ? "dark" : "light",
      });
      return;
    }

    if ((mapType === "country" || mapType === "state") && !initialRegion) {
      Alert.alert(
        "Required",
        "Please select a location for this map type",
        undefined,
        { userInterfaceStyle: colorScheme === "dark" ? "dark" : "light" },
      );
      return;
    }

    // Button animation
    buttonScale.value = withSequence(
      withSpring(0.95, { damping: 10 }),
      withSpring(1.05, { damping: 10 }),
      withSpring(1, { damping: 10 }),
    );

    try {
      await databaseService.createMap({
        name: mapName.trim(),
        emoji: selectedEmoji,
        type: mapType,
        initialRegion: initialRegion,
      });

      // Show interstitial ad if not premium
      await InterstitialAdService.showInterstitial();

      haptics.success();
      setMapName("");
      setSelectedEmoji("🗺️");
      setMapType("exact");
      setInitialRegion(undefined);
      navigation.navigate("Home");
    } catch (error) {
      console.error("Error creating map:", error);
      Alert.alert(
        "Error",
        "Failed to create map. Please try again.",
        undefined,
        { userInterfaceStyle: colorScheme === "dark" ? "dark" : "light" },
      );
    }
  };

  const renderMapTypeOption = (
    type: "country" | "state" | "exact",
    label: string,
    index: number,
  ) => {
    const iconScale = useSharedValue(mapType === type ? 1 : 0.8);

    useEffect(() => {
      if (mapType === type) {
        iconScale.value = withSpring(1, { damping: 10 });
      } else {
        iconScale.value = 0.8;
      }
    }, [mapType]);

    const iconAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: iconScale.value }],
    }));

    return (
      <TouchableOpacity
        key={type}
        style={styles.radioButtonContainer}
        onPress={() => {
          haptics.selection();
          setMapType(type);
        }}
        activeOpacity={0.7}
      >
        <Animated.View style={iconAnimatedStyle}>
          <Icon
            name={mapType === type ? "radiobox-marked" : "radiobox-blank"}
            size={getResponsiveValue(24, 24, 26, 30)}
            color={
              mapType === type
                ? theme.colors.primary
                : theme.colors.text.tertiary[colorScheme]
            }
          />
        </Animated.View>
        <Text
          style={[
            styles.radioLabel,
            { color: theme.colors.text.primary[colorScheme] },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

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
            New Map
          </Text>
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Map Name */}
          <Animated.View style={mapNameAnimatedStyle}>
            <Text
              style={[
                styles.label,
                { color: theme.colors.text.secondary[colorScheme] },
              ]}
            >
              Map Name
            </Text>
            <View
              style={[
                styles.inputContainer,
                { backgroundColor: theme.colors.surface[colorScheme] },
              ]}
            >
              <TextInput
                style={[
                  styles.input,
                  { color: theme.colors.text.primary[colorScheme] },
                ]}
                placeholder="e.g. Places I've Visited"
                placeholderTextColor={theme.colors.text.tertiary[colorScheme]}
                value={mapName}
                onChangeText={setMapName}
              />
            </View>
          </Animated.View>

          {/* Emoji Selector */}
          <Animated.View style={emojiSectionAnimatedStyle}>
            <Text
              style={[
                styles.label,
                { color: theme.colors.text.secondary[colorScheme] },
              ]}
            >
              Choose Emoji
            </Text>
            <TouchableOpacity
              style={[
                styles.emojiSelector,
                { backgroundColor: theme.colors.surface[colorScheme] },
              ]}
              onPress={() => {
                haptics.selection();
                setEmojiModalVisible(true);
              }}
            >
              <View
                style={[
                  styles.emojiInnerContainer,
                  { backgroundColor: theme.colors.innerSurface[colorScheme] },
                ]}
              >
                <Animated.View style={emojiPulseAnimatedStyle}>
                  <Text style={styles.emojiPreview}>{selectedEmoji}</Text>
                </Animated.View>
              </View>
              <Text
                style={[
                  styles.caption,
                  {
                    color: theme.colors.text.tertiary[colorScheme],
                    marginTop: 12,
                  },
                ]}
              >
                Tap to change
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Map Type */}
          <Animated.View style={mapTypeAnimatedStyle}>
            <Text
              style={[
                styles.label,
                { color: theme.colors.text.secondary[colorScheme] },
              ]}
            >
              Map Type
            </Text>
            {renderMapTypeOption(
              "country",
              "Country Level (e.g. Japan Trip)",
              0,
            )}
            {renderMapTypeOption("state", "State Level (e.g. California)", 1)}
            {renderMapTypeOption("exact", "Exact Location (Standard)", 2)}

            {/* Location Search for Country/State */}
            {(mapType === "country" || mapType === "state") && (
              <Animated.View
                style={{
                  marginTop: 16,
                  minHeight: 300, // Give enough space for dropdown
                  zIndex: 1000, // Ensure dropdown is on top
                }}
                entering={FadeIn.duration(300)}
                exiting={FadeOut.duration(200)}
              >
                <Text
                  style={[
                    styles.label,
                    {
                      color: theme.colors.text.secondary[colorScheme],
                      marginTop: 0,
                    },
                  ]}
                >
                  Search Location
                </Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flex: 1, zIndex: 1000 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: theme.colors.surface[colorScheme],
                        borderRadius: 12,
                        borderWidth: 0, // Matched original style which had no border on container, but input had styles. Let's keep it clean.
                        height: 44,
                        paddingHorizontal: 12,
                      }}
                    >
                      <Icon
                        name="magnify"
                        size={20}
                        color={theme.colors.text.tertiary[colorScheme]}
                      />
                      <TextInput
                        style={{
                          flex: 1,
                          height: 44,
                          color: theme.colors.text.primary[colorScheme],
                          fontSize: moderateScale(14),
                          marginLeft: 8,
                          fontFamily: "poppins_regular",
                          paddingVertical: 0, // crucial for android text centering
                        }}
                        placeholder='Search (e.g. "Japan")'
                        placeholderTextColor={
                          theme.colors.text.tertiary[colorScheme]
                        }
                        value={query}
                        onChangeText={handleSearch}
                        autoCorrect={false}
                      />
                      {query.length > 0 && (
                        <TouchableOpacity
                          onPress={() => {
                            haptics.selection();
                            setQuery("");
                            setPredictions([]);
                          }}
                        >
                          <Icon
                            name="close-circle"
                            size={18}
                            color={theme.colors.text.tertiary[colorScheme]}
                          />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Predictions List */}
                    {predictions.length > 0 && (
                      <View
                        style={{
                          position: "absolute",
                          top: 50,
                          left: 0,
                          right: 0,
                          backgroundColor: theme.colors.card[colorScheme],
                          borderRadius: 12,
                          elevation: 5,
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.1,
                          shadowRadius: 4,
                          zIndex: 2000,
                          maxHeight: 200,
                        }}
                      >
                        <FlatList
                          data={predictions}
                          keyExtractor={(item) => item.place_id}
                          keyboardShouldPersistTaps="always"
                          nestedScrollEnabled={true}
                          renderItem={({ item }) => (
                            <TouchableOpacity
                              style={{
                                padding: 12,
                                borderBottomWidth: 0.5,
                                borderBottomColor:
                                  theme.colors.border[colorScheme],
                              }}
                              onPress={() => {
                                haptics.selection();
                                onPlaceSelected(
                                  item.place_id,
                                  item.description,
                                );
                              }}
                            >
                              <Text
                                style={{
                                  color: theme.colors.text.primary[colorScheme],
                                  fontSize: moderateScale(14),
                                  fontFamily: "poppins_regular",
                                }}
                              >
                                {item.description}
                              </Text>
                            </TouchableOpacity>
                          )}
                        />
                      </View>
                    )}
                  </View>
                </View>
              </Animated.View>
            )}
          </Animated.View>

          {/* Create Button */}
          <Animated.View style={buttonAnimatedStyle}>
            <TouchableOpacity
              style={[
                styles.createButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={handleCreate}
            >
              <Text style={styles.createButtonText}>Create Map</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Emoji Modal */}
      <EmojiPickerModal
        visible={emojiModalVisible}
        onClose={() => setEmojiModalVisible(false)}
        onSelectEmoji={setSelectedEmoji}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  headerText: {
    fontWeight: "600",
    fontFamily: "poppins_bold",
  },
  headerBtn: {
    padding: 4,
  },
  content: {
    padding: 24,
  },
  label: {
    fontSize: moderateScale(14),
    fontWeight: "500",
    marginBottom: 8,
    marginTop: 16,
    fontFamily: "poppins_medium",
  },
  inputContainer: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  input: {
    fontSize: moderateScale(12),
    fontFamily: "poppins_regular",
    paddingVertical: 12,
  },
  emojiSelector: {
    flexDirection: "column",
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 24,
    marginBottom: 8,
    width: "100%",
    justifyContent: "center",
  },
  emojiInnerContainer: {
    width: "100%",
    height: getResponsiveValue(100, 100, 108, 132),
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emojiPreview: {
    fontSize: getResponsiveValue(
      moderateScale(60),
      moderateScale(60),
      moderateScale(60),
      72,
    ),
    lineHeight: getResponsiveValue(
      moderateScale(72),
      moderateScale(72),
      moderateScale(72),
      92,
    ),
    textAlign: "center",
  },
  radioButtonContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: getResponsiveValue(12, 12, 13, 16),
  },
  radioLabel: {
    fontSize: getResponsiveValue(
      moderateScale(12),
      moderateScale(12),
      moderateScale(12),
      18,
    ),
    fontWeight: "500",
    marginLeft: getResponsiveValue(12, 12, 12, 16),
    fontFamily: "poppins_medium",
  },
  createButton: {
    marginTop: 32,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  caption: {
    fontSize: moderateScale(12),
    fontWeight: "400",
    fontFamily: "poppins_regular",
  },
  createButtonText: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    fontFamily: "poppins_semibold",
    color: "#ffffff",
  },
});
