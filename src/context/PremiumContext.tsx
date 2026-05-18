import React, { createContext, useState, useEffect, useContext } from 'react';
import { PurchaseService } from '../services/PurchaseService';
import { PurchasesPackage } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

interface PremiumContextType {
    isPremium: boolean;
    isLoading: boolean;
    offerings: PurchasesPackage[];
    purchase: (pack: PurchasesPackage) => Promise<boolean>;
    restore: () => Promise<boolean>;
    manage: () => Promise<void>;
    presentPaywall: () => Promise<void>; // New method
    refreshStatus: () => Promise<void>;
}

const PremiumContext = createContext<PremiumContextType>({
    isPremium: false,
    isLoading: true,
    offerings: [],
    purchase: async () => false,
    restore: async () => false,
    manage: async () => { },
    presentPaywall: async () => { },
    refreshStatus: async () => { },
});

export const PremiumProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isPremium, setIsPremium] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [offerings, setOfferings] = useState<PurchasesPackage[]>([]);

    useEffect(() => {
        const init = async () => {
            try {
                // Initial check (Service is already initialized by App.tsx)

                const status = await PurchaseService.getValidEntitlements();
                setIsPremium(status);

                // Load offerings
                const currentOfferings = await PurchaseService.getOfferings();
                setOfferings(currentOfferings);

                // Listen for updates (renewals, cancellations, etc.)
                PurchaseService.listenForCustomerInfoUpdates((status) => {
                    setIsPremium(status);
                });

            } catch (error) {
                console.error("Failed to init premium context", error);
            } finally {
                setIsLoading(false);
            }
        };

        init();
    }, []);
    const purchase = async (pack: PurchasesPackage) => {
        setIsLoading(true);
        try {
            const success = await PurchaseService.purchasePackage(pack);
            if (success) {
                setIsPremium(true);
            }
            return success;
        } catch (error) {
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const restore = async () => {
        setIsLoading(true);
        try {
            const success = await PurchaseService.restorePurchases();
            if (success) {
                setIsPremium(true);
            }
            return success;
        } catch (error) {
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const manage = async () => {
        await PurchaseService.manageSubscriptions();
    };

    const presentPaywall = async () => {
        const result = await RevenueCatUI.presentPaywall({
            displayCloseButton: true,
        });

        // If they purchased or restored, update status
        if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
            refreshStatus();
        }
    };

    const refreshStatus = async () => {
        const status = await PurchaseService.getValidEntitlements();
        setIsPremium(status);
    };

    return (
        <PremiumContext.Provider value={{ isPremium, isLoading, offerings, purchase, restore, manage, presentPaywall, refreshStatus }}>
            {children}
        </PremiumContext.Provider>
    );
};

export const usePremium = () => useContext(PremiumContext);
