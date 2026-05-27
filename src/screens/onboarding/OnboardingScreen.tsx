import React, { useRef, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Dimensions,
  Animated,
  Text,
  ImageSourcePropType,
  Pressable,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "../../theme/ThemeContext";
import { RootStackParamList } from "../../types/navigation";
import { Button } from "../../components/common";
import { moderateScale } from "../../utils/responsive";
import { OnboardingSlide } from "./OnboardingSlide";
import ReanimatedAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

// Onboarding Data
const slides: {
  id: string;
  title: string;
  description: string;
  image: ImageSourcePropType;
}[] = [
  {
    id: "1",
    title: "Track your World, One Pin at a Time",
    description:
      "Track your world, one memory at a time. Keep a personal log of all the amazing places you visit.",
    image: require("../../assets/Images/OnBoarding1.png"),
  },
  {
    id: "2",
    title: "Create Custom Maps",
    description:
      'Organize your places into custom maps like "Places I Eat", "Dream Destinations", or "Hiking Trails".',
    image: require("../../assets/Images/OnBoarding2.png"),
  },
  {
    id: "3",
    title: "Pin Your Memories",
    description:
      "Drop pins, add photos, and write notes. Fully offline and private - your data stays with you.",
    image: require("../../assets/Images/OnBoarding3.png"),
  },
];

type OnboardingScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Onboarding"
>;

export const OnboardingScreen: React.FC = () => {
  const { theme, colorScheme } = useTheme();
  const navigation = useNavigation<OnboardingScreenNavigationProp>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesRef = useRef<FlatList>(null);

  // Reanimated values for text animations
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);

  // Reanimated values for button press
  const buttonScale = useSharedValue(1);

  const viewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  // Animate text when currentIndex changes
  useEffect(() => {
    // Reset and animate text
    textOpacity.value = 0;
    textTranslateY.value = 20;

    textOpacity.value = withTiming(1, { duration: 300 });
    textTranslateY.value = withSpring(0, { damping: 15 });
  }, [currentIndex]);

  const textAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: textOpacity.value,
      transform: [{ translateY: textTranslateY.value }],
    };
  });

  const scrollTo = () => {
    // Button press animation
    buttonScale.value = withSpring(0.95, { damping: 10 }, () => {
      buttonScale.value = withSpring(1, { damping: 10 });
    });

    if (currentIndex < slides.length - 1) {
      slidesRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem("@onboarding_completed", "true");
      navigation.replace("Main");
    } catch (err) {
      console.log("Error @setItem: ", err);
    }
  };

  const Paginator = () => {
    return (
      <View style={styles.paginatorContainer}>
        {slides.map((_, i) => {
          const inputRange = [(i - 1) * width, i * width, (i + 1) * width];

          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [10, 39, 10],
            extrapolate: "clamp",
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: "clamp",
          });

          return (
            <Animated.View
              key={i.toString()}
              style={[
                styles.dot,
                {
                  width: dotWidth,
                  opacity,
                  backgroundColor: theme.colors.primary,
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: buttonScale.value }],
    };
  });

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background[colorScheme] },
      ]}
    >
      <View style={{ height: height * 0.6 }}>
        <FlatList
          data={slides}
          renderItem={({ item, index }) => (
            <OnboardingSlide
              item={item}
              index={index}
              currentIndex={currentIndex}
            />
          )}
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          bounces={false}
          keyExtractor={(item) => item.id}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            {
              useNativeDriver: false,
            },
          )}
          scrollEventThrottle={32}
          onViewableItemsChanged={viewableItemsChanged}
          viewabilityConfig={viewConfig}
          ref={slidesRef}
        />
      </View>

      <View style={styles.bottomContainer}>
        <Paginator />

        <ReanimatedAnimated.View
          style={[styles.textContainer, textAnimatedStyle]}
        >
          <Text
            style={[
              styles.slideTitle,
              {
                color: theme.colors.text.primary[colorScheme],
                textAlign: "center",
                marginBottom: 20,
              },
            ]}
          >
            {slides[currentIndex].title}
          </Text>
          <Text
            style={[
              styles.slideDescription,
              {
                color: theme.colors.text.primary[colorScheme],
                textAlign: "center",
              },
            ]}
          >
            {slides[currentIndex].description}
          </Text>
        </ReanimatedAnimated.View>

        <ReanimatedAnimated.View style={[styles.footer, buttonAnimatedStyle]}>
          {currentIndex < slides.length - 1 ? (
            <Button title="Next" onPress={scrollTo} fullWidth />
          ) : (
            <Button
              title="Get Started"
              onPress={completeOnboarding}
              fullWidth
            />
          )}
        </ReanimatedAnimated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  paginatorContainer: {
    flexDirection: "row",
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  bottomContainer: {
    flex: 1,
    justifyContent: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  textContainer: {
    alignItems: "center",
    marginBottom: "auto",
  },
  footer: {
    paddingBottom: 40,
    width: "100%",
  },
  slideTitle: {
    fontSize: moderateScale(20),
    fontWeight: "700",
    lineHeight: moderateScale(30),
    fontFamily: "poppins_bold",
  },
  slideDescription: {
    fontSize: moderateScale(16),
    fontWeight: "300",
    lineHeight: moderateScale(20),
    fontFamily: "poppins_light",
  },
});
