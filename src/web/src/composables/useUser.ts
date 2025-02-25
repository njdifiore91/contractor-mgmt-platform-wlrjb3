/**
 * @fileoverview Vue 3 composable providing comprehensive user management functionality
 * with reactive state management, type-safe operations, enhanced error handling,
 * and secure PII data management.
 * @version 1.0.0
 */

import { ref, computed, onUnmounted } from 'vue';
import { debounce } from 'lodash';
import type { IUser } from '@/models/user.model';
import { UserRoleType } from '@/models/user.model';
import userApiClient from '@/api/user.api';

// Constants
const SEARCH_DEBOUNCE_MS = 300;
const DEFAULT_PAGE_SIZE = 10;

/**
 * Interface for search parameters with proper typing
 */
interface ISearchParams {
  searchTerm?: string;
  isActive?: boolean;
  roles?: UserRoleType[];
  pageNumber: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Composable for user management functionality
 */
export function useUser() {
  const users = ref<IUser[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const selectedUser = ref<IUser | null>(null);

  const searchParams = ref<ISearchParams>({
    pageNumber: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    isActive: true,
  });

  const debouncedSearch = debounce((term: string) => {
    searchParams.value = {
      ...searchParams.value,
      searchTerm: term,
    };
    fetchUsers();
  }, SEARCH_DEBOUNCE_MS);

  const fetchUsers = async (params?: ISearchParams) => {
    try {
      loading.value = true;
      error.value = null;
      const response = await userApiClient.getUsers(params || searchParams.value);
      users.value = response.users;
      return response;
    } catch (err) {
      console.error('Error fetching users:', err);
      error.value = 'Failed to fetch users';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createUser = async (userData: Partial<IUser>): Promise<IUser> => {
    try {
      loading.value = true;
      error.value = null;
      const newUser = await userApiClient.createUser(userData);
      users.value = [...users.value, newUser];
      return newUser;
    } catch (err) {
      console.error('Error creating user:', err);
      error.value = 'Failed to create user';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateUser = async (id: string | number, updates: Partial<IUser>): Promise<void> => {
    try {
      loading.value = true;
      error.value = null;
      const updatedUser = await userApiClient.updateUser(Number(id), updates);
      const index = users.value.findIndex((user) => user.id === id);
      if (index !== -1) {
        users.value[index] = updatedUser;
      }
    } catch (err) {
      console.error('Error updating user:', err);
      error.value = 'Failed to update user';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteUser = async (id: string | number): Promise<void> => {
    try {
      loading.value = true;
      error.value = null;
      await userApiClient.deleteUser(Number(id));
      users.value = users.value.filter((user) => user.id !== id);
    } catch (err) {
      console.error('Error deleting user:', err);
      error.value = 'Failed to delete user';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const validateUserData = (userData: Partial<IUser>): boolean => {
    if (!userData.email || !userData.firstName || !userData.lastName) {
      return false;
    }
    return true;
  };

  onUnmounted(() => {
    debouncedSearch.cancel();
  });

  return {
    users,
    loading,
    error,
    selectedUser,
    searchParams,
    debouncedSearch,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    validateUserData,
  };
}
