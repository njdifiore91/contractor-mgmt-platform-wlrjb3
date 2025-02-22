/// <reference types="vite/client" /> // @version ^4.0.0

/**
 * Type definitions for environment variables used in the Service Provider Management System.
 * This interface ensures type safety and proper integration with various services.
 */
interface ImportMetaEnv {
  /**
   * Base URL for the backend API services
   * @example 'https://api.serviceprovider.com'
   */
  readonly VITE_API_BASE_URL: string;

  /**
   * Azure AD B2C authority URL for authentication
   * @example 'https://login.microsoftonline.com/tenant-id'
   */
  readonly VITE_AUTH_AUTHORITY: string;

  /**
   * Azure AD B2C client ID for application authentication
   * @example '12345678-1234-1234-1234-123456789012'
   */
  readonly VITE_AUTH_CLIENT_ID: string;

  /**
   * Microsoft Graph API endpoint for OneDrive integration
   * @example 'https://graph.microsoft.com/v1.0/drives'
   */
  readonly VITE_ONEDRIVE_API_ENDPOINT: string;

  /**
   * Redis cache endpoint for application caching
   * @example 'redis.cache.windows.net:6380'
   */
  readonly VITE_REDIS_CACHE_ENDPOINT: string;

  /**
   * Current application environment
   * @example 'development' | 'testing' | 'staging' | 'production'
   */
  readonly VITE_APP_ENVIRONMENT: string;

  /**
   * API request timeout in milliseconds
   * @example 30000
   */
  readonly VITE_API_TIMEOUT: number;

  /**
   * Flag to enable debug features and logging
   * @example true
   */
  readonly VITE_ENABLE_DEBUG: boolean;
}

/**
 * Augments the Vite ImportMeta interface to include our custom env variables
 */
interface ImportMeta {
  readonly env: ImportMetaEnv;
}