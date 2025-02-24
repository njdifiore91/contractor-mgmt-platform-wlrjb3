/**
 * @fileoverview Vue 3 composable providing comprehensive user management functionality
 * with reactive state management, type-safe operations, enhanced error handling,
 * and secure PII data management.
 * @version 1.0.0
 */

import { ref, computed, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { debounce } from 'lodash';
import type { IUser } from '@/models/user.model';
import { UserRoleType } from '@/models/user.model';
import { useUserStore } from '@/stores/user.store';

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
  const userStore = useUserStore();
  const { users, loading, error, selectedUser } = storeToRefs(userStore);

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
      await userStore.fetchUsers(params || searchParams.value);
    } catch (err) {
      console.error('Error fetching users:', err);
      throw err;
    }
  };

  const getUserById = async (id: number): Promise<IUser> => {
    try {
      await userStore.fetchUserById(id);
      if (!selectedUser.value) {
        throw new Error('User not found');
      }
      return selectedUser.value;
    } catch (err) {
      console.error(`Error fetching user ${id}:`, err);
      throw err;
    }
  };

  const createUser = async (userData: Partial<IUser>): Promise<void> => {
    try {
      await userStore.createUser(userData);
    } catch (err) {
      console.error('Error creating user:', err);
      throw err;
    }
  };

  const updateUser = async (id: number, updates: Partial<IUser>): Promise<void> => {
    try {
      await userStore.updateUser(id, updates);
    } catch (err) {
      console.error('Error updating user:', err);
      throw err;
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
    getUserById,
    createUser,
    updateUser,
    validateUserData,
  };
}
