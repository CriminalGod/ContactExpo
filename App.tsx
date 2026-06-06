import React, { useState, useEffect } from 'react';
import {
  StatusBar,
  StyleSheet,
  View,
  AppState,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from './src/theme/colors';
import { securityService } from './src/services/security';
import PinScreen from './src/screens/PinScreen';
import HomeScreen from './src/screens/HomeScreen';
import HistoryScreen from './src/screens/HistoryScreen';

function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [isCheckingPin, setIsCheckingPin] = useState(true);
  const [activeScreen, setActiveScreen] = useState<'home' | 'history'>('home');

  // Check if a PIN exists in secure storage on mount
  useEffect(() => {
    checkPinStatus();
  }, []);

  const checkPinStatus = async () => {
    try {
      const pinExists = await securityService.hasPIN();
      setHasPin(pinExists);
      const isEnabled = await securityService.isPINEnabled();
      if (!pinExists || !isEnabled) {
        setIsUnlocked(true);
      } else {
        setIsUnlocked(false);
      }
    } catch (e) {
      console.warn('Failed to verify PIN settings status:', e);
    } finally {
      setIsCheckingPin(false);
    }
  };

  // App Lifecycle Security: Auto-lock on background/inactive state
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async nextAppState => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        const isEnabled = await securityService.isPINEnabled();
        if (isEnabled) {
          // Clear session token/authenticated state immediately
          setIsUnlocked(false);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleUnlock = () => {
    setIsUnlocked(true);
  };

  const handlePinCreated = () => {
    setHasPin(true);
  };

  const handleLockApp = () => {
    setIsUnlocked(false);
    setHasPin(false);
    setActiveScreen('home');
    checkPinStatus();
  };

  if (isCheckingPin) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={styles.container}>
        {!isUnlocked ? (
          <PinScreen
            onUnlock={handleUnlock}
            hasPin={hasPin}
            onPinCreated={handlePinCreated}
          />
        ) : activeScreen === 'home' ? (
          <HomeScreen
            onNavigateToHistory={() => setActiveScreen('history')}
            onLockApp={handleLockApp}
          />
        ) : (
          <HistoryScreen onBack={() => setActiveScreen('home')} />
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;
