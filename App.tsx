import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ThemeProvider } from './src/theme/ThemeContext';
import { PremiumProvider } from './src/context/PremiumContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { LogBox } from 'react-native';
import Toast from 'react-native-toast-message';
import { databaseService } from './src/services/DatabaseService';
import { MobileAds } from 'react-native-google-mobile-ads';
import { initAdsConsent } from './src/helpers/adConsent';
import { InterstitialAdService } from './src/services/InterstitialAdService';
import SplashScreen from 'react-native-splash-screen';

LogBox.ignoreAllLogs(true); // Ignore all log notifications

function App() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  React.useEffect(() => {
    let splashTimeout: ReturnType<typeof setTimeout>;

    const init = async () => {
      try {
        await databaseService.initDatabase();
      } catch (e) {
        console.error('Failed to init DB', e);
      }
      // Hide splash screen after initialization with a delay
      splashTimeout = setTimeout(() => {
        SplashScreen.hide();
      }, 2000); // 2 seconds delay
    };
    init();

    MobileAds()
      .initialize()
      .then(adapterStatuses => {
        initAdsConsent();
        InterstitialAdService.load();
      });

    // Cleanup timeout on unmount
    return () => {
      if (splashTimeout) {
        clearTimeout(splashTimeout);
      }
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PremiumProvider>
          <ThemeProvider>
            <PaperProvider>
              <BottomSheetModalProvider>
                <StatusBar
                  barStyle={isDarkMode ? 'light-content' : 'dark-content'}
                  backgroundColor="transparent"
                  translucent
                />
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
