import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useTheme } from "../../theme/ThemeContext";
import { getResponsiveValue, moderateScale } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";

// A dependency-free calendar picker (no native module — safe for the current
// build setup). Lets the user pick a visit date by tapping a day on a month
// grid they can page back/forward through.

interface DatePickerModalProps {
  visible: boolean;
  // Currently selected date (timestamp) or null for "no date yet".
  value: number | null;
  onClose: () => void;
  onSelect: (timestamp: number) => void;
  onClear?: () => void;
  // Optional inclusive bounds (timestamps). Days outside [minDate, maxDate] are
  // disabled. Used to keep "Been here" dates in the past and "Want to go" in
  // the future.
  minDate?: number | null;
  maxDate?: number | null;
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  value,
  onClose,
  onSelect,
  onClear,
  minDate,
  maxDate,
}) => {
  const { theme, colorScheme } = useTheme();

  // The month currently being displayed. Seed from the selected value, else now.
  const seed = value ? new Date(value) : new Date();
  const [viewYear, setViewYear] = useState(seed.getFullYear());
  const [viewMonth, setViewMonth] = useState(seed.getMonth());

  // Re-seed the visible month whenever the picker is re-opened.
  React.useEffect(() => {
    if (visible) {
      const s = value ? new Date(value) : new Date();
      setViewYear(s.getFullYear());
      setViewMonth(s.getMonth());
    }
  }, [visible]);

  const todayStart = startOfDay(new Date());
  const selectedStart = value ? startOfDay(new Date(value)) : null;

  // Day-level inclusive bounds (null = unbounded on that side).
  const minDay =
    minDate != null ? startOfDay(new Date(minDate)) : null;
  const maxDay =
    maxDate != null ? startOfDay(new Date(maxDate)) : null;
  const isOutOfRange = (ts: number) =>
    (minDay !== null && ts < minDay) || (maxDay !== null && ts > maxDay);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();

  // Disable a paging arrow when the entire target month is out of range.
  const prevMonthLastDay = new Date(viewYear, viewMonth, 0).getTime();
  const nextMonthFirstDay = new Date(viewYear, viewMonth + 1, 1).getTime();
  const prevDisabled = minDay !== null && prevMonthLastDay < minDay;
  const nextDisabled = maxDay !== null && nextMonthFirstDay > maxDay;

  const goPrevMonth = () => {
    haptics.selection();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    haptics.selection();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handlePickDay = (day: number) => {
    const ts = new Date(viewYear, viewMonth, day).getTime();
    if (isOutOfRange(ts)) return; // defensive; disabled cells already block this
    haptics.selection();
    onSelect(ts);
  };

  // Build the grid cells: leading blanks for the first-week offset, then days.
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.overlay, { backgroundColor: theme.colors.backdrop }]}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.sheet,
                { backgroundColor: theme.colors.card[colorScheme] },
              ]}
            >
              {/* Month header with paging arrows */}
              <View style={styles.header}>
                <TouchableOpacity onPress={goPrevMonth} disabled={prevDisabled} style={styles.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Icon name="chevron-left" size={28} color={prevDisabled ? theme.colors.text.tertiary[colorScheme] : theme.colors.text.primary[colorScheme]} />
                </TouchableOpacity>
                <Text style={[styles.monthLabel, { color: theme.colors.text.primary[colorScheme] }]}>
                  {MONTHS[viewMonth]} {viewYear}
                </Text>
                <TouchableOpacity onPress={goNextMonth} disabled={nextDisabled} style={styles.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Icon name="chevron-right" size={28} color={nextDisabled ? theme.colors.text.tertiary[colorScheme] : theme.colors.text.primary[colorScheme]} />
                </TouchableOpacity>
              </View>

              {/* Weekday labels */}
              <View style={styles.weekRow}>
                {WEEKDAYS.map((w, i) => (
                  <View key={i} style={styles.cell}>
                    <Text style={[styles.weekday, { color: theme.colors.text.tertiary[colorScheme] }]}>
                      {w}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Day grid */}
              <View style={styles.grid}>
                {cells.map((day, i) => {
                  if (day === null) {
                    return <View key={`blank_${i}`} style={styles.cell} />;
                  }
                  const dayStart = new Date(viewYear, viewMonth, day).getTime();
                  const isSelected = selectedStart === dayStart;
                  const isToday = todayStart === dayStart;
                  const disabled = isOutOfRange(dayStart);
                  return (
                    <TouchableOpacity
                      key={`day_${day}`}
                      style={styles.cell}
                      onPress={() => handlePickDay(day)}
                      activeOpacity={0.7}
                      disabled={disabled}
                    >
                      <View
                        style={[
                          styles.dayCircle,
                          isSelected && { backgroundColor: theme.colors.primary },
                          !isSelected && isToday && !disabled && {
                            borderWidth: 1,
                            borderColor: theme.colors.primary,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            {
                              color: disabled
                                ? theme.colors.text.tertiary[colorScheme]
                                : isSelected
                                  ? "#fff"
                                  : theme.colors.text.primary[colorScheme],
                            },
                            disabled && { opacity: 0.4 },
                          ]}
                        >
                          {day}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Footer actions */}
              <View style={styles.footer}>
                {onClear && (
                  <TouchableOpacity
                    onPress={() => {
                      haptics.selection();
                      onClear();
                    }}
                  >
                    <Text style={[styles.footerText, { color: theme.colors.error }]}>
                      Clear
                    </Text>
                  </TouchableOpacity>
                )}
                <View style={{ flex: 1 }} />
                <TouchableOpacity
                  onPress={() => {
                    haptics.selection();
                    onSelect(todayStart);
                  }}
                >
                  <Text style={[styles.footerText, { color: theme.colors.primary }]}>
                    Today
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  sheet: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    padding: getResponsiveValue(16, 16, 18, 24),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  navBtn: {
    padding: 4,
  },
  monthLabel: {
    fontSize: moderateScale(16),
    fontFamily: "poppins_bold",
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  weekday: {
    fontSize: moderateScale(12),
    fontFamily: "poppins_medium",
  },
  dayCircle: {
    width: getResponsiveValue(34, 34, 38, 46),
    height: getResponsiveValue(34, 34, 38, 46),
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: {
    fontSize: moderateScale(14),
    fontFamily: "poppins_regular",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 8,
  },
  footerText: {
    fontSize: moderateScale(14),
    fontFamily: "poppins_medium",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
});
