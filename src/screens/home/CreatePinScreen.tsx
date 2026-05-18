import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  Animated as RNAnimated,
  Easing as RNEasing,
  Platform,
  Image,
  Alert,
  PermissionsAndroid,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Geolocation from "@react-native-community/geolocation";
import Geocoder from "react-native-geocoding";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";

// Initialize Geocoder with your Google Maps API Key
Geocoder.init(AppConfig.GOOGLE_PLACES_API_KEY);

import { useNavigation, useRoute } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useTheme } from "../../theme/ThemeContext";
import { RatingPicker } from "../../components/common/RatingPicker";
import { ScreenHeader } from "../../components/common/ScreenHeader";
import { databaseService } from "../../services/DatabaseService";
import { EmojiPickerModal } from "../../components/common/EmojiPickerModal";
import AppConfig from "../../config";
import { getResponsiveValue, moderateScale } from "../../utils/responsive";
import { Button } from "../../components/common";
import { haptics } from "../../utils/haptics";
import { BannerAdView } from "../../components/ads/BannerAdView";
import { trackInterstitialAction } from "../../services/InterstitialAdService";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";

interface PlacePrediction {
  description: string;
  place_id: string;
}

export const CreatePinScreen: React.FC = () => {
  const { theme, colorScheme } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const route = useRoute();
  const { mapId, mapEmoji, pin } = route.params as {
    mapId: string;
    mapEmoji?: string;
    pin?: any;
  };

  const [title, setTitle] = useState(pin?.title || "");
  const [description, setDescription] = useState(pin?.description || "");
  const [location, setLocation] = useState(""); // Display text (Name or Address)
  const [rating, setRating] = useState(pin?.rating || 0);
  const [selectedEmoji, setSelectedEmoji] = useState(
    pin?.emoji || mapEmoji || "🗺️",
  );
  const [emojiModalVisible, setEmojiModalVisible] = useState(false);

  const [imageUri, setImageUri] = useState<string | null>(
    pin?.imageUri || null,
  );
  const [coordinates, setCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(pin ? { latitude: pin.latitude, longitude: pin.longitude } : null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
const [bannerHeight, setBannerHeight] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  // Manual Autocomplete State
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bannerTranslateY = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setIsKeyboardOpen(true);
      const keyboardHeight = e.endCoordinates?.height || 0;
      const bannerOffset = Math.max(0, keyboardHeight);

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
  const bottomReservedSpace =
     getResponsiveValue(10, 10, 12, 16);
  const scrollBottomPadding = isKeyboardOpen
    ? bottomReservedSpace + getResponsiveValue(260, 280, 300, 320)
    : bottomReservedSpace;
  const bannerAnimatedStyle = {
    transform: [{ translateY: bannerTranslateY }],
  };

  // Animation values for smooth, soft sequential entrance
  const locationOpacity = useSharedValue(0);
  const locationTranslateX = useSharedValue(-30);

  const titleOpacity = useSharedValue(0);
  const titleTranslateX = useSharedValue(-30);

  const descriptionOpacity = useSharedValue(0);
  const descriptionTranslateX = useSharedValue(-30);

  const ratingOpacity = useSharedValue(0);
  const ratingTranslateX = useSharedValue(-30);

  const emojiOpacity = useSharedValue(0);
  const emojiTranslateX = useSharedValue(-30);

  const photoOpacity = useSharedValue(0);
  const photoTranslateX = useSharedValue(-30);

  const buttonOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(0.9);

  // Trigger smooth entrance animations on mount
  React.useEffect(() => {
    // Reset to initial state
    locationOpacity.value = 0;
    locationTranslateX.value = -30;
    titleOpacity.value = 0;
    titleTranslateX.value = -30;
    descriptionOpacity.value = 0;
    descriptionTranslateX.value = -30;
    ratingOpacity.value = 0;
    ratingTranslateX.value = -30;
    emojiOpacity.value = 0;
    emojiTranslateX.value = -30;
    photoOpacity.value = 0;
    photoTranslateX.value = -30;
    buttonOpacity.value = 0;
    buttonScale.value = 0.9;

    // Stagger animations with gentle timing
    const easing = Easing.bezier(0.25, 0.1, 0.25, 1);
    const duration = 600;
    const stagger = 100;

    setTimeout(() => {
      // Location (0ms)
      locationOpacity.value = withTiming(1, { duration, easing });
      locationTranslateX.value = withTiming(0, { duration, easing });

      // Title (100ms)
      setTimeout(() => {
        titleOpacity.value = withTiming(1, { duration, easing });
        titleTranslateX.value = withTiming(0, { duration, easing });
      }, stagger);

      // Description (200ms)
      setTimeout(() => {
        descriptionOpacity.value = withTiming(1, { duration, easing });
        descriptionTranslateX.value = withTiming(0, { duration, easing });
      }, stagger * 2);

      // Rating (300ms)
      setTimeout(() => {
        ratingOpacity.value = withTiming(1, { duration, easing });
        ratingTranslateX.value = withTiming(0, { duration, easing });
      }, stagger * 3);

      // Emoji (400ms)
      setTimeout(() => {
        emojiOpacity.value = withTiming(1, { duration, easing });
        emojiTranslateX.value = withTiming(0, { duration, easing });
      }, stagger * 4);

      // Photo (500ms)
      setTimeout(() => {
        photoOpacity.value = withTiming(1, { duration, easing });
        photoTranslateX.value = withTiming(0, { duration, easing });
      }, stagger * 5);

      // Button (600ms)
      setTimeout(() => {
        buttonOpacity.value = withTiming(1, { duration, easing });
        buttonScale.value = withTiming(1, { duration, easing });
      }, stagger * 6);
    }, 100);
  }, []);

  // Sync state with pin param if it changes (defensive)
  React.useEffect(() => {
    if (pin) {
      setTitle(pin.title);
      setDescription(pin.description);
      setRating(pin.rating);
      setSelectedEmoji(pin.emoji || mapEmoji || "🗺️");
      setImageUri(pin.imageUri || null);
      setCoordinates({ latitude: pin.latitude, longitude: pin.longitude });
      setLocation(pin.address || "");
    }
  }, [pin, mapEmoji]);

  const handleSearch = (text: string) => {
    setLocation(text);

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
        )}&key=${AppConfig.GOOGLE_PLACES_API_KEY}&language=en`;
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
    setLocation(description);
    setPredictions([]);

    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${AppConfig.GOOGLE_PLACES_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK") {
        const { lat, lng } = data.result.geometry.location;
        setCoordinates({ latitude: lat, longitude: lng });
      } else {
        Alert.alert("Error", "Could not fetch location details.");
      }
    } catch (error) {
      Alert.alert("Error", "Network error fetching details.");
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      // Alert or toast
      return;
    }

    try {
      if (pin) {
        // Update existing pin
        await databaseService.updatePin(pin.id, {
          title: title.trim(),
          description: description.trim(),
          latitude: coordinates?.latitude,
          longitude: coordinates?.longitude,
          rating: rating,
          emoji: selectedEmoji,
          address: location, // Save address
          imageUri: imageUri || undefined,
        });
      } else {
        // Create new pin
        await databaseService.addPin({
          mapId: mapId,
          title: title.trim(),
          description: description.trim(),
          latitude: coordinates ? coordinates.latitude : 35.6895, // Use real coords or mock fallback
          longitude: coordinates
            ? coordinates.longitude
            : 139.6917 + Math.random() * 0.01,
          rating: rating,
          emoji: selectedEmoji,
          address: location, // Save address
          imageUri: imageUri || undefined,
        });
      }

      void trackInterstitialAction();
      haptics.success();
      navigation.goBack();
    } catch (error) {
      console.error("Failed to save pin:", error);
    }
  };

  const handleBack = () => {
    haptics.selection();
    navigation.goBack();
  };

  const handleTakePhoto = async () => {
    haptics.selection();
    try {
      if (Platform.OS === "android") {
        const hasPermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
        );
        if (hasPermission !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            "Permission Denied",
            "Camera permission is required to take photos.",
            undefined,
            { userInterfaceStyle: colorScheme === "dark" ? "dark" : "light" },
          );
          return;
        }
      }

      const result = await launchCamera({
        mediaType: "photo",
        quality: 0.7,
        saveToPhotos: false, // Attempting false to avoid external storage permission issues for now
      });

      if (result.didCancel) {
      } else if (result.errorCode) {
        Alert.alert(
          "Error",
          result.errorMessage || "Failed to open camera",
          undefined,
          { userInterfaceStyle: colorScheme === "dark" ? "dark" : "light" },
        );
      } else if (result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri || null);
      }
    } catch (error) {
      Alert.alert(
        "Error",
        "An unexpected error occurred opening current camera.",
        undefined,
        { userInterfaceStyle: colorScheme === "dark" ? "dark" : "light" },
      );
    }
  };

  const handlePickPhoto = async () => {
    haptics.selection();
    const result = await launchImageLibrary({
      mediaType: "photo",
      quality: 0.7,
      selectionLimit: 1,
    });

    if (result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri || null);
    }
  };

  const requestLocationPermission = async () => {
    if (Platform.OS === "ios") {
      return true;
    }
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "Location Permission",
          message:
            "This app needs access to your location to set pin coordinates.",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK",
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  const handleUseCurrentLocation = async () => {
    haptics.impactLight();
    const hasPermission = await requestLocationPermission();
    try {
      if (!hasPermission) {
        // Return silently
      }
    } catch (e) {}

    if (!hasPermission) {
      Alert.alert(
        "Permission Denied",
        "Location permission is required to use this feature.",
        undefined,
        { userInterfaceStyle: colorScheme === "dark" ? "dark" : "light" },
      );
      return;
    }

    setIsLoadingLocation(true);

    Geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoordinates({ latitude, longitude });

        try {
          const json = await Geocoder.from(latitude, longitude);
          if (json.results && json.results.length > 0) {
            const addressComponent = json.results[0].formatted_address;
            setLocation(addressComponent);
          }
        } catch (error) {
          console.warn("Geocoding failed", error);
          // Fallback handled by initial setLocation
        } finally {
          setIsLoadingLocation(false);
        }
      },
      (error) => {
        console.error(error);
        Alert.alert(
          "Error",
          "Failed to get current location. Make sure GPS is on.",
          undefined,
          { userInterfaceStyle: colorScheme === "dark" ? "dark" : "light" },
        );
        setIsLoadingLocation(false);
      },
      { enableHighAccuracy: false, timeout: 20000, maximumAge: 1000 },
    );
  };

  const handlePickOnMap = () => {
    haptics.selection();
    // @ts-ignore - Ignoring strict navigation type check for now or cast navigation
    navigation.navigate("MapPicker", {
      initialRegion: coordinates
        ? {
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }
        : undefined,
      onSelectLocation: (selectedLocation: {
        latitude: number;
        longitude: number;
        address: string;
      }) => {
        setCoordinates({
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
        });
        setLocation(selectedLocation.address);
      },
    });
  };

  const renderInput = (
    label: string,
    value: string,
    setValue: (text: string) => void,
    placeholder: string,
    multiline = false,
    animatedStyle?: any,
  ) => (
    <Animated.View style={[styles.inputGroup, animatedStyle]}>
      <Text
        style={[
          styles.label,
          { color: theme.colors.text.secondary[colorScheme] },
        ]}
      >
        {label}
      </Text>
      <View
        style={[
          styles.inputContainer,
          { backgroundColor: theme.colors.surface[colorScheme] },
          multiline && { minHeight: 100 },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            { color: theme.colors.text.primary[colorScheme] },
            multiline && { height: 80, textAlignVertical: "top" },
          ]}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.text.tertiary[colorScheme]}
          value={value}
          onChangeText={setValue}
          multiline={multiline}
        />
      </View>
    </Animated.View>
  );

  // Animated styles for smooth entrance
  const locationAnimatedStyle = useAnimatedStyle(() => ({
    opacity: locationOpacity.value,
    transform: [{ translateX: locationTranslateX.value }],
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateX: titleTranslateX.value }],
  }));

  const descriptionAnimatedStyle = useAnimatedStyle(() => ({
    opacity: descriptionOpacity.value,
    transform: [{ translateX: descriptionTranslateX.value }],
  }));

  const ratingAnimatedStyle = useAnimatedStyle(() => ({
    opacity: ratingOpacity.value,
    transform: [{ translateX: ratingTranslateX.value }],
  }));

  const emojiAnimatedStyle = useAnimatedStyle(() => ({
    opacity: emojiOpacity.value,
    transform: [{ translateX: emojiTranslateX.value }],
  }));

  const photoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: photoOpacity.value,
    transform: [{ translateX: photoTranslateX.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ scale: buttonScale.value }],
  }));

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background[colorScheme] },
      ]}
    >
      {/* Header */}
      <ScreenHeader
        leftComponent={
          <TouchableOpacity onPress={handleBack} style={styles.headerBtn}>
            <Icon
              name="chevron-left"
              size={getResponsiveValue(32, 32, 34, 40)}
              color={theme.colors.text.primary[colorScheme]}
            />
          </TouchableOpacity>
        }
        centerComponent={
          <Text
            style={[
              styles.headerText,
              { color: theme.colors.text.primary[colorScheme] },
            ]}
          >
            {pin ? "Edit Pin" : "Add Pin"}
          </Text>
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: scrollBottomPadding },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Location (Simplified Search) */}
          <Animated.View
            style={[styles.inputGroup, locationAnimatedStyle, { zIndex: 1000 }]}
          >
            <Text
              style={[
                styles.label,
                { color: theme.colors.text.secondary[colorScheme] },
              ]}
            >
              Location
            </Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.colors.surface[colorScheme],
                  flexDirection: "row",
                  alignItems: "center",
                  zIndex: 1000,
                },
              ]}
            >
              <Icon
                name="magnify"
                size={24}
                color={theme.colors.text.tertiary[colorScheme]}
                style={{ marginRight: 8 }}
              />
              <TextInput
                style={[
                  styles.input,
                  { flex: 1, color: theme.colors.text.primary[colorScheme] },
                ]}
                placeholder="Search location"
                placeholderTextColor={theme.colors.text.tertiary[colorScheme]}
                value={location}
                onChangeText={handleSearch}
              />
              {location.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    haptics.selection();
                    setLocation("");
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

            {/* Predictions List - Absolute Positioning */}
            {predictions.length > 0 && (
              <View
                style={{
                  position: "absolute",
                  top: 100, // Adjust based on input height + label
                  left: 0,
                  right: 0,
                  backgroundColor: theme.colors.surface[colorScheme],
                  borderRadius: 8,
                  elevation: 5,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  zIndex: 2000,
                  maxHeight: 200,
                  borderWidth: 1,
                  borderColor: theme.colors.border[colorScheme],
                }}
              >
                <FlatList
                  data={predictions}
                  keyExtractor={(item) => item.place_id}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={{
                        padding: 13,
                        borderBottomWidth: 0.5,
                        borderBottomColor: theme.colors.border[colorScheme],
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                      onPress={() => {
                        haptics.selection();
                        onPlaceSelected(item.place_id, item.description);
                      }}
                    >
                      <Icon
                        name="map-marker-outline"
                        size={16}
                        color={theme.colors.text.tertiary[colorScheme]}
                        style={{ marginRight: 8 }}
                      />
                      <Text
                        style={{
                          color: theme.colors.text.primary[colorScheme],
                          fontSize: 14,
                          fontFamily: "poppins_regular",
                        }}
                        numberOfLines={1}
                      >
                        {item.description}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}

            <View style={styles.locationActions}>
              <TouchableOpacity
                style={[
                  styles.locationBtn,
                  { borderColor: theme.colors.border[colorScheme] },
                  coordinates && {
                    backgroundColor: theme.colors.primary + "10",
                    borderColor: theme.colors.primary,
                  },
                ]}
                onPress={handleUseCurrentLocation}
                disabled={isLoadingLocation}
              >
                {isLoadingLocation ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.primary}
                    style={{ marginRight: 6 }}
                  />
                ) : (
                  <Icon
                    name="crosshairs-gps"
                    size={18}
                    color={theme.colors.primary}
                  />
                )}
                <Text
                  style={[
                    styles.locationBtnText,
                    { color: theme.colors.primary },
                  ]}
                >
                  {isLoadingLocation ? "Fetching..." : "Use Current"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.locationBtn,
                  { borderColor: theme.colors.border[colorScheme] },
                ]}
                onPress={handlePickOnMap}
              >
                <Icon
                  name="map-marker-outline"
                  size={18}
                  color={theme.colors.primary}
                />
                <Text
                  style={[
                    styles.locationBtnText,
                    { color: theme.colors.primary },
                  ]}
                >
                  Pick on Map
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {renderInput(
            "Title",
            title,
            setTitle,
            "Enter title...",
            false,
            titleAnimatedStyle,
          )}
          {renderInput(
            "Description",
            description,
            setDescription,
            "Add notes...",
            true,
            descriptionAnimatedStyle,
          )}

          {/* Rating */}
          <Animated.View style={[styles.inputGroup, ratingAnimatedStyle]}>
            <Text
              style={[
                styles.label,
                { color: theme.colors.text.secondary[colorScheme] },
              ]}
            >
              Rating
            </Text>
            <RatingPicker value={rating} onValueChange={setRating} />
          </Animated.View>

          {/* Emoji Selector */}
          <Animated.View style={[styles.inputGroup, emojiAnimatedStyle]}>
            <Text
              style={[
                styles.label,
                { color: theme.colors.text.secondary[colorScheme] },
              ]}
            >
              Icon
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
                <Text style={styles.emojiPreview}>{selectedEmoji}</Text>
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

          {/* Photo */}
          <Animated.View style={[styles.inputGroup, photoAnimatedStyle]}>
            <Text
              style={[
                styles.label,
                { color: theme.colors.text.secondary[colorScheme] },
              ]}
            >
              Photo (Optional)
            </Text>
            <View style={styles.photoActions}>
              <TouchableOpacity
                style={[
                  styles.photoBtn,
                  { backgroundColor: theme.colors.surface[colorScheme] },
                ]}
                onPress={handleTakePhoto}
              >
                <Icon
                  name="camera"
                  size={getResponsiveValue(24, 24, 26, 32)}
                  color={theme.colors.primary}
                />
                <Text
                  style={[
                    styles.photoBtnText,
                    { color: theme.colors.text.primary[colorScheme] },
                  ]}
                >
                  Take Photo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.photoBtn,
                  { backgroundColor: theme.colors.surface[colorScheme] },
                ]}
                onPress={handlePickPhoto}
              >
                <Icon
                  name="image"
                  size={getResponsiveValue(24, 24, 26, 32)}
                  color={theme.colors.primary}
                />
                <Text
                  style={[
                    styles.photoBtnText,
                    { color: theme.colors.text.primary[colorScheme] },
                  ]}
                >
                  Gallery
                </Text>
              </TouchableOpacity>
            </View>
            {imageUri && (
              <View style={styles.imagePreview}>
                <Image
                  source={{ uri: imageUri }}
                  style={{ width: "100%", height: "100%", borderRadius: 12 }}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    borderRadius: 12,
                    padding: 4,
                  }}
                  onPress={() => {
                    haptics.selection();
                    setImageUri(null);
                  }}
                >
                  <Icon name="close" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>

          {/* Save Button */}
          <Animated.View style={buttonAnimatedStyle}>
            <Button
              title={pin ? "Save Pin" : "Add Pin"}
              onPress={handleSave}
              fullWidth
            />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <RNAnimated.View
        style={[
          styles.bannerContainer,
          {
            backgroundColor: theme.colors.background[colorScheme],
            paddingBottom: isKeyboardOpen ? 0: insets.bottom,
          },
          bannerAnimatedStyle,
        ]}
      >
<BannerAdView onHeightChange={setBannerHeight} />  
    </RNAnimated.View>

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
  headerBtn: {
    width: getResponsiveValue(40, 40, 44, 56),
    height: getResponsiveValue(40, 40, 44, 56),
    justifyContent: "center",
    alignItems: "flex-start",
  },
  content: {
    padding: 24,
  },
  bannerContainer: { paddingTop: 8 },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: moderateScale(14),
    fontWeight: "500",
    marginBottom: 8,
    marginTop: 16,
    fontFamily: "poppins_medium",
  },
  hint: {
    fontSize: moderateScale(12),
    fontWeight: "300",
    marginTop: 4,
    fontFamily: "poppins_light",
  },
  inputContainer: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    fontSize: moderateScale(13),
    fontWeight: "300",
    padding: 0,
  },
  locationActions: {
    flexDirection: "row",
    marginTop: 12,
    gap: 12,
  },
  locationBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  locationBtnText: {
    fontSize: moderateScale(13),
    fontWeight: "400",
  },
  photoActions: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  photoBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    flexDirection: "row",
  },
  addressText: {
    fontSize: moderateScale(14),
    fontWeight: "400",
    fontFamily: "poppins_regular",
  },
  photoBtnText: {
    fontSize: moderateScale(13),
    fontWeight: "400",
  },
  imagePreview: {
    height: 150,
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  emojiSelector: {
    alignItems: "center",
    padding: 24,
    borderRadius: 12,
    marginBottom: 8,
  },
  emojiPreview: {
    fontSize: getResponsiveValue(
      moderateScale(64),
      moderateScale(64),
      moderateScale(64),
      72,
    ),
    lineHeight: getResponsiveValue(
      moderateScale(76),
      moderateScale(76),
      moderateScale(76),
      92,
    ),
    textAlign: "center",
  },
  headerText: {
    fontWeight: "600",
  },
  emojiInnerContainer: {
    width: "100%",
    height: 100,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  caption: {
    fontSize: moderateScale(12),
    fontWeight: "400",
  },
});
