import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useTheme } from "../../theme/ThemeContext";
import { ScreenHeader } from "../../components/common/ScreenHeader";
import { databaseService, PinData } from "../../services/DatabaseService";
import { HomeStackParamList } from "../../types/navigation";
import { getResponsiveValue, moderateScale } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";

type Nav = NativeStackNavigationProp<HomeStackParamList, "AddTripStop">;
type Rt = RouteProp<HomeStackParamList, "AddTripStop">;

export const AddTripStopScreen: React.FC = () => {
  const { theme, colorScheme } = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { tripId, dayIndex } = route.params;

  const [pins, setPins] = useState<PinData[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const all = await databaseService.getAllPins();
        if (active) setPins(all);
      } catch (e) {
        console.error("Failed to load pins:", e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pins;
    return pins.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.address || "").toLowerCase().includes(q),
    );
  }, [pins, query]);

  const selectedCount = Object.values(selected).filter(Boolean).length;

  const toggle = useCallback((id: string) => {
    haptics.selection();
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleConfirm = async () => {
    if (selectedCount === 0 || saving) return;
    setSaving(true);
    try {
      const chosen = pins.filter((p) => selected[p.id]);
      await databaseService.addTripStopsFromPins(tripId, dayIndex, chosen);
      haptics.success();
      navigation.goBack();
    } catch (e) {
      console.error("Failed to add stops:", e);
    } finally {
      setSaving(false);
    }
  };

  const goAddNew = () => {
    haptics.selection();
    navigation.replace("CreateTripStop", { tripId, dayIndex });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background[colorScheme] }]}>
      <ScreenHeader
        leftComponent={
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Icon name="chevron-left" size={getResponsiveValue(32, 32, 34, 40)} color={theme.colors.text.primary[colorScheme]} />
          </TouchableOpacity>
        }
        centerComponent={
          <Text style={[styles.headerText, { color: theme.colors.text.primary[colorScheme] }]}>
            Choose Places
          </Text>
        }
        rightComponent={
          <TouchableOpacity onPress={goAddNew} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Icon name="plus" size={getResponsiveValue(26, 26, 28, 34)} color={theme.colors.primary} />
          </TouchableOpacity>
        }
      />

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={[styles.searchRow, { backgroundColor: theme.colors.surface[colorScheme] }]}>
          <Icon name="magnify" size={20} color={theme.colors.text.tertiary[colorScheme]} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text.primary[colorScheme] }]}
            placeholder="Search your places"
            placeholderTextColor={theme.colors.text.tertiary[colorScheme]}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 120, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const isSel = !!selected[item.id];
            return (
              <TouchableOpacity
                style={[styles.row, { backgroundColor: theme.colors.surface[colorScheme] }]}
                onPress={() => toggle(item.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.rowEmoji}>{item.emoji || "📍"}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: theme.colors.text.primary[colorScheme] }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {!!item.address && (
                    <Text style={[styles.rowAddress, { color: theme.colors.text.tertiary[colorScheme] }]} numberOfLines={1}>
                      {item.address}
                    </Text>
                  )}
                </View>
                <Icon
                  name={isSel ? "check-circle" : "checkbox-blank-circle-outline"}
                  size={24}
                  color={isSel ? theme.colors.primary : theme.colors.text.tertiary[colorScheme]}
                />
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.centerFill}>
              <Icon name="map-marker-off" size={48} color={theme.colors.text.tertiary[colorScheme]} />
              <Text style={[styles.emptyText, { color: theme.colors.text.tertiary[colorScheme] }]}>
                {pins.length === 0
                  ? "You haven't pinned any places yet. Tap + to add a new place instead."
                  : "No places match your search."}
              </Text>
            </View>
          }
        />
      )}

      {/* Confirm bar */}
      {selectedCount > 0 && (
        <TouchableOpacity
          style={[styles.confirmBar, { backgroundColor: theme.colors.primary, opacity: saving ? 0.6 : 1 }]}
          onPress={handleConfirm}
          disabled={saving}
        >
          <Text style={styles.confirmText}>
            Add {selectedCount} {selectedCount === 1 ? "place" : "places"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBtn: { padding: 4 },
  headerText: { fontWeight: "600", fontFamily: "poppins_bold", fontSize: moderateScale(18) },
  searchWrap: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: moderateScale(13), fontFamily: "poppins_regular", paddingVertical: 0 },
  centerFill: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyText: {
    marginTop: 12,
    textAlign: "center",
    fontSize: moderateScale(13),
    fontFamily: "poppins_regular",
    lineHeight: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  rowEmoji: { fontSize: moderateScale(22) },
  rowTitle: { fontSize: moderateScale(14), fontFamily: "poppins_semibold" },
  rowAddress: { fontSize: moderateScale(11), fontFamily: "poppins_regular", marginTop: 2 },
  confirmBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  confirmText: { color: "#fff", fontSize: moderateScale(15), fontFamily: "poppins_semibold" },
});
