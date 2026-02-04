
import { Secrets } from './secrets';

export const AppConfig = {
    // AdMob Test IDs
    admob: {
        appIdAndroid: "ca-app-pub-3940256099942544~3347511713",
        appIdIOS: "ca-app-pub-3940256099942544~1458002511",
        bannerAndroid: "ca-app-pub-3940256099942544/6300978111",
        bannerIOS: "ca-app-pub-3940256099942544/2934735716",
        interstitialAndroid: "ca-app-pub-3940256099942544/1033173712",
        interstitialIOS: "ca-app-pub-3940256099942544/4411468910",
        rewardedAndroid: "ca-app-pub-3940256099942544/5224354917",
        rewardedIOS: "ca-app-pub-3940256099942544/1712485313",
        nativeAndroid: "ca-app-pub-3940256099942544/2247696110",
        nativeIOS: "ca-app-pub-3940256099942544/3986624511",
    },
    GOOGLE_MAPS_API_KEY: Secrets.GOOGLE_MAPS_API_KEY,
    REVENUECAT_API_KEY_IOS: Secrets.REVENUECAT_API_KEY_IOS,
    REVENUECAT_API_KEY_ANDROID: Secrets.REVENUECAT_API_KEY_ANDROID,
};


export default AppConfig;
