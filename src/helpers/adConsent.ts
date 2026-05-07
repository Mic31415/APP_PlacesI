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

        // If consent was just granted this session and the SDK was never initialized,
        // initialize it now so ads work without requiring an app restart.
        if (adsAllowed && !previouslyAllowed) {
            await mobileAds().initialize();
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
    try {
        // gatherConsent = requestInfoUpdate + loadAndShowConsentFormIfRequired.
        // Handles both GDPR (opt-in) and US-state CCPA (opt-out) automatically.
        const consentInfo = await AdsConsent.gatherConsent();

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
        return false;
    }

    try {
        const permissionStatus = await check(
            PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY
        );

        if (permissionStatus === RESULTS.BLOCKED) {
            return true;
        }

        if (permissionStatus === RESULTS.GRANTED) {
            return false;
        }

        if (permissionStatus === RESULTS.DENIED) {
            // Small delay to ensure the app is fully active and ready to show a modal
            await new Promise(resolve => setTimeout(resolve, 500));

            // Wrap request in a safety timeout so it can't hang the app forever
            await Promise.race([
                request(PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY),
                new Promise((_, reject) => setTimeout(() => reject(new Error("ATT_TIMEOUT")), 5000))
            ]).catch(err => {
                // Ignore timeout/fail in silent mode
            });

            return false;
        } else {
            return false;
        }

    } catch (error) {
        console.error("❌ [ATT] Error checking/requesting permission:", error);
        return false;
    }
};
