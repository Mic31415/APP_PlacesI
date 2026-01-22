import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ThemeProvider } from './src/theme/ThemeContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { LogBox } from 'react-native';

import { databaseService } from './src/services/DatabaseService';

LogBox.ignoreAllLogs(true); // Ignore all log notifications

function App() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  React.useEffect(() => {
    const init = async () => {
      try {
        await databaseService.initDatabase();
      } catch (e) {
        console.error('Failed to init DB', e);
      }
    };
    init();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
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
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
