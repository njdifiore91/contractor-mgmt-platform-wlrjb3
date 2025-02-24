/**
 * @fileoverview Vue.js composable providing enhanced authentication functionality with
 * Azure AD B2C integration, security monitoring, and session management.
 * @version 1.0.0
 */

import { ref, computed, effectScope, onScopeDispose } from 'vue';
import { useAuthStore } from '@/stores/auth.store';
import {
  type LoginCredentials,
  type DeviceInfo,
  AuthStatus,
  type AuthError,
  type MfaChallenge,
} from '../models/auth.model';
import { UserRoleType, UserRoles } from '@dummy-backend/models/user.model';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import type { IUser } from '@/models/user.model';
import {
  performAzureAuth,
  completeMfaChallenge,
  verifyTokenIntegrity,
} from '@/services/auth.service';
import { api } from '@/utils/api.util';
import { useStorage } from '@/composables/storage';

// Security configuration constants
const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes
const MAX_LOGIN_ATTEMPTS = 5;
const DEVICE_TRUST_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days
const SECURITY_CHECK_INTERVAL = 30000; // 30 seconds
const AUTH_API_BASE = '/api/auth';

interface SecurityEvent {
  type: string;
  timestamp: Date;
  details?: Record<string, unknown>;
}

/**
 * Composable that provides enhanced authentication functionality with security features
 */
export function useAuth() {
  const authStore = useAuthStore();
  const router = useRouter();
  const $q = useQuasar();

  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const currentUser = computed(() => authStore.user);
  const isAuthenticated = computed(() => authStore.authenticated);
  const mfaRequired = ref(false);
  const securityStatus = ref({ isLocked: false, mfaEnabled: false });
  const isInitialized = ref(false);

  const validateSession = async (): Promise<boolean> => {
    try {
      if (!isAuthenticated.value) return false;

      // Check if token is valid
      const isTokenValid = await verifyTokenIntegrity(authStore.tokens as any);
      if (!isTokenValid) {
        await logout();
        return false;
      }

      // Check if session is expired
      if (authStore.sessionTimeRemaining <= 0) {
        await logout();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Session validation failed:', error);
      await logout();
      return false;
    }
  };

  const refreshToken = async (): Promise<void> => {
    try {
      if (!authStore.tokens?.refreshToken) {
        throw new Error('No refresh token available');
      }

      await authStore.refreshToken();
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout();
    }
  };

  const handleSecurityEvent = async (event: SecurityEvent) => {
    try {
      // Log the security event
      authStore.logSecurityEvent(event.type as any, event.details || {});

      // Handle specific security events
      switch (event.type) {
        case 'SESSION_INVALID':
        case 'SECURITY_VIOLATION':
          await logout();
          break;
        default:
          console.warn('Unhandled security event:', event);
      }
    } catch (error) {
      console.error('Failed to handle security event:', error);
    }
  };

  const initializeAuth = async () => {
    if (isInitialized.value) return true;

    isLoading.value = true;
    error.value = null;

    try {
      // Try to initialize from stored session
      const hasValidSession = await authStore.initializeFromStorage();
      isInitialized.value = true;
      return hasValidSession;
    } catch (err) {
      console.error('Auth initialization failed:', err);
      error.value = 'Failed to initialize authentication';
      isInitialized.value = true;
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const login = async (credentials: LoginCredentials): Promise<void> => {
    isLoading.value = true;
    error.value = null;

    try {
      await authStore.login(credentials);

      // Navigate to dashboard or saved redirect
      const redirect = router.currentRoute.value.query.redirect as string;
      await router.push(redirect || '/dashboard');
    } catch (err: any) {
      error.value = err.message || 'Login failed';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const logout = async () => {
    isLoading.value = true;
    error.value = null;

    try {
      const { clearUserSession } = useStorage();

      // Clear all auth state and storage
      await authStore.clearAuth();
      await clearUserSession();

      // Clear additional storage items
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_session');
      localStorage.removeItem('user_session');
      sessionStorage.clear(); // Clear any session storage as well

      // Reset initialization state
      isInitialized.value = false;

      // Then redirect to login page
      await router.replace('/auth/login');
    } catch (err) {
      console.error('Logout failed:', err);
      error.value = 'Failed to logout';
    } finally {
      isLoading.value = false;
    }
  };

  const startSessionMonitoring = () => {
    // Monitor session status
    setInterval(async () => {
      const isValid = await checkAuthStatus();
      if (!isValid) {
        handleSecurityEvent({
          type: 'SESSION_INVALID',
          timestamp: new Date(),
        });
      }
    }, SECURITY_CHECK_INTERVAL);
  };

  const checkAuthStatus = async (): Promise<boolean> => {
    try {
      if (!authStore.isAuthenticated) return false;

      // Check token validity
      if (authStore.tokens && !authStore.isTokenValid) {
        await authStore.refreshToken();
      }

      // Check session validity
      const timeRemaining = authStore.sessionTimeRemaining;
      if (timeRemaining <= 0) {
        await logout();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Auth status check failed:', error);
      await logout();
      return false;
    }
  };

  const hasPermission = (permission: string): boolean => {
    const user = authStore.currentUser;
    if (!user || !user.permissions) {
      return false;
    }
    return user.permissions.includes(permission);
  };

  return {
    isLoading,
    error,
    currentUser,
    isAuthenticated,
    mfaRequired,
    securityStatus,
    isInitialized,
    initializeAuth,
    checkAuthStatus,
    handleSecurityEvent,
    logout,
    login,
    hasPermission,
    validateSession,
    refreshToken,
  };
}
