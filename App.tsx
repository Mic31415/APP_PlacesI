import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    const init = async () => {
      try {
        await databaseService.initDatabase();
        await PurchaseService.init();
      } catch (e) {
        console.error('❌ [App] Initialization Failed:', e);
      } finally {
        SplashScreen.hide();
        setIsAppReady(true);
      }

      try {
        if (__DEV__) {
          await mobileAds().setRequestConfiguration({
            testDeviceIdentifiers: ['EMULATOR'],
          });
        }

        const { canRequestAds } = await initAdsConsent();

        if (canRequestAds) {
          await mobileAds().initialize();
          console.log('✅ [ADMOB] Google Mobile Ads SDK initialized successfully');
        } else {
          console.log('⚠️ [ADMOB] Consent not obtained — skipping SDK init.');
        }
      } catch (error) {
        console.error('❌ [ADMOB] Error initializing Google Mobile Ads SDK:', error);
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
