import { ref } from 'vue';
import CryptoJS from 'crypto-js';

// Default encryption key for development
const DEFAULT_KEY = 'default-dev-key';

/**
 * Composable providing encryption, decryption, and digital signature utilities
 */
export function useEncryption() {
  // Secret key for encryption/decryption (in production this should be securely managed)
  const secretKey = ref(import.meta.env.VITE_ENCRYPTION_KEY || DEFAULT_KEY);

  /**
   * Encrypts data using AES encryption
   * @param data Data to encrypt
   * @returns Encrypted data as string
   */
  const encrypt = (data: any): string => {
    try {
      const jsonStr = JSON.stringify(data);
      return CryptoJS.AES.encrypt(jsonStr, secretKey.value).toString();
    } catch (error) {
      console.error('Encryption failed:', error);
      return '';
    }
  };

  /**
   * Decrypts AES encrypted data
   * @param encryptedData Encrypted data string
   * @returns Decrypted data
   */
  const decrypt = (encryptedData: string): any => {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey.value);
      const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
      return JSON.parse(decryptedStr);
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  };

  /**
   * Signs data using HMAC-SHA256
   * @param data Data to sign
   * @returns Digital signature
   */
  const sign = (data: string): string => {
    try {
      return CryptoJS.HmacSHA256(data, secretKey.value).toString();
    } catch (error) {
      console.error('Signing failed:', error);
      return '';
    }
  };

  /**
   * Verifies a digital signature
   * @param data Original data
   * @param signature Digital signature to verify
   * @returns True if signature is valid
   */
  const verify = (data: string, signature: string): boolean => {
    try {
      const computedSignature = sign(data);
      return computedSignature === signature;
    } catch (error) {
      console.error('Verification failed:', error);
      return false;
    }
  };

  return {
    encrypt,
    decrypt,
    sign,
    verify
  };
} 