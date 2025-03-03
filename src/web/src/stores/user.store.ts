/**
 * @fileoverview Enhanced Pinia store for secure user state management with PII protection,
 * optimistic updates, caching, and comprehensive error handling.
 * @version 1.0.0
 */

import { defineStore } from 'pinia'; // ^2.1.0
import { storeToRefs } from 'pinia'; // ^2.1.0
import { debounce } from 'lodash'; // ^4.17.21
import { UserApiService } from '@api/services'; // ^1.0.0
import { useEncryptionService } from '@security/encryption'; // ^1.0.0
import { IUser } from '../models/user.model';
import { useNotificationStore } from './notification.store';

// Constants
const DEFAULT_PAGE_SIZE = 20;
const DEBOUNCE_DELAY = 300;
const CACHE_DURATION = 300000; // 5 minutes in milliseconds

// Types
interface SearchParams {
  pageNumber: number;
  pageSize: number;
  searchTerm: string;
  isActive: boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface UserState {
  users: IUser[];
  loading: boolean;
  error: boolean;
  errorMessage: string;
  searchParams: SearchParams;
  totalCount: number;
  selectedUser: IUser | null;
  cache: Record<string, CacheEntry<IUser[]>>;
  pendingUpdates: Map<number, Partial<IUser>>;
}

// Store implementation
export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    users: [],
    loading: false,
    error: false,
    errorMessage: '',
    searchParams: {
      pageNumber: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      searchTerm: '',
      isActive: true,
      sortBy: 'lastName',
      sortOrder: 'asc'
    },
    totalCount: 0,
    selectedUser: null,
    cache: {},
    pendingUpdates: new Map()
  }),

  getters: {
    /**
     * Returns users with decrypted PII data for display
     */
    decryptedUsers(): IUser[] {
      const encryptionService = useEncryptionService();
      return this.users.map(user => ({
        ...user,
        email: encryptionService.decryptPII(user.email),
        phoneNumber: user.phoneNumber ? encryptionService.decryptPII(user.phoneNumber) : null
      }));
    },

    /**
     * Returns active users only
     */
    activeUsers(): IUser[] {
      return this.users.filter(user => user.isActive);
    },

    /**
     * Generates cache key based on search parameters
     */
    cacheKey(): string {
      return JSON.stringify(this.searchParams);
    }
  },

  actions: {
    /**
     * Fetches users based on search parameters with caching
     */
    async fetchUsers(): Promise<void> {
      try {
        this.loading = true;
        const cacheKey = this.cacheKey;
        const cachedData = this.cache[cacheKey];

        // Check cache validity
        if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
          this.users = cachedData.data;
          return;
        }

        const response = await UserApiService.getUsers(this.searchParams);
        this.users = response.data;
        this.totalCount = response.totalCount;

        // Update cache
        this.cache[cacheKey] = {
          data: this.users,
          timestamp: Date.now()
        };
      } catch (error) {
        this.handleError('Error fetching users', error);
      } finally {
        this.loading = false;
      }
    },

    /**
     * Fetches a single user by ID
     */
    async fetchUserById(id: number): Promise<void> {
      try {
        this.loading = true;
        const response = await UserApiService.getUserById(id);
        this.selectedUser = response;
      } catch (error) {
        this.handleError(`Error fetching user ${id}`, error);
      } finally {
        this.loading = false;
      }
    },

    /**
     * Creates a new user with encrypted PII data
     */
    async createUser(userData: Partial<IUser>): Promise<void> {
      try {
        this.loading = true;
        const encryptionService = useEncryptionService();
        
        const encryptedData = {
          ...userData,
          email: encryptionService.encryptPII(userData.email!),
          phoneNumber: userData.phoneNumber ? encryptionService.encryptPII(userData.phoneNumber) : null
        };

        const newUser = await UserApiService.createUser(encryptedData);
        this.users.unshift(newUser);
        this.invalidateCache();
        useNotificationStore().success('User created successfully');
      } catch (error) {
        this.handleError('Error creating user', error);
      } finally {
        this.loading = false;
      }
    },

    /**
     * Updates user with optimistic updates and rollback
     */
    async updateUser(id: number, updates: Partial<IUser>): Promise<void> {
      try {
        const encryptionService = useEncryptionService();
        const userIndex = this.users.findIndex(u => u.id === id);
        
        if (userIndex === -1) {
          throw new Error('User not found');
        }

        // Store original state for rollback
        this.pendingUpdates.set(id, this.users[userIndex]);

        // Optimistic update
        this.users[userIndex] = { ...this.users[userIndex], ...updates };

        // Encrypt PII data
        const encryptedUpdates = {
          ...updates,
          email: updates.email ? encryptionService.encryptPII(updates.email) : undefined,
          phoneNumber: updates.phoneNumber ? encryptionService.encryptPII(updates.phoneNumber) : undefined
        };

        await UserApiService.updateUser(id, encryptedUpdates);
        this.pendingUpdates.delete(id);
        this.invalidateCache();
        useNotificationStore().success('User updated successfully');
      } catch (error) {
        // Rollback on error
        if (this.pendingUpdates.has(id)) {
          const originalData = this.pendingUpdates.get(id)!;
          const userIndex = this.users.findIndex(u => u.id === id);
          if (userIndex !== -1) {
            this.users[userIndex] = { ...this.users[userIndex], ...originalData };
          }
          this.pendingUpdates.delete(id);
        }
        this.handleError('Error updating user', error);
      }
    },

    /**
     * Updates search parameters with debounced search
     */
    setSearchParams: debounce(function (this: any, params: Partial<SearchParams>) {
      this.searchParams = { ...this.searchParams, ...params };
      this.fetchUsers();
    }, DEBOUNCE_DELAY),

    /**
     * Invalidates the cache for a specific key or all cache
     */
    invalidateCache(cacheKey?: string): void {
      if (cacheKey) {
        delete this.cache[cacheKey];
      } else {
        this.cache = {};
      }
    },

    /**
     * Handles errors with proper logging and notification
     */
    handleError(message: string, error: any): void {
      console.error(`${message}:`, error);
      this.error = true;
      this.errorMessage = error.message || 'An unexpected error occurred';
      useNotificationStore().error(this.errorMessage);
    },

    /**
     * Resets store state to initial values
     */
    resetState(): void {
      this.users = [];
      this.loading = false;
      this.error = false;
      this.errorMessage = '';
      this.selectedUser = null;
      this.totalCount = 0;
      this.cache = {};
      this.pendingUpdates.clear();
      this.searchParams = {
        pageNumber: 1,
        pageSize: DEFAULT_PAGE_SIZE,
        searchTerm: '',
        isActive: true,
        sortBy: 'lastName',
        sortOrder: 'asc'
      };
    }
  }
});