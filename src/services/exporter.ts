import { utils, write } from 'xlsx';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { contactsService, MappedContact } from './contacts';
import { historyService } from './history';

export type ExportFormat = 'xlsx' | 'csv';

export const exporterService = {
  /**
   * Generates a date-stamped filename for contacts.
   */
  generateFilename(format: ExportFormat): string {
    const date = new Date();
    const YYYY = date.getFullYear();
    const MM = String(date.getMonth() + 1).padStart(2, '0');
    const DD = String(date.getDate()).padStart(2, '0');
    return `contacts_${YYYY}-${MM}-${DD}.${format}`;
  },

  /**
   * Main export routine.
   * Fetches contacts, compiles them, saves to temp cache, shares, and wipes cache.
   */
  async exportContacts(format: ExportFormat, customFilename?: string): Promise<{ success: boolean; contactCount: number }> {
    let contacts: MappedContact[] = [];
    try {
      contacts = await contactsService.fetchContacts();
    } catch (err) {
      console.warn('Failed to fetch contacts for export:', err);
      throw new Error('Could not access contacts. Please check permissions.');
    }

    if (contacts.length === 0) {
      throw new Error('No contacts found to export.');
    }

    const filename = customFilename || this.generateFilename(format);
    const filePath = `${RNFS.TemporaryDirectoryPath}/${filename}`;

    try {
      // Compile workbook using SheetJS
      const ws = utils.json_to_sheet(contacts);
      
      if (format === 'xlsx') {
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, 'Contacts');
        const wbout = write(wb, { type: 'base64', bookType: 'xlsx' });
        await RNFS.writeFile(filePath, wbout, 'base64');
      } else {
        const csvContent = utils.sheet_to_csv(ws);
        await RNFS.writeFile(filePath, csvContent, 'utf8');
      }

      // Open Native Share Sheet
      const shareOptions = {
        title: 'Exported Contacts',
        url: `file://${filePath}`,
        type: format === 'xlsx' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
          : 'text/csv',
      };
      
      await Share.open(shareOptions);

      // Log to history after sharing triggers successfully
      await historyService.addLog({
        filename,
        format,
        contactCount: contacts.length,
        timestamp: new Date().getTime(),
      });

      return { success: true, contactCount: contacts.length };
    } catch (shareError) {
      console.log('Share canceled or failed:', shareError);
      return { success: false, contactCount: contacts.length };
    } finally {
      // Zero local data persistence cache-wipe
      try {
        const fileExists = await RNFS.exists(filePath);
        if (fileExists) {
          await RNFS.unlink(filePath);
          console.log(`Cache-wipe success: Temporary file ${filename} deleted.`);
        }
      } catch (cleanError) {
        console.error('Failed to wipe cache file:', cleanError);
      }
    }
  },
};
