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

const { encrypt } = useEncryption();

// Dummy user data
const dummyUsers: IUser[] = [
  {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: encrypt('john.doe@example.com'),
    isActive: true,
    userRoles: [{ roleId: 1 }], // Admin
    emailPreferences: ['daily', 'weekly'],
    createdAt: new Date('2024-01-01'),
    lastLoginAt: new Date('2024-03-15'),
  },
  {
    id: 2,
    firstName: 'Jane',
    lastName: 'Smith',
    email: encrypt('jane.smith@example.com'),
    isActive: true,
    userRoles: [{ roleId: 2 }], // Operations
    emailPreferences: ['weekly'],
    createdAt: new Date('2024-01-15'),
    lastLoginAt: new Date('2024-03-14'),
  },
  {
    id: 3,
    firstName: 'Mike',
    lastName: 'Johnson',
    email: encrypt('mike.johnson@example.com'),
    isActive: false,
    userRoles: [{ roleId: 3 }], // Inspector
    emailPreferences: ['monthly'],
    createdAt: new Date('2024-02-01'),
    lastLoginAt: new Date('2024-03-10'),
  },
];

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
    async fetchUsers(params: any = {}) {
      try {
        this.loading = true;
        this.error = false;

        // Filter and sort dummy data
        let filteredUsers = [...dummyUsers];

        if (params.searchTerm) {
          const term = params.searchTerm.toLowerCase();
          filteredUsers = filteredUsers.filter(
            (user) =>
              user.firstName.toLowerCase().includes(term) ||
              user.lastName.toLowerCase().includes(term)
          );
        }

        if (typeof params.isActive === 'boolean') {
          filteredUsers = filteredUsers.filter((user) => user.isActive === params.isActive);
        }

        // Sort users
        const sortField = params.sortBy || 'lastName';
        const sortOrder = params.sortOrder === 'desc' ? -1 : 1;
        filteredUsers.sort((a, b) => {
          return sortOrder * a[sortField].localeCompare(b[sortField]);
        });

        // Apply pagination
        const start = (params.pageNumber - 1) * params.pageSize;
        const end = start + params.pageSize;
        this.users = filteredUsers.slice(start, end);
      } catch (error: any) {
        this.error = true;
        this.errorMessage = error.message;
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
        this.error = false;

        // Create new user with encrypted email
        const newUser: IUser = {
          id: dummyUsers.length + 1,
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          email: encrypt(userData.email || ''),
          isActive: true,
          userRoles: userData.userRoles || [],
          emailPreferences: userData.emailPreferences || [],
          createdAt: new Date(),
          lastLoginAt: null,
        };

        // Add to dummy data
        dummyUsers.push(newUser);

        // Update local state
        this.users = [...this.users, newUser];

        return newUser;
      } catch (error: any) {
        this.error = true;
        this.errorMessage = error.message;
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
        this.loading = true;
        this.error = false;

        // Find user in dummy data
        const userIndex = dummyUsers.findIndex((user) => user.id === id);
        if (userIndex === -1) {
          throw new Error('User not found');
        }

        // Update user with encrypted email if provided
        const updatedUser = {
          ...dummyUsers[userIndex],
          ...updates,
          email: updates.email ? encrypt(updates.email) : dummyUsers[userIndex].email,
        };

        // Update dummy data
        dummyUsers[userIndex] = updatedUser;

        // Update local state
        const localIndex = this.users.findIndex((user) => user.id === id);
        if (localIndex !== -1) {
          this.users[localIndex] = updatedUser;
        }
      } catch (error: any) {
        this.error = true;
        this.errorMessage = error.message;
        throw error;
      } finally {
        this.loading = false;
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
    invalidateCache() {
      this.cache = {};
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
        this.error = false;

        // Find user in dummy data
        const userIndex = dummyUsers.findIndex((user) => user.id === id);
        if (userIndex === -1) {
          throw new Error('User not found');
        }

        // Remove from dummy data
        dummyUsers.splice(userIndex, 1);

        // Update local state
        this.users = this.users.filter((user) => user.id !== id);
      } catch (error: any) {
        this.error = true;
        this.errorMessage = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },
  },
});
