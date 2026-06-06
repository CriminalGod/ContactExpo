/* eslint-disable no-bitwise */
import EncryptedStorage from 'react-native-encrypted-storage';

const PIN_KEY = 'user_pin_hash';

// Pure JavaScript SHA-256 Implementation
export function sha256(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i, j;
  let result = '';

  const words: number[] = [];
  const asciiLength = ascii[lengthProperty] * 8;

  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isPrime = function (n: number) {
    for (let factor = 2; factor * factor <= n; factor++) {
      if (n % factor === 0) return false;
    }
    return true;
  };

  const getFractionalPart = function (n: number) {
    return ((n - Math.floor(n)) * maxWord) | 0;
  };

  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (isPrime(candidate)) {
      if (primeCounter < 8) {
        hash[primeCounter] = getFractionalPart(mathPow(candidate, 1 / 2));
      }
      k[primeCounter] = getFractionalPart(mathPow(candidate, 1 / 3));
      primeCounter++;
    }
  }

  ascii += '\x80';
  while ((ascii[lengthProperty] % 64) - 56) {
    ascii += '\x00';
  }
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return ''; // ASCII check
    words[i >> 2] |= j << (24 - (i % 4) * 8);
  }
  words[words[lengthProperty]] = (asciiLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiLength | 0;

  for (j = 0; j < words[lengthProperty]; j += 16) {
    const w = words.slice(j, j + 16);
    const oldHash = hash.slice(0);
    for (i = w[lengthProperty]; i < 64; i++) {
      const s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }

    for (i = 0; i < 64; i++) {
      const S1 = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const temp1 = (hash[7] + S1 + ch + k[i] + w[i]) | 0;
      const S0 = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 = (S0 + maj) | 0;

      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    let val = hash[i];
    if (val < 0) val += maxWord;
    let str = val.toString(16);
    while (str[lengthProperty] < 8) {
      str = '0' + str;
    }
    result += str;
  }

  return result;
}

export const securityService = {
  /**
   * Check if a PIN has already been set up in EncryptedStorage.
   */
  async hasPIN(): Promise<boolean> {
    try {
      const hash = await EncryptedStorage.getItem(PIN_KEY);
      return hash !== null;
    } catch (error) {
      console.error('Failed to check PIN existence:', error);
      return false;
    }
  },

  /**
   * Hash and save a new PIN passcode.
   */
  async savePIN(pin: string): Promise<boolean> {
    try {
      if (pin.length < 4 || pin.length > 6) {
        throw new Error('PIN must be 4 or 6 digits');
      }
      const hash = sha256(pin);
      await EncryptedStorage.setItem(PIN_KEY, hash);
      return true;
    } catch (error) {
      console.error('Failed to save PIN:', error);
      return false;
    }
  },

  /**
   * Verify an input PIN code against the stored hash.
   */
  async verifyPIN(pin: string): Promise<boolean> {
    try {
      const storedHash = await EncryptedStorage.getItem(PIN_KEY);
      if (!storedHash) return false;
      const inputHash = sha256(pin);
      return storedHash === inputHash;
    } catch (error) {
      console.error('Failed to verify PIN:', error);
      return false;
    }
  },

  /**
   * Reset the PIN code (mainly for debug / first setup bypass).
   */
  async resetPIN(): Promise<boolean> {
    try {
      await EncryptedStorage.removeItem(PIN_KEY);
      await EncryptedStorage.removeItem('pin_enabled_status');
      return true;
    } catch (error) {
      console.error('Failed to reset PIN:', error);
      return false;
    }
  },

  /**
   * Check if the PIN lock is currently enabled.
   */
  async isPINEnabled(): Promise<boolean> {
    try {
      const status = await EncryptedStorage.getItem('pin_enabled_status');
      return status !== 'disabled';
    } catch (error) {
      console.error('Failed to check PIN enabled status:', error);
      return true; // Default to true
    }
  },

  /**
   * Enable or disable the PIN lock.
   */
  async setPINEnabled(enabled: boolean): Promise<boolean> {
    try {
      const value = enabled ? 'enabled' : 'disabled';
      await EncryptedStorage.setItem('pin_enabled_status', value);
      return true;
    } catch (error) {
      console.error('Failed to set PIN enabled status:', error);
      return false;
    }
  },
};
