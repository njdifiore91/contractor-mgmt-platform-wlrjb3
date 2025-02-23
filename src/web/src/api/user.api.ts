/**
 * @fileoverview API client module for user management operations with comprehensive security,
 * caching, and error handling features. Implements the user management requirements from
 * the technical specifications.
 * @version 1.0.0
 */

import type { AxiosResponse } from 'axios';
import CryptoJS from 'crypto-js';
import type { IUser, IRole } from '@/models/user.model';
import { UserRoleType } from '@/models/user.model';
import api from '../utils/api.util';

// API endpoint configuration
const API_BASE_PATH = '/api/v1/users';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const SEARCH_DEBOUNCE_MS = 300;

// In-memory cache for user data
const userCache = new Map<number, { data: IUser; timestamp: number }>();

/**
 * Error class for user-related API errors
 */
export class UserApiError extends Error {
    constructor(
        message: string,
        public statusCode: number,
        public details?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'UserApiError';
    }
}

/**
 * Interface for user search parameters
 */
export interface UserSearchParams {
    searchTerm?: string;
    isActive?: boolean;
    roles?: UserRoleType[];
    sortBy?: keyof IUser;
    sortOrder?: 'asc' | 'desc';
    cursor?: string;
    pageSize: number;
}

/**
 * Interface for user search response
 */
export interface UserSearchResponse {
    users: IUser[];
    nextCursor?: string;
    total: number;
}

/**
 * Interface for user creation data
 */
export interface CreateUserData {
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    azureAdB2CId: string;
    roles: UserRoleType[];
}

/**
 * Interface for user update data
 */
export interface UpdateUserData {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    roles?: UserRoleType[];
    isActive?: boolean;
}

/**
 * Retrieves a user by their unique identifier with caching
 * @param id User identifier
 * @returns Promise resolving to user details
 * @throws UserApiError if user not found or request fails
 */
export async function getUserById(id: number): Promise<IUser> {
    // Check cache first
    const cached = userCache.get(id);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }

    try {
        const response = await api.get<IUser>(`${API_BASE_PATH}/${id}`);
        
        // Cache successful response
        userCache.set(id, {
            data: response.data,
            timestamp: Date.now()
        });
        
        return response.data;
    } catch (error: any) {
        if (error.response?.status === 404) {
            throw new UserApiError('User not found', 404);
        }
        throw new UserApiError(
            'Failed to retrieve user',
            error.response?.status || 500,
            error.response?.data
        );
    }
}

/**
 * Searches for users with advanced filtering and cursor-based pagination
 * @param params Search parameters
 * @returns Promise resolving to paginated user search results
 * @throws UserApiError if search request fails
 */
export async function searchUsers(params: UserSearchParams): Promise<UserSearchResponse> {
    try {
        const response = await api.get<UserSearchResponse>(API_BASE_PATH, {
            params: {
                q: params.searchTerm,
                active: params.isActive,
                roles: params.roles?.join(','),
                sort: params.sortBy,
                order: params.sortOrder,
                cursor: params.cursor,
                limit: params.pageSize
            }
        });

        return response.data;
    } catch (error: any) {
        throw new UserApiError(
            'Failed to search users',
            error.response?.status || 500,
            error.response?.data
        );
    }
}

/**
 * Creates a new user with secure PII handling
 * @param userData User creation data
 * @returns Promise resolving to created user identifiers
 * @throws UserApiError if user creation fails
 */
export async function createUser(userData: CreateUserData): Promise<{ id: number; azureAdB2CId: string }> {
    try {
        // Encrypt sensitive PII data
        const encryptedData = {
            ...userData,
            firstName: CryptoJS.AES.encrypt(userData.firstName, 'secretKey').toString(),
            lastName: CryptoJS.AES.encrypt(userData.lastName, 'secretKey').toString(),
            phoneNumber: userData.phoneNumber ? CryptoJS.AES.encrypt(userData.phoneNumber, 'secretKey').toString() : undefined
        };

        const response = await api.post<{ id: number; azureAdB2CId: string }>(
            API_BASE_PATH,
            encryptedData
        );

        return response.data;
    } catch (error: any) {
        if (error.response?.status === 409) {
            throw new UserApiError('User already exists', 409);
        }
        throw new UserApiError(
            'Failed to create user',
            error.response?.status || 500,
            error.response?.data
        );
    }
}

/**
 * Updates an existing user's profile with optimistic updates
 * @param id User identifier
 * @param userData User update data
 * @returns Promise resolving to void on success
 * @throws UserApiError if update fails
 */
export async function updateUser(id: number, userData: UpdateUserData): Promise<void> {
    // Get current cache entry
    const cached = userCache.get(id);
    
    try {
        // Encrypt sensitive PII data
        const encryptedData = {
            ...userData,
            firstName: userData.firstName ? CryptoJS.AES.encrypt(userData.firstName, 'secretKey').toString() : undefined,
            lastName: userData.lastName ? CryptoJS.AES.encrypt(userData.lastName, 'secretKey').toString() : undefined,
            phoneNumber: userData.phoneNumber ? CryptoJS.AES.encrypt(userData.phoneNumber, 'secretKey').toString() : undefined
        };

        // Optimistically update cache
        if (cached) {
            userCache.set(id, {
                data: { ...cached.data, ...userData },
                timestamp: Date.now()
            });
        }

        await api.put(`${API_BASE_PATH}/${id}`, encryptedData);
    } catch (error: any) {
        // Rollback cache on failure
        if (cached) {
            userCache.set(id, cached);
        }

        if (error.response?.status === 404) {
            throw new UserApiError('User not found', 404);
        }
        if (error.response?.status === 409) {
            throw new UserApiError('Concurrent update detected', 409);
        }
        throw new UserApiError(
            'Failed to update user',
            error.response?.status || 500,
            error.response?.data
        );
    }
}

/**
 * Invalidates the cache entry for a specific user
 * @param id User identifier
 */
export function invalidateUserCache(id: number): void {
    userCache.delete(id);
}

/**
 * Clears the entire user cache
 */
export function clearUserCache(): void {
    userCache.clear();
}