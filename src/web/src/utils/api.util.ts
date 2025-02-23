/**
 * @fileoverview API utility module providing a configured Axios instance with comprehensive
 * security, authentication, and error handling features for backend communication.
 * @version 1.0.0
 */

import axios from 'axios'; // ^1.0.0
import type { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import rateLimit from 'axios-rate-limit'; // ^1.3.0
import { Notify } from 'quasar'; // ^2.0.0
import { useEncryption } from '@/composables/useEncryption';
import type { AuthToken } from '../models/auth.model';
import { AuthStatus, isTokenExpired } from '../models/auth.model';

// Environment configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const API_VERSION = import.meta.env.VITE_APP_API_VERSION || 'v1';
const API_TIMEOUT = parseInt(import.meta.env.VITE_APP_API_TIMEOUT || '30000');
const MAX_RETRY_ATTEMPTS = parseInt(import.meta.env.VITE_APP_API_RETRY_ATTEMPTS || '3');
const RATE_LIMIT_PER_SECOND = 10;

// Initialize encryption utilities
const { encrypt, decrypt, sign, verify } = useEncryption();

// Token storage in memory (not persisted)
let currentAuthToken: AuthToken | null = null;
let tokenRefreshPromise: Promise<AuthToken> | null = null;

/**
 * Creates and configures an Axios instance with security and monitoring features
 */
const createApiInstance = (): AxiosInstance => {
    // Create base instance
    const instance = axios.create({
        baseURL: API_BASE_URL,
        timeout: API_TIMEOUT,
        headers: {
            'Content-Type': 'application/json',
            'X-Client-Version': import.meta.env.VITE_APP_VERSION || '1.0.0',
            'X-API-Version': API_VERSION
        }
    });

    console.log('[API Config] Environment:', {
        API_BASE_URL,
        API_VERSION,
        API_TIMEOUT,
        MAX_RETRY_ATTEMPTS
    });
    console.log('[API Config] Base URL:', API_BASE_URL);
    console.log('[API Config] Full config:', {
        baseURL: API_BASE_URL,
        timeout: API_TIMEOUT
    });

    // Apply rate limiting
    const rateLimitedInstance = rateLimit(instance, {
        maxRequests: RATE_LIMIT_PER_SECOND,
        perMilliseconds: 1000,
        maxRPS: RATE_LIMIT_PER_SECOND
    });

    // Request interceptor for authentication
    rateLimitedInstance.interceptors.request.use(
        async (config) => {
            const fullUrl = `${config.baseURL}${config.url}`;
            console.log(`[API Debug] Making request to: ${fullUrl}`);
            console.log(`[API Debug] Request config:`, {
                method: config.method,
                url: config.url,
                baseURL: config.baseURL,
                headers: config.headers
            });
            if (currentAuthToken && isTokenExpired(currentAuthToken)) {
                const newToken = await refreshAuthToken(currentAuthToken);
                currentAuthToken = newToken;
            }

            if (currentAuthToken) {
                config.headers.Authorization = `Bearer ${currentAuthToken.accessToken}`;
            }

            // Skip encryption for now since backend doesn't support it
            // if (config.data) {
            //     config.headers['X-Request-Signature'] = sign(JSON.stringify(config.data));
            //     config.data = encrypt(config.data);
            // }

            return config;
        },
        (error) => Promise.reject(error)
    );

    // Response interceptor for error handling and decryption
    rateLimitedInstance.interceptors.response.use(
        async (response) => {
            // Skip decryption since backend doesn't support it
            // if (response.data) {
            //     const decryptedData = decrypt(response.data);
            //     response.data = decryptedData;
            // }
            return response;
        },
        async (error: AxiosError) => {
            return handleApiError(error);
        }
    );

    return rateLimitedInstance;
};

/**
 * Sets the authentication token and configures the API instance
 * @param token The authentication token to set
 */
export const setAuthToken = (token: AuthToken): void => {
    if (!token || !token.accessToken || !token.refreshToken) {
        throw new Error('Invalid authentication token');
    }

    currentAuthToken = token;

    // Schedule token refresh before expiration
    const expiresIn = new Date(token.expiresAt).getTime() - Date.now();
    const refreshBuffer = 5 * 60 * 1000; // 5 minutes
    if (expiresIn > refreshBuffer) {
        setTimeout(() => {
            refreshAuthToken(token);
        }, expiresIn - refreshBuffer);
    }
};

/**
 * Refreshes the authentication token
 * @param currentToken The current authentication token
 * @returns Promise resolving to the new authentication token
 */
export const refreshAuthToken = async (currentToken: AuthToken): Promise<AuthToken> => {
    if (tokenRefreshPromise) {
        return tokenRefreshPromise;
    }

    tokenRefreshPromise = api
        .post<AuthToken>('/auth/refresh', {
            refreshToken: currentToken.refreshToken
        })
        .then((response) => {
            const newToken = response.data;
            setAuthToken(newToken);
            tokenRefreshPromise = null;
            return newToken;
        })
        .catch((error) => {
            tokenRefreshPromise = null;
            currentAuthToken = null;
            throw error;
        });

    return tokenRefreshPromise;
};

/**
 * Handles API errors with comprehensive error processing and retry logic
 * @param error The axios error to handle
 */
const handleApiError = async (error: AxiosError): Promise<never> => {
    const config = error.config as AxiosRequestConfig & { _retry?: number };
    
    // Handle network errors
    if (!error.response) {
        Notify.create({
            type: 'negative',
            message: 'Network error. Please check your connection.'
        });
        throw error;
    }

    // Handle authentication errors
    if (error.response.status === 401) {
        if (currentAuthToken && !config._retry) {
            config._retry = (config._retry || 0) + 1;
            if (config._retry <= MAX_RETRY_ATTEMPTS) {
                try {
                    await refreshAuthToken(currentAuthToken);
                    return api(config);
                } catch (refreshError) {
                    // Token refresh failed, clear authentication
                    currentAuthToken = null;
                    window.dispatchEvent(new CustomEvent('auth:logout'));
                }
            }
        }
        
        Notify.create({
            type: 'negative',
            message: 'Authentication failed. Please log in again.'
        });
    }

    // Handle validation errors
    if (error.response.status === 400) {
        Notify.create({
            type: 'warning',
            message: 'Invalid request. Please check your input.'
        });
    }

    // Handle server errors
    if (error.response.status >= 500) {
        Notify.create({
            type: 'negative',
            message: 'Server error. Please try again later.'
        });
    }

    throw error;
};

// Create and export the configured API instance
export const api = createApiInstance();

export default api;