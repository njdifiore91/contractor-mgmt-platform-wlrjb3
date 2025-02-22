/**
 * @fileoverview Vue.js composable providing enhanced authentication functionality with 
 * Azure AD B2C integration, security monitoring, and session management.
 * @version 1.0.0
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'; // ^3.3.0
import { 
    useAuthStore,
    type SecurityEvent 
} from '../stores/auth.store';
import { 
    type LoginCredentials,
    type DeviceInfo,
    AuthStatus,
    type AuthError,
    type MfaChallenge 
} from '../models/auth.model';

// Security configuration constants
const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes
const MAX_LOGIN_ATTEMPTS = 5;
const DEVICE_TRUST_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days
const SECURITY_CHECK_INTERVAL = 30 * 1000; // 30 seconds

/**
 * Composable that provides enhanced authentication functionality with security features
 */
export function useAuth() {
    const authStore = useAuthStore();
    
    // Reactive state
    const isLoading = ref(false);
    const error = ref<string | null>(null);
    const mfaRequired = ref(false);
    const loginAttempts = ref<Date[]>([]);
    const securityCheckInterval = ref<number | null>(null);
    
    // Computed properties
    const isAuthenticated = computed(() => authStore.isAuthenticated);
    const currentUser = computed(() => authStore.user);
    const securityStatus = computed(() => ({
        isLocked: isRateLimited.value,
        lastActivity: authStore.session?.lastActivityAt,
        deviceTrusted: checkDeviceTrust(),
        mfaEnabled: !!authStore.user?.userRoles.some(r => r.roleId === 'Admin')
    }));
    
    // Rate limiting check
    const isRateLimited = computed(() => {
        const recentAttempts = loginAttempts.value.filter(
            timestamp => Date.now() - timestamp.getTime() < RATE_LIMIT_WINDOW
        );
        return recentAttempts.length >= MAX_LOGIN_ATTEMPTS;
    });

    /**
     * Handles user login with enhanced security checks
     */
    const login = async (credentials: LoginCredentials): Promise<void> => {
        try {
            if (isRateLimited.value) {
                throw new Error('Too many login attempts. Please try again later.');
            }

            isLoading.value = true;
            error.value = null;
            loginAttempts.value.push(new Date());

            // Enhance credentials with device information
            const deviceInfo = await captureDeviceInfo();
            const enhancedCredentials = { ...credentials, deviceInfo };

            // Attempt login
            await authStore.login(enhancedCredentials);

            // Handle MFA if required
            if (authStore.authStatus === AuthStatus.MFA_REQUIRED) {
                mfaRequired.value = true;
                return;
            }

            // Setup security monitoring
            initializeSecurityMonitoring();

        } catch (err) {
            handleError(err);
        } finally {
            isLoading.value = false;
        }
    };

    /**
     * Handles MFA verification process
     */
    const verifyMfa = async (code: string): Promise<void> => {
        try {
            isLoading.value = true;
            error.value = null;

            await authStore.verifyMfa(code);
            mfaRequired.value = false;
            initializeSecurityMonitoring();

        } catch (err) {
            handleError(err);
        } finally {
            isLoading.value = false;
        }
    };

    /**
     * Handles user logout with cleanup
     */
    const logout = async (): Promise<void> => {
        try {
            isLoading.value = true;
            await authStore.logout();
            cleanupSecurityMonitoring();
        } finally {
            isLoading.value = false;
        }
    };

    /**
     * Captures device information for security tracking
     */
    const captureDeviceInfo = async (): Promise<DeviceInfo> => {
        return {
            deviceId: await generateDeviceId(),
            userAgent: navigator.userAgent,
            ipAddress: await fetchClientIp()
        };
    };

    /**
     * Generates a unique device identifier
     */
    const generateDeviceId = async (): Promise<string> => {
        const buffer = await crypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(navigator.userAgent + navigator.language + screen.width + screen.height)
        );
        return Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    };

    /**
     * Fetches client IP address through a secure endpoint
     */
    const fetchClientIp = async (): Promise<string> => {
        try {
            const response = await fetch('/api/v1/security/client-ip');
            const data = await response.json();
            return data.ip;
        } catch {
            return 'unknown';
        }
    };

    /**
     * Initializes security monitoring
     */
    const initializeSecurityMonitoring = (): void => {
        cleanupSecurityMonitoring();
        
        securityCheckInterval.value = window.setInterval(() => {
            // Check token validity
            if (authStore.tokens && !authStore.isTokenValid) {
                handleSecurityEvent({
                    type: 'TOKEN_REFRESH',
                    timestamp: new Date(),
                    details: { reason: 'token_expired' }
                });
            }

            // Check session activity
            if (authStore.session && !authStore.sessionTimeRemaining) {
                handleSecurityEvent({
                    type: 'SESSION_EXPIRED',
                    timestamp: new Date(),
                    details: { reason: 'inactivity' }
                });
            }
        }, SECURITY_CHECK_INTERVAL);
    };

    /**
     * Cleans up security monitoring
     */
    const cleanupSecurityMonitoring = (): void => {
        if (securityCheckInterval.value) {
            clearInterval(securityCheckInterval.value);
            securityCheckInterval.value = null;
        }
    };

    /**
     * Checks if the current device is trusted
     */
    const checkDeviceTrust = (): boolean => {
        try {
            const trustData = localStorage.getItem('device_trust');
            if (!trustData) return false;

            const { timestamp, deviceId } = JSON.parse(trustData);
            return Date.now() - timestamp < DEVICE_TRUST_EXPIRY && 
                   deviceId === authStore.session?.deviceInfo.deviceId;
        } catch {
            return false;
        }
    };

    /**
     * Handles security events
     */
    const handleSecurityEvent = async (event: SecurityEvent): Promise<void> => {
        await authStore.trackSecurityEvent(event);

        switch (event.type) {
            case 'SESSION_EXPIRED':
                await logout();
                error.value = 'Your session has expired. Please log in again.';
                break;
            case 'SECURITY_VIOLATION':
                await logout();
                error.value = 'A security violation was detected. Please contact support.';
                break;
        }
    };

    /**
     * Handles authentication errors
     */
    const handleError = (err: unknown): void => {
        const authError = err as AuthError;
        error.value = authError.message || 'An authentication error occurred';
        
        handleSecurityEvent({
            type: 'LOGIN_FAILURE',
            timestamp: new Date(),
            details: { error: authError }
        });
    };

    // Lifecycle hooks
    onMounted(() => {
        if (isAuthenticated.value) {
            initializeSecurityMonitoring();
        }
    });

    onUnmounted(() => {
        cleanupSecurityMonitoring();
    });

    return {
        // State
        isLoading,
        error,
        mfaRequired,
        isAuthenticated,
        currentUser,
        securityStatus,

        // Methods
        login,
        logout,
        verifyMfa,
        handleSecurityEvent
    };
}