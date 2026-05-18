import mobileAds, { AdsConsent } from "react-native-google-mobile-ads";
import { Platform, DeviceEventEmitter } from "react-native";
import { check, request, PERMISSIONS, RESULTS } from "react-native-permissions";

// Single source of truth for whether ad requests are permitted this session.
// Set by initAdsConsent() at startup; read by every ad entry point.
let adsAllowed = false;

/** Returns true only after consent has been obtained and MobileAds is initialized. */
export const canShowAds = () => adsAllowed;

/**
 * Re-syncs adsAllowed from the current UMP consent state.
 * Call this after AdsConsent.showPrivacyOptionsForm() so that consent
 * changes made in Settings take effect in the same session.
 */
export const refreshAdsConsent = async () => {
    try {
        const consentInfo = await AdsConsent.getConsentInfo();
        const previouslyAllowed = adsAllowed;
        adsAllowed = consentInfo.canRequestAds;
        DeviceEventEmitter.emit('adsConsentReady', adsAllowed);
        console.log('🔄 Consent refreshed. canShowAds:', adsAllowed);

        // If consent was just granted this session and the SDK was never initialized,
        // initialize it now so ads work without requiring an app restart.
        if (adsAllowed && !previouslyAllowed) {
            await mobileAds().initialize();
            console.log('✅ Mobile Ads SDK initialized after consent granted in Settings.');
        }
    } catch (e) {
        console.error('❌ Failed to refresh consent state:', e);
    }
};

/**
 * Runs the UMP consent flow (GDPR + US-state CCPA) and iOS ATT.
 * Returns { canRequestAds } so the caller can gate MobileAds.initialize(),
 * and sets the module-level adsAllowed flag consumed by all ad helpers.
 * Must be called BEFORE MobileAds.initialize() per library docs.
 */
export const initAdsConsent = async () => {
    if (__DEV__) {
        console.log("🛠️ Dev mode: skipping UMP consent.");
        adsAllowed = true;
        DeviceEventEmitter.emit('adsConsentReady', true);
        return { canRequestAds: true };
    }
    try {
        console.log("🔐 Starting UMP consent...");

        // gatherConsent = requestInfoUpdate + loadAndShowConsentFormIfRequired.
        // Handles both GDPR (opt-in) and US-state CCPA (opt-out) automatically.
        const consentInfo = await AdsConsent.gatherConsent();
        console.log(
            "✅ Consent complete. canRequestAds:", consentInfo.canRequestAds,
            "| status:", consentInfo.status,
            "| privacyOptionsRequired:", consentInfo.privacyOptionsRequirementStatus,
        );

        // Request iOS ATT after UMP (Google's recommended order)
        if (Platform.OS === "ios") {
            await requestATTIfNeeded();
        }

        adsAllowed = consentInfo.canRequestAds;
        DeviceEventEmitter.emit('adsConsentReady', adsAllowed);
        return {
            canRequestAds: consentInfo.canRequestAds,
            // REQUIRED when user is in a covered US state — caller must show a
            // "Do Not Sell or Share My Data" button that calls AdsConsent.showPrivacyOptionsForm()
            privacyOptionsRequirementStatus: consentInfo.privacyOptionsRequirementStatus,
        };
    } catch (e) {
        console.error("❌ Consent initialization error:", e);
        // Block ads on consent failure
        adsAllowed = false;
        DeviceEventEmitter.emit('adsConsentReady', false);
        return { canRequestAds: false, privacyOptionsRequirementStatus: 'UNKNOWN' };
    }
};

/**
 * Request iOS App Tracking Transparency (ATT) permission if needed
 */
const requestATTIfNeeded = async () => {
    if (Platform.OS !== "ios") {
        return false; // Only for iOS, return false (not blocked)
    }

    try {
        const permissionStatus = await check(
            PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY
        );

        if (permissionStatus === RESULTS.BLOCKED) {
            return true; // Return true to indicate blocked
        }

        if (permissionStatus === RESULTS.GRANTED) {
            return false;
        }

        if (permissionStatus === RESULTS.DENIED) {
            await request(PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY);
            return false;
        }
    } catch (error) {
        return false;
    }
};
