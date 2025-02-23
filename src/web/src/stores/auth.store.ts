/**
 * @fileoverview Pinia store for managing authentication state and operations.
 * Implements secure token management, session tracking, and security monitoring
 * with Azure AD B2C integration.
 * @version 1.0.0
 */

import { defineStore } from 'pinia'; // ^2.1.0
import { useEncryption } from '@/composables/encryption'; // ^1.0.0
import type { 
    LoginCredentials, 
    AuthToken, 
    UserSession, 
    AuthError,
    MfaChallenge
} from '@/models/auth.model';
import { 
    AuthStatus,
    isTokenExpired,
    isValidSession 
} from '@/models/auth.model';
import type { IUser } from '@/models/user.model';
import { UserRoleType } from '@/models/user.model';
import {
    performAzureAuth,
    completeMfaChallenge,
    performTokenRefresh,
    terminateSession,
    verifyTokenIntegrity,
    captureDeviceInfo
} from '@/services/auth.service';
import { useStorage } from '@/composables/storage'; // ^1.0.0

// Security monitoring constants
const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry

interface SecurityEvent {
    type: 'LOGIN_ATTEMPT' | 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'TOKEN_REFRESH' | 'SESSION_EXPIRED' | 'SECURITY_VIOLATION';
    timestamp: Date;
    details: Record<string, unknown>;
}

interface User {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    permissions: string[];
    lastLoginAt: string;
}

interface AuthState {
    currentUser: User | null;
    authenticated: boolean;
    tokens: AuthToken | null;
    session: UserSession | null;
    user: IUser | null;
    authStatus: AuthStatus;
    securityEvents: SecurityEvent[];
    loginAttempts: { timestamp: Date; success: boolean }[];
    mfaChallenge: MfaChallenge | null;
    lastError: AuthError | null;
}

