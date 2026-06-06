import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Vibration,
} from 'react-native';
import { colors } from '../theme/colors';
import { securityService } from '../services/security';

interface PinScreenProps {
  onUnlock: () => void;
  hasPin: boolean;
  onPinCreated: () => void;
}

export default function PinScreen({ onUnlock, hasPin, onPinCreated }: PinScreenProps) {
  const [pin, setPin] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [tempPin, setTempPin] = useState('');
  const [errorCount, setErrorCount] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(!hasPin);

  const maxPinLength = 4;

  useEffect(() => {
    // Reset state on load
    setPin('');
    setIsConfirming(false);
    setTempPin('');
    setShowOnboarding(!hasPin);
  }, [hasPin]);

  const handleSkipPin = async () => {
    await securityService.setPINEnabled(false);
    onUnlock();
  };

  const handleKeyPress = (num: string) => {
    if (pin.length < maxPinLength) {
      const newPin = pin + num;
      setPin(newPin);
      Vibration.vibrate(15);

      if (newPin.length === maxPinLength) {
        // Automatically check/confirm when 4 digits are entered
        setTimeout(() => {
          handlePinComplete(newPin);
        }, 150);
      }
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      Vibration.vibrate(10);
    }
  };

  const handleClear = () => {
    setPin('');
    Vibration.vibrate(10);
  };

  const handlePinComplete = async (enteredPin: string) => {
    if (!hasPin) {
      // Setup flow
      if (!isConfirming) {
        setTempPin(enteredPin);
        setIsConfirming(true);
        setPin('');
      } else {
        if (enteredPin === tempPin) {
          const success = await securityService.savePIN(enteredPin);
          if (success) {
            Alert.alert('Success', 'PIN set successfully!');
            onPinCreated();
            onUnlock();
          } else {
            Alert.alert('Error', 'Failed to save PIN.');
            setPin('');
            setIsConfirming(false);
            setTempPin('');
          }
        } else {
          Alert.alert('Error', 'PINs do not match. Please try again.');
          setPin('');
          setIsConfirming(false);
          setTempPin('');
        }
      }
    } else {
      // Validation flow
      const isValid = await securityService.verifyPIN(enteredPin);
      if (isValid) {
        setErrorCount(0);
        onUnlock();
      } else {
        const nextErrors = errorCount + 1;
        setErrorCount(nextErrors);
        Vibration.vibrate([0, 100, 50, 100]);
        
        if (nextErrors >= 5) {
          Alert.alert(
            'Security Lockout',
            'Too many incorrect attempts. Please wait before trying again.'
          );
        } else {
          Alert.alert('Access Denied', `Incorrect PIN. ${5 - nextErrors} attempts remaining.`);
        }
        setPin('');
      }
    }
  };

  const getHeadingText = () => {
    if (!hasPin) {
      return isConfirming ? 'Confirm your secure PIN' : 'Create a 4-Digit PIN';
    }
    return 'Enter PIN to Unlock';
  };

  const getSubheadingText = () => {
    if (!hasPin) {
      return isConfirming ? 'Re-enter your passcode' : 'Choose a PIN to protect your contacts data';
    }
    return 'Verify your identity to access exporter';
  };

  // Render 4 dot indicators
  const renderDots = () => {
    const dots = [];
    for (let i = 0; i < maxPinLength; i++) {
      const isFilled = i < pin.length;
      dots.push(
        <View
          key={i}
          style={[
            styles.dot,
            isFilled
              ? styles.dotFilled
              : styles.dotEmpty,
          ]}
        />
      );
    }
    return <View style={styles.dotsContainer}>{dots}</View>;
  };

  // Render keypad row
  const renderKey = (val: string) => {
    return (
      <TouchableOpacity
        key={val}
        style={styles.key}
        onPress={() => handleKeyPress(val)}
      >
        <Text style={styles.keyText}>{val}</Text>
      </TouchableOpacity>
    );
  };

  if (showOnboarding) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.lockIconContainer}>
            <Text style={styles.lockIcon}>🛡️</Text>
          </View>
          <Text style={styles.heading}>Enable PIN Security?</Text>
          <Text style={styles.subheading}>
            Would you like to protect access to your device contacts with a secure 4-digit PIN lock?
          </Text>
        </View>

        <View style={styles.onboardingFooter}>
          <TouchableOpacity
            style={styles.onboardingButtonPrimary}
            onPress={() => setShowOnboarding(false)}
          >
            <Text style={styles.onboardingButtonPrimaryText}>Yes, Enable PIN Lock</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.onboardingButtonSecondary}
            onPress={handleSkipPin}
          >
            <Text style={styles.onboardingButtonSecondaryText}>No, Skip & Go to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.lockIconContainer}>
          <Text style={styles.lockIcon}>🔒</Text>
        </View>
        <Text style={styles.heading}>{getHeadingText()}</Text>
        <Text style={styles.subheading}>{getSubheadingText()}</Text>
      </View>

      {renderDots()}

      <View style={styles.keypad}>
        <View style={styles.row}>
          {['1', '2', '3'].map(renderKey)}
        </View>
        <View style={styles.row}>
          {['4', '5', '6'].map(renderKey)}
        </View>
        <View style={styles.row}>
          {['7', '8', '9'].map(renderKey)}
        </View>
        <View style={styles.row}>
          <TouchableOpacity style={styles.keyAux} onPress={handleClear}>
            <Text style={styles.keyAuxText}>C</Text>
          </TouchableOpacity>
          {renderKey('0')}
          <TouchableOpacity style={styles.keyAux} onPress={handleDelete}>
            <Text style={styles.keyAuxText}>⌫</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 30,
    paddingHorizontal: 20,
  },
  lockIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  lockIcon: {
    fontSize: 36,
  },
  heading: {
    fontSize: 24,
    fontWeight: '900',
    fontFamily: 'DM Sans',
    color: colors.onBackground,
    marginBottom: 8,
    textAlign: 'center',
  },
  subheading: {
    fontSize: 15,
    fontFamily: 'DM Sans',
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    fontWeight: '500',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 40,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginHorizontal: 12,
  },
  dotEmpty: {
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 3,
  },
  keypad: {
    width: '100%',
    maxWidth: 320,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  key: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  keyText: {
    fontSize: 26,
    fontWeight: 'bold',
    fontFamily: 'DM Sans',
    color: colors.onSurface,
  },
  keyAux: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyAuxText: {
    fontSize: 22,
    fontWeight: '600',
    fontFamily: 'DM Sans',
    color: colors.secondary,
  },
  onboardingFooter: {
    width: '100%',
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  onboardingButtonPrimary: {
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  onboardingButtonPrimaryText: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'DM Sans',
    color: colors.white,
  },
  onboardingButtonSecondary: {
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.secondaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onboardingButtonSecondaryText: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'DM Sans',
    color: colors.secondary,
  },
});
