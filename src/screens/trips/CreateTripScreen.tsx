import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useTheme } from "../../theme/ThemeContext";
import { ScreenHeader } from "../../components/common/ScreenHeader";
import { EmojiPickerModal } from "../../components/common/EmojiPickerModal";
import { DatePickerModal } from "../../components/common/DatePickerModal";
import { databaseService } from "../../services/DatabaseService";
import { trackInterstitialAction } from "../../services/InterstitialAdService";
import { HomeStackParamList } from "../../types/navigation";
import { getResponsiveValue, moderateScale } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";
import { BannerAdView } from "../../components/ads/BannerAdView";
import { formatShortDate, startOfDay, dayCount } from "../../utils/tripDates";

type Nav = NativeStackNavigationProp<HomeStackParamList, "CreateTrip">;
type Rt = RouteProp<HomeStackParamList, "CreateTrip">;

export const CreateTripScreen: React.FC = () => {
  const { theme, colorScheme } = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const editing = route.params?.trip;

  const [name, setName] = useState(editing?.name ?? "");
  const [emoji, setEmoji] = useState(editing?.emoji ?? "🧳");
  const [startDate, setStartDate] = useState<number | null>(editing?.startDate ?? null);
  const [endDate, setEndDate] = useState<number | null>(editing?.endDate ?? null);
  const [notes, setNotes] = useState(editing?.notes ?? "");

  const [emojiModal, setEmojiModal] = useState(false);
  const [picker, setPicker] = useState<"start" | "end" | null>(null);
  const [bannerHeight, setBannerHeight] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleBack = () => {
    haptics.selection();
    navigation.goBack();
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Required", "Please name your trip.", undefined, {
        userInterfaceStyle: colorScheme === "dark" ? "dark" : "light",
      });
      return;
    }
    if (startDate === null || endDate === null) {
      Alert.alert("Required", "Please pick start and end dates.", undefined, {
        userInterfaceStyle: colorScheme === "dark" ? "dark" : "light",
      });
      return;
    }
    if (endDate < startDate) {
      Alert.alert("Check dates", "The end date can't be before the start date.", undefined, {
        userInterfaceStyle: colorScheme === "dark" ? "dark" : "light",
      });
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      if (editing) {
        await databaseService.updateTrip(editing.id, {
          name: name.trim(),
          emoji,
          startDate,
          endDate,
          notes: notes.trim(),
        });
        // If the range shrank, sweep now-orphaned stops into Unscheduled.
        await databaseService.reflowStopsToValidDays(editing.id, dayCount(startDate, endDate));
        haptics.success();
        navigation.goBack();
      } else {
        const trip = await databaseService.createTrip({
          name: name.trim(),
          emoji,
          startDate,
          endDate,
          notes: notes.trim(),
        });
        void trackInterstitialAction();
        haptics.success();
        navigation.replace("TripItinerary", { tripId: trip.id });
      }
    } catch (error) {
      console.error("Failed to save trip:", error);
      Alert.alert("Error", "Could not save the trip. Please try again.", undefined, {
        userInterfaceStyle: colorScheme === "dark" ? "dark" : "light",
      });
    } finally {
      setSaving(false);
    }
  };

  const dateRow = (label: string, value: number | null, which: "start" | "end") => (
    <TouchableOpacity
      style={[styles.dateRow, { backgroundColor: theme.colors.surface[colorScheme] }]}
      onPress={() => {
        haptics.selection();
        setPicker(which);
      }}
      activeOpacity={0.8}
    >
      <View style={styles.dateRowLeft}>
        <Icon name="calendar" size={20} color={theme.colors.primary} />
        <Text style={[styles.dateRowLabel, { color: theme.colors.text.secondary[colorScheme] }]}>
          {label}
        </Text>
      </View>
      <Text
        style={[
          styles.dateRowValue,
          {
            color: value
              ? theme.colors.text.primary[colorScheme]
              : theme.colors.text.tertiary[colorScheme],
          },
        ]}
      >
        {value ? formatShortDate(value) : "Select"}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background[colorScheme] }]}>
      <ScreenHeader
        leftComponent={
          <TouchableOpacity onPress={handleBack} style={styles.headerBtn}>
            <Icon name="chevron-left" size={getResponsiveValue(32, 32, 34, 40)} color={theme.colors.text.primary[colorScheme]} />
          </TouchableOpacity>
        }
        centerComponent={
          <Text style={[styles.headerText, { color: theme.colors.text.primary[colorScheme] }]}>
            {editing ? "Edit Trip" : "New Trip"}
          </Text>
        }
      />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "padding"} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Name */}
          <Text style={[styles.label, { color: theme.colors.text.secondary[colorScheme] }]}>Trip Name</Text>
          <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface[colorScheme] }]}>
            <TextInput
              style={[styles.input, { color: theme.colors.text.primary[colorScheme] }]}
              placeholder="e.g. Japan, Autumn 2026"
              placeholderTextColor={theme.colors.text.tertiary[colorScheme]}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Emoji */}
          <Text style={[styles.label, { color: theme.colors.text.secondary[colorScheme] }]}>Choose Emoji</Text>
          <TouchableOpacity
            style={[styles.emojiSelector, { backgroundColor: theme.colors.surface[colorScheme] }]}
            onPress={() => {
              haptics.selection();
              setEmojiModal(true);
            }}
          >
            <View style={[styles.emojiInner, { backgroundColor: theme.colors.innerSurface[colorScheme] }]}>
              <Text style={styles.emojiPreview}>{emoji}</Text>
            </View>
            <Text style={[styles.caption, { color: theme.colors.text.tertiary[colorScheme] }]}>Tap to change</Text>
          </TouchableOpacity>

          {/* Dates */}
          <Text style={[styles.label, { color: theme.colors.text.secondary[colorScheme] }]}>Dates</Text>
          {dateRow("Start", startDate, "start")}
          <View style={{ height: 10 }} />
          {dateRow("End", endDate, "end")}

          {/* Notes */}
          <Text style={[styles.label, { color: theme.colors.text.secondary[colorScheme] }]}>Notes (optional)</Text>
          <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface[colorScheme] }]}>
            <TextInput
              style={[styles.input, styles.notesInput, { color: theme.colors.text.primary[colorScheme] }]}
              placeholder="Flights, hotel, anything to remember…"
              placeholderTextColor={theme.colors.text.tertiary[colorScheme]}
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </View>

          {/* Save */}
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: theme.colors.primary, opacity: saving ? 0.6 : 1 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>{editing ? "Save Changes" : "Create Trip"}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <BannerAdView onHeightChange={setBannerHeight} />

      <EmojiPickerModal
        visible={emojiModal}
        onClose={() => setEmojiModal(false)}
        onSelectEmoji={setEmoji}
      />

      <DatePickerModal
        visible={picker === "start"}
        value={startDate}
        onClose={() => setPicker(null)}
        onSelect={(ts) => {
          const day = startOfDay(ts);
          setStartDate(day);
          // Keep end on/after start.
          if (endDate !== null && endDate < day) setEndDate(day);
          setPicker(null);
        }}
      />
      <DatePickerModal
        visible={picker === "end"}
        value={endDate}
        minDate={startDate ?? undefined}
        onClose={() => setPicker(null)}
        onSelect={(ts) => {
          setEndDate(startOfDay(ts));
          setPicker(null);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBtn: { padding: 4 },
  headerText: { fontWeight: "600", fontFamily: "poppins_bold", fontSize: moderateScale(18) },
  content: { padding: 24 },
  label: {
    fontSize: moderateScale(14),
    fontWeight: "500",
    marginBottom: 8,
    marginTop: 16,
    fontFamily: "poppins_medium",
  },
  inputContainer: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5 },
  input: { fontSize: moderateScale(13), fontFamily: "poppins_regular", paddingVertical: 12 },
  notesInput: { minHeight: 80, textAlignVertical: "top" },
  emojiSelector: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  emojiInner: {
    width: "100%",
    height: getResponsiveValue(90, 90, 100, 124),
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emojiPreview: {
    fontSize: getResponsiveValue(moderateScale(54), moderateScale(54), moderateScale(54), 66),
    lineHeight: getResponsiveValue(moderateScale(66), moderateScale(66), moderateScale(66), 84),
    textAlign: "center",
  },
  caption: { fontSize: moderateScale(12), fontFamily: "poppins_regular" },
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
  saveButton: { marginTop: 32, paddingVertical: 16, borderRadius: 12, alignItems: "center" },
  saveButtonText: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    fontFamily: "poppins_semibold",
    color: "#fff",
  },
});
