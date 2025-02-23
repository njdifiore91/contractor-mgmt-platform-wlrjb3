/**
 * @fileoverview TypeScript model definitions for authentication-related entities in the frontend application.
 * Implements comprehensive authentication flows with Azure AD B2C integration and token management.
 * @version 1.0.0
 */

import type { IUser } from './user.model';

/**
 * Authentication status enum
 */
export const enum AuthStatus {
    UNAUTHENTICATED = 'UNAUTHENTICATED',
    PENDING = 'PENDING',
    AUTHENTICATED = 'AUTHENTICATED',
    MFA_REQUIRED = 'MFA_REQUIRED',
    REFRESHING = 'REFRESHING',
    ERROR = 'ERROR'
}

/**
 * Login credentials type
 */
export type LoginCredentials = {
    email: string;
    password: string;
    rememberMe?: boolean;
};

/**
 * Authentication token type
 */
export type AuthToken = {
    accessToken: string;
    refreshToken: string;
    idToken: string;
    tokenType: string;
    scope: string[];
    expiresIn: number;
    expiresAt: Date;
};

/**
 * MFA challenge type
 */
export type MfaChallenge = {
    challengeId: string;
    method: 'SMS' | 'EMAIL' | 'AUTHENTICATOR';
    destination?: string;
    expiresAt: Date;
};

/**
 * Device info type
 */
export type DeviceInfo = {
    deviceId: string;
    userAgent: string;
    ipAddress: string;
};

/**
 * User session type
 */
export type UserSession = {
    sessionId: string;
    userId: number;
    isAuthenticated: boolean;
    roles: string[];
    lastActivityAt: Date;
    deviceInfo: DeviceInfo;
    refreshTokenExpiry: Date;
    user: IUser;
};

/**
 * Authentication error type
 */
export type AuthError = {
    code: string;
    message: string;
    details?: Record<string, unknown>;
};

/**
 * Helper function to check if a token is expired
 */
export function isTokenExpired(token: AuthToken): boolean {
    return new Date() >= token.expiresAt;
}

/**
 * Helper function to check if a session is valid
 */
export function isValidSession(session: UserSession): boolean {
    return session.isAuthenticated && 
           new Date() < session.refreshTokenExpiry &&
           session.lastActivityAt != null;
}

/**
 * Helper function to validate login credentials
 */
export function validateCredentials(credentials: LoginCredentials): boolean {
    return !!(credentials.email && 
             credentials.email.includes('@') && 
             credentials.password && 
             credentials.password.length >= 8);
}

/**
 * MFA verification type
 */
export type MfaVerification = {
    challengeId: string;
    verificationCode: string;
};