export const useAuthStore = defineStore('auth', {
    state: (): AuthState => ({
        currentUser: {
            id: 1,
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            permissions: ['CreateInspector', 'AssignEquipment', 'ProcessDrugTest'],
            lastLoginAt: new Date().toISOString()
        },
        authenticated: true,
        tokens: null,
        session: null,
        user: null,
        authStatus: AuthStatus.UNAUTHENTICATED,
        securityEvents: [],
        loginAttempts: [],
        mfaChallenge: null,
        lastError: null
    }),

    getters: {
        isAuthenticated(): boolean {
            return this.authenticated;
        },

        isTokenValid(): boolean {
            return !!this.tokens && !isTokenExpired(this.tokens);
        },

        hasRole: (state) => (role: UserRoleType): boolean => {
            if (!state.user?.userRoles) return false;
            if (role === UserRoleType.Any) return true;
            
            const roleMap = {
                [UserRoleType.Admin]: 1,
                [UserRoleType.Operations]: 2,
                [UserRoleType.Inspector]: 3,
                [UserRoleType.CustomerService]: 4
            };
            return state.user.userRoles.some(ur => ur.roleId === roleMap[role]);
        },

        sessionTimeRemaining(): number {
            if (!this.session?.lastActivityAt) return 0;
            return Math.max(0, SESSION_TIMEOUT - 
                (Date.now() - this.session.lastActivityAt.getTime()));
        }
    },

    actions: {
        /**
         * Attempts to authenticate a user with the provided credentials
         */
        async login(credentials: LoginCredentials): Promise<void> {
            try {
                // Reset any previous state
                this.resetState();
                this.authStatus = AuthStatus.PENDING;
                this.recordLoginAttempt();

                if (this.isLoginThrottled()) {
                    throw new Error('Too many login attempts. Please try again later.');
                }

                // Perform authentication
                const response = await performAzureAuth(credentials);

                if (response.requiresMfa && response.mfaChallenge) {
                    this.authStatus = AuthStatus.MFA_REQUIRED;
                    this.mfaChallenge = response.mfaChallenge;
                    return;
                }

                await this.handleAuthSuccess(response);

            } catch (error) {
                this.handleAuthError(error);
                throw error; // Re-throw to handle in the UI
            }
        },

        /**
         * Handles MFA verification process
         */
        async verifyMfa(verificationCode: string): Promise<void> {
            try {
                if (!this.mfaChallenge) {
                    throw new Error('No MFA challenge active');
                }

                const response = await completeMfaChallenge(verificationCode);
                await this.handleAuthSuccess(response);

            } catch (error) {
                this.handleAuthError(error);
            }
        },

        /**
         * Refreshes the authentication token
         */
        async refreshToken(): Promise<void> {
            try {
                if (!this.tokens?.refreshToken) {
                    throw new Error('No refresh token available');
                }

                this.authStatus = AuthStatus.REFRESHING;
                const response = await performTokenRefresh(this.tokens.refreshToken);
                
                this.tokens = response.tokens;
                this.logSecurityEvent('TOKEN_REFRESH', { success: true });

            } catch (error) {
                this.handleAuthError(error);
                await this.logout();
            }
        },

        /**
         * Logs out the current user and cleans up the session
         */
        async logout(): Promise<void> {
            const { clearUserSession } = useStorage();
            
            try {
                if (this.session) {
                    await terminateSession(this.session.sessionId);
                }
            } finally {
                // Clear storage
                await clearUserSession();
                
                // Reset state
                this.tokens = null;
                this.session = null;
                this.user = null;
                this.authStatus = AuthStatus.UNAUTHENTICATED;
                this.securityEvents = [];
                this.loginAttempts = [];
                this.mfaChallenge = null;
                this.lastError = null;
                this.authenticated = false;
            }
        },

        /**
         * Records a login attempt and checks for potential security violations
         */
        recordLoginAttempt(): void {
            const now = new Date();
            this.loginAttempts = [
                ...this.loginAttempts.filter(attempt => 
                    now.getTime() - attempt.timestamp.getTime() < LOGIN_ATTEMPT_WINDOW
                ),
                { timestamp: now, success: false }
            ];
        },

        /**
         * Checks if login attempts should be throttled
         */
        isLoginThrottled(): boolean {
            const recentAttempts = this.loginAttempts.filter(attempt => 
                Date.now() - attempt.timestamp.getTime() < LOGIN_ATTEMPT_WINDOW
            );
            return recentAttempts.length >= LOGIN_ATTEMPT_LIMIT;
        },

        /**
         * Handles successful authentication
         */
        async handleAuthSuccess(response: any): Promise<void> {
            const { encrypt } = useEncryption();
            const { saveAuthToken, saveUserSession } = useStorage();
            
            if (response.tokens) {
                this.tokens = response.tokens;
                await saveAuthToken(response.tokens);
            }
            
            this.user = response.user;
            this.session = {
                sessionId: crypto.randomUUID(),
                userId: response.user.id,
                isAuthenticated: true,
                roles: response.user.userRoles.map((ur: { roleId: string }) => ur.roleId),
                lastActivityAt: new Date(),
                deviceInfo: await captureDeviceInfo(),
                refreshTokenExpiry: new Date(Date.now() + response.tokens.expiresIn * 1000),
                user: response.user
            };

            // Save to storage
            await saveUserSession(this.session);

            this.authStatus = AuthStatus.AUTHENTICATED;
            this.loginAttempts = [];
            if (this.user) {
                this.logSecurityEvent('LOGIN_SUCCESS', { userId: this.user.id });
            }
            this.authenticated = true;
        },

        /**
         * Handles authentication errors
         */
        handleAuthError(error: any): void {
            this.authStatus = AuthStatus.ERROR;
            this.lastError = {
                code: error.code || 'AUTH_ERROR',
                message: error.message || 'Authentication failed',
                details: error.details
            };
            this.logSecurityEvent('LOGIN_FAILURE', { error: this.lastError });
        },

        /**
         * Monitors for security events and potential violations
         */
        monitorSecurityEvents(): void {
            // Monitor for concurrent sessions
            window.addEventListener('storage', (event) => {
                if (event.key === 'auth_session' && event.newValue !== event.oldValue) {
                    this.handleSecurityViolation('CONCURRENT_SESSION');
                }
            });

            // Monitor for token tampering
            setInterval(() => {
                if (this.tokens && !verifyTokenIntegrity(this.tokens)) {
                    this.handleSecurityViolation('TOKEN_TAMPERING');
                }
            }, 30000);
        },

        /**
         * Handles detected security violations
         */
        async handleSecurityViolation(type: string): Promise<void> {
            this.logSecurityEvent('SECURITY_VIOLATION', { type });
            await this.logout();
        },

        /**
         * Logs security events for monitoring
         */
        logSecurityEvent(type: SecurityEvent['type'], details: Record<string, unknown>) {
            this.securityEvents.push({
                type,
                timestamp: new Date(),
                details
            });
        },

        /**
         * Maintains session activity and handles timeouts
         */
        startSessionHeartbeat(): void {
            setInterval(() => {
                if (this.session) {
                    this.session.lastActivityAt = new Date();
                }

                if (this.tokens && 
                    this.tokens.expiresAt.getTime() - Date.now() < TOKEN_REFRESH_THRESHOLD) {
                    this.refreshToken();
                }
            }, 60000);
        },

        /**
         * Resets the store state
         */
        resetState(): void {
            this.tokens = null;
            this.session = null;
            this.user = null;
            this.authStatus = AuthStatus.UNAUTHENTICATED;
            this.mfaChallenge = null;
            this.lastError = null;
        },

        async initializeFromStorage(): Promise<boolean> {
            const { getAuthToken, getUserSession } = useStorage();
            
            try {
                // Load tokens and session from storage
                const storedToken = await getAuthToken();
                const storedSession = await getUserSession();

                if (storedToken && storedSession) {
                    // Validate token and session
                    if (!isTokenExpired(storedToken) && isValidSession(storedSession)) {
                        this.tokens = storedToken;
                        this.session = storedSession;
                        this.user = storedSession.user;
                        this.authStatus = AuthStatus.AUTHENTICATED;
                        this.authenticated = true;
                        
                        // Start monitoring
                        this.monitorSecurityEvents();
                        this.startSessionHeartbeat();
                        return true;
                    }
                }
                
                // Clear invalid session
                await this.clearAuth();
                return false;
            } catch (error) {
                console.error('Failed to initialize from storage:', error);
                await this.clearAuth();
                return false;
            }
        },

        async clearAuth() {
            this.tokens = null;
            this.session = null;
            this.user = null;
            this.authStatus = AuthStatus.UNAUTHENTICATED;
            this.mfaChallenge = null;
            this.loginAttempts = [];
            // Keep security events for audit purposes
            localStorage.removeItem('auth_tokens');
            localStorage.removeItem('auth_session');
            this.authenticated = false;
        },

        setUser(user: User) {
            this.currentUser = user;
            this.authenticated = true;
        },

        clearUser() {
            this.currentUser = null;
            this.authenticated = false;
        }
    }
});