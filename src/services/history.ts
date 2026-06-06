import EncryptedStorage from 'react-native-encrypted-storage';

const HISTORY_KEY = 'export_history_logs';

export interface HistoryLog {
  id: string;
  filename: string;
  format: 'xlsx' | 'csv';
  contactCount: number;
  timestamp: number;
}

export const historyService = {
  /**
   * Fetch all export history logs.
   */
  async getLogs(): Promise<HistoryLog[]> {
    try {
      const logsStr = await EncryptedStorage.getItem(HISTORY_KEY);
      if (!logsStr) return [];
      const logs: HistoryLog[] = JSON.parse(logsStr);
      // Sort by latest timestamp descending
      return logs.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Failed to get history logs:', error);
      return [];
    }
  },

  /**
   * Add a new log to history.
   */
  async addLog(log: Omit<HistoryLog, 'id'>): Promise<void> {
    try {
      const logs = await this.getLogs();
      const newLog: HistoryLog = {
        ...log,
        id: Math.random().toString(36).substring(2, 9),
      };
      logs.push(newLog);
      await EncryptedStorage.setItem(HISTORY_KEY, JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to add log:', error);
    }
  },

  /**
   * Clear all export history logs.
   */
  async clearLogs(): Promise<void> {
    try {
      await EncryptedStorage.removeItem(HISTORY_KEY);
    } catch (error) {
      console.error('Failed to clear history logs:', error);
    }
  },
};
