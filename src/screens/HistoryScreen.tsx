import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../theme/colors';
import { historyService, HistoryLog } from '../services/history';
import { exporterService } from '../services/exporter';

interface HistoryScreenProps {
  onBack: () => void;
}

export default function HistoryScreen({ onBack }: HistoryScreenProps) {
  const [logs, setLogs] = useState<HistoryLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sharingId, setSharingId] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const list = await historyService.getLogs();
      setLogs(list);
    } catch (err) {
      console.warn('Failed to load logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to clear all history logs? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await historyService.clearLogs();
            setLogs([]);
          },
        },
      ]
    );
  };

  const handleShareLog = async (item: HistoryLog) => {
    setSharingId(item.id);
    try {
      // Re-trigger share sequence dynamically (regenerate contacts file on demand)
      const res = await exporterService.exportContacts(item.format, item.filename);
      if (res.success) {
        // Reload logs to update timestamp
        await loadLogs();
      }
    } catch (error: any) {
      Alert.alert('Share Failed', error.message || 'An error occurred during re-share.');
    } finally {
      setSharingId(null);
    }
  };

  // Convert size dynamically based on contacts count
  const calculateTotalSize = () => {
    const totalCount = logs.reduce((sum, item) => sum + item.contactCount, 0);
    // Rough estimate: 0.15 KB per contact
    const kb = totalCount * 0.15;
    if (kb < 100) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month} ${day}, ${year} • ${hours}:${minutes}`;
  };

  const renderLogItem = ({ item }: { item: HistoryLog }) => {
    const isSharing = sharingId === item.id;
    const isXlsx = item.format === 'xlsx';

    return (
      <View style={styles.logCard}>
        <View style={[styles.logIconContainer, isXlsx ? styles.logIconXlsx : styles.logIconCsv]}>
          <Text style={styles.logIconText}>{isXlsx ? '📊' : '📄'}</Text>
        </View>
        <View style={styles.logDetails}>
          <Text style={styles.logFilename} numberOfLines={1}>
            {item.filename}
          </Text>
          <View style={styles.logMetaRow}>
            <Text style={styles.logDate}>{formatDate(item.timestamp)}</Text>
            <View style={[styles.formatBadge, isXlsx ? styles.badgeXlsx : styles.badgeCsv]}>
              <Text style={[styles.formatBadgeText, isXlsx ? styles.textXlsx : styles.textCsv]}>
                {item.format.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={() => handleShareLog(item)}
          disabled={isSharing}
        >
          {isSharing ? (
            <ActivityIndicator size="small" color={colors.tertiary} />
          ) : (
            <Text style={styles.shareButtonText}>📤</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={onBack}>
          <Text style={styles.headerButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Export History</Text>
        <TouchableOpacity style={styles.clearButton} onPress={handleClearAll} disabled={logs.length === 0}>
          <Text style={[styles.clearButtonText, logs.length === 0 && styles.clearButtonDisabled]}>
            Clear all
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={item => item.id}
          renderItem={renderLogItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            logs.length > 0 ? (
              <View style={styles.statsContainer}>
                {/* Stats Bento Row */}
                <View style={[styles.statBox, styles.statBoxLeft]}>
                  <View style={styles.statInfo}>
                    <Text style={styles.statLabel}>Total Exports</Text>
                    <Text style={[styles.statValue, { color: colors.primary }]}>{logs.length}</Text>
                  </View>
                  <View style={styles.statIconBadge}>
                    <Text style={styles.statIcon}>☁️</Text>
                  </View>
                </View>
                <View style={[styles.statBox, styles.statBoxRight]}>
                  <View style={styles.statInfo}>
                    <Text style={styles.statLabel}>Estimated Size</Text>
                    <Text style={[styles.statValue, { color: colors.secondary }]}>{calculateTotalSize()}</Text>
                  </View>
                  <View style={styles.statIconBadge}>
                    <Text style={styles.statIcon}>💾</Text>
                  </View>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyGraphicContainer}>
                <View style={styles.emptySoftCircle} />
                <Text style={styles.emptyEmoji}>📁</Text>
              </View>
              <Text style={styles.emptyHeading}>No exports yet.</Text>
              <Text style={styles.emptySubheading}>
                Your history is looking a bit light. Start exporting contacts to see them appear here!
              </Text>
              <TouchableOpacity style={styles.emptyStartButton} onPress={onBack}>
                <Text style={styles.emptyStartButtonText}>Start Export</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
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
    fontWeight: 'bold',
    color: colors.primary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'DM Sans',
    color: colors.onBackground,
    letterSpacing: -0.5,
  },
  clearButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'DM Sans',
    color: colors.tertiary,
  },
  clearButtonDisabled: {
    color: colors.outline,
    opacity: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 24,
    flexGrow: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant + '40',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statBoxLeft: {
    marginRight: 8,
  },
  statBoxRight: {
    marginLeft: 8,
  },
  statInfo: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'DM Sans',
    color: colors.onSurfaceVariant,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'DM Sans',
  },
  statIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.grayLow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 18,
  },
  logCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '40',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1.5,
  },
  logIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logIconXlsx: {
    backgroundColor: colors.primaryContainer + '40',
  },
  logIconCsv: {
    backgroundColor: colors.secondaryContainer + '50',
  },
  logIconText: {
    fontSize: 20,
  },
  logDetails: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  logFilename: {
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: 'DM Sans',
    color: colors.onSurface,
    marginBottom: 4,
  },
  logMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logDate: {
    fontSize: 12,
    fontFamily: 'DM Sans',
    color: colors.onSurfaceVariant,
    marginRight: 8,
  },
  formatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeXlsx: {
    backgroundColor: colors.secondaryContainer,
  },
  badgeCsv: {
    backgroundColor: colors.primaryContainer,
  },
  formatBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: 'DM Sans',
  },
  textXlsx: {
    color: colors.secondary,
  },
  textCsv: {
    color: colors.primary,
  },
  shareButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.grayLow,
  },
  shareButtonText: {
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyGraphicContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 20,
  },
  emptySoftCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primaryContainer + '30',
    position: 'absolute',
  },
  emptyEmoji: {
    fontSize: 56,
  },
  emptyHeading: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'DM Sans',
    color: colors.onBackground,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubheading: {
    fontSize: 14,
    fontFamily: 'DM Sans',
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    maxWidth: 260,
  },
  emptyStartButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 999,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyStartButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'DM Sans',
    color: colors.white,
  },
});
