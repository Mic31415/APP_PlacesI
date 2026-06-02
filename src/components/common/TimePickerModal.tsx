import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { getResponsiveValue, moderateScale } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";

// A dependency-free time picker (no native module — safe for the current build
// setup). Picks an hour + minute (5-min steps) + AM/PM and returns the time as
// minutes-from-midnight. Mirrors DatePickerModal's modal shell.

interface TimePickerModalProps {
  visible: boolean;
  value: number | null; // minutes from midnight, or null for "no time"
  onClose: () => void;
  onSelect: (minutes: number) => void;
  onClear?: () => void;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5,..55

export const TimePickerModal: React.FC<TimePickerModalProps> = ({
  visible,
  value,
  onClose,
  onSelect,
  onClear,
}) => {
  const { theme, colorScheme } = useTheme();

  // Seed from value (default 9:00 AM) whenever the picker opens.
  const seed = value ?? 9 * 60;
  const seedH24 = Math.floor(seed / 60) % 24;
  const [hour12, setHour12] = useState(seedH24 % 12 === 0 ? 12 : seedH24 % 12);
  const [minute, setMinute] = useState(seed % 60);
  const [isPM, setIsPM] = useState(seedH24 >= 12);

  useEffect(() => {
    if (visible) {
      const s = value ?? 9 * 60;
      const h = Math.floor(s / 60) % 24;
      setHour12(h % 12 === 0 ? 12 : h % 12);
      setMinute(s % 60);
      setIsPM(h >= 12);
    }
  }, [visible]);

  const confirm = () => {
    haptics.selection();
    let h24 = hour12 % 12; // 12 -> 0
    if (isPM) h24 += 12;
    onSelect(h24 * 60 + minute);
  };

  const renderChip = (
    label: string,
    selected: boolean,
    onPress: () => void,
  ) => (
    <TouchableOpacity
      key={label}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      activeOpacity={0.7}
      style={[
        styles.chip,
        {
          backgroundColor: selected
            ? theme.colors.primary
            : theme.colors.surface[colorScheme],
        },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          {
            color: selected ? "#fff" : theme.colors.text.primary[colorScheme],
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.overlay, { backgroundColor: theme.colors.backdrop }]}>
          <TouchableWithoutFeedback>
            <View style={[styles.sheet, { backgroundColor: theme.colors.card[colorScheme] }]}>
              <Text style={[styles.title, { color: theme.colors.text.primary[colorScheme] }]}>
                Set time
              </Text>

              {/* Hour */}
              <Text style={[styles.sectionLabel, { color: theme.colors.text.tertiary[colorScheme] }]}>
                Hour
              </Text>
              <View style={styles.chipWrap}>
                {HOURS.map((h) => renderChip(String(h), hour12 === h, () => setHour12(h)))}
              </View>

              {/* Minute */}
              <Text style={[styles.sectionLabel, { color: theme.colors.text.tertiary[colorScheme] }]}>
                Minute
              </Text>
              <View style={styles.chipWrap}>
                {MINUTES.map((m) =>
                  renderChip(m.toString().padStart(2, "0"), minute === m, () => setMinute(m)),
                )}
              </View>

              {/* AM / PM */}
              <View style={styles.ampmRow}>
                {renderChip("AM", !isPM, () => setIsPM(false))}
                {renderChip("PM", isPM, () => setIsPM(true))}
              </View>

              {/* Footer */}
              <View style={styles.footer}>
                {onClear && (
                  <TouchableOpacity
                    onPress={() => {
                      haptics.selection();
                      onClear();
                    }}
                  >
                    <Text style={[styles.footerText, { color: theme.colors.error }]}>Clear</Text>
                  </TouchableOpacity>
                )}
                <View style={{ flex: 1 }} />
                <TouchableOpacity onPress={onClose}>
                  <Text style={[styles.footerText, { color: theme.colors.text.secondary[colorScheme] }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={confirm}>
                  <Text style={[styles.footerText, { color: theme.colors.primary }]}>Done</Text>
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
  title: {
    fontSize: moderateScale(16),
    fontFamily: "poppins_bold",
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: moderateScale(12),
    fontFamily: "poppins_medium",
    marginTop: 12,
    marginBottom: 6,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    minWidth: 44,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    fontSize: moderateScale(14),
    fontFamily: "poppins_medium",
  },
  ampmRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 8,
    gap: 8,
  },
  footerText: {
    fontSize: moderateScale(14),
    fontFamily: "poppins_medium",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
});
