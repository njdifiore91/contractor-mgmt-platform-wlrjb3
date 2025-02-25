/**
 * @fileoverview User API client module providing comprehensive user management operations
 * with enhanced error handling, validation, retry logic, and logging capabilities.
 * @version 1.0.0
 */

import type { IUser } from '../models/user.model';
import api from '../utils/api.util';
import retry from 'axios-retry';
import rateLimit from 'axios-rate-limit';
import createError from 'http-errors';

// API endpoint constants
const API_VERSION = 'v1';
const BASE_URL = import.meta.env.VITE_APP_API_URL || 'http://localhost:8080';
const API_ENDPOINTS = {
  USERS: `/api/${API_VERSION}/users`,
} as const;

// Retry configuration for failed requests
const RETRY_CONFIG = {
  retries: 3,
  retryDelay: retry.exponentialDelay,
  retryCondition: retry.isNetworkOrIdempotentRequestError,
};

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  maxRequests: 50,
  perMilliseconds: 1000,
};

// Simple logger for browser environment
const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`[MOCK API] ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[MOCK API ERROR] ${message}`, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[MOCK API WARNING] ${message}`, ...args);
  },
};

// Dummy data for users
const dummyUsers: IUser[] = [
  {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    isActive: true,
    phoneNumber: '+1234567890',
    azureAdB2CId: 'dummy-azure-id-1',
    userRoles: [{ id: 1, userId: 1, roleId: 1, assignedAt: new Date(), revokedAt: null }],
    createdAt: new Date('2024-01-01'),
    modifiedAt: null,
    lastLoginAt: new Date('2024-03-15'),
  },
  {
    id: 2,
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    isActive: true,
    phoneNumber: '+0987654321',
    azureAdB2CId: 'dummy-azure-id-2',
    userRoles: [{ id: 2, userId: 2, roleId: 2, assignedAt: new Date(), revokedAt: null }],
    createdAt: new Date('2024-01-15'),
    modifiedAt: null,
    lastLoginAt: new Date('2024-03-14'),
  },
  {
    id: 3,
    firstName: 'Mike',
    lastName: 'Johnson',
    email: 'mike.johnson@example.com',
    isActive: false,
    phoneNumber: '+1122334455',
    azureAdB2CId: 'dummy-azure-id-3',
    userRoles: [{ id: 3, userId: 3, roleId: 3, assignedAt: new Date(), revokedAt: null }],
    createdAt: new Date('2024-02-01'),
    modifiedAt: null,
    lastLoginAt: new Date('2024-03-10'),
  },
];

/**
 * User API client class providing comprehensive user management operations
 * with error handling, validation, and logging capabilities.
 */
export class UserApiClient {
  constructor() {
    // Configure retry and rate limiting
    retry(api, RETRY_CONFIG);
    rateLimit(api, RATE_LIMIT_CONFIG);
  }

  /**
   * Retrieves a list of users with pagination and filtering
   * @param params Query parameters for filtering and pagination
   * @returns Promise resolving to array of users and total count
   * @throws {ApiError} If the request fails
   */
  async getUsers(params: {
    pageNumber: number;
    pageSize: number;
    searchTerm?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ users: IUser[]; total: number }> {
    try {
      logger.info('GET /api/v1/users', params);
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 200));

      let filteredUsers = [...dummyUsers];

      // Apply search term filter
      if (params.searchTerm) {
        const term = params.searchTerm.toLowerCase();
        filteredUsers = filteredUsers.filter(
          (user) =>
            user.firstName.toLowerCase().includes(term) ||
            user.lastName.toLowerCase().includes(term) ||
            user.email.toLowerCase().includes(term)
        );
      }

      // Apply active status filter
      if (typeof params.isActive === 'boolean') {
        filteredUsers = filteredUsers.filter((user) => user.isActive === params.isActive);
      }

      // Sort users
      const sortField = params.sortBy || 'lastName';
      const sortOrder = params.sortOrder === 'desc' ? -1 : 1;
      filteredUsers.sort((a, b) => {
        const aValue = a[sortField as keyof IUser];
        const bValue = b[sortField as keyof IUser];
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortOrder * aValue.localeCompare(bValue);
        }
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortOrder * (aValue - bValue);
        }
        return 0;
      });

      // Calculate total before pagination
      const total = filteredUsers.length;

      // Apply pagination
      const start = (params.pageNumber - 1) * params.pageSize;
      const end = start + params.pageSize;
      const users = filteredUsers.slice(start, end);

      logger.info('Response:', { total, users: users.length });
      return { users, total };
    } catch (error) {
      logger.error('Failed to fetch users list', { error, params });
      throw createError(500, 'Failed to fetch users list', { cause: error });
    }
  }

  /**
   * Creates a new user
   * @param userData User data to create
   * @returns Promise resolving to created user
   * @throws {ApiError} If the request fails or validation errors occur
   */
  async createUser(userData: Partial<IUser>): Promise<IUser> {
    try {
      logger.info('POST /api/v1/users', { userData });
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Validate required fields
      if (!userData.firstName || !userData.lastName || !userData.email) {
        throw new Error('Missing required fields');
      }

      const newUser: IUser = {
        id: Math.max(...dummyUsers.map((u) => u.id)) + 1,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        isActive: userData.isActive ?? true,
        phoneNumber: userData.phoneNumber || null,
        azureAdB2CId: userData.azureAdB2CId || '',
        userRoles:
          userData.userRoles?.map((role) => ({
            id: Math.random(),
            userId: 0, // Will be set after creation
            roleId: role.roleId,
            assignedAt: new Date(),
            revokedAt: null,
          })) || [],
        createdAt: new Date(),
        modifiedAt: null,
        lastLoginAt: null,
      };

      // Update userId in roles
      newUser.userRoles = newUser.userRoles.map((role) => ({
        ...role,
        userId: newUser.id,
      }));

      dummyUsers.push(newUser);
      logger.info('Response:', { newUser });
      return newUser;
    } catch (error) {
      logger.error('Failed to create user', { error, userData });
      throw createError(400, 'Failed to create user', { cause: error });
    }
  }

  /**
   * Updates an existing user
   * @param id User identifier
   * @param updates Updated user data
   * @returns Promise resolving to updated user
   * @throws {ApiError} If the request fails or user is not found
   */
  async updateUser(id: number, updates: Partial<IUser>): Promise<IUser> {
    try {
      logger.info('PUT /api/v1/users/' + id, { updates });
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 300));

      const userIndex = dummyUsers.findIndex((user) => user.id === id);
      if (userIndex === -1) {
        throw new Error('User not found');
      }

      const updatedUser: IUser = {
        ...dummyUsers[userIndex],
        firstName: updates.firstName || dummyUsers[userIndex].firstName,
        lastName: updates.lastName || dummyUsers[userIndex].lastName,
        email: updates.email || dummyUsers[userIndex].email,
        isActive: updates.isActive ?? dummyUsers[userIndex].isActive,
        phoneNumber: updates.phoneNumber ?? dummyUsers[userIndex].phoneNumber,
        azureAdB2CId: updates.azureAdB2CId || dummyUsers[userIndex].azureAdB2CId,
        userRoles:
          updates.userRoles?.map((role) => ({
            id: Math.random(),
            userId: id,
            roleId: role.roleId,
            assignedAt: new Date(),
            revokedAt: null,
          })) || dummyUsers[userIndex].userRoles,
        modifiedAt: new Date(),
      };

      dummyUsers[userIndex] = updatedUser;
      logger.info('Response:', { updatedUser });
      return updatedUser;
    } catch (error) {
      logger.error('Failed to update user', { error, id, updates });
      throw createError(400, 'Failed to update user', { cause: error });
    }
  }

  /**
   * Deletes a user
   * @param id User identifier
   * @throws {ApiError} If the request fails or user is not found
   */
  async deleteUser(id: number): Promise<void> {
    try {
      logger.info('DELETE /api/v1/users/' + id);
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 300));

      const userIndex = dummyUsers.findIndex((user) => user.id === id);
      if (userIndex === -1) {
        throw new Error('User not found');
      }

      dummyUsers.splice(userIndex, 1);
      logger.info('Response: User deleted successfully');
    } catch (error) {
      logger.error('Failed to delete user', { error, id });
      throw createError(400, 'Failed to delete user', { cause: error });
    }
  }
}

// Export singleton instance
const userApiClient = new UserApiClient();
export default userApiClient;

// Export individual functions for convenience
export const getUsers = (params: Parameters<UserApiClient['getUsers']>[0]) =>
  userApiClient.getUsers(params);

export const createUser = (userData: Parameters<UserApiClient['createUser']>[0]) =>
  userApiClient.createUser(userData);

export const updateUser = (id: number, updates: Parameters<UserApiClient['updateUser']>[1]) =>
  userApiClient.updateUser(id, updates);

export const deleteUser = (id: number) => userApiClient.deleteUser(id);
