import { PermissionsAndroid, Platform } from 'react-native';
import Contacts from 'react-native-contacts';

export interface MappedContact {
  GivenName: string;
  FamilyName: string;
  PhoneNumbers: string;
  EmailAddresses: string;
  Company: string;
}

export const contactsService = {
  /**
   * Request native permission to read contacts on Android.
   */
  async requestPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
        {
          title: 'Contacts Permission',
          message: 'This app requires access to your contacts to export them.',
          buttonPositive: 'OK',
          buttonNegative: 'Cancel',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('Permission request error:', err);
      return false;
    }
  },

  /**
   * Check if contact permission is already granted.
   */
  async checkPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }
    return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_CONTACTS);
  },

  /**
   * Fetch device contacts and map them to the required fields.
   */
  async fetchContacts(): Promise<MappedContact[]> {
    const hasPermission = await this.checkPermission();
    if (!hasPermission) {
      const requestResult = await this.requestPermission();
      if (!requestResult) {
        throw new Error('READ_CONTACTS permission denied');
      }
    }

    try {
      const contacts = await Contacts.getAll();
      const mapped = contacts.map(c => {
        const phones = c.phoneNumbers ? c.phoneNumbers.map(p => p.number).filter(Boolean).join(', ') : '';
        const emails = c.emailAddresses ? c.emailAddresses.map(e => e.email).filter(Boolean).join(', ') : '';

        return {
          GivenName: c.givenName || '',
          FamilyName: c.familyName || '',
          PhoneNumbers: phones,
          EmailAddresses: emails,
          Company: c.company || '',
        };
      });
      return mapped;
    } catch (err) {
      console.warn('Failed to fetch contacts:', err);
      throw err;
    }
  },
};
