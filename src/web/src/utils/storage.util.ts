/**
 * @fileoverview Advanced utility service for secure browser storage operations
 * Implements AES-256 encryption with IV and salt for sensitive data storage
 * @version 1.0.0
 */

import CryptoJS from 'crypto-js'; // ^4.1.1
import { AuthToken, UserSession } from '../models/auth.model';

/**
 * Storage operation options interface
 */
interface StorageOptions {
  encrypt?: boolean;
  compress?: boolean;
  expiresIn?: number;
  namespace?: string;
}

/**
 * Storage metadata interface for integrity checking
 */
interface StorageMetadata {
  version: string;
  iv: string;
  salt: string;
  timestamp: number;
  hash: string;
  compressed: boolean;
}

/**
 * Constants for storage operations
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_SESSION: 'user_session',
  PREFERENCES: 'user_preferences',
  STORAGE_VERSION: 'storage_version',
  INTEGRITY_HASH: 'storage_integrity'
} as const;

/**
 * Configuration constants
 */
const STORAGE_CONFIG = {
  VERSION: '1.0',
  MAX_SIZE: 5242880, // 5MB
  SESSION_TIMEOUT: 3600000, // 1 hour
  CLEANUP_INTERVAL: 86400000 // 24 hours
} as const;

/**
 * Advanced storage service with encryption, integrity checking, and automatic maintenance
 */
export class StorageService {
  private readonly encryptionKey: string;
  private readonly storage: Storage;
  private readonly registry: Map<string, StorageMetadata>;

  constructor() {
    this.encryptionKey = import.meta.env.VUE_APP_STORAGE_ENCRYPTION_KEY as string;
    this.storage = window.localStorage;
    this.registry = new Map();
    
    if (!this.encryptionKey) {
      throw new Error('Storage encryption key not configured');
    }
    
    this.initializeStorage();
    this.startMaintenanceInterval();
  }

  /**
   * Initialize storage and verify integrity
   */
  private initializeStorage(): void {
    try {
      const version = this.storage.getItem(STORAGE_KEYS.STORAGE_VERSION);
      if (version !== STORAGE_CONFIG.VERSION) {
        this.migrateStorage();
      }
      this.verifyStorageIntegrity();
    } catch (error) {
      console.error('Storage initialization failed:', error);
      this.clearStorage();
    }
  }

  /**
   * Generate cryptographic initialization vector
   */
  private generateIV(): string {
    return CryptoJS.lib.WordArray.random(16).toString();
  }

  /**
   * Generate salt for key derivation
   */
  private generateSalt(): string {
    return CryptoJS.lib.WordArray.random(32).toString();
  }

  /**
   * Derive encryption key using PBKDF2
   */
  private deriveKey(salt: string): CryptoJS.lib.WordArray {
    return CryptoJS.PBKDF2(this.encryptionKey, salt, {
      keySize: 256 / 32,
      iterations: 1000
    });
  }

  /**
   * Encrypt data with AES-256-CBC
   */
  private encrypt(data: any, iv: string, salt: string): string {
    const key = this.deriveKey(salt);
    const encrypted = CryptoJS.AES.encrypt(
      JSON.stringify(data),
      key,
      { iv: CryptoJS.enc.Hex.parse(iv) }
    );
    return encrypted.toString();
  }

  /**
   * Decrypt data with AES-256-CBC
   */
  private decrypt(encrypted: string, iv: string, salt: string): any {
    const key = this.deriveKey(salt);
    const decrypted = CryptoJS.AES.decrypt(
      encrypted,
      key,
      { iv: CryptoJS.enc.Hex.parse(iv) }
    );
    return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
  }

  /**
   * Calculate integrity hash of storage item
   */
  private calculateHash(data: string, metadata: Partial<StorageMetadata>): string {
    const content = `${data}${metadata.iv}${metadata.salt}${metadata.timestamp}`;
    return CryptoJS.SHA256(content).toString();
  }

