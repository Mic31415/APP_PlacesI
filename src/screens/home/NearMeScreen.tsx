import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
  Platform,
  PermissionsAndroid,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Geolocation from "@react-native-community/geolocation";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useTheme } from "../../theme/ThemeContext";
import { HomeStackParamList } from "../../types/navigation";
import { databaseService, PinData, MapData } from "../../services/DatabaseService";
import { getResponsiveValue, moderateScale } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";
import { resolvePinImage } from "../../utils/imageStorage";

type NavProp = NativeStackNavigationProp<HomeStackParamList, "NearMe">;

// Only surface places within this distance — keeps "near me" meaningful.
const RADIUS_KM = 50;
const THUMB_SIZE = getResponsiveValue(56, 56, 60, 76);

// Haversine great-circle distance in kilometres.
const distanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDistance = (km: number): string =>
  km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;

interface NearbyPin {
  pin: PinData;
  km: number;
  mapName: string;
  mapEmoji: string;
}

type ScreenStatus = "loading" | "denied" | "error" | "ready";

export const NearMeScreen: React.FC = () => {
  const { theme, colorScheme } = useTheme();
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();

  const [status, setStatus] = useState<ScreenStatus>("loading");
  const [nearby, setNearby] = useState<NearbyPin[]>([]);
  const [wishlistOnly, setWishlistOnly] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const handleImageError = (id: string) => {
    setFailedImages((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const requestLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS === "ios") return true;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "Location Permission",
          message: "We need your location to show saved places near you.",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK",
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  };

  // Remember the last fix so we can recompute on focus without re-prompting
  // for location or flashing the loading state.
  const coordsRef = useRef<{ latitude: number; longitude: number } | null>(null);

  // Recompute the nearby list from the DB against a known location. Shared by
  // the initial load and the on-focus refresh, so a status change made in the
  // pin detail (e.g. "Want to go" → "Been here") is reflected when you return.
  const computeNearby = async (latitude: number, longitude: number) => {
    const [pins, maps] = await Promise.all([
      databaseService.getAllPins(),
      databaseService.getMaps(),
    ]);
    const mapLookup = new Map<string, MapData>();
    maps.forEach((m) => mapLookup.set(m.id, m));

    const within: NearbyPin[] = [];
    for (const pin of pins) {
      const km = distanceKm(latitude, longitude, pin.latitude, pin.longitude);
      if (km <= RADIUS_KM) {
        const m = mapLookup.get(pin.mapId);
        within.push({
          pin,
          km,
          mapName: m?.name || "Map",
          mapEmoji: m?.emoji || "🗺️",
        });
      }
    }
    within.sort((a, b) => a.km - b.km);
    setNearby(within);
  };

  const load = async () => {
    setStatus("loading");
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      setStatus("denied");
      return;
    }

    Geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          coordsRef.current = { latitude, longitude };
          await computeNearby(latitude, longitude);
          setStatus("ready");
        } catch (e) {
          console.error("Near me load failed", e);
          setStatus("error");
        }
      },
      (error) => {
        console.error("Near me location failed", error);
        setStatus("error");
      },
      { enableHighAccuracy: false, timeout: 20000, maximumAge: 10000 },
    );
  };

  // Silent refresh against the cached location — no spinner, no re-prompt — so
  // edits made elsewhere (status, deletions, new pins) show up on return.
  const refresh = async () => {
    const coords = coordsRef.current;
    if (!coords) return;
    try {
      await computeNearby(coords.latitude, coords.longitude);
    } catch (e) {
      console.error("Near me refresh failed", e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (coordsRef.current) {
        refresh();
      } else {
        load();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const handleBack = () => {
    haptics.selection();
    navigation.goBack();
  };

  const handlePress = (item: NearbyPin) => {
    haptics.selection();
    navigation.navigate("MapView", {
      mapId: item.pin.mapId,
      mapName: item.mapName,
      emoji: item.mapEmoji,
      focusPinId: item.pin.id,
    });
  };

  const visible = wishlistOnly
    ? nearby.filter((n) => (n.pin.status || "visited") === "wishlist")
    : nearby;

  const renderItem = ({ item }: { item: NearbyPin }) => {
    const { pin } = item;
    const cover =
      pin.images && pin.images.length > 0 ? pin.images[0] : pin.imageUri;
    const showImage = !!cover && !failedImages.has(pin.id);
    const isWishlist = (pin.status || "visited") === "wishlist";
    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.card[colorScheme],
            ...theme.shadows.sm,
          },
        ]}
        activeOpacity={0.75}
        onPress={() => handlePress(item)}
      >
        <View
          style={[
            styles.thumbWrap,
            isWishlist && {
              borderStyle: "dashed",
              borderColor: theme.colors.primary,
            },
          ]}
        >
          {showImage ? (
            <Image
              source={{ uri: resolvePinImage(cover) }}
              style={styles.thumbInner}
              onError={() => handleImageError(pin.id)}
            />
          ) : (
            <View
              style={[
                styles.thumbInner,
                {
                  backgroundColor: theme.colors.primary + "1F",
                  alignItems: "center",
                  justifyContent: "center",
                },
              ]}
            >
              <Text style={styles.thumbEmoji}>{pin.emoji || "📍"}</Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          <Text
            numberOfLines={1}
            style={[
              styles.title,
              { color: theme.colors.text.primary[colorScheme] },
            ]}
          >
            {pin.title}
          </Text>
          {pin.address ? (
            <Text
              numberOfLines={1}
              style={[
                styles.subtitle,
                { color: theme.colors.text.secondary[colorScheme] },
              ]}
            >
              {pin.address}
            </Text>
          ) : null}
          <View style={styles.metaRow}>
            <View style={styles.distancePill}>
              <Icon
                name="near-me"
                size={getResponsiveValue(12, 12, 13, 17)}
                color={theme.colors.primary}
              />
              <Text style={[styles.distanceText, { color: theme.colors.primary }]}>
                {formatDistance(item.km)}
              </Text>
            </View>
            <View
              style={[
                styles.mapChip,
                { backgroundColor: theme.colors.surface[colorScheme] },
              ]}
            >
              <Text style={styles.mapChipEmoji}>{item.mapEmoji}</Text>
              <Text
                numberOfLines={1}
                style={[
                  styles.mapChipText,
                  { color: theme.colors.text.secondary[colorScheme] },
                ]}
              >
                {item.mapName}
              </Text>
            </View>
          </View>
        </View>

        <Icon
          name="chevron-right"
          size={getResponsiveValue(22, 22, 24, 30)}
          color={theme.colors.text.tertiary[colorScheme]}
        />
      </TouchableOpacity>
    );
  };

  const renderBody = () => {
    if (status === "loading") {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            style={[
              styles.centerText,
              { color: theme.colors.text.tertiary[colorScheme] },
            ]}
          >
            Finding places near you…
          </Text>
        </View>
      );
    }

    if (status === "denied" || status === "error") {
      return (
        <View style={styles.center}>
          <Icon
            name={status === "denied" ? "map-marker-off" : "alert-circle-outline"}
            size={getResponsiveValue(56, 56, 64, 80)}
            color={theme.colors.text.tertiary[colorScheme]}
          />
          <Text
            style={[
              styles.centerText,
              { color: theme.colors.text.tertiary[colorScheme] },
            ]}
          >
            {status === "denied"
              ? "Location permission is needed to show places near you."
              : "We couldn't get your location. Make sure GPS is on."}
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => {
              haptics.selection();
              load();
            }}
          >
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (visible.length === 0) {
      return (
        <View style={styles.center}>
          <Icon
            name="map-marker-radius-outline"
            size={getResponsiveValue(56, 56, 64, 80)}
            color={theme.colors.text.tertiary[colorScheme]}
          />
          <Text
            style={[
              styles.centerText,
              { color: theme.colors.text.tertiary[colorScheme] },
            ]}
          >
            {wishlistOnly
              ? `No "Want to go" places within ${RADIUS_KM} km.`
              : `No saved places within ${RADIUS_KM} km.`}
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={visible}
        keyExtractor={(item) => item.pin.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.md,
          paddingTop: theme.spacing.xs,
          paddingBottom: insets.bottom + theme.spacing.xl,
        }}
        ListHeaderComponent={
          <Text
            style={[
              styles.count,
              { color: theme.colors.text.tertiary[colorScheme] },
            ]}
          >
            {visible.length} {visible.length === 1 ? "place" : "places"} within{" "}
            {RADIUS_KM} km
          </Text>
        }
      />
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background[colorScheme],
          paddingTop: insets.top,
        },
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Icon
            name="arrow-left"
            size={getResponsiveValue(24, 24, 26, 32)}
            color={theme.colors.text.primary[colorScheme]}
          />
        </TouchableOpacity>
        <Text
          style={[
            styles.headerTitle,
            { color: theme.colors.text.primary[colorScheme] },
          ]}
        >
          Near me
        </Text>
        {/* Wishlist-only toggle */}
        <TouchableOpacity
          onPress={() => {
            haptics.selection();
            setWishlistOnly((v) => !v);
          }}
          style={[
            styles.toggle,
            {
              backgroundColor: wishlistOnly
                ? theme.colors.primary + "20"
                : theme.colors.surface[colorScheme],
              borderColor: wishlistOnly
                ? theme.colors.primary
                : theme.colors.border[colorScheme],
            },
          ]}
        >
          <Icon
            name="star-outline"
            size={15}
            color={
              wishlistOnly
                ? theme.colors.primary
                : theme.colors.text.secondary[colorScheme]
            }
          />
          <Text
            style={[
              styles.toggleText,
              {
                color: wishlistOnly
                  ? theme.colors.primary
                  : theme.colors.text.secondary[colorScheme],
              },
            ]}
          >
            Want to go
          </Text>
        </TouchableOpacity>
      </View>

      {renderBody()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 8,
  },
  backButton: {
    paddingRight: 8,
    paddingVertical: 6,
  },
  headerTitle: {
    flex: 1,
    fontSize: getResponsiveValue(moderateScale(20), moderateScale(20), moderateScale(20), 28),
    fontFamily: "poppins_bold",
    fontWeight: "600",
  },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  toggleText: {
    fontSize: moderateScale(12),
    fontFamily: "poppins_medium",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
  },
  centerText: {
    textAlign: "center",
    fontSize: moderateScale(14),
    fontFamily: "poppins_regular",
  },
  retryBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  retryText: {
    color: "#fff",
    fontFamily: "poppins_medium",
    fontSize: moderateScale(14),
  },
  count: {
    paddingHorizontal: 4,
    paddingBottom: 8,
    fontSize: moderateScale(12),
    fontFamily: "poppins_regular",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
    gap: 12,
  },
  thumbWrap: {
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "transparent",
    padding: 2,
  },
  thumbInner: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 12,
  },
  thumbEmoji: {
    fontSize: getResponsiveValue(28, 28, 32, 42),
  },
  body: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  title: {
    fontSize: getResponsiveValue(moderateScale(15), moderateScale(15), moderateScale(15), 21),
    fontFamily: "poppins_bold",
    fontWeight: "600",
  },
  subtitle: {
    marginTop: 2,
    fontSize: moderateScale(13),
    fontFamily: "poppins_regular",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  distancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  distanceText: {
    fontSize: moderateScale(12),
    fontFamily: "poppins_medium",
  },
  mapChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    maxWidth: "60%",
  },
  mapChipEmoji: {
    fontSize: getResponsiveValue(12, 12, 13, 17),
    marginRight: 4,
  },
  mapChipText: {
    fontSize: moderateScale(11),
    fontFamily: "poppins_regular",
  },
});
