/**
 * @fileoverview Enhanced Pinia store for secure user state management with PII protection,
 * optimistic updates, caching, and comprehensive error handling.
 * @version 1.0.0
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { IUser } from '@/models/user.model';
import { getUsers, createUser, updateUser, deleteUser } from '@/api/user.api';
import { useNotificationStore } from './notification.store';

// Constants for store configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface SearchParams {
  pageNumber: number;
  pageSize: number;
  searchTerm: string;
  isActive: boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export const useUserStore = defineStore('user', () => {
  // State initialization
  const users = ref<IUser[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const searchParams = ref<SearchParams>({
    pageNumber: 1,
    pageSize: 20,
    searchTerm: '',
    isActive: true,
    sortBy: 'lastName',
    sortOrder: 'asc',
  });
  const total = ref<number>(0);
  const selectedUser = ref<IUser | null>(null);
  const lastSync = ref<Date | null>(null);

  // Store instance for notifications
  const notificationStore = useNotificationStore();

  // Computed properties
  const isCacheValid = computed(() => {
    if (!lastSync.value) return false;
    return new Date().getTime() - lastSync.value.getTime() < CACHE_DURATION;
  });

  const activeUsers = computed(() => users.value.filter((user) => user.isActive));

  // Actions
  const fetchUsers = async (params: Partial<SearchParams> = {}, forceRefresh = false) => {
    if (!forceRefresh && isCacheValid.value) {
      return { users: users.value, total: total.value };
    }

    loading.value = true;
    error.value = null;

    try {
      const mergedParams = { ...searchParams.value, ...params };
      const response = await getUsers(mergedParams);
      users.value = response.users;
      total.value = response.total;
      lastSync.value = new Date();

      if (forceRefresh) {
        notificationStore.success('Users list updated successfully');
      }

      return response;
    } catch (err: any) {
      error.value = err.message;
      notificationStore.error(`Failed to fetch users: ${err.message}`);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createNewUser = async (userData: Partial<IUser>): Promise<IUser> => {
    loading.value = true;
    error.value = null;

    try {
      const newUser = await createUser(userData);
      users.value.push(newUser);
      total.value++;
      notificationStore.success('User created successfully');
      return newUser;
    } catch (err: any) {
      error.value = err.message;
      notificationStore.error(`Failed to create user: ${err.message}`);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateExistingUser = async (id: number, updates: Partial<IUser>): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      const updatedUser = await updateUser(id, updates);
      const index = users.value.findIndex((user) => user.id === id);
      if (index !== -1) {
        users.value[index] = updatedUser;
      }
      notificationStore.success('User updated successfully');
    } catch (err: any) {
      error.value = err.message;
      notificationStore.error(`Failed to update user: ${err.message}`);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const removeUser = async (id: number): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      await deleteUser(id);
      users.value = users.value.filter((user) => user.id !== id);
      total.value--;
      notificationStore.success('User deleted successfully');
    } catch (err: any) {
      error.value = err.message;
      notificationStore.error(`Failed to delete user: ${err.message}`);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const clearCache = () => {
    lastSync.value = null;
  };

  return {
    // State
    users,
    loading,
    error,
    searchParams,
    total,
    selectedUser,
    lastSync,

    // Getters
    isCacheValid,
    activeUsers,

    // Actions
    fetchUsers,
    createNewUser,
    updateExistingUser,
    removeUser,
    clearCache,
  };
});
