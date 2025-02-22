import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest'; // ^0.34.0
import axios from 'axios'; // ^1.0.0
import MockAdapter from 'axios-mock-adapter'; // ^1.21.0
import api, { setAuthToken, clearAuthToken } from '@/utils/api.util';
import { AuthToken } from '@/models/auth.model';

// Test constants
const TEST_API_URL = 'https://api.test.com';
const TEST_TIMEOUT = 30000;

// Mock data
const mockAuthToken: AuthToken = {
  accessToken: 'test-access-token',
  refreshToken: 'test-refresh-token',
  idToken: 'test-id-token',
  tokenType: 'Bearer',
  scope: ['api:access'],
  expiresIn: 3600,
  expiresAt: new Date(Date.now() + 3600000)
};

const mockExpiredToken: AuthToken = {
  ...mockAuthToken,
  expiresAt: new Date(Date.now() - 1000)
};

// Initialize mock adapter
const mockAxios = new MockAdapter(axios);

describe('API Utility Tests', () => {
  beforeEach(() => {
    // Reset mock adapter
    mockAxios.reset();
    // Clear any stored tokens
    clearAuthToken();
    // Reset axios default headers
    axios.defaults.headers.common = {};
    // Reset vi mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockAxios.reset();
    vi.clearAllMocks();
  });

  test('should initialize with correct configuration', () => {
    expect(api.defaults.baseURL).toBeDefined();
    expect(api.defaults.timeout).toBe(TEST_TIMEOUT);
    expect(api.defaults.headers.common['Content-Type']).toBe('application/json');
  });

  test('should handle authentication token management', async () => {
    // Test token setting
    setAuthToken(mockAuthToken);
    
    const testEndpoint = '/test';
    mockAxios.onGet(testEndpoint).reply(200, { data: 'success' });

    const response = await api.get(testEndpoint);
    
    expect(response.config.headers.Authorization)
      .toBe(`Bearer ${mockAuthToken.accessToken}`);
  });

  test('should handle token refresh when expired', async () => {
    const newToken: AuthToken = {
      ...mockAuthToken,
      accessToken: 'new-access-token',
      expiresAt: new Date(Date.now() + 3600000)
    };

    setAuthToken(mockExpiredToken);
    
    mockAxios.onPost('/auth/refresh').reply(200, newToken);
    mockAxios.onGet('/test').reply(200, { data: 'success' });

    const response = await api.get('/test');
    
    expect(mockAxios.history.post).toHaveLength(1);
    expect(mockAxios.history.post[0].url).toBe('/auth/refresh');
    expect(response.config.headers.Authorization)
      .toBe(`Bearer ${newToken.accessToken}`);
  });

  test('should implement request security features', async () => {
    const testData = { test: 'data' };
    mockAxios.onPost('/secure', testData).reply(200);

    await api.post('/secure', testData);

    const request = mockAxios.history.post[0];
    
    // Verify request signing
    expect(request.headers['X-Request-Signature']).toBeDefined();
    
    // Verify rate limiting headers
    expect(request.headers['X-RateLimit-Limit']).toBeDefined();
    expect(request.headers['X-RateLimit-Remaining']).toBeDefined();
  });

  test('should handle network errors appropriately', async () => {
    mockAxios.onGet('/test').networkError();

    await expect(api.get('/test')).rejects.toThrow();
  });

  test('should handle 401 unauthorized errors', async () => {
    setAuthToken(mockAuthToken);
    
    mockAxios.onGet('/test')
      .replyOnce(401)
      .onPost('/auth/refresh').reply(200, mockAuthToken)
      .onGet('/test').reply(200, { data: 'success' });

    const response = await api.get('/test');
    
    expect(mockAxios.history.post).toHaveLength(1);
    expect(response.status).toBe(200);
  });

  test('should handle 400 validation errors', async () => {
    const errorResponse = {
      message: 'Validation failed',
      errors: ['Invalid input']
    };

    mockAxios.onPost('/test').reply(400, errorResponse);

    await expect(api.post('/test', {})).rejects.toMatchObject({
      response: {
        status: 400,
        data: errorResponse
      }
    });
  });

  test('should handle 500 server errors', async () => {
    mockAxios.onGet('/test').reply(500);

    await expect(api.get('/test')).rejects.toMatchObject({
      response: {
        status: 500
      }
    });
  });

  test('should respect rate limiting configuration', async () => {
    const requests = Array(11).fill('/test');
    mockAxios.onGet('/test').reply(200);

    const responses = await Promise.allSettled(
      requests.map(url => api.get(url))
    );

    const rejected = responses.filter(r => r.status === 'rejected');
    expect(rejected.length).toBeGreaterThan(0);
  });

  test('should handle request encryption/decryption', async () => {
    const testData = { sensitive: 'data' };
    mockAxios.onPost('/secure', testData)
      .reply(200, { encrypted: 'response' });

    const response = await api.post('/secure', testData);
    
    // Verify request encryption
    const request = mockAxios.history.post[0];
    expect(request.data).not.toBe(JSON.stringify(testData));
    
    // Verify response decryption
    expect(response.data).toBeDefined();
  });

  test('should handle multiple concurrent requests', async () => {
    mockAxios.onGet('/test').reply(200);

    const requests = Array(5).fill('/test');
    const responses = await Promise.all(
      requests.map(url => api.get(url))
    );

    expect(responses).toHaveLength(5);
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });
  });

  test('should clear authentication on logout', () => {
    setAuthToken(mockAuthToken);
    clearAuthToken();

    expect(api.defaults.headers.common.Authorization).toBeUndefined();
  });
});