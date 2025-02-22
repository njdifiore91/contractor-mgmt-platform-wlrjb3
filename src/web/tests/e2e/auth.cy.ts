/**
 * @fileoverview End-to-end tests for authentication flows using Cypress.
 * Tests Azure AD B2C integration, token management, and security measures.
 * @version 1.0.0
 */

import { LoginCredentials, AuthToken, UserSession, AuthStatus, MfaChallenge } from '../../src/models/auth.model';
import { IUser, UserRoleType } from '../../src/models/user.model';

// Test user credentials and configuration
const TEST_USER: LoginCredentials = {
  email: 'test@example.com',
  password: 'TestPass123!',
  clientId: 'test-client-id',
  rememberMe: false
};

// API endpoints for authentication
const AUTH_ENDPOINTS = {
  login: '/api/auth/login',
  logout: '/api/auth/logout',
  refresh: '/api/auth/refresh',
  mfa: '/api/auth/mfa'
};

describe('Authentication E2E Tests', () => {
  beforeEach(() => {
    // Reset application state
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.clearSessionStorage();

    // Visit login page
    cy.visit('/login');

    // Configure security headers check
    cy.intercept('*', (req) => {
      req.headers['X-XSRF-TOKEN'] = 'test-csrf-token';
    });

    // Mock Azure AD B2C endpoints
    cy.intercept('POST', '**/oauth2/v2.0/token', {
      statusCode: 200,
      body: {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        id_token: 'mock-id-token',
        token_type: 'Bearer',
        expires_in: 3600
      }
    }).as('azureAuth');
  });

  describe('Login Flow', () => {
    it('should successfully login with valid credentials', () => {
      // Type credentials
      cy.get('[data-cy="email-input"]').type(TEST_USER.email);
      cy.get('[data-cy="password-input"]').type(TEST_USER.password);

      // Submit form
      cy.get('[data-cy="login-button"]').click();

      // Wait for Azure AD B2C authentication
      cy.wait('@azureAuth');

      // Verify successful login
      cy.url().should('include', '/dashboard');
      cy.window().its('localStorage').should('have.property', 'auth_token');

      // Verify security headers
      cy.request(AUTH_ENDPOINTS.login).then((response) => {
        expect(response.headers).to.have.property('strict-transport-security');
        expect(response.headers).to.have.property('x-content-type-options', 'nosniff');
      });
    });

    it('should handle invalid credentials correctly', () => {
      const invalidUser = { ...TEST_USER, password: 'wrong-password' };

      cy.get('[data-cy="email-input"]').type(invalidUser.email);
      cy.get('[data-cy="password-input"]').type(invalidUser.password);
      cy.get('[data-cy="login-button"]').click();

      cy.get('[data-cy="error-message"]')
        .should('be.visible')
        .and('contain', 'Invalid credentials');
    });

    it('should handle MFA challenge when required', () => {
      // Mock MFA challenge response
      cy.intercept('POST', AUTH_ENDPOINTS.mfa, {
        statusCode: 200,
        body: {
          challengeType: 'authenticator',
          challengeId: 'test-challenge-id',
          expiresAt: new Date(Date.now() + 300000)
        } as MfaChallenge
      }).as('mfaChallenge');

      // Login and trigger MFA
      cy.get('[data-cy="email-input"]').type(TEST_USER.email);
      cy.get('[data-cy="password-input"]').type(TEST_USER.password);
      cy.get('[data-cy="login-button"]').click();

      // Verify MFA challenge
      cy.wait('@mfaChallenge');
      cy.get('[data-cy="mfa-input"]').should('be.visible');
      cy.get('[data-cy="mfa-input"]').type('123456');
      cy.get('[data-cy="mfa-submit"]').click();

      // Verify successful MFA completion
      cy.url().should('include', '/dashboard');
    });
  });

  describe('Token Management', () => {
    it('should refresh token automatically when expired', () => {
      // Login first
      cy.login(TEST_USER);

      // Mock token refresh
      cy.intercept('POST', AUTH_ENDPOINTS.refresh, {
        statusCode: 200,
        body: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600
        }
      }).as('tokenRefresh');

      // Simulate expired token
      cy.window().then((window) => {
        const expiredToken: AuthToken = {
          accessToken: 'expired-token',
          refreshToken: 'valid-refresh-token',
          expiresAt: new Date(Date.now() - 1000),
          tokenType: 'Bearer',
          scope: ['openid', 'profile'],
          expiresIn: 3600,
          idToken: 'mock-id-token'
        };
        window.localStorage.setItem('auth_token', JSON.stringify(expiredToken));
      });

      // Trigger authenticated request
      cy.request('/api/protected-resource');

      // Verify token refresh
      cy.wait('@tokenRefresh');
      cy.window().its('localStorage')
        .invoke('getItem', 'auth_token')
        .should('include', 'new-access-token');
    });
  });

  describe('Logout Flow', () => {
    it('should clear session and redirect on logout', () => {
      // Login first
      cy.login(TEST_USER);

      // Perform logout
      cy.get('[data-cy="logout-button"]').click();

      // Verify session cleared
      cy.window().its('localStorage').should('not.have.property', 'auth_token');
      cy.getCookie('session').should('not.exist');

      // Verify redirect
      cy.url().should('include', '/login');
    });
  });

  describe('Security Measures', () => {
    it('should enforce password complexity requirements', () => {
      const weakPassword = 'weak';
      
      cy.get('[data-cy="email-input"]').type(TEST_USER.email);
      cy.get('[data-cy="password-input"]').type(weakPassword);
      cy.get('[data-cy="login-button"]').click();

      cy.get('[data-cy="password-error"]')
        .should('be.visible')
        .and('contain', 'Password must meet complexity requirements');
    });

    it('should prevent XSS in login form', () => {
      const xssAttempt = '<script>alert("xss")</script>';
      
      cy.get('[data-cy="email-input"]').type(xssAttempt);
      cy.get('[data-cy="email-input"]').should('have.value', xssAttempt.replace(/[<>]/g, ''));
    });

    it('should handle rate limiting', () => {
      // Attempt multiple rapid login requests
      for (let i = 0; i < 5; i++) {
        cy.get('[data-cy="login-button"]').click();
      }

      // Verify rate limit response
      cy.get('[data-cy="error-message"]')
        .should('be.visible')
        .and('contain', 'Too many attempts');
    });
  });

  describe('Session Management', () => {
    it('should maintain session with remember me', () => {
      const rememberMeUser = { ...TEST_USER, rememberMe: true };
      
      cy.get('[data-cy="email-input"]').type(rememberMeUser.email);
      cy.get('[data-cy="password-input"]').type(rememberMeUser.password);
      cy.get('[data-cy="remember-me"]').check();
      cy.get('[data-cy="login-button"]').click();

      // Verify persistent session
      cy.reload();
      cy.url().should('include', '/dashboard');
    });

    it('should handle session timeout correctly', () => {
      cy.login(TEST_USER);

      // Simulate session timeout
      cy.clock().tick(24 * 60 * 60 * 1000); // Advance 24 hours
      
      // Verify session expired handling
      cy.request('/api/protected-resource').then((response) => {
        expect(response.status).to.eq(401);
      });
      
      cy.url().should('include', '/login');
    });
  });
});

// Custom command for login helper
Cypress.Commands.add('login', (credentials: LoginCredentials) => {
  cy.visit('/login');
  cy.get('[data-cy="email-input"]').type(credentials.email);
  cy.get('[data-cy="password-input"]').type(credentials.password);
  cy.get('[data-cy="login-button"]').click();
  cy.url().should('include', '/dashboard');
});

// Extend Cypress types
declare global {
  namespace Cypress {
    interface Chainable {
      login(credentials: LoginCredentials): Chainable<void>;
    }
  }
}