import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { colors } from '../theme/colors';
import { contactsService } from '../services/contacts';
import { exporterService, ExportFormat } from '../services/exporter';
import { securityService } from '../services/security';

interface HomeScreenProps {
  onNavigateToHistory: () => void;
  onLockApp: () => void;
}

export default function HomeScreen({ onNavigateToHistory, onLockApp }: HomeScreenProps) {
  const [contactsCount, setContactsCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [format, setFormat] = useState<ExportFormat>('xlsx');
  const [isExporting, setIsExporting] = useState(false);

  const [pinEnabled, setPinEnabled] = useState(true);

  useEffect(() => {
    loadContactsCount();
    loadPinSettings();
  }, []);

  const loadPinSettings = async () => {
    const enabled = await securityService.isPINEnabled();
    setPinEnabled(enabled);
  };

  const loadContactsCount = async () => {
    setIsLoading(true);
    try {
      const isGranted = await contactsService.requestPermission();
      if (isGranted) {
        const list = await contactsService.fetchContacts();
        setContactsCount(list.length);
      } else {
        setContactsCount(0);
      }
    } catch (err) {
      console.warn('Error loading contacts:', err);
      setContactsCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await exporterService.exportContacts(format);
      if (res.success) {
        Alert.alert('Success', `Successfully shared spreadsheet of ${res.contactCount} contacts.`);
      }
    } catch (error: any) {
      Alert.alert('Export Failed', error.message || 'An error occurred during export.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSettings = () => {
    Alert.alert(
      'Security Settings',
      'Choose an option:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: pinEnabled ? 'Disable PIN Lock' : 'Enable PIN Lock',
          onPress: async () => {
            const nextVal = !pinEnabled;
            await securityService.setPINEnabled(nextVal);
            setPinEnabled(nextVal);
            Alert.alert(
              'PIN Lock',
              nextVal ? 'PIN Lock enabled successfully.' : 'PIN Lock disabled successfully.'
            );
          },
        },
        {
          text: 'Reset PIN Passcode',
          style: 'destructive',
          onPress: async () => {
            await securityService.resetPIN();
            onLockApp();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={handleSettings}>
          <Text style={styles.headerButtonText}>⚙️</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Export</Text>
        <TouchableOpacity style={styles.headerButton} onPress={onNavigateToHistory}>
          <Text style={styles.headerButtonText}>↺</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Contacts Bento Card */}
        <View style={styles.card}>
          <View style={styles.bentoBlob1} />
          <View style={styles.bentoBlob2} />
          
          <View style={styles.contactsCardContent}>
            <View style={styles.iconContainer}>
              <Text style={styles.iconText}>👥</Text>
            </View>

            {isLoading ? (
              <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
            ) : (
              <>
                <Text style={styles.statsNumber}>
                  {contactsCount !== null ? contactsCount.toLocaleString() : '0'}
                </Text>
                <Text style={styles.statsLabel}>Contacts Found on this device.</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>✓ UP TO DATE</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Format Selector Section */}
        <View style={styles.formatSection}>
          <Text style={styles.sectionTitle}>SELECT EXPORT FORMAT</Text>
          <View style={styles.toggleContainer}>
            {/* Sliding background highlight */}
            <View
              style={[
                styles.toggleBackground,
                format === 'csv' ? styles.toggleBgRight : styles.toggleBgLeft,
              ]}
            />
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setFormat('xlsx')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.toggleText,
                  format === 'xlsx' ? styles.toggleTextActive : styles.toggleTextInactive,
                ]}
              >
                XLSX
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setFormat('csv')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.toggleText,
                  format === 'csv' ? styles.toggleTextActive : styles.toggleTextInactive,
                ]}
              >
                CSV
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Informative illustration graphic */}
        <View style={styles.visualContainer}>
          <View style={styles.softCircle} />
          <View style={styles.pillRibbon} />
          <Text style={styles.visualEmoji}>📊</Text>
        </View>

        {/* Export Trigger */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.exportButton, isExporting && styles.exportButtonDisabled]}
            onPress={handleExport}
            disabled={isExporting}
            activeOpacity={0.9}
          >
            {isExporting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Text style={styles.exportButtonIcon}>📤</Text>
                <Text style={styles.exportButtonText}>Export Contacts</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant + '30',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonText: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'DM Sans',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  scrollContainer: {
    padding: 24,
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 30,
    borderWidth: 1.5,
    borderColor: colors.primaryContainer,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    marginBottom: 24,
  },
  bentoBlob1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary + '08',
  },
  bentoBlob2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.tertiary + '08',
  },
  contactsCardContent: {
    alignItems: 'center',
    zIndex: 2,
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.primaryContainer + '40',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 32,
  },
  loader: {
    marginVertical: 20,
  },
  statsNumber: {
    fontSize: 40,
    fontWeight: '900',
    fontFamily: 'DM Sans',
    color: colors.onBackground,
    marginBottom: 4,
    letterSpacing: -1,
  },
  statsLabel: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'DM Sans',
    color: colors.onSurfaceVariant,
    marginBottom: 16,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: colors.secondaryContainer,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'DM Sans',
    color: colors.secondary,
  },
  formatSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'DM Sans',
    color: colors.onSurfaceVariant,
    letterSpacing: 1.5,
    marginBottom: 12,
    marginLeft: 6,
  },
  toggleContainer: {
    height: 52,
    flexDirection: 'row',
    backgroundColor: colors.surfaceVariant,
    borderRadius: 26,
    padding: 4,
    position: 'relative',
  },
  toggleBackground: {
    position: 'absolute',
    top: 4,
    height: 44,
    width: '50%',
    backgroundColor: colors.white,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleBgLeft: {
    left: 4,
  },
  toggleBgRight: {
    left: '50%',
  },
  toggleButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  toggleText: {
    fontSize: 15,
    fontFamily: 'DM Sans',
  },
  toggleTextActive: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  toggleTextInactive: {
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  visualContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginVertical: 10,
  },
  softCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.secondaryContainer + '60',
    position: 'absolute',
  },
  pillRibbon: {
    width: 140,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primaryContainer + '60',
    transform: [{ rotate: '-15deg' }],
    position: 'absolute',
  },
  visualEmoji: {
    fontSize: 48,
    zIndex: 2,
  },
  footer: {
    marginTop: 'auto',
    width: '100%',
  },
  exportButton: {
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.success,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  exportButtonDisabled: {
    backgroundColor: colors.outline,
    shadowOpacity: 0,
    elevation: 0,
  },
  exportButtonIcon: {
    fontSize: 22,
    marginRight: 8,
  },
  exportButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'DM Sans',
    color: colors.white,
  },
});
