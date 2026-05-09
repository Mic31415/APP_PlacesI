import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import { AppConfig } from '../config';
import { canShowAds } from '../helpers/adConsent';
import { PurchaseService } from './PurchaseService';

let interstitial: InterstitialAd | null = null;
let interstitialListeners: (() => void)[] = [];
const INTERSTITIAL_ACTION_COUNT_KEY = '@placesi_interstitial_action_count';
const INTERSTITIAL_FREQUENCY = 3;

const clearInterstitialListeners = () => {
    interstitialListeners.forEach(removeListener => {
        try {
            removeListener?.();
        } catch (error) {
            console.log('⚠️ Error removing interstitial listener:', error);
        }
    });
    interstitialListeners = [];
};

const disposeInterstitialAd = () => {
    clearInterstitialListeners();
    interstitial = null;
};

const waitForLoad = (ad: InterstitialAd) => new Promise((resolve, reject) => {
    const offLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
        offLoaded();
        offError();
        resolve(true);
    });
    const offError = ad.addAdEventListener(AdEventType.ERROR, (error) => {
        offLoaded();
        offError();
        reject(error);
    });
});

const getAdUnitId = () => {
    if (__DEV__) {
        return TestIds.INTERSTITIAL;
    }
    return Platform.OS === 'ios' ? AppConfig.admob.interstitialIOS : AppConfig.admob.interstitialAndroid;
};

export const InterstitialAdService = {
    updatePremiumStatus: (status: boolean) => {
        // Kept for compatibility with PremiumContext, but we check live status in load/show
    },

    loadInterstitial: async () => {
        if (!canShowAds()) return null;

        // if (__DEV__) return null;

        // Check for subscription first
        const isPremium = await PurchaseService.getValidEntitlements();
        if (isPremium) return null;

        try {
            const adUnitId = getAdUnitId();
            
            clearInterstitialListeners();
            interstitial = InterstitialAd.createForAdRequest(adUnitId || TestIds.INTERSTITIAL);

            interstitialListeners = [
                interstitial.addAdEventListener(AdEventType.LOADED, () => {
                }),
                interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
                }),
                interstitial.addAdEventListener(AdEventType.PAID, (event) => {
                }),
            ];

            interstitial.load();
            return interstitial;
        } catch (error) {
            console.error('❌ [Interstitial] Error in load process:', error);
            disposeInterstitialAd();
            return null;
        }
    },

    showInterstitial: async () => {
        if (!canShowAds()) return false;

        // if (__DEV__) return true;

        const isPremium = await PurchaseService.getValidEntitlements();
        if (isPremium) return true;

        try {
            if (!interstitial) {
                await InterstitialAdService.loadInterstitial();
            }

            if (!interstitial) {
                return false;
            }

            if (!interstitial.loaded) {
                try {
                    await waitForLoad(interstitial);
                } catch (e) {
                    return false;
                }
            }

            return new Promise((resolve) => {
                const removeErrorListener = interstitial!.addAdEventListener(
                    AdEventType.ERROR,
                    (error) => {
                        removeErrorListener();
                        removeClosedListener();
                        disposeInterstitialAd();
                        resolve(false);
                    }
                );

                const removeClosedListener = interstitial!.addAdEventListener(
                    AdEventType.CLOSED,
                    () => {
                        removeErrorListener();
                        removeClosedListener();
                        disposeInterstitialAd();
                        // Preload removed to match reference app
                        resolve(true);
                    }
                );

                interstitial!.show();
            });
        } catch (error) {
            console.error('❌ [Interstitial] Error in show process:', error);
            disposeInterstitialAd();
            return false;
        }
    },

    showEveryThirdAction: async () => {
        try {
            const storedCount = await AsyncStorage.getItem(INTERSTITIAL_ACTION_COUNT_KEY);
            const nextCount = (Number(storedCount) || 0) + 1;

            if (nextCount < INTERSTITIAL_FREQUENCY) {
                await AsyncStorage.setItem(INTERSTITIAL_ACTION_COUNT_KEY, String(nextCount));
                return false;
            }

            await AsyncStorage.setItem(INTERSTITIAL_ACTION_COUNT_KEY, '0');
            return InterstitialAdService.showInterstitial();
        } catch (error) {
            console.error('❌ [Interstitial] Error updating action count:', error);
            return false;
        }
    },
};
