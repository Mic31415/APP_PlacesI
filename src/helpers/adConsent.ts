import { AdsConsent, AdsConsentStatus } from "react-native-google-mobile-ads";
import { Platform } from "react-native";
import { check, request, PERMISSIONS, RESULTS } from "react-native-permissions";

let nonPersonalizedAdsOnly = true;

/**
 * Initialize ad consent management (GDPR/CCPA compliance)
 * Uses Google's User Messaging Platform (UMP) SDK which is a certified CMP
 * Call this once at app startup, AFTER MobileAds.initialize()
 */
export const initAdsConsent = async () => {
    try {
        let consentInfo;
        try {
            consentInfo = await AdsConsent.requestInfoUpdate();
        } catch (requestError: any) {
            const errorMessage = requestError?.message || String(requestError);
            console.error("❌ Consent info update error:", errorMessage);

            const isConfigurationError =
                errorMessage.includes("Publisher misconfiguration") ||
                errorMessage.includes("no form(s) configured") ||
                errorMessage.includes(
                    "Failed to read publisher's account configuration"
                ) ||
                errorMessage.includes("UMP SDK") ||
                errorMessage.includes("CMP");

            if (isConfigurationError) {
                console.warn(
                    "⚠️ UMP not configured in AdMob console. Please configure UMP in AdMob Policy center."
                );
                console.warn("⚠️ Using non-personalized ads until UMP is configured.");
                nonPersonalizedAdsOnly = true;
                return; // Exit early - no consent form to show
            }
            throw requestError;
        }

        let status = typeof consentInfo === 'object' ? consentInfo.status : consentInfo;

        // If consent form is required and available, show it
        if (
            status === AdsConsentStatus.REQUIRED &&
            consentInfo?.isConsentFormAvailable
        ) {
            try {
                const updatedConsentInfo =
                    await AdsConsent.loadAndShowConsentFormIfRequired();
                status = typeof updatedConsentInfo === "object" ? updatedConsentInfo.status : updatedConsentInfo;
            } catch (formError) {
                console.error("❌ Error showing consent form:", formError);
                try {
                    const currentConsentInfo = await AdsConsent.getConsentInfo();
                    status = typeof currentConsentInfo === "object" ? currentConsentInfo.status : currentConsentInfo;
                } catch (statusError) {
                    console.error("❌ Error getting consent info:", statusError);
                    status = AdsConsentStatus.UNKNOWN;
                }
            }
        } else if (
            status === AdsConsentStatus.REQUIRED &&
            !consentInfo?.isConsentFormAvailable
        ) {
            console.warn(
                "⚠️ Consent required but form not available. Using non-personalized ads."
            );
            status = AdsConsentStatus.UNKNOWN;
        }

        if (
            status === AdsConsentStatus.OBTAINED ||
            status === AdsConsentStatus.NOT_REQUIRED
        ) {
            nonPersonalizedAdsOnly = false;
        } else {
            nonPersonalizedAdsOnly = true;
        }

        if (Platform.OS === "ios") {
            const attBlocked = await requestATTIfNeeded();
            if (attBlocked) {
                nonPersonalizedAdsOnly = true;
            }
        }
    } catch (e) {
        console.error("❌ Error in consent initialization:", e);
        nonPersonalizedAdsOnly = true;
    }
};

const requestATTIfNeeded = async () => {
    if (Platform.OS !== "ios") {
        return false;
    }

    try {
        const permissionStatus = await check(
            PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY
        );

        if (permissionStatus === RESULTS.BLOCKED) return true;
        if (permissionStatus === RESULTS.GRANTED) return false;

        // NOT_DETERMINED is often mapped to DENIED in react-native-permissions
        if (permissionStatus === RESULTS.DENIED) {
            await request(PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY);
            return false;
        } else {
            // If unavailable, blocked, or limited, assumed blocked/restricted
            return false;
        }
    } catch (error) {
        return false;
    }
};

export const getNonPersonalizedFlag = () => nonPersonalizedAdsOnly;
