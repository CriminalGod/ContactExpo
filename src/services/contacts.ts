import { PermissionsAndroid, Platform } from 'react-native';
import Contacts from 'react-native-contacts';

export interface MappedContact {
  Name: string;
  [key: string]: string;
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
      
      // Determine the maximum number of phone numbers any contact has
      const maxPhones = Math.max(
        1,
        ...contacts.map(c => (c.phoneNumbers ? c.phoneNumbers.map(p => p.number).filter(Boolean).length : 0))
      );

      const mapped = contacts.map(c => {
        const fullName = [c.givenName, c.familyName].filter(Boolean).join(' ').trim();
        const phones = c.phoneNumbers ? c.phoneNumbers.map(p => p.number).filter(Boolean) : [];
        const emails = c.emailAddresses ? c.emailAddresses.map(e => e.email).filter(Boolean).join(', ') : '';

        // Construct object with keys in the exact desired column order
        const orderedObj: any = {
          Name: fullName,
        };
        
        for (let i = 1; i <= maxPhones; i++) {
          orderedObj[`Phone Number ${i}`] = phones[i - 1] || '';
        }
        
        orderedObj.EmailAddresses = emails;
        orderedObj.Company = c.company || '';

        return orderedObj as MappedContact;
      });
      
      return mapped;
    } catch (err) {
      console.warn('Failed to fetch contacts:', err);
      throw err;
    }
  },
};
