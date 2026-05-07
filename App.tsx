import React, { useState } from 'react';
import { LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { PaperProvider } from 'react-native-paper';
import mobileAds from 'react-native-google-mobile-ads';
import Toast from 'react-native-toast-message';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/theme/ThemeContext';
import { PremiumProvider } from './src/context/PremiumContext';
import { databaseService } from './src/services/DatabaseService';
import { initAdsConsent } from './src/helpers/adConsent';
import { PurchaseService } from './src/services/PurchaseService';
import SplashScreen from 'react-native-splash-screen';

LogBox.ignoreAllLogs(true); // Ignore all log notifications

function App() {
  const [isAppReady, setIsAppReady] = useState(false);

  React.useEffect(() => {
    const init = async () => {
      try {
        // 1. Initialize Database
        await databaseService.initDatabase();

        // 2. Initialize RevenueCat (MUST be before Ads to check premium status)
        await PurchaseService.init();

        // 3. Run UMP Consent flow BEFORE MobileAds.initialize()
        const { canRequestAds } = await initAdsConsent();

        // 4. Initialize Google Mobile Ads SDK if allowed
        if (canRequestAds) {
          await mobileAds().initialize();
        }
      } catch (e) {
        console.error('❌ [App] Initialization Failed:', e);
      } finally {
        setIsAppReady(true);
        SplashScreen.hide();
      }
    };

    init();
  }, []);

  if (!isAppReady) {
    return null; // Keep Splash Screen visible via native layer
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PremiumProvider>
          <ThemeProvider>
            <PaperProvider>
              <BottomSheetModalProvider>
                <AppNavigator />
              </BottomSheetModalProvider>
            </PaperProvider>
          </ThemeProvider>
        </PremiumProvider>
      </SafeAreaProvider>
      <Toast />
    </GestureHandlerRootView>
  );
}

export default App;

