/**
 * @fileoverview Composable for handling secure storage operations
 * @version 1.0.0
 */

import type { AuthToken, UserSession } from '@/models/auth.model';

const AUTH_TOKEN_KEY = 'auth_token';
const USER_SESSION_KEY = 'user_session';

export function useStorage() {
    const getAuthToken = (): AuthToken | null => {
        try {
            const tokenData = localStorage.getItem(AUTH_TOKEN_KEY);
            if (!tokenData) return null;
            const token = JSON.parse(tokenData);
            // Convert date strings back to Date objects
            if (token.expiresAt) {
                token.expiresAt = new Date(token.expiresAt);
            }
            return token;
        } catch (error) {
            console.error('Failed to get auth token:', error);
            return null;
        }
    };

    const saveAuthToken = (token: AuthToken): void => {
        try {
            localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(token));
        } catch (error) {
            console.error('Failed to save auth token:', error);
        }
    };

    const getUserSession = (): UserSession | null => {
        try {
            const sessionData = localStorage.getItem(USER_SESSION_KEY);
            if (!sessionData) return null;
            const session = JSON.parse(sessionData);
            // Convert date strings back to Date objects
            if (session.lastActivityAt) {
                session.lastActivityAt = new Date(session.lastActivityAt);
            }
            if (session.refreshTokenExpiry) {
                session.refreshTokenExpiry = new Date(session.refreshTokenExpiry);
            }
            return session;
        } catch (error) {
            console.error('Failed to get user session:', error);
            return null;
        }
    };

    const saveUserSession = (session: UserSession): void => {
        try {
            localStorage.setItem(USER_SESSION_KEY, JSON.stringify(session));
        } catch (error) {
            console.error('Failed to save user session:', error);
        }
    };

    const clearUserSession = (): void => {
        try {
            localStorage.removeItem(AUTH_TOKEN_KEY);
            localStorage.removeItem(USER_SESSION_KEY);
        } catch (error) {
            console.error('Failed to clear user session:', error);
        }
    };

    return {
        getAuthToken,
        saveAuthToken,
        getUserSession,
        saveUserSession,
        clearUserSession
    };
} 