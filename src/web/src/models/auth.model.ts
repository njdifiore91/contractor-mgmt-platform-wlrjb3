/**
 * @fileoverview TypeScript model definitions for authentication-related entities in the frontend application.
 * Implements comprehensive authentication flows with Azure AD B2C integration and token management.
 * @version 1.0.0
 */

import { IUser } from './user.model';

/**
 * Interface representing login credentials for Azure AD B2C authentication.
 * Supports both standard and MFA-enabled login flows.
 */
export interface LoginCredentials {
    /** User's email address for authentication */
    email: string;
    
    /** User's password (only used for initial auth, not stored) */
    password: string;
    
    /** Azure AD B2C client identifier */
    clientId: string;
    
    /** Flag to enable persistent session */
    rememberMe: boolean;
}

/**
 * Interface representing JWT authentication tokens from Azure AD B2C.
 * Includes comprehensive token metadata and expiration tracking.
 */
export interface AuthToken {
    /** JWT access token for API authorization */
    accessToken: string;
    
    /** Refresh token for obtaining new access tokens */
    refreshToken: string;
    
    /** ID token containing user claims */
    idToken: string;
    
    /** Token type (typically 'Bearer') */
    tokenType: string;
    
    /** Array of granted OAuth scopes */
    scope: string[];
    
    /** Token lifetime in seconds */
    expiresIn: number;
    
    /** Calculated absolute expiration timestamp */
    expiresAt: Date;
}

/**
 * Interface for tracking user session state and activity.
 * Supports comprehensive session management and security tracking.
 */
export interface UserSession {
    /** Unique session identifier */
    sessionId: string;
    
    /** Reference to authenticated user ID */
    userId: number;
    
    /** Flag indicating active authentication state */
    isAuthenticated: boolean;
    
    /** Array of user's active roles */
    roles: string[];
    
    /** Timestamp of last session activity */
    lastActivityAt: Date;
    
    /** Device information for security tracking */
    deviceInfo: DeviceInfo;
    
    /** Refresh token expiration timestamp */
    refreshTokenExpiry: Date;
}

/**
 * Interface for tracking device-specific session information.
 * Enhances security monitoring and session management.
 */
export interface DeviceInfo {
    /** Unique device identifier */
    deviceId: string;
    
    /** Browser/client user agent string */
    userAgent: string;
    
    /** Client IP address */
    ipAddress: string;
}

/**
 * Enumeration of possible authentication states.
 * Supports granular tracking of authentication flow status.
 */
export enum AuthStatus {
    /** User is fully authenticated */
    AUTHENTICATED = 'AUTHENTICATED',
    
    /** No active authentication */
    UNAUTHENTICATED = 'UNAUTHENTICATED',
    
    /** Authentication in progress */
    PENDING = 'PENDING',
    
    /** Token refresh in progress */
    REFRESHING = 'REFRESHING',
    
    /** Multi-factor authentication required */
    MFA_REQUIRED = 'MFA_REQUIRED',
    
    /** Session has expired */
    SESSION_EXPIRED = 'SESSION_EXPIRED',
    
    /** Authentication error occurred */
    ERROR = 'ERROR'
}

/**
 * Type guard to check if a token is expired
 * @param token The authentication token to check
 * @returns boolean indicating if the token is expired
 */
export function isTokenExpired(token: AuthToken): boolean {
    return token.expiresAt < new Date();
}

/**
 * Type guard to check if a session is valid
 * @param session The user session to validate
 * @returns boolean indicating if the session is valid
 */
export function isValidSession(session: UserSession): boolean {
    const sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const timeSinceLastActivity = Date.now() - session.lastActivityAt.getTime();
    return session.isAuthenticated && timeSinceLastActivity < sessionTimeout;
}

/**
 * Type representing the possible authentication errors
 */
export type AuthError = {
    code: string;
    message: string;
    details?: Record<string, unknown>;
};

/**
 * Interface for MFA challenge response
 */
export interface MfaChallenge {
    challengeType: 'sms' | 'email' | 'authenticator';
    challengeId: string;
    expiresAt: Date;
}

/**
 * Interface for MFA verification request
 */
export interface MfaVerification {
    challengeId: string;
    verificationCode: string;
}