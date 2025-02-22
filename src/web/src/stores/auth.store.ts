/**
 * @fileoverview Pinia store for managing authentication state and operations.
 * Implements secure token management, session tracking, and security monitoring
 * with Azure AD B2C integration.
 * @version 1.0.0
 */

import { defineStore } from 'pinia'; // ^2.1.0
import { useEncryption } from '@/composables/encryption'; // ^1.0.0
import { 
    LoginCredentials, 
    AuthToken, 
    UserSession, 
    AuthStatus, 
    AuthError,
    MfaChallenge,
    isTokenExpired,
    isValidSession 
} from '../models/auth.model';
import { IUser, UserRoleType } from '../models/user.model';

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

interface AuthState {
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
            return this.authStatus === AuthStatus.AUTHENTICATED && 
                   !!this.tokens && 
                   !isTokenExpired(this.tokens);
        },

        isTokenValid(): boolean {
            return !!this.tokens && !isTokenExpired(this.tokens);
        },

        hasRole: (state) => (role: UserRoleType): boolean => {
            return state.user?.userRoles.some(ur => ur.roleId === UserRoleType[role]) ?? false;
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
                this.authStatus = AuthStatus.PENDING;
                this.recordLoginAttempt();

                if (this.isLoginThrottled()) {
                    throw new Error('Too many login attempts. Please try again later.');
                }

                // Perform Azure AD B2C authentication
                const response = await this.performAzureAuth(credentials);

                if (response.requiresMfa) {
                    this.authStatus = AuthStatus.MFA_REQUIRED;
                    this.mfaChallenge = response.mfaChallenge;
                    return;
                }

                await this.handleAuthSuccess(response);
                this.monitorSecurityEvents();
                this.startSessionHeartbeat();

            } catch (error) {
                this.handleAuthError(error);
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

                const response = await this.completeMfaChallenge(verificationCode);
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
                const response = await this.performTokenRefresh(this.tokens.refreshToken);
                
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
            try {
                if (this.session) {
                    await this.terminateSession(this.session.sessionId);
                }
            } finally {
                this.resetState();
                this.logSecurityEvent('LOGIN_SUCCESS', { type: 'logout' });
            }
        },

        /**
         * Records a login attempt and checks for potential security violations
         */
        private recordLoginAttempt(): void {
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
        private isLoginThrottled(): boolean {
            const recentAttempts = this.loginAttempts.filter(attempt => 
                Date.now() - attempt.timestamp.getTime() < LOGIN_ATTEMPT_WINDOW
            );
            return recentAttempts.length >= LOGIN_ATTEMPT_LIMIT;
        },

        /**
         * Handles successful authentication
         */
        private async handleAuthSuccess(response: any): Promise<void> {
            const { encrypt } = useEncryption();
            
            this.tokens = response.tokens;
            this.user = response.user;
            this.session = {
                sessionId: crypto.randomUUID(),
                userId: response.user.id,
                isAuthenticated: true,
                roles: response.user.userRoles.map(ur => ur.roleId),
                lastActivityAt: new Date(),
                deviceInfo: await this.captureDeviceInfo(),
                refreshTokenExpiry: new Date(Date.now() + response.tokens.expiresIn * 1000)
            };

            this.authStatus = AuthStatus.AUTHENTICATED;
            this.loginAttempts = [];
            this.logSecurityEvent('LOGIN_SUCCESS', { userId: this.user.id });
        },

        /**
         * Handles authentication errors
         */
        private handleAuthError(error: any): void {
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
        private monitorSecurityEvents(): void {
            // Monitor for concurrent sessions
            window.addEventListener('storage', (event) => {
                if (event.key === 'auth_session' && event.newValue !== event.oldValue) {
                    this.handleSecurityViolation('CONCURRENT_SESSION');
                }
            });

            // Monitor for token tampering
            setInterval(() => {
                if (this.tokens && !this.verifyTokenIntegrity(this.tokens)) {
                    this.handleSecurityViolation('TOKEN_TAMPERING');
                }
            }, 30000);
        },

        /**
         * Handles detected security violations
         */
        private async handleSecurityViolation(type: string): Promise<void> {
            this.logSecurityEvent('SECURITY_VIOLATION', { type });
            await this.logout();
        },

        /**
         * Logs security events for monitoring
         */
        private logSecurityEvent(type: SecurityEvent['type'], details: Record<string, unknown>): void {
            this.securityEvents.push({
                type,
                timestamp: new Date(),
                details: {
                    ...details,
                    deviceInfo: this.session?.deviceInfo
                }
            });
        },

        /**
         * Maintains session activity and handles timeouts
         */
        private startSessionHeartbeat(): void {
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
        private resetState(): void {
            this.tokens = null;
            this.session = null;
            this.user = null;
            this.authStatus = AuthStatus.UNAUTHENTICATED;
            this.mfaChallenge = null;
            this.lastError = null;
        }
    }
});