import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import { AppConfig } from '../config';
import { canShowAds } from '../helpers/adConsent';
import { PurchaseService } from './PurchaseService';

let interstitialAd: InterstitialAd | null = null;
let interstitialAdListeners: (() => void)[] = [];
const INTERSTITIAL_ACTION_COUNT_KEY = '@placesi_interstitial_action_count';

const clearInterstitialListeners = () => {
    interstitialAdListeners.forEach(removeListener => {
        try {
            removeListener?.();
        } catch (error) {
            console.log('⚠️ Error removing interstitial listener:', error);
        }
    });
    interstitialAdListeners = [];
};

const disposeInterstitialAd = () => {
    clearInterstitialListeners();
    interstitialAd = null;
};

const waitForLoad = (ad: InterstitialAd) => new Promise<boolean>((resolve, reject) => {
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

const loadInterstitialAd = async () => {
    if (!canShowAds()) {
        console.log('🚫 Ads not permitted (consent not obtained) — skipping interstitial load.');
        return null;
    }

    if (__DEV__) {
        return null;
    }

    const isPremium = await PurchaseService.getValidEntitlements();
    if (isPremium) {
        console.log('👑 User has active subscription, skipping interstitial ad load.');
        return null;
    }

    try {
        const adUnitId = getAdUnitId();
        console.log('📱 Loading interstitial ad with unit ID:', adUnitId);

        clearInterstitialListeners();
        interstitialAd = InterstitialAd.createForAdRequest(adUnitId);

        interstitialAdListeners = [
            interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
                console.log('✅ Interstitial ad loaded');
            }),
            interstitialAd.addAdEventListener(AdEventType.ERROR, (error) => {
                console.log('❌ Interstitial ad error:', error);
            }),
        ];

        interstitialAd.load();
        return interstitialAd;
    } catch (error) {
        console.error('❌ Error loading interstitial ad:', error);
        disposeInterstitialAd();
        return null;
    }
};

export const showInterstitialAd = async () => {
    if (!canShowAds()) {
        console.log('🚫 Ads not permitted (consent not obtained) — skipping interstitial show.');
        return false;
    }

    if (__DEV__) {
        return true;
    }

    const isPremium = await PurchaseService.getValidEntitlements();
    if (isPremium) {
        console.log('👑 User has active subscription, skipping interstitial ad show.');
        return true;
    }

    try {
        if (!interstitialAd) {
            console.log('⚠️ Interstitial ad not loaded, loading now...');
            await loadInterstitialAd();
        }

        if (!interstitialAd) {
            console.log('❌ Failed to load interstitial ad');
            return false;
        }

        if (!interstitialAd.loaded) {
            console.log('⚠️ Interstitial ad not ready, waiting for load...');
            try {
                await waitForLoad(interstitialAd);
            } catch (e) {
                console.log('❌ Interstitial ad still not ready');
                return false;
            }
        }

        console.log('📺 Showing interstitial ad');

        return new Promise<boolean>((resolve) => {
            const removeErrorListener = interstitialAd!.addAdEventListener(
                AdEventType.ERROR,
                (error) => {
                    console.log('❌ Ad error:', error);
                    removeErrorListener();
                    removeClosedListener();
                    disposeInterstitialAd();
                    resolve(false);
                }
            );

            const removeClosedListener = interstitialAd!.addAdEventListener(
                AdEventType.CLOSED,
                () => {
                    console.log('✅ Interstitial ad closed');
                    removeErrorListener();
                    removeClosedListener();
                    disposeInterstitialAd();
                    resolve(true);
                }
            );

            interstitialAd!.show();
        });
    } catch (error) {
        console.error('❌ Error showing interstitial ad:', error);
        disposeInterstitialAd();
        return false;
    }
};

export const trackInterstitialAction = async () => {
    try {
        const countStr = await AsyncStorage.getItem(INTERSTITIAL_ACTION_COUNT_KEY);
        const count = countStr ? parseInt(countStr, 10) : 0;
        const nextCount = count + 1;

        await AsyncStorage.setItem(INTERSTITIAL_ACTION_COUNT_KEY, nextCount.toString());

        if (nextCount % 3 === 0) {
            void showInterstitialAd();
        }
    } catch (error) {
        console.error('❌ Failed to update interstitial action count:', error);
    }
};
