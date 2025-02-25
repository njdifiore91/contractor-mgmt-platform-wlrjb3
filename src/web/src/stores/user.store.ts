/**
 * @fileoverview Enhanced Pinia store for secure user state management with PII protection,
 * optimistic updates, caching, and comprehensive error handling.
 * @version 1.0.0
 */

import { defineStore } from 'pinia'; // ^2.1.0
import { storeToRefs } from 'pinia'; // ^2.1.0
import { debounce } from 'lodash'; // ^4.17.21
import { useEncryption } from '@/composables/useEncryption';
import type { IUser } from '@/models/user.model';
import type { ISearchParams } from '@/models/search.model';
import { useNotificationStore } from './notification.store';
import axios from 'axios';

// Constants
const DEFAULT_PAGE_SIZE = 20;
const DEBOUNCE_DELAY = 300;
const CACHE_DURATION = 300000; // 5 minutes in milliseconds
const API_BASE_URL = '/api'; // Changed to relative path

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
  pendingUpdates: Map<string | number, Partial<IUser>>;
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
      sortOrder: 'asc',
    },
    totalCount: 0,
    selectedUser: null,
    cache: {},
    pendingUpdates: new Map(),
  }),

  getters: {
    /**
     * Returns users with decrypted PII data for display
     */
    decryptedUsers(): IUser[] {
      const { decrypt } = useEncryption();
      return this.users.map((user) => ({
        ...user,
        email: decrypt(user.email),
        phoneNumber: user.phoneNumber ? decrypt(user.phoneNumber) : null,
      }));
    },

    /**
     * Returns active users only
     */
    activeUsers(): IUser[] {
      return this.users.filter((user) => user.isActive);
    },

    /**
     * Generates cache key based on search parameters
     */
    cacheKey(): string {
      return JSON.stringify(this.searchParams);
    },
  },

  actions: {
    /**
     * Fetches users based on search parameters with caching
     */
    async fetchUsers(params: ISearchParams): Promise<void> {
      try {
        this.loading = true;
        const cacheKey = this.cacheKey;
        const cachedData = this.cache[cacheKey];

        // Check cache validity
        if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
          this.users = cachedData.data;
          return;
        }

        const response = await axios.get(`${API_BASE_URL}/users`, {
          params: {
            pageNumber: params.pageNumber || 1,
            pageSize: params.pageSize || DEFAULT_PAGE_SIZE,
            searchTerm: params.searchTerm || '',
            isActive: params.isActive,
            sortBy: params.sortBy || 'lastName',
            sortOrder: params.sortOrder || 'asc',
          },
        });

        // Check if response has the expected structure
        if (response.data && Array.isArray(response.data.users)) {
          this.users = response.data.users;
          this.totalCount = response.data.total || 0;

          // Update cache
          this.cache[cacheKey] = {
            data: this.users,
            timestamp: Date.now(),
          };
        } else {
          throw new Error('Invalid response format from server');
        }
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'Failed to fetch users';
        this.handleError(errorMessage, error);
        throw error;
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
        const response = await axios.get(`${API_BASE_URL}/users/${id}`);
        this.selectedUser = response.data;
      } catch (error) {
        this.handleError(`Error fetching user ${id}`, error);
      } finally {
        this.loading = false;
      }
    },

    /**
     * Creates a new user with encrypted PII data
     */
    async createUser(userData: Partial<IUser>): Promise<IUser> {
      try {
        this.loading = true;
        const { encrypt } = useEncryption();

        const encryptedData = {
          ...userData,
          email: encrypt(userData.email!),
          phoneNumber: userData.phoneNumber ? encrypt(userData.phoneNumber) : null,
        };

        const response = await axios.post(`${API_BASE_URL}/users`, encryptedData);
        const newUser = response.data;
        this.users.unshift(newUser);
        this.invalidateCache();
        useNotificationStore().success('User created successfully');
        return newUser;
      } catch (error) {
        this.handleError('Error creating user', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Updates user with optimistic updates and rollback
     */
    async updateUser(id: string | number, updates: Partial<IUser>): Promise<void> {
      try {
        const { encrypt } = useEncryption();
        const userIndex = this.users.findIndex((u) => u.id === id);

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
          email: updates.email ? encrypt(updates.email) : undefined,
          phoneNumber: updates.phoneNumber ? encrypt(updates.phoneNumber) : undefined,
        };

        // If id is a number, convert it to the MongoDB ObjectId format
        const mongoId = typeof id === 'number' ? id.toString() : id;
        await axios.put(`${API_BASE_URL}/users/${mongoId}`, encryptedUpdates);

        this.pendingUpdates.delete(id);
        this.invalidateCache();
        useNotificationStore().success('User updated successfully');
      } catch (error) {
        // Rollback on error
        if (this.pendingUpdates.has(id)) {
          const originalData = this.pendingUpdates.get(id)!;
          const userIndex = this.users.findIndex((u) => u.id === id);
          if (userIndex !== -1) {
            this.users[userIndex] = { ...this.users[userIndex], ...originalData };
          }
          this.pendingUpdates.delete(id);
        }
        this.handleError('Error updating user', error);
        throw error;
      }
    },

    /**
     * Updates search parameters with debounced search
     */
    setSearchParams: debounce(function (this: any, params: Partial<SearchParams>) {
      this.searchParams = { ...this.searchParams, ...params };
      this.fetchUsers(this.searchParams as ISearchParams);
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
    },

    /**
     * Deletes a user with proper error handling and cache invalidation
     */
    async deleteUser(id: string | number): Promise<void> {
      try {
        this.loading = true;
        // If id is a number, convert it to the MongoDB ObjectId format
        const mongoId = typeof id === 'number' ? id.toString() : id;
        await axios.delete(`${API_BASE_URL}/users/${mongoId}`);

        // Remove user from local state
        this.users = this.users.filter((user) => user.id !== id);

        // Invalidate cache
        this.invalidateCache();
        useNotificationStore().success('User deleted successfully');
      } catch (error) {
        this.handleError('Error deleting user', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },
  },
});
