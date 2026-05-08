import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Alert,
  Image,
  Platform,
} from "react-native";
import ViewShot, { captureRef } from "react-native-view-shot";
import Share from "react-native-share";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useTheme } from "../../theme/ThemeContext";
import { getResponsiveValue, moderateScale } from "../../utils/responsive";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { haptics } from "../../utils/haptics";

interface PinDetailModalProps {
  visible: boolean;
  pin: any; // Type this properly later
  onClose: () => void;
  onDelete?: (id: string) => void;
  onEdit?: () => void;
  onShare?: () => void;
}

export const PinDetailModal: React.FC<PinDetailModalProps> = ({
  visible,
  pin,
  onClose,
  onDelete,
  onEdit,
  onShare,
}) => {
  const { theme, colorScheme } = useTheme();
  const modalRadius = getResponsiveValue(24, 24, 24, 28);
  const actionIconSize = getResponsiveValue(24, 24, 26, 30);

  // Animation values for soft, smooth animations
  const backdropOpacity = useSharedValue(0);
  const modalTranslateY = useSharedValue(500); // Start from bottom

  const viewShotRef = React.useRef(null);

  // Trigger smooth animations when visible changes
  useEffect(() => {
    if (visible) {
      // Entrance animation - very smooth and soft
      backdropOpacity.value = withTiming(1, {
        duration: 400,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Gentle ease out
      });
      modalTranslateY.value = withSpring(0, {
        damping: 30, // Higher damping for softer spring
        stiffness: 150, // Medium stiffness for smooth motion
        mass: 1,
      });
    } else {
      // Exit animation - smooth fade and slide down
      backdropOpacity.value = withTiming(0, {
        duration: 350,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1), // Gentle ease in
      });
      modalTranslateY.value = withTiming(500, {
        duration: 350,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      });
    }
  }, [visible]);

  // Animated styles
  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: modalTranslateY.value }],
  }));

  // Early return after all hooks
  if (!pin) return null;

  const handleDelete = () => {
    haptics.warning();
    Alert.alert(
      "Delete Pin",
      "Are you sure you want to delete this pin?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            if (onDelete && pin?.id) {
              onDelete(pin.id);
            }
            onClose();
          },
        },
      ],
      { userInterfaceStyle: colorScheme === "dark" ? "dark" : "light" },
    );
  };

  const handleShare = async () => {
    haptics.selection();
    try {
      const uri = await captureRef(viewShotRef, {
        format: "png",
        quality: 0.9,
      });

      const shareOptions = {
        title: `Share ${pin.title}`,
        message: `Check out ${pin.title} from my trip!`,
        url: uri,
        subject: `Check out ${pin.title}`, // for email
      };

      await Share.open(shareOptions);
    } catch (error) {
      console.error("Snapshot failed", error);
      // Fallback to text share if available
      if (onShare) onShare();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={() => {
        haptics.selection();
        onClose();
      }}
    >
      <TouchableWithoutFeedback
        onPress={() => {
          haptics.selection();
          onClose();
        }}
      >
        <Animated.View style={[styles.overlay, backdropAnimatedStyle]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalSheet,
                {
                  borderTopLeftRadius: modalRadius,
                  borderTopRightRadius: modalRadius,
                },
                modalAnimatedStyle,
              ]}
            >
              <ViewShot
                ref={viewShotRef}
                style={{ backgroundColor: theme.colors.card[colorScheme] }}
                options={{ format: "png", quality: 0.9 }}
              >
                <View
                  style={[
                    styles.content,
                    {
                      backgroundColor: theme.colors.card[colorScheme],
                      borderTopLeftRadius: modalRadius,
                      borderTopRightRadius: modalRadius,
                    },
                  ]}
                >
                  {/* Drag Handle (Visual only for Modal) */}
                  <View
                    style={[
                      styles.dragHandle,
                      {
                        backgroundColor:
                          theme.colors.text.tertiary[colorScheme],
                      },
                    ]}
                  />

                  {/* Image Placeholder or Actual Image */}
                  <View
                    style={[
                      styles.imageContainer,
                      { backgroundColor: theme.colors.surface[colorScheme] },
                    ]}
                  >
                    {pin.imageUri ? (
                      <Image
                        source={{ uri: pin.imageUri }}
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: 12,
                        }}
                        resizeMode="cover"
                      />
                    ) : (
                      <>
                        <Icon
                          name="image"
                          size={getResponsiveValue(48, 48, 52, 58)}
                          color={theme.colors.text.tertiary[colorScheme]}
                        />
                        <Text
                          style={[
                            styles.noImageText,
                            { color: theme.colors.text.tertiary[colorScheme] },
                          ]}
                        >
                          No Image
                        </Text>
                      </>
                    )}
                  </View>

                  {/* Title & Rating */}
                  <View style={styles.headerRow}>
                    <Text
                      style={[
                        styles.pinTitle,
                        {
                          flex: 1,
                          color: theme.colors.text.primary[colorScheme],
                        },
                      ]}
                    >
                      {pin.emoji || "📍"} {pin.title}
                    </Text>
                    <View style={styles.ratingContainer}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Icon
                          key={star}
                          name={
                            star <= (pin.rating || 0) ? "star" : "star-outline"
                          }
                          size={getResponsiveValue(18, 18, 20, 24)}
                          color={
                            star <= (pin.rating || 0)
                              ? "#FFD700"
                              : theme.colors.text.tertiary[colorScheme]
                          }
                        />
                      ))}
                    </View>
                  </View>

                  {/* Description */}
                  {pin.description ? (
                    <Text
                      style={[
                        styles.description,
                        { color: theme.colors.text.secondary[colorScheme] },
                      ]}
                    >
                      {pin.description}
                    </Text>
                  ) : null}

                  {/* Info Rows */}
                  <View style={styles.coordinatesContainer}>
                    <Icon
                      name="map-marker"
                      size={getResponsiveValue(16, 16, 18, 26)}
                      color={theme.colors.text.secondary[colorScheme]}
                    />
                    <Text
                      style={[
                        styles.coordinates,
                        { color: theme.colors.text.secondary[colorScheme] },
                      ]}
                    >
                      {pin.address || "No address available"}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Icon
                      name="calendar"
                      size={getResponsiveValue(20, 20, 22, 28)}
                      color={theme.colors.text.tertiary[colorScheme]}
                    />
                    <Text
                      style={[
                        styles.infoText,
                        { color: theme.colors.text.secondary[colorScheme] },
                      ]}
                    >
                      Added: {new Date(pin.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </ViewShot>

              {/* Action Buttons (Outside ViewShot to avoid capturing buttons) */}
              <View
                style={[
                  styles.actions,
                  {
                    borderTopColor: theme.colors.border[colorScheme],
                    backgroundColor: theme.colors.card[colorScheme],
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => {
                    haptics.impactLight();
                    if (onEdit) onEdit();
                  }}
                >
                  <Icon
                    name="pencil"
                    size={actionIconSize}
                    color={theme.colors.primary}
                  />
                  <Text
                    style={[
                      styles.actionLabel,
                      { color: theme.colors.primary },
                    ]}
                  >
                    Edit
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={handleShare}
                >
                  <Icon
                    name="share-variant"
                    size={actionIconSize}
                    color={theme.colors.primary}
                  />
                  <Text
                    style={[
                      styles.actionLabel,
                      { color: theme.colors.primary },
                    ]}
                  >
                    Share Image
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={handleDelete}
                >
                  <Icon
                    name="delete"
                    size={actionIconSize}
                    color={theme.colors.error}
                  />
                  <Text
                    style={[styles.actionLabel, { color: theme.colors.error }]}
                  >
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent backdrop
  },
  modalSheet: {
    width: "100%",
    alignSelf: "center",
    overflow: "hidden",
  },
  content: {
    padding: getResponsiveValue(24, 24, 24, 32),
    paddingTop: getResponsiveValue(12, 12, 12, 16),
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  dragHandle: {
    width: getResponsiveValue(40, 40, 44, 52),
    height: getResponsiveValue(4, 4, 4, 5),
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: getResponsiveValue(20, 20, 20, 24),
  },
  imageContainer: {
    width: "100%",
    height: getResponsiveValue(190, 210, 230, 300),
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: getResponsiveValue(20, 20, 20, 24),
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: "row",
    marginTop: getResponsiveValue(6, 6, 7, 10),
  },
  noImageText: {
    fontSize: getResponsiveValue(
      moderateScale(12),
      moderateScale(12),
      moderateScale(12),
      16,
    ),
    marginTop: 4,
    fontFamily: "poppins_regular",
  },
  description: {
    fontSize: getResponsiveValue(
      moderateScale(16),
      moderateScale(16),
      moderateScale(16),
      20,
    ),
    lineHeight: getResponsiveValue(24, 24, 24, 28),
    marginBottom: getResponsiveValue(24, 24, 24, 28),
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: getResponsiveValue(12, 12, 12, 14),
    gap: getResponsiveValue(12, 12, 12, 14),
  },
  infoText: {
    fontSize: getResponsiveValue(
      moderateScale(15),
      moderateScale(15),
      moderateScale(15),
      20,
    ),
    lineHeight: getResponsiveValue(22, 22, 22, 26),
  },
  coordinatesContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: getResponsiveValue(8, 8, 8, 10),
    gap: getResponsiveValue(8, 8, 8, 10),
  },
  coordinates: {
    flex: 1,
    fontSize: getResponsiveValue(
      moderateScale(14),
      moderateScale(14),
      moderateScale(14),
      20,
    ),
    lineHeight: getResponsiveValue(20, 20, 20, 26),
  },
  actions: {
    flexDirection: "row",
    marginTop: "auto",
    borderTopWidth: 1,
    paddingTop: getResponsiveValue(20, 20, 20, 24),
    paddingBottom: getResponsiveValue(24, 24, 24, 30),
    paddingHorizontal: getResponsiveValue(24, 24, 24, 32),
    justifyContent: "space-around",
  },
  actionBtn: {
    alignItems: "center",
    minWidth: getResponsiveValue(80, 80, 88, 120),
    gap: getResponsiveValue(4, 4, 5, 8),
  },
  actionLabel: {
    fontSize: getResponsiveValue(
      moderateScale(12),
      moderateScale(12),
      moderateScale(12),
      18,
    ),
    lineHeight: getResponsiveValue(16, 16, 17, 22),
    fontWeight: "500",
    fontFamily: "poppins_medium",
  },
  pinTitle: {
    fontSize: getResponsiveValue(
      moderateScale(20),
      moderateScale(20),
      moderateScale(20),
      28,
    ),
    fontWeight: "700",
    lineHeight: getResponsiveValue(
      moderateScale(30),
      moderateScale(30),
      moderateScale(30),
      36,
    ),
    fontFamily: "poppins_bold",
  },
});
