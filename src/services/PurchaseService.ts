import { Platform } from 'react-native';
import Purchases, { PurchasesPackage, CustomerInfo, LOG_LEVEL } from 'react-native-purchases';
import { AppConfig } from '../config';

// Entitlement Identifier from RevenueCat Dashboard
const ENTITLEMENT_ID = 'Auto Renewable subscriptions';

export const PurchaseService = {
    init: async () => {
        const apiKey = Platform.select({
            ios: AppConfig.REVENUECAT_API_KEY_IOS,
            android: AppConfig.REVENUECAT_API_KEY_ANDROID,
        });

        if (!apiKey) {
            console.error('RevenueCat API key not found');
            return;
        }

        if (__DEV__) {
            Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        }

        await Purchases.configure({ apiKey });
    },

    getOfferings: async (): Promise<PurchasesPackage[]> => {
        try {
            const offerings = await Purchases.getOfferings();
            if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {
                return offerings.current.availablePackages;
            }
        } catch (e) {
            console.error('Error fetching offerings', e);
        }
        return [];
    },

    purchasePackage: async (pack: PurchasesPackage): Promise<boolean> => {
        try {
            const { customerInfo } = await Purchases.purchasePackage(pack);
            if (typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== "undefined") {
                return true; // Unlock that great premium content!
            }
        } catch (e: any) {
            if (!e.userCancelled) {
                console.error('Error purchasing package', e);
                throw e; // Propagate error for UI handling
            }
        }
        return false;
    },

    restorePurchases: async (): Promise<boolean> => {
        try {
            const customerInfo = await Purchases.restorePurchases();
            if (typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== "undefined") {
                return true;
            }
        } catch (e) {
            console.error('Error restoring purchases', e);
            throw e;
        }
        return false;
    },

    getValidEntitlements: async (): Promise<boolean> => {
        try {
            const customerInfo = await Purchases.getCustomerInfo();
            return typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== "undefined";
        } catch (e) {
            console.error('Error checking entitlements', e);
            return false;
        }
    },

    listenForCustomerInfoUpdates: (callback: (isPremium: boolean) => void) => {
        Purchases.addCustomerInfoUpdateListener((info: CustomerInfo) => {
            const isPremium = typeof info.entitlements.active[ENTITLEMENT_ID] !== "undefined";
            callback(isPremium);
        });
    },

    manageSubscriptions: async () => {
        // This will open the manage subscription page on the specific platform
        // If it fails (e.g. simulator), it's safe to catch
        try {
            // RevenueCat doesn't have a direct 'manage' method exposed in basic SDK, 
            // but we can use Linking or a helper if available. 
            // Ideally, we can just use the OS specific URLs if we wanted to be manual,
            // but `presentCodeRedemptionSheet` is for redemption.
            // Best practice is typically:
            // iOS: https://apps.apple.com/account/subscriptions
            // Android: https://play.google.com/store/account/subscriptions

            // BUT, modern apps often just link to the store.
            // We'll use a simple Linking approach in the UI or check if Purchases has a helper now.
            // Current best practice:
            // Linking.openURL(Platform.OS === 'ios' ? 'https://apps.apple.com/account/subscriptions' : 'https://play.google.com/store/account/subscriptions');
            // We will implement this in the UI/Context layer or helper.
            // EDIT: Let's simpler include it here as a helper.
            const url = Platform.OS === 'ios'
                ? 'https://apps.apple.com/account/subscriptions'
                : 'https://play.google.com/store/account/subscriptions';
            // We need to import Linking. Instead, let's keep Service pure and let UI handle linking for now,
            // OR import Linking here. Let's import Linking.
            const { Linking } = require("react-native");
            await Linking.openURL(url);

        } catch (e) {
            console.warn("Could not open subscription management", e);
        }
    }
};
