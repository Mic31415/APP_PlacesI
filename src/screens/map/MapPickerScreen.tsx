import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
  FlatList,
} from "react-native";
import MapView, {
  Region,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
} from "react-native-maps";
// Removed GooglePlacesAutocomplete
import Geolocation from "@react-native-community/geolocation";
import { check, request, PERMISSIONS, RESULTS } from "react-native-permissions";
import Geocoder from "react-native-geocoding";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeContext";
import { HomeStackParamList } from "../../types/navigation";
import AppConfig from "../../config";
import { getResponsiveValue, moderateScale } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";
import { trackInterstitialAction } from "../../services/InterstitialAdService";

// Initialize Geocoder if not already initialized
Geocoder.init(AppConfig.GOOGLE_PLACES_API_KEY);

type MapPickerScreenRouteProp = RouteProp<HomeStackParamList, "MapPicker">;

interface PlacePrediction {
  description: string;
  place_id: string;
}

export const MapPickerScreen: React.FC = () => {
  const { theme, colorScheme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<MapPickerScreenRouteProp>();
  const insets = useSafeAreaInsets();

  const { initialRegion, onSelectLocation } = route.params;

  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region>(
    initialRegion || {
      latitude: 37.78825,
      longitude: -122.4324,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    },
  );

  const [isLocating, setIsLocating] = useState<boolean>(!initialRegion);

  // We track the center coordinate as the user drags
  const [centerCoordinate, setCenterCoordinate] = useState<{
    latitude: number;
    longitude: number;
  }>(
    initialRegion
      ? { latitude: initialRegion.latitude, longitude: initialRegion.longitude }
      : { latitude: 37.78825, longitude: -122.4324 },
  );

  const [address, setAddress] = useState<string>("");
  const [isLoadingAddress, setIsLoadingAddress] = useState<boolean>(false);
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Manual Autocomplete State
  const [query, setQuery] = useState<string>("");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial reverse geocode & Current Location
  useEffect(() => {
    if (initialRegion) {
      reverseGeocode(centerCoordinate.latitude, centerCoordinate.longitude);
    } else {
      getCurrentLocation();
    }
  }, []);

  const getCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const permission = Platform.select({
        ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
        android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
      });

      if (!permission) {
        setIsLocating(false);
        return;
      }

      const result = await check(permission);

      if (result === RESULTS.DENIED) {
        await request(permission);
      }

      Geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newRegion = {
            latitude,
            longitude,
            latitudeDelta: 0.005, // Zoom in closer for current location
            longitudeDelta: 0.002,
          };

          setRegion(newRegion);
          setCenterCoordinate({ latitude, longitude });
          mapRef.current?.animateToRegion(newRegion, 1000);

          // Fetch address for current location
          reverseGeocode(latitude, longitude);
          setIsLocating(false);
        },
        (error) => {
          reverseGeocode(centerCoordinate.latitude, centerCoordinate.longitude);
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
      );
    } catch (error) {
      console.error("Location permission error:", error);
      // Fallback
      reverseGeocode(centerCoordinate.latitude, centerCoordinate.longitude);
      setIsLocating(false);
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    setIsLoadingAddress(true);
    try {
      const json = await Geocoder.from(lat, lng);
      if (json.results && json.results.length > 0) {
        const formattedAddress = json.results[0].formatted_address;
        setAddress(formattedAddress);
      } else {
        setAddress("Unknown location");
      }
    } catch (error) {
      console.warn("Reverse geocoding failed", error);
      setAddress("Location found");
    } finally {
      setIsLoadingAddress(false);
    }
  };

  const onRegionChangeComplete = (newRegion: Region) => {
    setRegion(newRegion);
    setCenterCoordinate({
      latitude: newRegion.latitude,
      longitude: newRegion.longitude,
    });

    // Debounce the reverse geocoding
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      reverseGeocode(newRegion.latitude, newRegion.longitude);
    }, 800);
  };

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

  const onPlaceSelected = async (placeId: string) => {
    haptics.selection();
    setPredictions([]);
    // Clear query or keep selected name? Keeping logic simple for now.

    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${AppConfig.GOOGLE_PLACES_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK") {
        const { lat, lng } = data.result.geometry.location;
        const newRegion = {
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        };
        mapRef.current?.animateToRegion(newRegion, 1000);
        setRegion(newRegion);
        setCenterCoordinate({ latitude: lat, longitude: lng });
        reverseGeocode(lat, lng);
      } else {
        Alert.alert("Error", "Could not fetch location details.");
      }
    } catch (error) {
      Alert.alert("Error", "Network error fetching details.");
    }
  };

  const handleConfirm = async () => {
    void trackInterstitialAction();

    haptics.success();
    onSelectLocation({
      latitude: centerCoordinate.latitude,
      longitude: centerCoordinate.longitude,
      address: address,
    });
    navigation.goBack();
  };

  const handleCancel = () => {
    haptics.selection();
    navigation.goBack();
  };

  const handleCurrentLocation = () => {
    haptics.impactLight();
    getCurrentLocation();
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background[colorScheme] },
      ]}
    >
      {/* Search Bar Overlay */}
      <View
        style={{
          position: "absolute",
          top: insets.top + getResponsiveValue(10, 10, 12, 20),
          left: getResponsiveValue(10, 10, 12, 24),
          right: getResponsiveValue(10, 10, 12, 24),
          zIndex: 100,
          elevation: 10,
          flexDirection: "row",
          alignItems: "flex-start",
        }}
      >
        <TouchableOpacity
          onPress={handleCancel}
          style={{
            height: getResponsiveValue(44, 44, 48, 60),
            width: getResponsiveValue(44, 44, 48, 60),
            backgroundColor: theme.colors.surface[colorScheme],
            borderRadius: getResponsiveValue(8, 8, 10, 14),
            justifyContent: "center",
            alignItems: "center",
            marginRight: getResponsiveValue(10, 10, 12, 16),
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Icon
            name="chevron-left"
            size={getResponsiveValue(30, 30, 32, 38)}
            color={theme.colors.text.primary[colorScheme]}
          />
        </TouchableOpacity>

        <View style={{ flex: 1, zIndex: 1000 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: theme.colors.surface[colorScheme],
              borderRadius: getResponsiveValue(8, 8, 10, 14),
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 4,
              paddingHorizontal: getResponsiveValue(10, 10, 12, 18),
              height: getResponsiveValue(44, 44, 48, 60),
            }}
          >
            <Icon
              name="magnify"
              size={getResponsiveValue(20, 20, 22, 28)}
              color={theme.colors.text.tertiary[colorScheme]}
            />
            <TextInput
              style={{
                flex: 1,
                height: getResponsiveValue(44, 44, 48, 60),
                color: theme.colors.text.primary[colorScheme],
                fontSize: getResponsiveValue(16, 16, 17, 22),
                marginLeft: getResponsiveValue(8, 8, 8, 12),
                fontFamily: "poppins_regular",
              }}
              placeholder="Search for a place"
              placeholderTextColor={theme.colors.text.tertiary[colorScheme]}
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
                  size={getResponsiveValue(18, 18, 20, 26)}
                  color={theme.colors.text.tertiary[colorScheme]}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Predictions List */}
          {predictions.length > 0 && (
            <View
              style={{
                marginTop: 8,
                backgroundColor: theme.colors.surface[colorScheme],
                borderRadius: 8,
                elevation: 4,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                maxHeight: getResponsiveValue(200, 200, 220, 280),
              }}
            >
              <FlatList
                data={predictions}
                keyExtractor={(item) => item.place_id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={{
                      padding: getResponsiveValue(13, 13, 14, 18),
                      borderBottomWidth: 0.5,
                      borderBottomColor: theme.colors.border[colorScheme],
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                    onPress={() => onPlaceSelected(item.place_id)}
                  >
                    <Text
                      style={{
                        color: theme.colors.text.primary[colorScheme],
                        fontSize: getResponsiveValue(14, 14, 15, 20),
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

      {isLocating ? (
        <View
          style={[
            styles.centerMarkerContainer,
            {
              backgroundColor: theme.colors.background[colorScheme],
              zIndex: 20,
            },
          ]}
        >
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            style={{
              marginTop: 16,
              color: theme.colors.text.secondary[colorScheme],
              fontFamily: "poppins_medium",
            }}
          >
            Finding your location...
          </Text>
        </View>
      ) : (
        <>
          <MapView
            ref={mapRef}
            provider={PROVIDER_DEFAULT}
            style={styles.map}
            initialRegion={region}
            onRegionChangeComplete={onRegionChangeComplete}
            showsUserLocation={true}
            showsMyLocationButton={true}
            mapPadding={{ top: insets.top + 60, right: 0, bottom: 0, left: 0 }}
          />

          {/* Center Fixed Pin */}
          <View style={styles.centerMarkerContainer} pointerEvents="none">
            <Icon
              name="map-marker"
              size={48}
              color={theme.colors.primary}
              style={{ marginBottom: 48 }}
            />
            {/* marginBottom lifts the pin tip to center roughly */}
          </View>
        </>
      )}

      {/* Bottom Sheet for Address & Confirm */}
      <View
        style={[
          styles.bottomSheet,
          {
            backgroundColor: theme.colors.surface[colorScheme],
            paddingBottom: insets.bottom + getResponsiveValue(16, 16, 18, 22),
          },
        ]}
      >
        <Text
          style={[
            styles.addressLabel,
            { color: theme.colors.text.tertiary[colorScheme] },
          ]}
        >
          Selected Location
        </Text>

        <View style={styles.addressContainer}>
          <Icon
            name="map-marker-outline"
            size={getResponsiveValue(20, 20, 22, 28)}
            color={theme.colors.primary}
            style={{ marginTop: 2 }}
          />
          <View style={{ flex: 1, marginLeft: 8 }}>
            {isLoadingAddress ? (
              <ActivityIndicator
                size="small"
                color={theme.colors.text.secondary[colorScheme]}
                style={{ alignSelf: "flex-start" }}
              />
            ) : (
              <Text
                style={[
                  styles.addressText,
                  { color: theme.colors.text.primary[colorScheme] },
                ]}
                numberOfLines={2}
              >
                {address || "Drag map to select"}
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.confirmButton,
            { backgroundColor: theme.colors.primary },
            isLoadingAddress && styles.confirmButtonDisabled,
          ]}
          onPress={handleConfirm}
          disabled={isLoadingAddress}
          activeOpacity={isLoadingAddress ? 1 : 0.7}
          accessibilityState={{ disabled: isLoadingAddress, busy: isLoadingAddress }}
        >
          {isLoadingAddress ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.confirmButtonText}>Confirm Location</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  centerMarkerContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  headerOverlay: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerTitleContainer: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
    marginRight: 44 + 12, // Balance out the back button spacing
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerTitle: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    fontFamily: "poppins_bold",
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: getResponsiveValue(24, 24, 24, 32),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  addressLabel: {
    fontSize: getResponsiveValue(
      moderateScale(12),
      moderateScale(12),
      moderateScale(12),
      16,
    ),
    fontWeight: "600",
    marginBottom: getResponsiveValue(8, 8, 8, 10),
    textTransform: "uppercase",
    fontFamily: "poppins_semibold",
  },
  addressContainer: {
    flexDirection: "row",
    marginBottom: getResponsiveValue(24, 24, 24, 28),
  },
  addressText: {
    fontSize: getResponsiveValue(
      moderateScale(16),
      moderateScale(16),
      moderateScale(16),
      26,
    ),
    fontWeight: "500",
    lineHeight: getResponsiveValue(22, 22, 24, 32),
    fontFamily: "poppins_semibold",
  },
  confirmButton: {
    height: getResponsiveValue(50, 50, 54, 64),
    borderRadius: getResponsiveValue(12, 12, 12, 14),
    justifyContent: "center",
    alignItems: "center",
  },
  confirmButtonDisabled: {
    opacity: 0.55,
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: getResponsiveValue(
      moderateScale(16),
      moderateScale(16),
      moderateScale(16),
      24,
    ),
    fontWeight: "700",
    fontFamily: "poppins_bold",
  },
});
