import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  Image,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useTheme } from "../../theme/ThemeContext";
import { HomeStackParamList } from "../../types/navigation";
import {
  databaseService,
  GlobalSearchResult,
} from "../../services/DatabaseService";
import {
  getResponsiveValue,
  moderateScale,
} from "../../utils/responsive";
import { haptics } from "../../utils/haptics";

type NavProp = NativeStackNavigationProp<HomeStackParamList, "GlobalSearch">;

const SEARCH_DEBOUNCE_MS = 200;
const THUMB_SIZE = getResponsiveValue(56, 56, 60, 76);

export const GlobalSearchScreen: React.FC = () => {
  const { theme, colorScheme } = useTheme();
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const requestIdRef = useRef(0);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      inputRef.current?.focus();
    }, 80);
    return () => clearTimeout(t);
  }, []);

  // Track the on-screen keyboard so the result list can extend its bottom
  // padding by that amount — otherwise the last few cards live underneath
  // the keyboard and can never scroll into view.
  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const h = e.endCoordinates?.height ?? 0;
      // insets.bottom is already part of the visible safe area at the
      // bottom of the list; the keyboard sits above it, so subtract.
      setKeyboardHeight(Math.max(0, h - insets.bottom));
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [insets.bottom]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const myRequestId = ++requestIdRef.current;
    const handle = setTimeout(async () => {
      const matches = await databaseService.searchPinsGlobal(trimmed, 100);
      // Drop stale results if the user has typed again since this fired.
      if (myRequestId !== requestIdRef.current) return;
      setResults(matches);
      setIsSearching(false);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [query]);

  const handleResultPress = (item: GlobalSearchResult) => {
    haptics.selection();
    Keyboard.dismiss();
    navigation.navigate("MapView", {
      mapId: item.mapId,
      mapName: item.mapName,
      emoji: item.mapEmoji,
      focusPinId: item.id,
    });
  };

  const handleClear = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  const handleBack = () => {
    Keyboard.dismiss();
    navigation.goBack();
  };

  const trimmedQuery = query.trim();
  const showEmptyResults =
    trimmedQuery.length > 0 && !isSearching && results.length === 0;
  const showHint = trimmedQuery.length === 0;

  const renderItem = ({ item }: { item: GlobalSearchResult }) => {
    const address = item.address?.trim() || "";
    const hasAddress = address.length > 0;
    return (
      <TouchableOpacity
        style={[
          styles.resultCard,
          {
            backgroundColor: theme.colors.card[colorScheme],
            ...theme.shadows.sm,
          },
        ]}
        activeOpacity={0.75}
        onPress={() => handleResultPress(item)}
      >
        {item.imageUri ? (
          <Image source={{ uri: item.imageUri }} style={styles.thumbImage} />
        ) : (
          <View
            style={[
              styles.thumbFallback,
              { backgroundColor: theme.colors.background[colorScheme] },
            ]}
          >
            <Text style={styles.thumbEmoji}>{item.emoji || "📍"}</Text>
          </View>
        )}

        <View style={styles.resultBody}>
          <Text
            numberOfLines={1}
            style={[
              styles.resultTitle,
              { color: theme.colors.text.primary[colorScheme] },
            ]}
          >
            {item.title}
          </Text>

            {hasAddress && (
              <Text
                numberOfLines={1}
                style={[
                  styles.resultSubtitle,
                  { color: theme.colors.text.secondary[colorScheme] },
                ]}
              >
                {address}
              </Text>
            )}

          <View style={styles.metaRow}>
            <View
              style={[
                styles.mapChip,
                { backgroundColor: theme.colors.background[colorScheme] },
              ]}
            >
              <Text style={styles.mapChipEmoji}>{item.mapEmoji || "🗺️"}</Text>
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

            {item.rating > 0 && (
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Icon
                    key={n}
                    name={n <= item.rating ? "star" : "star-outline"}
                    size={getResponsiveValue(13, 13, 14, 18)}
                    color={
                      n <= item.rating
                        ? theme.colors.star
                        : theme.colors.text.tertiary[colorScheme]
                    }
                  />
                ))}
              </View>
            )}
          </View>
        </View>

        <Icon
          name="chevron-right"
          size={getResponsiveValue(22, 22, 24, 30)}
          color={theme.colors.text.tertiary[colorScheme]}
          style={styles.chevron}
        />
      </TouchableOpacity>
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
      <View
        style={[
          styles.headerRow,
          {
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.spacing.md,
          },
        ]}
      >
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

        <View
          style={[
            styles.searchField,
            {
              backgroundColor: theme.colors.card[colorScheme],
              ...theme.shadows.md,
            },
          ]}
        >
          <Icon
            name="magnify"
            size={getResponsiveValue(20, 20, 22, 28)}
            color={theme.colors.text.tertiary[colorScheme]}
            style={styles.searchIcon}
          />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Search all pins"
            placeholderTextColor={theme.colors.text.tertiary[colorScheme]}
            style={[
              styles.searchInput,
              { color: theme.colors.text.primary[colorScheme] },
            ]}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={handleClear}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon
                name="close-circle"
                size={getResponsiveValue(18, 18, 20, 26)}
                color={theme.colors.text.tertiary[colorScheme]}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showHint ? (
        <View style={[styles.emptyState, { paddingBottom: keyboardHeight }]}>
          <Icon
            name="map-search-outline"
            size={getResponsiveValue(56, 56, 64, 80)}
            color={theme.colors.text.tertiary[colorScheme]}
          />
          <Text
            style={[
              styles.emptyText,
              { color: theme.colors.text.tertiary[colorScheme] },
            ]}
          >
            Search across all your maps by pin title, description, or address.
          </Text>
        </View>
      ) : showEmptyResults ? (
        <View style={[styles.emptyState, { paddingBottom: keyboardHeight }]}>
          <Icon
            name="magnify-close"
            size={getResponsiveValue(56, 56, 64, 80)}
            color={theme.colors.text.tertiary[colorScheme]}
          />
          <Text
            style={[
              styles.emptyText,
              { color: theme.colors.text.tertiary[colorScheme] },
            ]}
          >
            No pins match “{trimmedQuery}”.
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.md,
            paddingTop: theme.spacing.xs,
            paddingBottom:
              keyboardHeight + insets.bottom + theme.spacing.xl,
          }}
          ListHeaderComponent={
            isSearching ? (
              <View style={styles.searchingRow}>
                <ActivityIndicator
                  size="small"
                  color={theme.colors.text.tertiary[colorScheme]}
                />
                <Text
                  style={[
                    styles.searchingText,
                    { color: theme.colors.text.tertiary[colorScheme] },
                  ]}
                >
                  Searching…
                </Text>
              </View>
            ) : results.length > 0 ? (
              <Text
                style={[
                  styles.resultsCount,
                  { color: theme.colors.text.tertiary[colorScheme] },
                ]}
              >
                {results.length} {results.length === 1 ? "result" : "results"}
              </Text>
            ) : null
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 8,
  },
  backButton: {
    paddingRight: 12,
    paddingVertical: 6,
  },
  searchField: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: getResponsiveValue(48, 48, 52, 62),
    borderRadius: getResponsiveValue(24, 24, 26, 31),
    paddingHorizontal: 16,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: getResponsiveValue(
      moderateScale(16),
      moderateScale(16),
      moderateScale(16),
      22,
    ),
    fontFamily: "poppins_regular",
    paddingVertical: 0,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: getResponsiveValue(
      moderateScale(14),
      moderateScale(14),
      moderateScale(14),
      20,
    ),
    textAlign: "center",
    fontFamily: "poppins_regular",
  },
  searchingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 12,
    paddingHorizontal: 4,
  },
  searchingText: {
    marginLeft: 8,
    fontSize: getResponsiveValue(
      moderateScale(13),
      moderateScale(13),
      moderateScale(13),
      18,
    ),
    fontFamily: "poppins_regular",
  },
  resultsCount: {
    paddingHorizontal: 4,
    paddingBottom: 8,
    fontSize: getResponsiveValue(
      moderateScale(12),
      moderateScale(12),
      moderateScale(12),
      17,
    ),
    fontFamily: "poppins_regular",
  },
  resultCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
  },
  thumbImage: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 12,
    marginRight: 12,
  },
  thumbFallback: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 12,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbEmoji: {
    fontSize: getResponsiveValue(28, 28, 32, 42),
  },
  resultBody: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  resultTitle: {
    fontSize: getResponsiveValue(
      moderateScale(15),
      moderateScale(15),
      moderateScale(15),
      21,
    ),
    fontFamily: "poppins_bold",
    fontWeight: "600",
  },
  resultSubtitle: {
    marginTop: 2,
    fontSize: getResponsiveValue(
      moderateScale(13),
      moderateScale(13),
      moderateScale(13),
      18,
    ),
    fontFamily: "poppins_regular",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  mapChip: {
    flexDirection: "row",
    paddingVertical: 4,
    borderRadius: 999,
    maxWidth: "70%",
  },
  mapChipEmoji: {
    fontSize: getResponsiveValue(12, 12, 13, 17),
    marginRight: 4,
  },
  mapChipText: {
    fontSize: getResponsiveValue(
      moderateScale(11),
      moderateScale(11),
      moderateScale(12),
      16,
    ),
    fontFamily: "poppins_regular",
    marginRight: 16,
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  chevron: {
    marginLeft: 6,
  },
});
