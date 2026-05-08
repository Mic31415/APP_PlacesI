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
  size?: BannerAdSize;
}

export const BannerAdView: React.FC<BannerAdProps> = ({
  size = BannerAdSize.BANNER,
}) => {
  const bannerRef = useRef<any>(null);
  const { isPremium } = usePremium();
  const { width } = useWindowDimensions();
  const [adLoaded, setAdLoaded] = useState(false);
  const [adDimensions, setAdDimensions] = useState({ width: 0, height: 0 });
  const [isConsentObtained, setIsConsentObtained] = useState(canShowAds());

  const adaptiveWidth = Math.max(1, Math.round(width));

  const adUnitId = __DEV__
    ? TestIds.BANNER
    : Platform.select({
        ios: AppConfig.admob.bannerIOS,
        android: AppConfig.admob.bannerAndroid,
      }) || TestIds.BANNER;

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

  // Reload ad on iOS foreground to maximize revenue
  useForeground(() => {
    if (Platform.OS === "ios" && bannerRef.current?.load) {
      bannerRef.current.load();
    }
  });
  if (__DEV__) {
    return;
  }
  return (
    <>
      {!isPremium && isConsentObtained && (
        <View
          style={[
            styles.container,
            {
              height: adLoaded ? adDimensions.height || undefined : 0,
              overflow: "hidden",
            },
          ]}
        >
          <BannerAd
            key={bannerKey}
            ref={bannerRef}
            unitId={adUnitId}
            size={size}
            onSizeChange={(dimensions) => {
              setAdDimensions(dimensions);
            }}
            onAdLoaded={(dimensions) => {
              setAdLoaded(true);
              setAdDimensions(dimensions);
            }}
            onAdFailedToLoad={(error) => {
              console.error("❌ [BannerAd] Ad failed to load:", error);
              setAdLoaded(false);
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
