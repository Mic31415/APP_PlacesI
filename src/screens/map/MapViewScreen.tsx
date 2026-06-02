import React, {
  useState,
  useRef,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  FlatList,
  Alert,
  Modal,
  TextInput,
  Share,
  KeyboardAvoidingView,
  Keyboard,
  Animated as RNAnimated,
  Easing as RNEasing,
  Platform,
  PermissionsAndroid,
  ActivityIndicator,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Geolocation from "@react-native-community/geolocation";
import MapView from "react-native-map-clustering";
import { PROVIDER_DEFAULT } from "react-native-maps";
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
} from "@react-navigation/native";
import { useTheme } from "../../theme/ThemeContext";
import { ScreenHeader } from "../../components/common/ScreenHeader";
import { CustomMarker } from "../../components/map/CustomMarker";
import { MapSearchBar } from "../../components/map/MapSearchBar";
import { FloatingButton } from "../../components/common/FloatingButton";
import { RootStackParamList, HomeStackParamList } from "../../types/navigation";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PinDetailModal } from "../../components/map/PinDetailModal";
import { EmojiPickerModal } from "../../components/common/EmojiPickerModal";
import { MapHeaderMenu } from "../../components/map/MapHeaderMenu";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { BannerAdView } from "../../components/ads/BannerAdView";
import ViewShot, { captureRef } from "react-native-view-shot";
import RNShare from "react-native-share";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";

// ... imports
import { databaseService, PinData } from "../../services/DatabaseService";
import { resolvePinImage } from "../../utils/imageStorage";
import { getResponsiveValue, moderateScale } from "../../utils/responsive";
import { RatingPicker } from "../../components/common/RatingPicker";
import { haptics } from "../../utils/haptics";

