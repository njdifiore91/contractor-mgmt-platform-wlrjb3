/**
 * @fileoverview Unit tests for the authentication Pinia store
 * Tests authentication flows, token management, and security monitoring
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'; // ^0.34.0
import { createPinia, setActivePinia } from 'pinia'; // ^2.1.0
import { useAuthStore } from '@/stores/auth.store';
import { AuthStatus, LoginCredentials } from '@/models/auth.model';

// Mock crypto for UUID generation
const mockCrypto = {
  randomUUID: () => '12345678-1234-1234-1234-123456789012'
};
global.crypto = mockCrypto as Crypto;

// Mock current date for consistent testing
const mockDate = new Date('2023-12-01T12:00:00Z');
vi.setSystemTime(mockDate);

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const store = useAuthStore();
      
      expect(store.tokens).toBeNull();
      expect(store.session).toBeNull();
      expect(store.user).toBeNull();
      expect(store.authStatus).toBe(AuthStatus.UNAUTHENTICATED);
      expect(store.securityEvents).toEqual([]);
      expect(store.loginAttempts).toEqual([]);
      expect(store.mfaChallenge).toBeNull();
      expect(store.lastError).toBeNull();
    });
  });

  describe('login flow', () => {
    const mockCredentials: LoginCredentials = {
      email: 'test@example.com',
      password: 'TestPass123!',
      clientId: 'test-client',
      rememberMe: false
    };

    const mockAuthResponse = {
      tokens: {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        idToken: 'mock-id-token',
        tokenType: 'Bearer',
        scope: ['openid', 'profile'],
        expiresIn: 3600,
        expiresAt: new Date(mockDate.getTime() + 3600 * 1000)
      },
      user: {
        id: 1,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        userRoles: [{ roleId: 'Admin' }],
        isActive: true
      }
    };

    it('should handle successful login without MFA', async () => {
      const store = useAuthStore();
      vi.spyOn(store, 'performAzureAuth' as any).mockResolvedValue({
        ...mockAuthResponse,
        requiresMfa: false
      });

      await store.login(mockCredentials);

      expect(store.authStatus).toBe(AuthStatus.AUTHENTICATED);
      expect(store.tokens).toEqual(mockAuthResponse.tokens);
      expect(store.user).toEqual(mockAuthResponse.user);
      expect(store.securityEvents[0]).toMatchObject({
        type: 'LOGIN_SUCCESS',
        details: { userId: 1 }
      });
    });

    it('should handle MFA challenge', async () => {
      const store = useAuthStore();
      const mockMfaChallenge = {
        challengeType: 'sms' as const,
        challengeId: 'mock-challenge',
        expiresAt: new Date(mockDate.getTime() + 300 * 1000)
      };

      vi.spyOn(store, 'performAzureAuth' as any).mockResolvedValue({
        requiresMfa: true,
        mfaChallenge: mockMfaChallenge
      });

      await store.login(mockCredentials);

      expect(store.authStatus).toBe(AuthStatus.MFA_REQUIRED);
      expect(store.mfaChallenge).toEqual(mockMfaChallenge);
      expect(store.tokens).toBeNull();
    });

    it('should handle login throttling', async () => {
      const store = useAuthStore();
      
      // Simulate multiple failed login attempts
      for (let i = 0; i < 5; i++) {
        store.loginAttempts.push({
          timestamp: new Date(mockDate.getTime() - 60000),
          success: false
        });
      }

      await store.login(mockCredentials);

      expect(store.authStatus).toBe(AuthStatus.ERROR);
      expect(store.lastError?.message).toContain('Too many login attempts');
    });
  });

  describe('token management', () => {
    it('should handle token refresh', async () => {
      const store = useAuthStore();
      const mockNewTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresAt: new Date(mockDate.getTime() + 3600 * 1000)
      };

      store.tokens = {
        ...mockNewTokens,
        idToken: 'mock-id-token',
        tokenType: 'Bearer',
        scope: ['openid'],
        expiresIn: 3600
      };

      vi.spyOn(store, 'performTokenRefresh' as any).mockResolvedValue({
        tokens: mockNewTokens
      });

      await store.refreshToken();

      expect(store.tokens?.accessToken).toBe('new-access-token');
      expect(store.securityEvents).toContainEqual(
        expect.objectContaining({
          type: 'TOKEN_REFRESH',
          details: { success: true }
        })
      );
    });

    it('should handle token refresh failure', async () => {
      const store = useAuthStore();
      store.tokens = {
        accessToken: 'old-token',
        refreshToken: 'old-refresh',
        idToken: 'old-id-token',
        tokenType: 'Bearer',
        scope: ['openid'],
        expiresIn: 3600,
        expiresAt: new Date()
      };

      vi.spyOn(store, 'performTokenRefresh' as any).mockRejectedValue(
        new Error('Refresh failed')
      );

      await store.refreshToken();

      expect(store.tokens).toBeNull();
      expect(store.authStatus).toBe(AuthStatus.UNAUTHENTICATED);
      expect(store.securityEvents).toContainEqual(
        expect.objectContaining({
          type: 'LOGIN_FAILURE'
        })
      );
    });
  });

  describe('security monitoring', () => {
    it('should detect concurrent sessions', async () => {
      const store = useAuthStore();
      const mockStorageEvent = new StorageEvent('storage', {
        key: 'auth_session',
        oldValue: 'old-session',
        newValue: 'new-session'
      });

      // Initialize store with session
      store.session = {
        sessionId: 'test-session',
        userId: 1,
        isAuthenticated: true,
        roles: ['Admin'],
        lastActivityAt: new Date(),
        deviceInfo: {
          deviceId: 'test-device',
          userAgent: 'test-agent',
          ipAddress: '127.0.0.1'
        },
        refreshTokenExpiry: new Date(mockDate.getTime() + 86400000)
      };

      // Trigger storage event
      window.dispatchEvent(mockStorageEvent);

      expect(store.securityEvents).toContainEqual(
        expect.objectContaining({
          type: 'SECURITY_VIOLATION',
          details: { type: 'CONCURRENT_SESSION' }
        })
      );
      expect(store.session).toBeNull();
    });

    it('should monitor login attempts', async () => {
      const store = useAuthStore();
      const mockFailedLogin = {
        email: 'test@example.com',
        password: 'wrong-password',
        clientId: 'test-client',
        rememberMe: false
      };

      vi.spyOn(store, 'performAzureAuth' as any).mockRejectedValue(
        new Error('Invalid credentials')
      );

      await store.login(mockFailedLogin);

      expect(store.loginAttempts).toHaveLength(1);
      expect(store.securityEvents).toContainEqual(
        expect.objectContaining({
          type: 'LOGIN_FAILURE'
        })
      );
    });

    it('should handle session timeout', async () => {
      const store = useAuthStore();
      
      // Initialize session with old timestamp
      store.session = {
        sessionId: 'test-session',
        userId: 1,
        isAuthenticated: true,
        roles: ['Admin'],
        lastActivityAt: new Date(mockDate.getTime() - 86400000 * 2), // 2 days old
        deviceInfo: {
          deviceId: 'test-device',
          userAgent: 'test-agent',
          ipAddress: '127.0.0.1'
        },
        refreshTokenExpiry: new Date(mockDate.getTime() + 86400000)
      };

      // Trigger session heartbeat
      vi.advanceTimersByTime(60000);

      expect(store.securityEvents).toContainEqual(
        expect.objectContaining({
          type: 'SESSION_EXPIRED'
        })
      );
      expect(store.session).toBeNull();
    });
  });

  describe('logout', () => {
    it('should properly clean up session and state', async () => {
      const store = useAuthStore();
      
      // Setup initial authenticated state
      store.tokens = {
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        idToken: 'test-id',
        tokenType: 'Bearer',
        scope: ['openid'],
        expiresIn: 3600,
        expiresAt: new Date(mockDate.getTime() + 3600 * 1000)
      };
      store.session = {
        sessionId: 'test-session',
        userId: 1,
        isAuthenticated: true,
        roles: ['Admin'],
        lastActivityAt: new Date(),
        deviceInfo: {
          deviceId: 'test-device',
          userAgent: 'test-agent',
          ipAddress: '127.0.0.1'
        },
        refreshTokenExpiry: new Date(mockDate.getTime() + 86400000)
      };
      store.authStatus = AuthStatus.AUTHENTICATED;

      vi.spyOn(store, 'terminateSession' as any).mockResolvedValue(undefined);

      await store.logout();

      expect(store.tokens).toBeNull();
      expect(store.session).toBeNull();
      expect(store.user).toBeNull();
      expect(store.authStatus).toBe(AuthStatus.UNAUTHENTICATED);
      expect(store.securityEvents).toContainEqual(
        expect.objectContaining({
          type: 'LOGIN_SUCCESS',
          details: { type: 'logout' }
        })
      );
    });
  });
});