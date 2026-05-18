
import { Secrets } from './secrets';

export const AppConfig = {
    // AdMob Test IDs
    admob: {
        appIdAndroid: Secrets.ADMOB.ANDROID_APP_ID,
        appIdIOS: Secrets.ADMOB.IOS_APP_ID,
        bannerAndroid: Secrets.ADMOB.ANDROID_BANNER_ID,
        bannerIOS: Secrets.ADMOB.IOS_BANNER_ID,
        interstitialAndroid: Secrets.ADMOB.ANDROID_INTERSTITIAL_ID,
        interstitialIOS: Secrets.ADMOB.IOS_INTERSTITIAL_ID,
    },

    GOOGLE_PLACES_API_KEY: Secrets.GOOGLE_PLACES_API_KEY,
    REVENUECAT_API_KEY_IOS: Secrets.REVENUECAT_API_KEY_IOS,
    REVENUECAT_API_KEY_ANDROID: Secrets.REVENUECAT_API_KEY_ANDROID,
};


export default AppConfig;
