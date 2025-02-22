/**
 * @fileoverview Vue 3 composable providing comprehensive user management functionality
 * with reactive state management, type-safe operations, enhanced error handling,
 * and secure PII data management.
 * @version 1.0.0
 */

import { ref, computed, onUnmounted } from 'vue'; // ^3.x
import { storeToRefs } from 'pinia'; // ^2.x
import { debounce } from 'lodash'; // ^4.17.21
import { IUser, UserRoleType } from '../models/user.model';
import { useUserStore } from '../stores/user.store';

// Constants
const SEARCH_DEBOUNCE_MS = 300;
const DEFAULT_PAGE_SIZE = 20;

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
 * Enhanced composable for user management with comprehensive functionality
 */
export function useUser() {
  // Initialize store with proper typing
  const userStore = useUserStore();
  
  // Extract reactive refs from store using storeToRefs for proper reactivity
  const { users, loading, error, selectedUser, totalCount } = storeToRefs(userStore);

  // Local reactive state for enhanced error handling
  const localError = ref<string | null>(null);
  const searchInProgress = ref(false);

  /**
   * Computed property for active users only
   */
  const activeUsers = computed(() => {
    return users.value.filter(user => user.isActive);
  });

  /**
   * Computed property for user count by role
   */
  const usersByRole = computed(() => {
    const roleCount = new Map<UserRoleType, number>();
    users.value.forEach(user => {
      user.userRoles.forEach(role => {
        const count = roleCount.get(role.name as UserRoleType) || 0;
        roleCount.set(role.name as UserRoleType, count + 1);
      });
    });
    return roleCount;
  });

  /**
   * Debounced search function with enhanced error handling
   */
  const searchUsers = debounce(async (params: ISearchParams): Promise<void> => {
    try {
      searchInProgress.value = true;
      localError.value = null;

      // Validate search parameters
      if (params.pageNumber < 1) params.pageNumber = 1;
      if (params.pageSize < 1) params.pageSize = DEFAULT_PAGE_SIZE;

      // Sanitize search term
      if (params.searchTerm) {
        params.searchTerm = params.searchTerm.trim();
      }

      await userStore.setSearchParams(params);
    } catch (err) {
      localError.value = err instanceof Error ? err.message : 'An error occurred during search';
      throw err;
    } finally {
      searchInProgress.value = false;
    }
  }, SEARCH_DEBOUNCE_MS);

  /**
   * Retrieves user by ID with enhanced error handling
   */
  const getUserById = async (id: number): Promise<IUser> => {
    try {
      localError.value = null;
      await userStore.fetchUserById(id);
      
      if (!selectedUser.value) {
        throw new Error(`User with ID ${id} not found`);
      }
      
      return selectedUser.value;
    } catch (err) {
      localError.value = err instanceof Error ? err.message : 'Error fetching user';
      throw err;
    }
  };

  /**
   * Creates a new user with validation
   */
  const createUser = async (userData: Partial<IUser>): Promise<void> => {
    try {
      localError.value = null;
      
      // Validate required fields
      if (!userData.email || !userData.firstName || !userData.lastName) {
        throw new Error('Required fields missing');
      }

      await userStore.createUser(userData);
    } catch (err) {
      localError.value = err instanceof Error ? err.message : 'Error creating user';
      throw err;
    }
  };

  /**
   * Updates existing user with optimistic updates
   */
  const updateUser = async (id: number, updates: Partial<IUser>): Promise<void> => {
    try {
      localError.value = null;
      await userStore.updateUser(id, updates);
    } catch (err) {
      localError.value = err instanceof Error ? err.message : 'Error updating user';
      throw err;
    }
  };

  /**
   * Validates user data before operations
   */
  const validateUserData = (userData: Partial<IUser>): boolean => {
    if (!userData.email?.includes('@')) return false;
    if (!userData.firstName?.trim()) return false;
    if (!userData.lastName?.trim()) return false;
    if (userData.phoneNumber && !/^\+?[\d\s-()]+$/.test(userData.phoneNumber)) return false;
    return true;
  };

  /**
   * Cleanup function to reset store state
   */
  onUnmounted(() => {
    userStore.resetState();
  });

  return {
    // Reactive state
    users,
    loading,
    error: computed(() => error.value || localError.value),
    searchInProgress,
    totalCount,
    selectedUser,
    activeUsers,
    usersByRole,

    // Actions
    searchUsers,
    getUserById,
    createUser,
    updateUser,
    validateUserData,
  };
}