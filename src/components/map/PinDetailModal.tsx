import React, { useEffect, useState } from "react";
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
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import ViewShot, { captureRef } from "react-native-view-shot";
import Share from "react-native-share";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useTheme } from "../../theme/ThemeContext";
import { getResponsiveValue, moderateScale } from "../../utils/responsive";
import { resolvePinImage } from "../../utils/imageStorage";
import { PinData } from "../../services/DatabaseService";
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
  pin: PinData | null;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onEdit?: () => void;
  onShare?: () => void;
  onToggleStatus?: (id: string, newStatus: "visited" | "wishlist") => void;
}

export const PinDetailModal: React.FC<PinDetailModalProps> = ({
  visible,
  pin,
  onClose,
  onDelete,
  onEdit,
  onShare,
  onToggleStatus,
}) => {
  const { theme, colorScheme } = useTheme();
  const modalRadius = getResponsiveValue(24, 24, 24, 28);
  const actionIconSize = getResponsiveValue(24, 24, 26, 30);

  // Animation values for soft, smooth animations
  const backdropOpacity = useSharedValue(0);
  const modalTranslateY = useSharedValue(500); // Start from bottom

  const viewShotRef = React.useRef(null);

  // Per-photo "broken file" fallback + swipeable gallery state. Reset whenever
  // the pin changes.
  const [failedUris, setFailedUris] = useState<string[]>([]);
  const [galleryWidth, setGalleryWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  useEffect(() => {
    setFailedUris([]);
    setActiveIndex(0);
  }, [pin?.id]);

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

  // Cover-first gallery; fall back to the legacy single cover for safety.
  const galleryImages: string[] =
    pin.images && pin.images.length > 0
      ? pin.images
      : pin.imageUri
        ? [pin.imageUri]
        : [];

  const handleGalleryScroll = (
    e: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    if (galleryWidth <= 0) return;
    const index = Math.round(e.nativeEvent.contentOffset.x / galleryWidth);
    if (index !== activeIndex) setActiveIndex(index);
  };

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
      <Animated.View style={[styles.overlay, { backgroundColor: theme.colors.backdrop }, backdropAnimatedStyle]}>
          {/* Backdrop sits BEHIND the sheet as a sibling (not a parent wrapper)
              so tapping outside closes the modal, while the sheet's own gestures
              — like the photo carousel swipe — are never stolen by a wrapping
              touchable. A wrapping TouchableWithoutFeedback was eating the
              horizontal pan (fully on iOS, intermittently on Android). */}
          <TouchableWithoutFeedback
            onPress={() => {
              haptics.selection();
              onClose();
            }}
          >
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
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

                  {/* Image gallery (swipeable) or placeholder */}
                  <View
                    style={[
                      styles.imageContainer,
                      { backgroundColor: theme.colors.surface[colorScheme] },
                    ]}
                    onLayout={(e) =>
                      setGalleryWidth(e.nativeEvent.layout.width)
                    }
                  >
                    {galleryImages.length > 0 ? (
                      <>
                        {/* Only mount the pager once the width is known so every
                            page has the correct width from the first frame —
                            otherwise paging is unreliable (0-width init). */}
                        {galleryWidth > 0 && (
                          <ScrollView
                            key={pin.id}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            onMomentumScrollEnd={handleGalleryScroll}
                            scrollEnabled={galleryImages.length > 1}
                            decelerationRate="fast"
                            style={StyleSheet.absoluteFill}
                          >
                            {galleryImages.map((uri, i) => {
                              const failed = failedUris.includes(uri);
                              return (
                                <View
                                  key={`${uri}_${i}`}
                                  style={{
                                    width: galleryWidth,
                                    height: "100%",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  {failed ? (
                                    <>
                                      <Icon
                                        name="image-off"
                                        size={getResponsiveValue(48, 48, 52, 58)}
                                        color={
                                          theme.colors.text.tertiary[colorScheme]
                                        }
                                      />
                                      <Text
                                        style={[
                                          styles.noImageText,
                                          {
                                            color:
                                              theme.colors.text.tertiary[
                                                colorScheme
                                              ],
                                          },
                                        ]}
                                      >
                                        Image unavailable
                                      </Text>
                                    </>
                                  ) : (
                                    <Image
                                      source={{ uri: resolvePinImage(uri) }}
                                      style={{
                                        width: "100%",
                                        height: "100%",
                                        borderRadius: 12,
                                      }}
                                      resizeMode="cover"
                                      onError={() =>
                                        setFailedUris((prev) =>
                                          prev.includes(uri)
                                            ? prev
                                            : [...prev, uri],
                                        )
                                      }
                                    />
                                  )}
                                </View>
                              );
                            })}
                          </ScrollView>
                        )}
                        {galleryImages.length > 1 && (
                          <>
                            {/* Page counter */}
                            <View style={styles.galleryCounter}>
                              <Text style={styles.galleryCounterText}>
                                {activeIndex + 1} / {galleryImages.length}
                              </Text>
                            </View>
                            {/* Page dots */}
                            <View style={styles.galleryDots}>
                              {galleryImages.map((_, i) => (
                                <View
                                  key={i}
                                  style={[
                                    styles.galleryDot,
                                    {
                                      backgroundColor:
                                        i === activeIndex
                                          ? "#fff"
                                          : "rgba(255,255,255,0.5)",
                                    },
                                  ]}
                                />
                              ))}
                            </View>
                          </>
                        )}
                      </>
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
                              ? theme.colors.star
                              : theme.colors.text.tertiary[colorScheme]
                          }
                        />
                      ))}
                    </View>
                  </View>

                  {/* Status chip — tap to flip Been here / Want to go */}
                  {(() => {
                    const isWishlist = (pin.status || "visited") === "wishlist";
                    return (
                      <TouchableOpacity
                        activeOpacity={onToggleStatus ? 0.7 : 1}
                        disabled={!onToggleStatus}
                        onPress={() => {
                          if (!onToggleStatus) return;
                          haptics.selection();
                          onToggleStatus(
                            pin.id,
                            isWishlist ? "visited" : "wishlist",
                          );
                        }}
                        style={[
                          styles.statusChip,
                          {
                            backgroundColor: isWishlist
                              ? theme.colors.primary + "20"
                              : theme.colors.success + "20",
                            borderColor: isWishlist
                              ? theme.colors.primary
                              : theme.colors.success,
                          },
                        ]}
                      >
                        <Icon
                          name={isWishlist ? "star-outline" : "check-circle"}
                          size={getResponsiveValue(15, 15, 16, 20)}
                          color={
                            isWishlist
                              ? theme.colors.primary
                              : theme.colors.success
                          }
                        />
                        <Text
                          style={[
                            styles.statusChipText,
                            {
                              color: isWishlist
                                ? theme.colors.primary
                                : theme.colors.success,
                            },
                          ]}
                        >
                          {isWishlist ? "Want to go" : "Been here"}
                        </Text>
                        {onToggleStatus && (
                          <Icon
                            name="swap-horizontal"
                            size={getResponsiveValue(14, 14, 15, 19)}
                            color={
                              isWishlist
                                ? theme.colors.primary
                                : theme.colors.success
                            }
                            style={{ marginLeft: 2, opacity: 0.7 }}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })()}

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

                  {/* Tags */}
                  {pin.tags && pin.tags.length > 0 ? (
                    <View style={styles.tagRow}>
                      {pin.tags.map((t) => (
                        <View
                          key={t}
                          style={[
                            styles.tagChip,
                            { backgroundColor: theme.colors.primary + "20" },
                          ]}
                        >
                          <Text
                            style={[
                              styles.tagChipText,
                              { color: theme.colors.primary },
                            ]}
                          >
                            {t}
                          </Text>
                        </View>
                      ))}
                    </View>
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
                  {pin.visitedAt ? (
                    <View style={styles.infoRow}>
                      <Icon
                        name="calendar-check"
                        size={getResponsiveValue(20, 20, 22, 28)}
                        color={theme.colors.text.tertiary[colorScheme]}
                      />
                      <Text
                        style={[
                          styles.infoText,
                          { color: theme.colors.text.secondary[colorScheme] },
                        ]}
                      >
                        Visited:{" "}
                        {new Date(pin.visitedAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </Text>
                    </View>
                  ) : null}
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
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    // backgroundColor is applied at the use site via theme.colors.backdrop
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
    overflow: "hidden",
  },
  galleryCounter: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  galleryCounterText: {
    color: "#fff",
    fontSize: moderateScale(12),
    fontFamily: "poppins_medium",
  },
  galleryDots: {
    position: "absolute",
    bottom: 8,
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
  },
  galleryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: getResponsiveValue(12, 12, 12, 16),
    marginBottom: getResponsiveValue(20, 20, 20, 24),
  },
  tagChip: {
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  tagChipText: {
    fontSize: moderateScale(12),
    fontFamily: "poppins_medium",
  },
  statusChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 10,
    gap: 5,
  },
  statusChipText: {
    fontSize: getResponsiveValue(
      moderateScale(12),
      moderateScale(12),
      moderateScale(13),
      17,
    ),
    fontFamily: "poppins_medium",
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
    marginTop: getResponsiveValue(12, 12, 12, 16),
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
