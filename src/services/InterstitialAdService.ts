import { Platform } from 'react-native';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import { AppConfig } from '../config';

const adUnitId = __DEV__
    ? TestIds.INTERSTITIAL
    : Platform.select({
        ios: AppConfig.admob.interstitialIOS,
        android: AppConfig.admob.interstitialAndroid,
    }) || TestIds.INTERSTITIAL;

let interstitial: InterstitialAd | null = null;
let isLoaded = false;
let isPremiumUser = false;

export const InterstitialAdService = {
    setPremiumStatus: (status: boolean) => {
        isPremiumUser = status;
        // If they just bought premium, maybe clear the ad instance?
        // But simpler to just gate the show()
    },

    load: () => {
        if (isPremiumUser) return;

        // Create new instance if null
        if (!interstitial) {
            interstitial = InterstitialAd.createForAdRequest(adUnitId, {
                requestNonPersonalizedAdsOnly: true,
            });

            interstitial.addAdEventListener(AdEventType.LOADED, () => {
                isLoaded = true;
            });

            interstitial.addAdEventListener(AdEventType.CLOSED, () => {
                isLoaded = false;
                interstitial = null;
                // Reload for next time
                InterstitialAdService.load();
            });

            interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
                console.error('Interstitial Ad Failed', error);
                isLoaded = false;
            });
        }

        if (!isLoaded) {
            interstitial.load();
        }
    },

    show: async () => {
        if (isPremiumUser) {
            return;
        }

        if (isLoaded && interstitial) {
            await interstitial.show();
            isLoaded = false; // Reset loaded state immediately after show request
        } else {
            InterstitialAdService.load();
        }
    },

};
