import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Modal,
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
  Dimensions,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useTheme } from "../../theme/ThemeContext";
import { getResponsiveValue, moderateScale } from "../../utils/responsive";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";
import { haptics } from "../../utils/haptics";

interface MapHeaderMenuProps {
  onEdit: () => void;
  onShare: () => void;
  onDelete: () => void;
}

export const MapHeaderMenu: React.FC<MapHeaderMenuProps> = ({
  onEdit,
  onShare,
  onDelete,
}) => {
  const { theme, colorScheme } = useTheme();
  const [visible, setVisible] = useState(false);

  // Animation values for smooth menu entrance
  const backdropOpacity = useSharedValue(0);
  const sheetTranslateY = useSharedValue(400);

  // Individual menu item animations for staggered entrance
  const menuItem1Opacity = useSharedValue(0);
  const menuItem1TranslateX = useSharedValue(-20);

  const menuItem2Opacity = useSharedValue(0);
  const menuItem2TranslateX = useSharedValue(-20);

  const menuItem3Opacity = useSharedValue(0);
  const menuItem3TranslateX = useSharedValue(-20);

  // Trigger animations when visible changes
  useEffect(() => {
    if (visible) {
      // Entrance animation - very smooth
      backdropOpacity.value = withTiming(1, {
        duration: 400,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
      sheetTranslateY.value = withSpring(0, {
        damping: 30,
        stiffness: 150,
      });

      // Stagger menu items with gentle timing
      setTimeout(() => {
        menuItem1Opacity.value = withTiming(1, {
          duration: 500,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
        menuItem1TranslateX.value = withTiming(0, {
          duration: 500,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
      }, 150);

      setTimeout(() => {
        menuItem2Opacity.value = withTiming(1, {
          duration: 500,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
        menuItem2TranslateX.value = withTiming(0, {
          duration: 500,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
      }, 250);

      setTimeout(() => {
        menuItem3Opacity.value = withTiming(1, {
          duration: 500,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
        menuItem3TranslateX.value = withTiming(0, {
          duration: 500,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
      }, 350);
    } else {
      // Exit animation - smooth and quick
      backdropOpacity.value = withTiming(0, {
        duration: 300,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      });
      sheetTranslateY.value = withTiming(400, {
        duration: 300,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      });

      // Reset menu items
      menuItem1Opacity.value = 0;
      menuItem1TranslateX.value = -20;
      menuItem2Opacity.value = 0;
      menuItem2TranslateX.value = -20;
      menuItem3Opacity.value = 0;
      menuItem3TranslateX.value = -20;
    }
  }, [visible]);

  // Animated styles
  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  const menuItem1AnimatedStyle = useAnimatedStyle(() => ({
    opacity: menuItem1Opacity.value,
    transform: [{ translateX: menuItem1TranslateX.value }],
  }));

  const menuItem2AnimatedStyle = useAnimatedStyle(() => ({
    opacity: menuItem2Opacity.value,
    transform: [{ translateX: menuItem2TranslateX.value }],
  }));

  const menuItem3AnimatedStyle = useAnimatedStyle(() => ({
    opacity: menuItem3Opacity.value,
    transform: [{ translateX: menuItem3TranslateX.value }],
  }));

  const openMenu = () => {
    haptics.selection();
    setVisible(true);
  };
  const closeMenu = () => setVisible(false);

  const handleOption = (action: () => void) => {
    haptics.impactLight();
    closeMenu();
    // slight delay to allow modal to close smoothly before action
    setTimeout(action, 200);
  };

  return (
    <>
      <TouchableOpacity onPress={openMenu} style={styles.triggerButton}>
        <Icon
          name="dots-vertical"
          size={getResponsiveValue(28, 28, 30, 38)}
          color={theme.colors.text.primary[colorScheme]}
        />
      </TouchableOpacity>

      <Modal
        transparent={true}
        visible={visible}
        animationType="none"
        onRequestClose={closeMenu}
      >
        <TouchableWithoutFeedback onPress={closeMenu}>
          <Animated.View style={[styles.overlay, { backgroundColor: theme.colors.backdrop }, backdropAnimatedStyle]}>
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.sheet,
                  { backgroundColor: theme.colors.card[colorScheme] },
                  sheetAnimatedStyle,
                ]}
              >
                {/* Header Row */}
                <View
                  style={[
                    styles.headerRow,
                    { borderBottomColor: theme.colors.border[colorScheme] },
                  ]}
                >
                  <View style={styles.headerLeft}>
                    <Text
                      style={[
                        styles.headerTitle,
                        { color: theme.colors.text.primary[colorScheme] },
                      ]}
                    >
                      More
                    </Text>
                  </View>
                  <View style={styles.headerCenter}>
                    <View
                      style={[
                        styles.handle,
                        { backgroundColor: theme.colors.border[colorScheme] },
                      ]}
                    />
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      haptics.selection();
                      closeMenu();
                    }}
                    style={styles.closeButton}
                  >
                    <Icon
                      name="close"
                      size={24}
                      color={theme.colors.text.primary[colorScheme]}
                    />
                  </TouchableOpacity>
                </View>

                {/* Options */}
                <Animated.View style={menuItem1AnimatedStyle}>
                  <TouchableOpacity
                    style={[
                      styles.option,
                      { borderBottomColor: theme.colors.border[colorScheme] },
                    ]}
                    onPress={() => handleOption(onEdit)}
                  >
                    <Icon
                      name="pencil"
                      size={24}
                      color={theme.colors.text.primary[colorScheme]}
                      style={styles.icon}
                    />
                    <Text
                      style={[
                        styles.optionText,
                        { color: theme.colors.text.primary[colorScheme] },
                      ]}
                    >
                      Edit Map
                    </Text>
                  </TouchableOpacity>
                </Animated.View>

                <Animated.View style={menuItem2AnimatedStyle}>
                  <TouchableOpacity
                    style={[
                      styles.option,
                      { borderBottomColor: theme.colors.border[colorScheme] },
                    ]}
                    onPress={() => handleOption(onShare)}
                  >
                    <Icon
                      name="share-variant"
                      size={24}
                      color={theme.colors.text.primary[colorScheme]}
                      style={styles.icon}
                    />
                    <Text
                      style={[
                        styles.optionText,
                        { color: theme.colors.text.primary[colorScheme] },
                      ]}
                    >
                      Share
                    </Text>
                  </TouchableOpacity>
                </Animated.View>

                <Animated.View style={menuItem3AnimatedStyle}>
                  <TouchableOpacity
                    style={[styles.option, { borderBottomWidth: 0 }]}
                    onPress={() => handleOption(onDelete)}
                  >
                    <Icon
                      name="trash-can-outline"
                      size={24}
                      color={theme.colors.error}
                      style={styles.icon}
                    />
                    <Text
                      style={[styles.optionText, { color: theme.colors.error }]}
                    >
                      Delete Map
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  triggerButton: {
    width: getResponsiveValue(40, 40, 44, 56),
    height: getResponsiveValue(40, 40, 44, 56),
    justifyContent: "center",
    alignItems: "flex-end",
  },
  overlay: {
    flex: 1,
    // backgroundColor is applied at the use site via theme.colors.backdrop
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 10,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
    borderBottomWidth: 0.5,
  },
  headerLeft: {
    flex: 1,
    alignItems: "flex-start",
  },
  headerCenter: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    pointerEvents: "none",
  },
  headerTitle: {
    fontSize: moderateScale(20),
    fontWeight: "bold",
    marginTop: 10,
    fontFamily: "poppins_bold",
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    marginTop: -30, // Move handle up nicely
  },
  closeButton: {
    paddingVertical: 8,
    marginTop: 10,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  icon: {
    marginRight: 16,
  },
  optionText: {
    fontSize: moderateScale(18),
    fontWeight: "500",
    fontFamily: "poppins_medium",
  },
});
