import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useTheme } from "../../theme/ThemeContext";
import { ScreenHeader } from "../../components/common/ScreenHeader";
import { EmojiPickerModal } from "../../components/common/EmojiPickerModal";
import { TimePickerModal } from "../../components/common/TimePickerModal";
import { databaseService, TripData } from "../../services/DatabaseService";
import { HomeStackParamList } from "../../types/navigation";
import { AppConfig } from "../../config";
import { getResponsiveValue, moderateScale } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";
import { enumerateDays, formatTime } from "../../utils/tripDates";

type Nav = NativeStackNavigationProp<HomeStackParamList, "CreateTripStop">;
type Rt = RouteProp<HomeStackParamList, "CreateTripStop">;

interface Prediction {
  description: string;
  place_id: string;
}

export const CreateTripStopScreen: React.FC = () => {
  const { theme, colorScheme } = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { tripId, dayIndex: initialDay, stop } = route.params;

  const [trip, setTrip] = useState<TripData | null>(null);
  const [title, setTitle] = useState(stop?.title ?? "");
  const [emoji, setEmoji] = useState(stop?.emoji ?? "📍");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(
    stop && stop.latitude != null && stop.longitude != null
      ? { latitude: stop.latitude, longitude: stop.longitude }
      : null,
  );
  const [address, setAddress] = useState<string>(stop?.address ?? "");
  const [timeMinutes, setTimeMinutes] = useState<number | null>(stop?.timeMinutes ?? null);
  const [note, setNote] = useState(stop?.note ?? "");
  const [dayIndex, setDayIndex] = useState<number>(stop?.dayIndex ?? initialDay);

  // Seed the search field with the saved location when editing an existing
  // stop (e.g. one added from "Choose from my places"), so the location shows
  // instead of looking empty.
  const [query, setQuery] = useState(stop?.address ?? "");
  // A long seeded value otherwise scrolls the input to its end (showing
  // "…ncisco, USA" with the place name cut off). Pin the caret to the start so
  // it reads from the beginning; release it once the user taps in to edit.
  const [searchSelection, setSearchSelection] = useState<
    { start: number; end: number } | undefined
  >(stop?.address ? { start: 0, end: 0 } : undefined);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [emojiModal, setEmojiModal] = useState(false);
  const [timeModal, setTimeModal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    databaseService.getTrip(tripId).then(setTrip).catch(() => {});
  }, [tripId]);

  const days = trip ? enumerateDays(trip.startDate, trip.endDate) : [];

  const handleSearch = (text: string) => {
    setQuery(text);
    if (debounce.current) clearTimeout(debounce.current);
    if (text.length < 3) {
      setPredictions([]);
      return;
    }
    debounce.current = setTimeout(async () => {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          text,
        )}&key=${AppConfig.GOOGLE_PLACES_API_KEY}&language=en`;
        const res = await fetch(url);
        const data = await res.json();
        setPredictions(
          data.status === "OK"
            ? data.predictions.map((p: any) => ({ description: p.description, place_id: p.place_id }))
            : [],
        );
      } catch {
        setPredictions([]);
      }
    }, 500);
  };

  const onPlaceSelected = async (placeId: string, description: string) => {
    haptics.selection();
    setQuery(description);
    setPredictions([]);
    if (!title.trim()) setTitle(description.split(",")[0]);
    setAddress(description);
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address&key=${AppConfig.GOOGLE_PLACES_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === "OK") {
        const { lat, lng } = data.result.geometry.location;
        setCoords({ latitude: lat, longitude: lng });
        if (data.result.formatted_address) setAddress(data.result.formatted_address);
      }
    } catch {
      // keep the description as address; coords just stay unset
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      haptics.warning();
      Alert.alert("Required", "Please give this place a name.", undefined, {
        userInterfaceStyle: colorScheme === "dark" ? "dark" : "light",
      });
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        emoji,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
        address: address.trim() || null,
        timeMinutes,
        note: note.trim() || null,
        dayIndex,
      };
      if (stop) {
        await databaseService.updateTripStop(stop.id, payload);
      } else {
        await databaseService.addTripStop({ tripId, pinId: null, ...payload });
      }
      haptics.success();
      navigation.goBack();
    } catch (error) {
      console.error("Failed to save stop:", error);
      Alert.alert("Error", "Could not save this place.", undefined, {
        userInterfaceStyle: colorScheme === "dark" ? "dark" : "light",
      });
    } finally {
      setSaving(false);
    }
  };

  const dayChip = (label: string, idx: number) => {
    const active = dayIndex === idx;
    return (
      <TouchableOpacity
        key={idx}
        onPress={() => {
          haptics.selection();
          setDayIndex(idx);
        }}
        activeOpacity={0.8}
        style={[
          styles.dayChip,
          {
            backgroundColor: active ? theme.colors.primary : theme.colors.surface[colorScheme],
          },
        ]}
      >
        <Text
          style={[
            styles.dayChipText,
            { color: active ? "#fff" : theme.colors.text.primary[colorScheme] },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
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
            {stop ? "Edit Place" : "Add Place"}
          </Text>
        }
      />

      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Search location */}
          <Text style={[styles.label, { color: theme.colors.text.secondary[colorScheme] }]}>Search location</Text>
          <View style={{ zIndex: 1000 }}>
            <View style={[styles.searchRow, { backgroundColor: theme.colors.surface[colorScheme] }]}>
              <Icon name="magnify" size={20} color={theme.colors.text.tertiary[colorScheme]} />
              <TextInput
                style={[styles.searchInput, { color: theme.colors.text.primary[colorScheme] }]}
                placeholder='Search a place (e.g. "Eiffel Tower")'
                placeholderTextColor={theme.colors.text.tertiary[colorScheme]}
                value={query}
                selection={searchSelection}
                onFocus={() => setSearchSelection(undefined)}
                onChangeText={(t) => {
                  setSearchSelection(undefined);
                  handleSearch(t);
                }}
                autoCorrect={false}
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => { setQuery(""); setPredictions([]); }}>
                  <Icon name="close-circle" size={18} color={theme.colors.text.tertiary[colorScheme]} />
                </TouchableOpacity>
              )}
            </View>
            {predictions.length > 0 && (
              <View style={[styles.predictions, { backgroundColor: theme.colors.card[colorScheme], borderColor: theme.colors.border[colorScheme] }]}>
                <FlatList
                  data={predictions}
                  keyExtractor={(item) => item.place_id}
                  keyboardShouldPersistTaps="always"
                  nestedScrollEnabled
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.predictionRow, { borderBottomColor: theme.colors.border[colorScheme] }]}
                      onPress={() => onPlaceSelected(item.place_id, item.description)}
                    >
                      <Text style={{ color: theme.colors.text.primary[colorScheme], fontSize: moderateScale(13), fontFamily: "poppins_regular" }}>
                        {item.description}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
          </View>

          {/* Name + emoji */}
          <Text style={[styles.label, { color: theme.colors.text.secondary[colorScheme] }]}>Place name</Text>
          <View style={styles.nameRow}>
            <TouchableOpacity
              style={[styles.emojiBtn, { backgroundColor: theme.colors.surface[colorScheme] }]}
              onPress={() => { haptics.selection(); setEmojiModal(true); }}
            >
              <Text style={styles.emojiBtnText}>{emoji}</Text>
            </TouchableOpacity>
            <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface[colorScheme], flex: 1 }]}>
              <TextInput
                style={[styles.input, { color: theme.colors.text.primary[colorScheme] }]}
                placeholder="e.g. Lunch at Ichiran"
                placeholderTextColor={theme.colors.text.tertiary[colorScheme]}
                value={title}
                onChangeText={setTitle}
              />
            </View>
          </View>
          {address.length > 0 && (
            <Text style={[styles.addressHint, { color: theme.colors.text.tertiary[colorScheme] }]} numberOfLines={2}>
              {address}
            </Text>
          )}

          {/* Day */}
          <Text style={[styles.label, { color: theme.colors.text.secondary[colorScheme] }]}>Day</Text>
          <View style={styles.dayWrap}>
            {days.map((d) => dayChip(`${d.label}`, d.index))}
            {dayChip("Ideas", -1)}
          </View>

          {/* Time */}
          <Text style={[styles.label, { color: theme.colors.text.secondary[colorScheme] }]}>Time (optional)</Text>
          <TouchableOpacity
            style={[styles.dateRow, { backgroundColor: theme.colors.surface[colorScheme] }]}
            onPress={() => { haptics.selection(); setTimeModal(true); }}
            activeOpacity={0.8}
          >
            <View style={styles.dateRowLeft}>
              <Icon name="clock-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.dateRowLabel, { color: theme.colors.text.secondary[colorScheme] }]}>Time</Text>
            </View>
            <Text style={[styles.dateRowValue, { color: timeMinutes != null ? theme.colors.text.primary[colorScheme] : theme.colors.text.tertiary[colorScheme] }]}>
              {timeMinutes != null ? formatTime(timeMinutes) : "Any time"}
            </Text>
          </TouchableOpacity>

          {/* Note */}
          <Text style={[styles.label, { color: theme.colors.text.secondary[colorScheme] }]}>Note (optional)</Text>
          <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface[colorScheme] }]}>
            <TextInput
              style={[styles.input, styles.notesInput, { color: theme.colors.text.primary[colorScheme] }]}
              placeholder="Reservation #, reminder, what to order…"
              placeholderTextColor={theme.colors.text.tertiary[colorScheme]}
              value={note}
              onChangeText={setNote}
              multiline
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: theme.colors.primary, opacity: saving ? 0.6 : 1 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>{stop ? "Save Changes" : "Add to Trip"}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <EmojiPickerModal visible={emojiModal} onClose={() => setEmojiModal(false)} onSelectEmoji={setEmoji} />
      <TimePickerModal
        visible={timeModal}
        value={timeMinutes}
        onClose={() => setTimeModal(false)}
        onSelect={(m) => { setTimeMinutes(m); setTimeModal(false); }}
        onClear={() => { setTimeMinutes(null); setTimeModal(false); }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBtn: { padding: 4 },
  headerText: { fontWeight: "600", fontFamily: "poppins_bold", fontSize: moderateScale(18) },
  content: { padding: 20, paddingBottom: 40 },
  label: {
    fontSize: moderateScale(14),
    fontWeight: "500",
    marginBottom: 8,
    marginTop: 16,
    fontFamily: "poppins_medium",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    height: 46,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: moderateScale(13), fontFamily: "poppins_regular", paddingVertical: 0 },
  predictions: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    borderRadius: 12,
    borderWidth: 0.5,
    maxHeight: 220,
    zIndex: 2000,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  predictionRow: { padding: 12, borderBottomWidth: 0.5 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  emojiBtn: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiBtnText: { fontSize: moderateScale(24) },
  inputContainer: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5 },
  input: { fontSize: moderateScale(13), fontFamily: "poppins_regular", paddingVertical: 12 },
  notesInput: { minHeight: 70, textAlignVertical: "top" },
  addressHint: { fontSize: moderateScale(11), fontFamily: "poppins_regular", marginTop: 6 },
  dayWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dayChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  dayChipText: { fontSize: moderateScale(13), fontFamily: "poppins_medium" },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dateRowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  dateRowLabel: { fontSize: moderateScale(14), fontFamily: "poppins_medium" },
  dateRowValue: { fontSize: moderateScale(14), fontFamily: "poppins_semibold" },
  saveButton: { marginTop: 28, paddingVertical: 16, borderRadius: 12, alignItems: "center" },
  saveButtonText: { fontSize: moderateScale(16), fontWeight: "600", fontFamily: "poppins_semibold", color: "#fff" },
});