// Default Region (Tokyo)
const INITIAL_REGION = {
  latitude: 35.6895,
  longitude: 139.6917,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

type MapViewScreenNavigationProp = NativeStackNavigationProp<
  HomeStackParamList,
  "MapView"
>;
type MapViewScreenRouteProp = RouteProp<HomeStackParamList, "MapView">;

export const MapViewScreen: React.FC = () => {
  const { theme, colorScheme } = useTheme();
  const navigation = useNavigation<MapViewScreenNavigationProp>();
  const route = useRoute<MapViewScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const { mapId, mapName, emoji, focusPinId } = route.params || {};

  const mapRef = useRef<MapView>(null);
  const mapViewShotRef = useRef<ViewShot>(null);
  // Set when an incoming focusPinId has just been consumed, so the
  // onMapReady fit-to-all-coordinates pass doesn't zoom out away from
  // the pin the user came to see. Cleared after one onMapReady fire.
  const focusPinHandledRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pins, setPins] = useState<PinData[]>([]);

  // Local state for Map Details (to allow updates)
  const [currentMapName, setCurrentMapName] = useState(mapName);
  const [currentMapEmoji, setCurrentMapEmoji] = useState(emoji);

  // Edit Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState(mapName);
  const [editEmoji, setEditEmoji] = useState(emoji);
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);

  // Filter & Sort State
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "az" | "rating">(
    "newest",
  );
  const [minRating, setMinRating] = useState(0);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "visited" | "wishlist"
  >("all");
  // Map vs. list presentation of the same filtered pins.
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  // Tags selected in the filter sheet; a pin matches if it has any of them.
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [bannerHeight, setBannerHeight] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const bannerTranslateY = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setIsKeyboardOpen(true);
      const keyboardHeight = e.endCoordinates?.height || 0;
      const adjustedHeight = Math.max(0, keyboardHeight - insets.bottom);
      const bannerOffset = Math.max(0, adjustedHeight);

      RNAnimated.timing(bannerTranslateY, {
        toValue: -bannerOffset,
        duration: Platform.OS === "ios" ? e.duration || 250 : 250,
        easing: RNEasing.out(RNEasing.quad),
        useNativeDriver: true,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      setIsKeyboardOpen(false);
      RNAnimated.timing(bannerTranslateY, {
        toValue: 0,
        duration: Platform.OS === "ios" ? e.duration || 250 : 250,
        easing: RNEasing.out(RNEasing.quad),
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [bannerTranslateY, insets.bottom]);

  const bannerAnimatedStyle = {
    transform: [{ translateY: bannerTranslateY }],
  };

  const filteredPins = useMemo(() => {
    let result = pins;

    // 1. Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (pin) =>
          pin.title.toLowerCase().includes(query) ||
          (pin.description && pin.description.toLowerCase().includes(query)),
      );
    }

    // 2. Filter by Rating
    if (minRating > 0) {
      result = result.filter((pin) => (pin.rating || 0) >= minRating);
    }

    // 2b. Filter by Status (Been here / Want to go)
    if (statusFilter !== "all") {
      result = result.filter(
        (pin) => (pin.status || "visited") === statusFilter,
      );
    }

    // 2c. Filter by Tags (pin matches if it has any selected tag)
    if (tagFilter.length > 0) {
      result = result.filter((pin) =>
        (pin.tags || []).some((t) => tagFilter.includes(t)),
      );
    }

    // 3. Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case "oldest":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case "az":
          return a.title.localeCompare(b.title);
        case "rating":
          return (b.rating || 0) - (a.rating || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [pins, searchQuery, sortBy, minRating, statusFilter, tagFilter]);

  // Unique tags across this map's pins, for the filter sheet.
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    for (const pin of pins) for (const t of pin.tags || []) set.add(t);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [pins]);

  // Animation values for smooth, soft animations
  const searchBarOpacity = useSharedValue(0);
  const searchBarTranslateY = useSharedValue(-20); // Smaller distance for subtle effect

  const horizontalListOpacity = useSharedValue(0);
  const horizontalListTranslateY = useSharedValue(30); // Smaller distance

  const fabOpacity = useSharedValue(0);
  const fabScale = useSharedValue(0.8); // Scale instead of translate for softer feel

  // Edit Map modal animation values
  const editModalBackdropOpacity = useSharedValue(0);
  const editModalTranslateY = useSharedValue(500);

  const editFieldOpacity = useSharedValue(0);
  const editFieldTranslateY = useSharedValue(20);

  const editIconOpacity = useSharedValue(0);
  const editIconTranslateY = useSharedValue(20);

  const editButtonsOpacity = useSharedValue(0);
  const editButtonsTranslateY = useSharedValue(20);

  // Filter Modal Animation Values
  const filterModalBackdropOpacity = useSharedValue(0);
  const filterModalTranslateY = useSharedValue(500);

  const [initialRegion, setInitialRegion] = useState<any>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      if (!mapId) return;

      const prepareMap = async () => {
        try {
          // 1. Fetch Map Details & Pins
          // We use exportMapData as a convenient way to get both, or we could add getMap
          const { map, pins: fetchedPins } =
            await databaseService.exportMapData(mapId);

          setPins(fetchedPins);

          // Sync local state if changed from outside
          if (map.name !== currentMapName) setCurrentMapName(map.name);
          if (map.emoji !== currentMapEmoji) setCurrentMapEmoji(map.emoji);

          const focusTarget = focusPinId
            ? fetchedPins.find((p) => p.id === focusPinId)
            : null;

          if (focusTarget) {
            // Came in from Global Search — center tightly on the requested
            // pin and open its detail sheet straight away.
            focusPinHandledRef.current = true;
            setInitialRegion({
              latitude: focusTarget.latitude,
              longitude: focusTarget.longitude,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            });
            setIsMapReady(true);
            setSelectedPin(focusTarget);
            setModalVisible(true);
            // Consume the param so refocusing this screen later (e.g. after
            // closing the detail sheet) doesn't replay the auto-open.
            navigation.setParams({ focusPinId: undefined } as any);
          } else if (fetchedPins.length > 0) {
            // Option A: Fit to Pins
            const firstPin = fetchedPins[0];
            setInitialRegion({
              latitude: firstPin.latitude,
              longitude: firstPin.longitude,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
            });
            setIsMapReady(true);
          } else if (map.initialRegion) {
            // Option B: Use Map's Initial Region (Country/State)
            try {
              const region = JSON.parse(map.initialRegion);
              setInitialRegion(region);
              setIsMapReady(true);
            } catch (e) {
              // Fallback
              triggerUserLocationFallback();
            }
          } else {
            // Option C: No Pins & No Region -> User Location
            triggerUserLocationFallback();
          }
        } catch (error) {
          console.error("Failed to prepare map:", error);
          setIsMapReady(true);
        }
      };

      const triggerUserLocationFallback = async () => {
        const requestLocation = async () => {
          let hasPermission = false;
          if (Platform.OS === "android") {
            hasPermission = await PermissionsAndroid.check(
              PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            );
            if (!hasPermission) {
              const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
              );
              hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
            }
          } else {
            Geolocation.requestAuthorization();
            hasPermission = true;
          }

          if (hasPermission) {
            Geolocation.getCurrentPosition(
              (position) => {
                setInitialRegion({
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                });
                setIsMapReady(true);
              },
              (error) => {
                setInitialRegion({
                  latitude: 35.6895,
                  longitude: 139.6917,
                  latitudeDelta: 0.1,
                  longitudeDelta: 0.1,
                });
                setIsMapReady(true);
              },
              { enableHighAccuracy: false, timeout: 5000, maximumAge: 10000 },
            );
          } else {
            setInitialRegion({
              latitude: 35.6895,
              longitude: 139.6917,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
            });
            setIsMapReady(true);
          }
        };
        requestLocation();
      };

      prepareMap();

      // Trigger smooth entrance animations
      // Reset to initial state
      searchBarOpacity.value = 0;
      searchBarTranslateY.value = -20;
      horizontalListOpacity.value = 0;
      horizontalListTranslateY.value = 30;
      fabOpacity.value = 0;
      fabScale.value = 0.8;

      // Animate with very smooth, soft timing
      setTimeout(() => {
        // Search bar - gentle fade and slide (200ms delay)
        setTimeout(() => {
          searchBarOpacity.value = withTiming(1, {
            duration: 600,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Ease out
          });
          searchBarTranslateY.value = withTiming(0, {
            duration: 600,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          });
        }, 200);

        // Horizontal list - very soft slide up (400ms delay)
        setTimeout(() => {
          horizontalListOpacity.value = withTiming(1, {
            duration: 700,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          });
          horizontalListTranslateY.value = withSpring(0, {
            damping: 25, // Higher damping for softer spring
            stiffness: 80, // Lower stiffness for gentler motion
          });
        }, 400);

        // FAB - gentle scale and fade (500ms delay)
        setTimeout(() => {
          fabOpacity.value = withTiming(1, {
            duration: 600,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          });
          fabScale.value = withSpring(1, {
            damping: 20,
            stiffness: 100,
          });
        }, 500);
      }, 100);

      return () => {
        // Cleanup
        searchBarOpacity.value = 0;
        horizontalListOpacity.value = 0;
        fabOpacity.value = 0;
      };
    }, [mapId]),
  );

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPin, setSelectedPin] = useState<PinData | null>(null);

  const handleEditMap = () => {
    haptics.selection();
    setEditName(currentMapName);
    setEditEmoji(currentMapEmoji);
    setEditModalVisible(true);
  };

  const handleSaveMap = async () => {
    if (!editName.trim()) {
      Alert.alert("Error", "Map name cannot be empty", undefined, {
        userInterfaceStyle: colorScheme === "dark" ? "dark" : "light",
      });
      return;
    }

    try {
      await databaseService.updateMap(mapId, {
        name: editName.trim(),
        emoji: editEmoji,
      });
      setCurrentMapName(editName.trim());
      setCurrentMapEmoji(editEmoji);
      haptics.success();
      setEditModalVisible(false);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to update map", undefined, {
        userInterfaceStyle: colorScheme === "dark" ? "dark" : "light",
      });
    }
  };

  const handleAddPin = () => {
    haptics.impactLight();
    if (!mapId) {
      console.error("Missing mapId in MapViewScreen");
      Alert.alert("Error", "Map ID is missing. Cannot create pin.");
      return;
    }
    navigation.navigate("CreatePin", { mapId, mapEmoji: emoji });
  };

  const handleEditPin = (pin: PinData | null) => {
    if (!pin) return;
    haptics.selection();
    setModalVisible(false); // Close modal first
    navigation.navigate("CreatePin", { mapId, mapEmoji: emoji, pin });
  };

  const handleSharePin = async (pin: PinData | null) => {
    if (!pin) return;
    haptics.selection();
    try {
      let message = `${pin.emoji || "📍"} *${pin.title}*\n`;
      if (pin.rating) message += `⭐ ${pin.rating}/5\n`;
      if (pin.description) message += `"${pin.description}"\n`;
      if (pin.latitude && pin.longitude) {
        message += `🗺️ https://maps.google.com/?q=${pin.latitude},${pin.longitude}\n`;
      }
      message += `\nShared from *Places I...* App`;

      await Share.share({
        message: message,
        title: `Check out ${pin.title}`,
      });
    } catch (error) {
      console.error("Error sharing pin:", error);
    }
  };

  const handleMarkerPress = useCallback((pin: PinData) => {
    haptics.selection();
    setSelectedPin(pin);
    setModalVisible(true);
  }, []);

  const handleClosePinDetail = useCallback(() => {
    haptics.selection();
    setModalVisible(false);
    setSelectedPin(null);
  }, []);

  const handleDeletePin = useCallback(
    async (pinId: string) => {
      try {
        await databaseService.deletePin(pinId);
        const updatedPins = pins.filter((p) => p.id !== pinId);
        setPins(updatedPins);
      } catch (error) {
        console.error("Failed to delete pin:", error);
        Alert.alert("Error", "Failed to delete pin", undefined, {
          userInterfaceStyle: colorScheme === "dark" ? "dark" : "light",
        });
      }
    },
    [pins],
  );

  const handleToggleStatus = useCallback(
    async (pinId: string, newStatus: "visited" | "wishlist") => {
      try {
        haptics.success();
        await databaseService.updatePin(pinId, { status: newStatus });
        // Update the list and the open detail sheet so the change is instant.
        setPins((prev) =>
          prev.map((p) => (p.id === pinId ? { ...p, status: newStatus } : p)),
        );
        setSelectedPin((prev) =>
          prev && prev.id === pinId ? { ...prev, status: newStatus } : prev,
        );
      } catch (error) {
        console.error("Failed to update pin status:", error);
        Alert.alert("Error", "Failed to update status", undefined, {
          userInterfaceStyle: colorScheme === "dark" ? "dark" : "light",
        });
      }
    },
    [colorScheme],
  );

  const buildMapTextMessage = (): string => {
    let message = `🗺️ *${currentMapName}* ${currentMapEmoji}\n`;
    message += `📍 ${pins.length} Places Pinned\n\n`;

    if (pins.length > 0) {
      message += `Here are the places I've saved:\n\n`;

        // Loop through pins and format them
      pins.forEach((pin, index) => {
        const ratingStar = pin.rating ? "⭐ " + pin.rating + "/5" : "";
        message += `${index + 1}. ${pin.emoji || "📍"} *${pin.title}*\n`;
        if (ratingStar) message += `   ${ratingStar}\n`;
        if (pin.description) message += `   "${pin.description}"\n`;
          // Add Google Maps link if coords exist
        if (pin.latitude && pin.longitude) {
          message += `   🗺️ https://maps.google.com/?q=${pin.latitude},${pin.longitude}\n`;
        }
          message += "\n"; // Add spacing between pins
      });
    } else {
      message += "No pins added yet! Start exploring.\n";
    }

    message += `\nShared from *Places I...* App`;
    return message;
  };

  const handleShareMap = async () => {
    haptics.selection();

    // Build the full pin-list message once so the image share and the text
    // fallback share the exact same content. Receiving apps that support
    // both image + caption (Messages, WhatsApp, Email, etc.) will show the
    // map screenshot with the full pin list as the accompanying caption.
    const fullMessage = buildMapTextMessage();

    // 1) Try capturing the map and sharing it as an image + the full pin
    //    list. This is the preferred path — recipients see the visual map
    //    AND the same detailed message users were used to.
    try {
      const uri = await captureRef(mapViewShotRef, {
        format: "png",
        quality: 0.9,
      });

      await RNShare.open({
        title: `My Map: ${currentMapName}`,
        message: fullMessage,
        url: uri,
      });
      return;
    } catch (error: any) {
      // The native share sheet throws when the user dismisses it. That's
      // not a real failure — bail silently without falling back.
      const msg = String(error?.message || "");
      if (/user did not share|dismiss|cancel/i.test(msg)) {
        return;
      }
      console.warn("Map image share failed, falling back to text:", error);
    }

    // 2) Fall back to the original text-only share (full pin list) so the
    //    user always gets *some* share path even if the snapshot fails.
    try {
      await Share.share({
        message: fullMessage,
        title: `My Map: ${currentMapName}`,
      });
    } catch (error) {
      console.error("Text share fallback failed:", error);
      Alert.alert("Share Failed", "Could not share map.");
    }
  };

  const handleDeleteMap = () => {
    haptics.warning();
    Alert.alert(
      "Delete Map",
      `Are you sure you want to delete "${currentMapName}"?\nAll ${pins.length} pins on this map will also be deleted.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await databaseService.deleteMap(mapId);
              haptics.success();
              navigation.goBack();
            } catch (error) {
              console.error("Failed to delete map:", error);
              Alert.alert("Error", "Failed to delete map", undefined, {
                userInterfaceStyle: colorScheme === "dark" ? "dark" : "light",
              });
            }
          },
        },
      ],
      { userInterfaceStyle: colorScheme === "dark" ? "dark" : "light" },
    );
  };

  const renderHeaderRight = useCallback(
    () => (
      <View style={styles.headerRightRow}>
        <TouchableOpacity
          onPress={() => {
            haptics.selection();
            setViewMode((m) => (m === "map" ? "list" : "map"));
          }}
          style={styles.headerToggleButton}
          accessibilityRole="button"
          accessibilityLabel={
            viewMode === "map" ? "Switch to list view" : "Switch to map view"
          }
        >
          <Icon
            name={viewMode === "map" ? "format-list-bulleted" : "map-outline"}
            size={getResponsiveValue(24, 24, 26, 32)}
            color={theme.colors.text.primary[colorScheme]}
          />
        </TouchableOpacity>
        <MapHeaderMenu
          onEdit={() => handleEditMap()}
          onShare={handleShareMap}
          onDelete={handleDeleteMap}
        />
      </View>
    ),
    [handleEditMap, currentMapName, currentMapEmoji, pins, viewMode, colorScheme],
  );

  // Animated styles for smooth, soft animations
  const searchBarAnimatedStyle = useAnimatedStyle(() => ({
    opacity: searchBarOpacity.value,
    transform: [{ translateY: searchBarTranslateY.value }],
  }));

  const horizontalListAnimatedStyle = useAnimatedStyle(() => ({
    opacity: horizontalListOpacity.value,
    transform: [{ translateY: horizontalListTranslateY.value }],
  }));

  const fabAnimatedStyle = useAnimatedStyle(() => ({
    opacity: fabOpacity.value,
    transform: [{ scale: fabScale.value }],
  }));

  // Edit Map modal animated styles
  const editModalBackdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: editModalBackdropOpacity.value,
  }));

  const editModalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: editModalTranslateY.value }],
  }));

  const editFieldAnimatedStyle = useAnimatedStyle(() => ({
    opacity: editFieldOpacity.value,
    transform: [{ translateY: editFieldTranslateY.value }],
  }));

  const editIconAnimatedStyle = useAnimatedStyle(() => ({
    opacity: editIconOpacity.value,
    transform: [{ translateY: editIconTranslateY.value }],
  }));

  const editButtonsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: editButtonsOpacity.value,
    transform: [{ translateY: editButtonsTranslateY.value }],
  }));

  // Trigger Edit Map modal animations
  React.useEffect(() => {
    if (editModalVisible) {
      // Entrance animation
      editModalBackdropOpacity.value = withTiming(1, {
        duration: 400,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
      editModalTranslateY.value = withSpring(0, {
        damping: 30,
        stiffness: 150,
      });

      // Stagger form fields
      setTimeout(() => {
        editFieldOpacity.value = withTiming(1, {
          duration: 500,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
        editFieldTranslateY.value = withTiming(0, {
          duration: 500,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
      }, 150);

      setTimeout(() => {
        editIconOpacity.value = withTiming(1, {
          duration: 500,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
        editIconTranslateY.value = withTiming(0, {
          duration: 500,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
      }, 250);

      setTimeout(() => {
        editButtonsOpacity.value = withTiming(1, {
          duration: 500,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
        editButtonsTranslateY.value = withTiming(0, {
          duration: 500,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
      }, 350);
    } else {
      // Exit animation
      editModalBackdropOpacity.value = withTiming(0, {
        duration: 300,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      });
      editModalTranslateY.value = withTiming(500, {
        duration: 300,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      });

      // Reset fields
      editFieldOpacity.value = 0;
      editFieldTranslateY.value = 20;
      editIconOpacity.value = 0;
      editIconTranslateY.value = 20;
      editButtonsOpacity.value = 0;
      editButtonsTranslateY.value = 20;
    }
  }, [editModalVisible]);

  // Trigger Filter Modal animations
  const filterModalBackdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: filterModalBackdropOpacity.value,
  }));

  const filterModalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: filterModalTranslateY.value }],
  }));

  useEffect(() => {
    if (filterModalVisible) {
      filterModalBackdropOpacity.value = withTiming(1, { duration: 300 });
      filterModalTranslateY.value = withSpring(0, {
        damping: 30,
        stiffness: 150,
      });
    } else {
      filterModalBackdropOpacity.value = withTiming(0, { duration: 300 });
      filterModalTranslateY.value = withTiming(500, { duration: 300 });
    }
  }, [filterModalVisible]);

  return (
    <View style={styles.container}>
      <ScreenHeader
        leftComponent={
          <View style={styles.headerLeftRow}>
            <TouchableOpacity
              onPress={() => {
                haptics.selection();
                navigation.goBack();
              }}
              style={styles.headerIconButton}
            >
              <Icon
                name="chevron-left"
                size={getResponsiveValue(32, 32, 34, 40)}
                color={theme.colors.text.primary[colorScheme]}
              />
            </TouchableOpacity>
            <Text
              style={[
                styles.headerText,
                { color: theme.colors.text.primary[colorScheme] },
              ]}
              numberOfLines={1}
            >
              {currentMapEmoji || "🗺️"} {currentMapName || "Map"}
            </Text>
          </View>
        }
        rightComponent={renderHeaderRight()}
      />

      <View style={styles.mapContainer}>
        {!isMapReady ? (
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          // ViewShot wraps the map so the Share-as-Image flow can capture
          // just the map + pins (the search bar, FAB, and horizontal card
          // strip render as siblings outside this wrapper, so they're not
          // included in the captured PNG).
          <ViewShot
            ref={mapViewShotRef}
            style={StyleSheet.absoluteFillObject}
            options={{ format: "png", quality: 0.9 }}
          >
            <MapView
              ref={mapRef as any}
              provider={PROVIDER_DEFAULT}
              style={styles.map}
              initialRegion={initialRegion}
              clusterColor={theme.colors.primary}
              clusterTextColor="#ffffff"
              spiderLineColor={theme.colors.primary}
              radius={100}
              onMapReady={() => {
                // If we just arrived via Global Search, the initial region
                // is already centered on the target pin — don't zoom out to
                // fit everything.
                if (focusPinHandledRef.current) {
                  focusPinHandledRef.current = false;
                  return;
                }
                // Fit to coordinates if pins exist. Bottom padding must
                // clear the horizontal pin card strip (height + its 40px
                // bottom offset + a small gap) and the banner ad if the
                // user is free-tier, otherwise the lowest pins end up
                // hidden behind those overlays.
                if (filteredPins.length > 0) {
                  const cardStripHeight = getResponsiveValue(80, 80, 86, 104);
                  const cardStripBottomOffset = 40;
                  const cardStripGap = 24;
                  const fitBottomPadding =
                    cardStripHeight +
                    cardStripBottomOffset +
                    cardStripGap +
                    bannerHeight;

                  const coordinates = filteredPins.map((pin) => ({
                    latitude: pin.latitude,
                    longitude: pin.longitude,
                  }));
                  (mapRef.current as any)?.fitToCoordinates(coordinates, {
                    edgePadding: {
                      top: 100,
                      right: 50,
                      bottom: fitBottomPadding,
                      left: 50,
                    },
                    animated: true,
                  });
                }
              }}
            >
              {filteredPins.map((pin) => (
                <CustomMarker
                  // Status is part of the key so toggling Been here / Want to go
                  // remounts the marker — react-native-maps does not reliably
                  // redraw a custom marker's view when its props change in place.
                  key={`${pin.id || `${pin.latitude}-${pin.longitude}`}-${pin.status || "visited"}`}
                  coordinate={{
                    latitude: pin.latitude,
                    longitude: pin.longitude,
                  }}
                  emoji={pin.emoji || "📍"}
                  status={pin.status || "visited"}
                  onPress={() => handleMarkerPress(pin)}
                />
              ))}
            </MapView>
          </ViewShot>
        )}

        {/* Overlays (SearchBar, etc) - Keep them visible or hide until map ready?
                    If we hide map, overlays might look weird floating on white.
                    Let's only show them when map is ready.
                 */}
        {isMapReady && (
          <>
            {/* List view overlay — same filtered/sorted pins, vertical list */}
            {viewMode === "list" && (
              <View
                style={[
                  styles.listOverlay,
                  { backgroundColor: theme.colors.background[colorScheme] },
                ]}
              >
                <FlatList
                  data={filteredPins}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{
                    paddingTop: getResponsiveValue(70, 70, 76, 92),
                    paddingBottom: bannerHeight + insets.bottom + 24,
                    paddingHorizontal: 16,
                    flexGrow: 1,
                  }}
                  ListEmptyComponent={
                    <View style={styles.listEmpty}>
                      <Icon
                        name="map-marker-off-outline"
                        size={getResponsiveValue(48, 48, 52, 64)}
                        color={theme.colors.text.tertiary[colorScheme]}
                      />
                      <Text
                        style={[
                          styles.listEmptyText,
                          { color: theme.colors.text.secondary[colorScheme] },
                        ]}
                      >
                        {pins.length === 0
                          ? "No pins yet. Tap + to add your first place."
                          : "No pins match your search or filters."}
                      </Text>
                    </View>
                  }
                  renderItem={({ item }) => {
                    const isWishlist = (item.status || "visited") === "wishlist";
                    const cover = item.images && item.images.length > 0
                      ? item.images[0]
                      : item.imageUri;
                    return (
                      <TouchableOpacity
                        style={[
                          styles.listRow,
                          {
                            backgroundColor: theme.colors.card[colorScheme],
                            borderColor: theme.colors.border[colorScheme],
                          },
                        ]}
                        activeOpacity={0.9}
                        onPress={() => handleMarkerPress(item)}
                      >
                        {/* Thumbnail or emoji */}
                        {cover ? (
                          <Image
                            source={{ uri: resolvePinImage(cover) }}
                            style={styles.listThumb}
                            resizeMode="cover"
                          />
                        ) : (
                          <View
                            style={[
                              styles.listThumb,
                              {
                                backgroundColor:
                                  theme.colors.surface[colorScheme],
                                alignItems: "center",
                                justifyContent: "center",
                              },
                            ]}
                          >
                            <Text style={styles.listThumbEmoji}>
                              {item.emoji || "📍"}
                            </Text>
                          </View>
                        )}

                        {/* Texts */}
                        <View style={styles.listRowContent}>
                          <Text
                            style={[
                              styles.listRowTitle,
                              { color: theme.colors.text.primary[colorScheme] },
                            ]}
                            numberOfLines={1}
                          >
                            {item.title}
                          </Text>
                          <Text
                            style={[
                              styles.listRowAddress,
                              {
                                color: item.address
                                  ? theme.colors.text.secondary[colorScheme]
                                  : theme.colors.text.tertiary[colorScheme],
                                fontStyle: item.address ? "normal" : "italic",
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {item.address || "Address unavailable"}
                          </Text>
                          <View style={styles.listRowMeta}>
                            {/* Rating */}
                            {(item.rating || 0) > 0 && (
                              <View style={styles.listRowStars}>
                                <Icon
                                  name="star"
                                  size={13}
                                  color={theme.colors.star}
                                />
                                <Text
                                  style={[
                                    styles.listRowMetaText,
                                    {
                                      color:
                                        theme.colors.text.secondary[colorScheme],
                                    },
                                  ]}
                                >
                                  {item.rating}
                                </Text>
                              </View>
                            )}
                            {/* Status */}
                            <Icon
                              name={isWishlist ? "star-outline" : "check-circle"}
                              size={13}
                              color={
                                isWishlist
                                  ? theme.colors.primary
                                  : theme.colors.success
                              }
                            />
                            <Text
                              style={[
                                styles.listRowMetaText,
                                {
                                  color:
                                    theme.colors.text.secondary[colorScheme],
                                },
                              ]}
                            >
                              {isWishlist ? "Want to go" : "Been here"}
                            </Text>
                            {/* Visit date */}
                            {item.visitedAt ? (
                              <Text
                                style={[
                                  styles.listRowMetaText,
                                  {
                                    color:
                                      theme.colors.text.tertiary[colorScheme],
                                  },
                                ]}
                              >
                                ·{" "}
                                {new Date(item.visitedAt).toLocaleDateString(
                                  undefined,
                                  { year: "numeric", month: "short", day: "numeric" },
                                )}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            )}

            <Animated.View style={searchBarAnimatedStyle}>
              <MapSearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFilterPress={() => {
                  haptics.selection();
                  setFilterModalVisible(true);
                }}
                style={{ top: 10 }}
              />
            </Animated.View>

            {/* Hide the Add Pin FAB while the keyboard is open so it doesn't
                hover over the keyboard / search predictions area. */}
            {!isKeyboardOpen && (
              <Animated.View
                style={[
                  fabAnimatedStyle,
                  {
                    position: "absolute",
                    bottom:
                      pins.length === 0
                        ? 40 + (bannerHeight > 0 ? 0 : insets.bottom)
                        : 40 +
                          getResponsiveValue(80, 80, 86, 104) +
                          getResponsiveValue(16, 16, 20, 24),
                    right: getResponsiveValue(16, 16, 20, 24),
                    zIndex: 100,
                  },
                ]}
              >
                <FloatingButton
                  onPress={handleAddPin}
                  icon="map-marker-plus-outline"
                  style={{
                    position: "relative",
                    marginBottom: 0,
                    marginRight: 0,
                  }}
                />
              </Animated.View>
            )}

            {/* Horizontal Pin List (map mode only) */}
            {viewMode === "map" && (
            <Animated.View
              style={[
                styles.horizontalListContainer,
                horizontalListAnimatedStyle,
              ]}
            >
              <FlatList
                horizontal
                data={filteredPins}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                snapToInterval={280 + 16} // card width + margin
                decelerationRate="fast"
                contentContainerStyle={{ paddingHorizontal: 16 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.card,
                      {
                        backgroundColor: theme.colors.card[colorScheme],
                        borderColor: theme.colors.border[colorScheme],
                      },
                    ]}
                    onPress={() => handleMarkerPress(item)}
                    activeOpacity={0.98}
                  >
                    {(item.status || "visited") === "wishlist" ? (
                      <View
                        style={[
                          styles.cardEmojiRing,
                          { borderColor: theme.colors.primary },
                        ]}
                      >
                        <Text style={styles.cardEmojiInRing}>
                          {item.emoji || "📍"}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.cardEmoji}>{item.emoji || "📍"}</Text>
                    )}
                    <View style={styles.cardContent}>
                      <Text
                        style={[
                          styles.pinCardTitle,
                          { color: theme.colors.text.primary[colorScheme] },
                        ]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <Text
                        style={[
                          styles.pinCardCoordinates,
                          {
                            color: item.address
                              ? theme.colors.text.secondary[colorScheme]
                              : theme.colors.text.tertiary[colorScheme],
                            fontStyle: item.address ? "normal" : "italic",
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {item.address || "Address unavailable"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            </Animated.View>
            )}
          </>
        )}
      </View>

      <PinDetailModal
        visible={modalVisible}
        pin={selectedPin}
        onClose={handleClosePinDetail}
        onDelete={handleDeletePin}
        onEdit={() => handleEditPin(selectedPin)}
        onShare={() => handleSharePin(selectedPin)}
        onToggleStatus={handleToggleStatus}
      />

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        animationType="none"
        transparent={true}
        onRequestClose={() => {
          haptics.selection();
          setFilterModalVisible(false);
        }}
      >
        <Animated.View
          style={[styles.bottomSheetOverlay, { backgroundColor: theme.colors.backdrop }, filterModalBackdropAnimatedStyle]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => {
              haptics.selection();
              setFilterModalVisible(false);
            }}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "padding"}
            style={{ flex: 1, justifyContent: "flex-end" }}
            pointerEvents="box-none"
          >
            <Animated.View
              style={[
                styles.bottomSheetContent,
                { backgroundColor: theme.colors.card[colorScheme] },
                filterModalAnimatedStyle,
              ]}
            >
              {/* Handle */}
              <View style={styles.sheetHandleContainer}>
                <View style={[styles.sheetHandle, { backgroundColor: theme.colors.handle[colorScheme] }]} />
              </View>

              {/* Header */}
              <View style={styles.sheetHeader}>
                <Text
                  style={[
                    styles.sheetTitle,
                    { color: theme.colors.text.primary[colorScheme] },
                  ]}
                >
                  Filter & Sort
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    haptics.selection();
                    setFilterModalVisible(false);
                  }}
                >
                  <Icon
                    name="close"
                    size={24}
                    color={theme.colors.text.primary[colorScheme]}
                  />
                </TouchableOpacity>
              </View>

              {/* Sort Options */}
              <Text
                style={[
                  styles.label,
                  {
                    color: theme.colors.text.primary[colorScheme],
                    marginTop: 0,
                  },
                ]}
              >
                Sort By
              </Text>
              <View style={styles.sortContainer}>
                {[
                  { label: "Newest", value: "newest", icon: "clock-outline" },
                  { label: "Oldest", value: "oldest", icon: "history" },
                  {
                    label: "Name (A-Z)",
                    value: "az",
                    icon: "sort-alphabetical-ascending",
                  },
                  {
                    label: "Highest Rated",
                    value: "rating",
                    icon: "star-outline",
                  },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.sortOption,
                      { borderColor: theme.colors.border[colorScheme] },
                      sortBy === option.value && {
                        backgroundColor: theme.colors.primary + "20",
                        borderColor: theme.colors.primary,
                      },
                    ]}
                    onPress={() => {
                      haptics.selection();
                      setSortBy(option.value as any);
                    }}
                  >
                    <Icon
                      name={option.icon}
                      size={20}
                      color={
                        sortBy === option.value
                          ? theme.colors.primary
                          : theme.colors.text.secondary[colorScheme]
                      }
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      style={[
                        styles.sortText,
                        {
                          color:
                            sortBy === option.value
                              ? theme.colors.primary
                              : theme.colors.text.secondary[colorScheme],
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Rating Filter */}
              <Text
                style={[
                  styles.label,
                  {
                    color: theme.colors.text.primary[colorScheme],
                    marginTop: 16,
                  },
                ]}
              >
                Minimum Rating
              </Text>
              <View
                style={[
                  styles.ratingFilterContainer,
                  { backgroundColor: theme.colors.surface[colorScheme] },
                ]}
              >
                <RatingPicker
                  value={minRating}
                  onValueChange={(val) =>
                    setMinRating(val === minRating ? 0 : val)
                  }
                  size={36}
                />
                <Text
                  style={[
                    styles.ratingHint,
                    { color: theme.colors.text.tertiary[colorScheme] },
                  ]}
                >
                  {minRating > 0 ? `${minRating} stars & up` : "Any rating"}
                </Text>
              </View>

              {/* Status Filter */}
              <Text
                style={[
                  styles.label,
                  {
                    color: theme.colors.text.primary[colorScheme],
                    marginTop: 16,
                  },
                ]}
              >
                Status
              </Text>
              <View style={styles.sortContainer}>
                {[
                  { label: "All", value: "all", icon: "map-marker-multiple" },
                  { label: "Been here", value: "visited", icon: "check-circle" },
                  {
                    label: "Want to go",
                    value: "wishlist",
                    icon: "star-outline",
                  },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.sortOption,
                      { borderColor: theme.colors.border[colorScheme] },
                      statusFilter === option.value && {
                        backgroundColor: theme.colors.primary + "20",
                        borderColor: theme.colors.primary,
                      },
                    ]}
                    onPress={() => {
                      haptics.selection();
                      setStatusFilter(option.value as any);
                    }}
                  >
                    <Icon
                      name={option.icon}
                      size={20}
                      color={
                        statusFilter === option.value
                          ? theme.colors.primary
                          : theme.colors.text.secondary[colorScheme]
                      }
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      style={[
                        styles.sortText,
                        {
                          color:
                            statusFilter === option.value
                              ? theme.colors.primary
                              : theme.colors.text.secondary[colorScheme],
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Tag Filter */}
              {availableTags.length > 0 && (
                <>
                  <Text
                    style={[
                      styles.label,
                      {
                        color: theme.colors.text.primary[colorScheme],
                        marginTop: 16,
                      },
                    ]}
                  >
                    Tags
                  </Text>
                  <View style={styles.tagFilterWrap}>
                    {availableTags.map((tag) => {
                      const active = tagFilter.includes(tag);
                      return (
                        <TouchableOpacity
                          key={tag}
                          onPress={() => {
                            haptics.selection();
                            setTagFilter((prev) =>
                              active
                                ? prev.filter((t) => t !== tag)
                                : [...prev, tag],
                            );
                          }}
                          style={[
                            styles.tagFilterChip,
                            {
                              backgroundColor: active
                                ? theme.colors.primary + "20"
                                : theme.colors.surface[colorScheme],
                              borderColor: active
                                ? theme.colors.primary
                                : theme.colors.border[colorScheme],
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.tagFilterChipText,
                              {
                                color: active
                                  ? theme.colors.primary
                                  : theme.colors.text.secondary[colorScheme],
                              },
                            ]}
                          >
                            {tag}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {/* Action Buttons */}
              {(() => {
                const isResetDisabled =
                  sortBy === "newest" &&
                  minRating === 0 &&
                  statusFilter === "all" &&
                  tagFilter.length === 0;
                return (
              <View style={[styles.buttonRow, { marginTop: 32 }]}>
                <TouchableOpacity
                  onPress={() => {
                    if (isResetDisabled) return;
                    haptics.selection();
                    setSortBy("newest");
                    setMinRating(0);
                    setStatusFilter("all");
                    setTagFilter([]);
                  }}
                  disabled={isResetDisabled}
                  activeOpacity={isResetDisabled ? 1 : 0.7}
                  accessibilityState={{ disabled: isResetDisabled }}
                  style={[
                    styles.actionButton,
                    { backgroundColor: theme.colors.surface[colorScheme] },
                    isResetDisabled && { opacity: 0.5 },
                  ]}
                >
                  <Text
                    style={[
                      styles.cancelButtonText,
                      { color: theme.colors.text.primary[colorScheme] },
                    ]}
                  >
                    Reset
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    haptics.impactLight();
                    setFilterModalVisible(false);
                  }}
                  style={[
                    styles.actionButton,
                    { backgroundColor: theme.colors.primary },
                  ]}
                >
                  <Text style={styles.saveButtonText}>Apply</Text>
                </TouchableOpacity>
              </View>
                );
              })()}
            </Animated.View>
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>

      {/* Edit Map Modal */}
      <Modal
        visible={editModalVisible}
        animationType="none"
        transparent={true}
        onRequestClose={() => {
          haptics.selection();
          setEditModalVisible(false);
        }}
      >
        <Animated.View
          style={[styles.bottomSheetOverlay, editModalBackdropAnimatedStyle]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "padding"}
            style={{ flex: 1, justifyContent: "flex-end" }}
          >
            <Animated.View
              style={[
                styles.bottomSheetContent,
                { backgroundColor: theme.colors.card[colorScheme] },
                editModalAnimatedStyle,
              ]}
            >
              {/* Handle */}
              <View style={styles.sheetHandleContainer}>
                <View style={[styles.sheetHandle, { backgroundColor: theme.colors.handle[colorScheme] }]} />
              </View>

              {/* Header */}
              <View style={styles.sheetHeader}>
                <Text
                  style={[
                    styles.sheetTitle,
                    { color: theme.colors.text.primary[colorScheme] },
                  ]}
                >
                  Edit Map
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    haptics.selection();
                    setEditModalVisible(false);
                  }}
                >
                  <Icon
                    name="close"
                    size={24}
                    color={theme.colors.text.primary[colorScheme]}
                  />
                </TouchableOpacity>
              </View>

              {/* Name Input */}
              <Animated.View style={editFieldAnimatedStyle}>
                <Text
                  style={[
                    styles.label,
                    { color: theme.colors.text.primary[colorScheme] },
                  ]}
                >
                  Name
                </Text>
                <TextInput
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: theme.colors.surface[colorScheme],
                      color: theme.colors.text.primary[colorScheme],
                    },
                  ]}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Map Name"
                  placeholderTextColor={theme.colors.text.tertiary[colorScheme]}
                />
              </Animated.View>

              {/* Icon Selector */}
              <Animated.View style={editIconAnimatedStyle}>
                <Text
                  style={[
                    styles.label,
                    { color: theme.colors.text.primary[colorScheme] },
                  ]}
                >
                  Icon
                </Text>
                <TouchableOpacity
                  style={[
                    styles.iconSelector,
                    {
                      borderColor: theme.colors.primary,
                      backgroundColor: theme.colors.surface[colorScheme],
                    },
                  ]}
                  onPress={() => {
                    haptics.selection();
                    setEditModalVisible(false);
                    setTimeout(() => setEmojiPickerVisible(true), 300);
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      backgroundColor: theme.colors.innerSurface[colorScheme],
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <Text style={{ fontSize: moderateScale(24) }}>
                      {editEmoji}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: theme.colors.text.primary[colorScheme],
                      fontSize: moderateScale(16),
                    }}
                  >
                    Change Icon
                  </Text>
                </TouchableOpacity>
              </Animated.View>

              {/* Action Buttons */}
              <Animated.View
                style={[styles.buttonRow, editButtonsAnimatedStyle]}
              >
                <TouchableOpacity
                  onPress={() => {
                    haptics.selection();
                    setEditModalVisible(false);
                  }}
                  style={[
                    styles.actionButton,
                    { backgroundColor: theme.colors.surface[colorScheme] },
                  ]}
                >
                  <Text
                    style={[
                      styles.cancelButtonText,
                      { color: theme.colors.text.primary[colorScheme] },
                    ]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSaveMap}
                  style={[
                    styles.actionButton,
                    { backgroundColor: theme.colors.primary },
                  ]}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>

      <EmojiPickerModal
        visible={emojiPickerVisible}
        onClose={() => {
          haptics.selection();
          setEmojiPickerVisible(false);
          setTimeout(() => setEditModalVisible(true), 300);
        }}
        onSelectEmoji={setEditEmoji}
      />
      <RNAnimated.View
        style={[
          styles.bannerContainer,
          {
            backgroundColor: theme.colors.background[colorScheme],
            paddingBottom: bannerHeight > 0 ? insets.bottom : 0,
          },
          bannerAnimatedStyle,
        ]}
      >
        <BannerAdView onHeightChange={setBannerHeight} />
      </RNAnimated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  bannerContainer: {
    paddingHorizontal: 0,
  },
  horizontalListContainer: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    height: getResponsiveValue(80, 80, 86, 104),
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    width: getResponsiveValue(260, 260, 280, 360),
    padding: getResponsiveValue(12, 12, 13, 16),
    marginRight: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardEmoji: {
    fontSize: getResponsiveValue(
      moderateScale(32),
      moderateScale(32),
      moderateScale(32),
      52,
    ),
    lineHeight: getResponsiveValue(
      moderateScale(40),
      moderateScale(40),
      moderateScale(40),
      66,
    ),
    marginRight: getResponsiveValue(12, 12, 12, 16),
    textAlign: "center",
  },
  cardEmojiRing: {
    width: getResponsiveValue(44, 44, 46, 66),
    height: getResponsiveValue(44, 44, 46, 66),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 999,
    marginRight: getResponsiveValue(12, 12, 12, 16),
  },
  cardEmojiInRing: {
    // No explicit lineHeight — a lineHeight == fontSize clips emoji glyphs at
    // the bottom. Natural height + includeFontPadding:false keeps it centered.
    fontSize: getResponsiveValue(26, 26, 28, 42),
    includeFontPadding: false,
    textAlign: "center",
  },
  cardContent: {
    flex: 1,
  },
  headerText: {
    fontWeight: "600",
    fontFamily: "poppins_bold",
    flexShrink: 1,
    fontSize: getResponsiveValue(
      moderateScale(20),
      moderateScale(20),
      moderateScale(20),
      30,
    ),
    lineHeight: getResponsiveValue(
      moderateScale(26),
      moderateScale(26),
      moderateScale(26),
      38,
    ),
  },
  headerLeftRow: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },
  headerIconButton: {
    width: getResponsiveValue(40, 40, 44, 56),
    height: getResponsiveValue(40, 40, 44, 56),
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerToggleButton: {
    height: getResponsiveValue(40, 40, 44, 56),
    justifyContent: "center",
    alignItems: "flex-end",
  },
  headerRightRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  tagFilterWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  tagFilterChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  tagFilterChipText: {
    fontSize: moderateScale(13),
    fontFamily: "poppins_medium",
  },
  // List view
  listOverlay: {
    // No explicit zIndex: document order already stacks this above the map and
    // below the later-rendered search bar + FAB. An explicit zIndex here would
    // paint the opaque overlay OVER the search bar, hiding it and leaving the
    // list's reserved top padding as an empty gap.
    ...StyleSheet.absoluteFillObject,
  },
  listEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  listEmptyText: {
    textAlign: "center",
    fontSize: moderateScale(14),
    fontFamily: "poppins_regular",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
    gap: 12,
  },
  listThumb: {
    width: getResponsiveValue(56, 56, 62, 80),
    height: getResponsiveValue(56, 56, 62, 80),
    borderRadius: 12,
  },
  listThumbEmoji: {
    fontSize: moderateScale(26),
  },
  listRowContent: {
    flex: 1,
    gap: 3,
  },
  listRowTitle: {
    fontSize: moderateScale(15),
    fontFamily: "poppins_medium",
  },
  listRowAddress: {
    fontSize: moderateScale(12),
    fontFamily: "poppins_regular",
  },
  listRowMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
    flexWrap: "wrap",
  },
  listRowStars: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  listRowMetaText: {
    fontSize: moderateScale(11),
    fontFamily: "poppins_regular",
  },
  // Bottom Sheet Styles
  bottomSheetOverlay: {
    flex: 1,
    // backgroundColor applied at use site via theme.colors.backdrop
    justifyContent: "flex-end",
  },
  bottomSheetContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  sheetHandleContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  sheetHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    // backgroundColor applied at use site via theme.colors.handle
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  sheetTitle: {
    fontSize: moderateScale(20),
    fontWeight: "bold",
    fontFamily: "poppins_bold",
  },
  label: {
    fontSize: moderateScale(16),
    fontWeight: "500",
    marginBottom: 8,
    fontFamily: "poppins_medium",
  },
  inputContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  iconSelector: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 12,
    marginBottom: 32,
    borderWidth: 2,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: moderateScale(16),
    fontWeight: "bold",
    fontFamily: "poppins_bold",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: moderateScale(16),
    fontWeight: "bold",
    fontFamily: "poppins_bold",
  },
  pinCardTitle: {
    fontSize: getResponsiveValue(
      moderateScale(16),
      moderateScale(16),
      moderateScale(16),
      25,
    ),
    fontWeight: "600",
    fontFamily: "poppins_semibold",
  },
  pinCardCoordinates: {
    fontSize: getResponsiveValue(
      moderateScale(12),
      moderateScale(12),
      moderateScale(12),
      22,
    ),
    fontWeight: "400",
    fontFamily: "poppins_regular",
  },
  sortContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 8,
  },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    // borderColor applied at use site via theme.colors.border (already overridden inline)
  },
  sortText: {
    fontSize: moderateScale(14),
    fontWeight: "500",
    fontFamily: "poppins_medium",
  },
  ratingFilterContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
  },
  ratingHint: {
    fontSize: moderateScale(14),
    fontFamily: "poppins_regular",
  },
});