  /**
   * Securely store authentication token
   */
  public async saveAuthToken(token: AuthToken): Promise<void> {
    try {
      const iv = this.generateIV();
      const salt = this.generateSalt();
      const encrypted = this.encrypt(token, iv, salt);
      
      const metadata: StorageMetadata = {
        version: STORAGE_CONFIG.VERSION,
        iv,
        salt,
        timestamp: Date.now(),
        hash: this.calculateHash(encrypted, { iv, salt, timestamp: Date.now() }),
        compressed: false
      };

      this.storage.setItem(STORAGE_KEYS.AUTH_TOKEN, encrypted);
      this.registry.set(STORAGE_KEYS.AUTH_TOKEN, metadata);
      
      // Set token expiration
      if (token.expiresIn) {
        setTimeout(() => {
          this.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        }, token.expiresIn * 1000);
      }
    } catch (error) {
      console.error('Failed to save auth token:', error);
      throw new Error('Storage operation failed');
    }
  }

  /**
   * Retrieve and validate authentication token
   */
  public async getAuthToken(): Promise<AuthToken | null> {
    try {
      const encrypted = this.storage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (!encrypted) return null;

      const metadata = this.registry.get(STORAGE_KEYS.AUTH_TOKEN);
      if (!metadata) {
        this.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        return null;
      }

      // Verify integrity
      const hash = this.calculateHash(encrypted, metadata);
      if (hash !== metadata.hash) {
        this.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        throw new Error('Storage integrity check failed');
      }

      const token = this.decrypt(encrypted, metadata.iv, metadata.salt);
      return token as AuthToken;
    } catch (error) {
      console.error('Failed to retrieve auth token:', error);
      return null;
    }
  }

  /**
   * Save user session with encryption
   */
  public async saveUserSession(session: UserSession): Promise<void> {
    try {
      const iv = this.generateIV();
      const salt = this.generateSalt();
      const encrypted = this.encrypt(session, iv, salt);
      
      const metadata: StorageMetadata = {
        version: STORAGE_CONFIG.VERSION,
        iv,
        salt,
        timestamp: Date.now(),
        hash: this.calculateHash(encrypted, { iv, salt, timestamp: Date.now() }),
        compressed: false
      };

      this.storage.setItem(STORAGE_KEYS.USER_SESSION, encrypted);
      this.registry.set(STORAGE_KEYS.USER_SESSION, metadata);
    } catch (error) {
      console.error('Failed to save user session:', error);
      throw new Error('Storage operation failed');
    }
  }

  /**
   * Clear user session and related data
   */
  public async clearUserSession(): Promise<void> {
    try {
      this.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      this.removeItem(STORAGE_KEYS.USER_SESSION);
    } catch (error) {
      console.error('Failed to clear user session:', error);
      throw new Error('Storage operation failed');
    }
  }

  /**
   * Remove item from storage and registry
   */
  private removeItem(key: string): void {
    this.storage.removeItem(key);
    this.registry.delete(key);
  }

  /**
   * Verify storage integrity across all items
   */
  private verifyStorageIntegrity(): void {
    for (const [key, metadata] of this.registry) {
      const encrypted = this.storage.getItem(key);
      if (!encrypted) {
        this.registry.delete(key);
        continue;
      }

      const hash = this.calculateHash(encrypted, metadata);
      if (hash !== metadata.hash) {
        this.removeItem(key);
      }
    }
  }

  /**
   * Start maintenance interval for cleanup
   */
  private startMaintenanceInterval(): void {
    setInterval(() => {
      this.verifyStorageIntegrity();
      this.cleanupExpiredItems();
    }, STORAGE_CONFIG.CLEANUP_INTERVAL);
  }

  /**
   * Clean up expired items from storage
   */
  private cleanupExpiredItems(): void {
    const now = Date.now();
    for (const [key, metadata] of this.registry) {
      if (now - metadata.timestamp > STORAGE_CONFIG.SESSION_TIMEOUT) {
        this.removeItem(key);
      }
    }
  }

  /**
   * Migrate storage to new version if needed
   */
  private migrateStorage(): void {
    // Clear old storage and initialize new version
    this.clearStorage();
    this.storage.setItem(STORAGE_KEYS.STORAGE_VERSION, STORAGE_CONFIG.VERSION);
  }

  /**
   * Clear all storage and registry
   */
  private clearStorage(): void {
    this.storage.clear();
    this.registry.clear();
  }
}