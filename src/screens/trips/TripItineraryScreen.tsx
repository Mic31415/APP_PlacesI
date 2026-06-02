import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute, useFocusEffect, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useTheme } from "../../theme/ThemeContext";
import { ScreenHeader } from "../../components/common/ScreenHeader";
import { databaseService, TripData, TripStopData } from "../../services/DatabaseService";
import { HomeStackParamList } from "../../types/navigation";
import { getResponsiveValue, moderateScale } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";
import { BannerAdView } from "../../components/ads/BannerAdView";
import { enumerateDays, formatDateRange, formatTime, dayCount } from "../../utils/tripDates";

type Nav = NativeStackNavigationProp<HomeStackParamList, "TripItinerary">;
type Rt = RouteProp<HomeStackParamList, "TripItinerary">;

export const TripItineraryScreen: React.FC = () => {
  const { theme, colorScheme } = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { tripId } = route.params;

  const [trip, setTrip] = useState<TripData | null>(null);
  const [stops, setStops] = useState<TripStopData[]>([]);
  const [loading, setLoading] = useState(true);
  const [bannerHeight, setBannerHeight] = useState(0);
  const [movingStop, setMovingStop] = useState<TripStopData | null>(null);

  const load = useCallback(async () => {
    try {
      const [t, s] = await Promise.all([
        databaseService.getTrip(tripId),
        databaseService.getTripStops(tripId),
      ]);
      setTrip(t);
      setStops(s);
    } catch (e) {
      console.error("Failed to load trip:", e);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const days = trip ? enumerateDays(trip.startDate, trip.endDate) : [];
  const ideas = stops.filter((s) => s.dayIndex === -1);

  const handleAddToDay = (dayIndex: number) => {
    haptics.selection();
    Alert.alert(
      "Add a place",
      undefined,
      [
        {
          text: "Choose from my places",
          onPress: () => navigation.navigate("AddTripStop", { tripId, dayIndex }),
        },
        {
          text: "Add a new place",
          onPress: () => navigation.navigate("CreateTripStop", { tripId, dayIndex }),
        },
        { text: "Cancel", style: "cancel" },
      ],
      { userInterfaceStyle: colorScheme === "dark" ? "dark" : "light" },
    );
  };

  const handleStopLongPress = (stop: TripStopData) => {
    haptics.impactMedium();
    Alert.alert(
      stop.title,
      undefined,
      [
        { text: "Move to another day", onPress: () => handleMove(stop) },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await databaseService.deleteTripStop(stop.id);
            load();
          },
        },
        { text: "Cancel", style: "cancel" },
      ],
      { userInterfaceStyle: colorScheme === "dark" ? "dark" : "light" },
    );
  };

  // Opens a scrollable picker (a plain Alert would stack one button per day and
  // become unusable on long trips).
  const handleMove = (stop: TripStopData) => setMovingStop(stop);

  const moveTargets = movingStop
    ? [
        ...days.map((d) => ({ text: `${d.label} · ${d.dateLabel}`, idx: d.index })),
        { text: "Unscheduled / Ideas", idx: -1 },
      ].filter((t) => t.idx !== movingStop.dayIndex)
    : [];

  const doMove = async (idx: number) => {
    if (!movingStop) return;
    const stopId = movingStop.id;
    setMovingStop(null);
    haptics.selection();
    await databaseService.moveTripStop(stopId, idx);
    load();
  };

  const handleHeaderMenu = () => {
    if (!trip) return;
    haptics.selection();
    Alert.alert(
      trip.name,
      undefined,
      [
        { text: "Edit trip", onPress: () => navigation.navigate("CreateTrip", { trip }) },
        {
          text: "Delete trip",
          style: "destructive",
          onPress: () =>
            Alert.alert(
              "Delete Trip",
              `Delete "${trip.name}"? This cannot be undone.`,
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: async () => {
                    await databaseService.deleteTrip(trip.id);
                    navigation.goBack();
                  },
                },
              ],
              { userInterfaceStyle: colorScheme === "dark" ? "dark" : "light" },
            ),
        },
        { text: "Cancel", style: "cancel" },
      ],
      { userInterfaceStyle: colorScheme === "dark" ? "dark" : "light" },
    );
  };

  const renderStop = (stop: TripStopData) => (
    <TouchableOpacity
      key={stop.id}
      style={[styles.stopRow, { backgroundColor: theme.colors.surface[colorScheme] }]}
      activeOpacity={0.8}
      onPress={() => navigation.navigate("CreateTripStop", { tripId, dayIndex: stop.dayIndex, stop })}
      onLongPress={() => handleStopLongPress(stop)}
    >
      <Text style={styles.stopEmoji}>{stop.emoji || "📍"}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.stopTitle, { color: theme.colors.text.primary[colorScheme] }]} numberOfLines={1}>
          {stop.title}
        </Text>
        {!!stop.note && (
          <Text style={[styles.stopNote, { color: theme.colors.text.tertiary[colorScheme] }]} numberOfLines={1}>
            {stop.note}
          </Text>
        )}
      </View>
      {stop.timeMinutes != null && (
        <View style={[styles.timeChip, { backgroundColor: theme.colors.primary + "1F" }]}>
          <Text style={[styles.timeChipText, { color: theme.colors.primary }]}>{formatTime(stop.timeMinutes)}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderSection = (label: string, sub: string | null, dayIndex: number, sectionStops: TripStopData[]) => (
    <View key={dayIndex} style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary[colorScheme] }]}>{label}</Text>
          {sub && <Text style={[styles.sectionSub, { color: theme.colors.text.tertiary[colorScheme] }]}>{sub}</Text>}
        </View>
      </View>
      {sectionStops.map(renderStop)}
      <TouchableOpacity style={styles.addRow} onPress={() => handleAddToDay(dayIndex)} activeOpacity={0.7}>
        <Icon name="plus-circle-outline" size={20} color={theme.colors.primary} />
        <Text style={[styles.addRowText, { color: theme.colors.primary }]}>Add place</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background[colorScheme] }]}>
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background[colorScheme] }]}>
        <ScreenHeader
          leftComponent={
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
              <Icon name="chevron-left" size={getResponsiveValue(32, 32, 34, 40)} color={theme.colors.text.primary[colorScheme]} />
            </TouchableOpacity>
          }
        />
        <View style={styles.centerFill}>
          <Text style={{ color: theme.colors.text.tertiary[colorScheme], fontFamily: "poppins_regular" }}>
            This trip is no longer available.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background[colorScheme] }]}>
      <ScreenHeader
        leftComponent={
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Icon name="chevron-left" size={getResponsiveValue(32, 32, 34, 40)} color={theme.colors.text.primary[colorScheme]} />
          </TouchableOpacity>
        }
        centerComponent={
          <Text style={[styles.headerText, { color: theme.colors.text.primary[colorScheme] }]} numberOfLines={1}>
            {trip.emoji} {trip.name}
          </Text>
        }
        rightComponent={
          <TouchableOpacity onPress={handleHeaderMenu} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Icon name="dots-vertical" size={getResponsiveValue(24, 24, 26, 32)} color={theme.colors.text.primary[colorScheme]} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: bannerHeight + 32 }}>
        {/* Trip summary */}
        <View style={[styles.summary, { backgroundColor: theme.colors.card[colorScheme], ...theme.shadows.sm }]}>
          <Text style={[styles.summaryRange, { color: theme.colors.text.primary[colorScheme] }]}>
            {formatDateRange(trip.startDate, trip.endDate)}
          </Text>
          <Text style={[styles.summaryMeta, { color: theme.colors.text.secondary[colorScheme] }]}>
            {dayCount(trip.startDate, trip.endDate)} days · {stops.length} {stops.length === 1 ? "place" : "places"}
          </Text>
          {!!trip.notes && (
            <Text style={[styles.summaryNotes, { color: theme.colors.text.tertiary[colorScheme] }]}>{trip.notes}</Text>
          )}
        </View>

        {/* Days */}
        {days.map((d) =>
          renderSection(d.label, d.dateLabel, d.index, stops.filter((s) => s.dayIndex === d.index)),
        )}

        {/* Unscheduled / Ideas — only when it has stops */}
        {ideas.length > 0 && renderSection("Unscheduled / Ideas", null, -1, ideas)}
      </ScrollView>

      <BannerAdView onHeightChange={setBannerHeight} />

      {/* Move-to-day picker */}
      <Modal
        visible={movingStop !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setMovingStop(null)}
      >
        <TouchableWithoutFeedback onPress={() => setMovingStop(null)}>
          <View style={[styles.modalOverlay, { backgroundColor: theme.colors.backdrop }]}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalSheet, { backgroundColor: theme.colors.card[colorScheme] }]}>
                <Text style={[styles.modalTitle, { color: theme.colors.text.primary[colorScheme] }]}>
                  Move "{movingStop?.title}" to
                </Text>
                <ScrollView style={{ maxHeight: 320 }}>
                  {moveTargets.map((t) => (
                    <TouchableOpacity
                      key={t.idx}
                      style={[styles.modalRow, { borderBottomColor: theme.colors.border[colorScheme] }]}
                      onPress={() => doMove(t.idx)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.modalRowText, { color: theme.colors.text.primary[colorScheme] }]}>
                        {t.text}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity onPress={() => setMovingStop(null)} style={styles.modalCancel}>
                  <Text style={[styles.modalCancelText, { color: theme.colors.text.secondary[colorScheme] }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBtn: { padding: 4 },
  headerText: { fontWeight: "600", fontFamily: "poppins_bold", fontSize: moderateScale(17) },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  summary: { borderRadius: 16, padding: 16, marginBottom: 16 },
  summaryRange: { fontSize: moderateScale(16), fontFamily: "poppins_semibold" },
  summaryMeta: { fontSize: moderateScale(13), fontFamily: "poppins_regular", marginTop: 4 },
  summaryNotes: { fontSize: moderateScale(12), fontFamily: "poppins_regular", marginTop: 8, lineHeight: 18 },
  section: { marginBottom: 18 },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  sectionTitle: { fontSize: moderateScale(15), fontFamily: "poppins_bold" },
  sectionSub: { fontSize: moderateScale(12), fontFamily: "poppins_regular", marginTop: 1 },
  stopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  stopEmoji: { fontSize: moderateScale(22) },
  stopTitle: { fontSize: moderateScale(14), fontFamily: "poppins_semibold" },
  stopNote: { fontSize: moderateScale(11), fontFamily: "poppins_regular", marginTop: 2 },
  timeChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  timeChipText: { fontSize: moderateScale(11), fontFamily: "poppins_semibold" },
  addRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 4 },
  addRowText: { fontSize: moderateScale(13), fontFamily: "poppins_medium" },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  modalSheet: { width: "100%", maxWidth: 360, borderRadius: 20, padding: 16 },
  modalTitle: { fontSize: moderateScale(15), fontFamily: "poppins_bold", marginBottom: 8 },
  modalRow: { paddingVertical: 14, borderBottomWidth: 0.5 },
  modalRowText: { fontSize: moderateScale(14), fontFamily: "poppins_medium" },
  modalCancel: { paddingTop: 14, alignItems: "center" },
  modalCancelText: { fontSize: moderateScale(14), fontFamily: "poppins_medium" },
});
