import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  StyleSheet,
  Platform,
  useWindowDimensions,
  DeviceEventEmitter,
} from "react-native";
import {
  BannerAd,
  BannerAdSize,
  TestIds,
  useForeground,
} from "react-native-google-mobile-ads";
import { AppConfig } from "../../config";
import { canShowAds } from "../../helpers/adConsent";
import { usePremium } from "../../context/PremiumContext";

interface BannerAdProps {
  onAdLoaded?: (loaded: boolean, height: number) => void;
  onHeightChange?: (height: number) => void;
}

export const BannerAdView: React.FC<BannerAdProps> = ({
  onAdLoaded,
  onHeightChange,
}) => {
  const bannerRef = useRef<any>(null);
  const { isPremium, isLoading } = usePremium();
  const { width } = useWindowDimensions();
  const [isAdLoaded, setIsAdLoaded] = useState(false);
  const [adDimensions, setAdDimensions] = useState({ width: 0, height: 0 });
  const [isConsentObtained, setIsConsentObtained] = useState(canShowAds());

  const adaptiveWidth = Math.max(1, Math.round(width));

  const adUnitId = __DEV__
    ? TestIds.ADAPTIVE_BANNER
    : Platform.select({
        ios: AppConfig.admob.bannerIOS,
        android: AppConfig.admob.bannerAndroid,
      }) || TestIds.ADAPTIVE_BANNER;

  const bannerKey = useMemo(
    () => `banner-${Platform.OS}-${adaptiveWidth}`,
    [adaptiveWidth],
  );

  useEffect(() => {
    // Listen for the exact moment App.tsx finishes the UMP consent check
    const listener = DeviceEventEmitter.addListener(
      "adsConsentReady",
      (isAllowed) => {
        setIsConsentObtained(isAllowed);
      },
    );

    // Failsafe: if consent was already obtained before listener attached
    if (canShowAds() && !isConsentObtained) {
      setIsConsentObtained(true);
    }

    return () => {
      listener.remove();
    };
  }, []);

  useEffect(() => {
    setIsAdLoaded(false);
    setAdDimensions({ width: 0, height: 0 });
    if (onHeightChange) onHeightChange(0);
  }, [bannerKey, onAdLoaded, onHeightChange]);

  useForeground(() => {
    if (Platform.OS === "ios" && bannerRef.current?.load) {
      bannerRef.current.load();
    }
  });

  if (__DEV__) {
    return null;
  }

  return (
    <>
      {!isPremium && !isLoading && isConsentObtained && (
        <View
          style={[
            styles.container,
            {
              height: isAdLoaded ? adDimensions.height || undefined : 0,
              overflow: "hidden",
            },
          ]}
        >
          <BannerAd
            key={bannerKey}
            ref={bannerRef}
            unitId={adUnitId}
            size={BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER}
            width={adaptiveWidth}
            onSizeChange={(dimensions) => {
              setAdDimensions(dimensions);
              onHeightChange?.(dimensions.height);
            }}
            onAdLoaded={() => {
              console.log("Banner ad loaded successfully");
              setIsAdLoaded(true);
              const height = adDimensions.height || 60;
               if (onAdLoaded) onAdLoaded(true, height);
               if (onHeightChange) onHeightChange(height);
            }}
            onAdFailedToLoad={(error) => {
              console.error("❌ [BannerAd] Ad failed to load:", error);
              setIsAdLoaded(false);
              if (onAdLoaded) onAdLoaded(false, 0);
              if (onHeightChange) onHeightChange(0);
            }}
          />
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    backgroundColor: "transparent",
  },
});
