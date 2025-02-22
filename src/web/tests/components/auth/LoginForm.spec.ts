import { mount } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import axe from '@axe-core/vue'; // v4.7.0
import LoginForm from '../../src/components/auth/LoginForm.vue';
import { useAuth } from '../../src/composables/useAuth';
import { useAuthStore } from '../../src/stores/auth.store';
import { AuthStatus } from '../../src/models/auth.model';

// Mock router
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}));

// Mock Quasar notifications
vi.mock('@quasar/quasar-ui-qinput', () => ({
  useQuasar: () => ({
    notify: vi.fn()
  })
}));

describe('LoginForm', () => {
  let wrapper;
  let authStore;
  let mockLogin;
  let mockInitiateMFA;
  let mockRouter;

  beforeEach(() => {
    // Create fresh Pinia instance for each test
    const pinia = createTestingPinia({
      createSpy: vi.fn
    });

    // Setup auth store with initial state
    authStore = useAuthStore();
    authStore.$reset();

    // Mock auth composable functions
    mockLogin = vi.fn();
    mockInitiateMFA = vi.fn();
    vi.mock('../../src/composables/useAuth', () => ({
      useAuth: () => ({
        login: mockLogin,
        initiateMFA: mockInitiateMFA,
        isLoading: ref(false),
        error: ref(null)
      })
    }));

    // Mount component with required props and plugins
    wrapper = mount(LoginForm, {
      global: {
        plugins: [pinia],
        stubs: {
          'q-input': true,
          'q-btn': true,
          'q-icon': true,
          'q-checkbox': true,
          'q-banner': true,
          'q-dialog': true,
          'loading-spinner': true
        }
      }
    });

    // Get router mock
    mockRouter = vi.mocked(useRouter());
  });

  afterEach(() => {
    vi.clearAllMocks();
    wrapper.unmount();
  });

  it('validates form inputs correctly', async () => {
    // Test empty form submission
    await wrapper.find('form').trigger('submit');
    expect(wrapper.vm.emailError).toBeTruthy();
    expect(wrapper.vm.passwordError).toBeTruthy();
    expect(mockLogin).not.toHaveBeenCalled();

    // Test invalid email format
    await wrapper.setData({ email: 'invalid-email' });
    await wrapper.find('form').trigger('submit');
    expect(wrapper.vm.emailError).toBe('Please enter a valid email address');
    expect(mockLogin).not.toHaveBeenCalled();

    // Test valid form submission
    await wrapper.setData({
      email: 'test@example.com',
      password: 'ValidPass123!'
    });
    await wrapper.find('form').trigger('submit');
    expect(wrapper.vm.emailError).toBeFalsy();
    expect(wrapper.vm.passwordError).toBeFalsy();
    expect(mockLogin).toHaveBeenCalledTimes(1);
  });

  it('handles successful authentication', async () => {
    // Setup successful login response
    mockLogin.mockResolvedValueOnce({ requiresMfa: false });
    
    // Submit valid credentials
    await wrapper.setData({
      email: 'test@example.com',
      password: 'ValidPass123!',
      rememberMe: true
    });
    await wrapper.find('form').trigger('submit');

    // Verify login call
    expect(mockLogin).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'ValidPass123!',
      rememberMe: true,
      deviceFingerprint: expect.any(String)
    });

    // Verify navigation
    expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
  });

  it('handles MFA flow correctly', async () => {
    // Setup MFA required response
    mockLogin.mockResolvedValueOnce({ requiresMfa: true });
    mockInitiateMFA.mockResolvedValueOnce({});

    // Submit credentials
    await wrapper.setData({
      email: 'test@example.com',
      password: 'ValidPass123!'
    });
    await wrapper.find('form').trigger('submit');

    // Verify MFA dialog shown
    expect(wrapper.vm.showMfaDialog).toBe(true);

    // Submit MFA code
    await wrapper.setData({ mfaCode: '123456' });
    await wrapper.find('[data-test="verify-mfa-btn"]').trigger('click');

    // Verify MFA verification
    expect(mockInitiateMFA).toHaveBeenCalledWith('123456');
    expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
  });

  it('handles authentication errors appropriately', async () => {
    // Setup error response
    const errorMessage = 'Invalid credentials';
    mockLogin.mockRejectedValueOnce(new Error(errorMessage));

    // Submit form
    await wrapper.setData({
      email: 'test@example.com',
      password: 'WrongPass123!'
    });
    await wrapper.find('form').trigger('submit');

    // Verify error handling
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.find('[role="alert"]').text()).toContain(errorMessage);
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('manages loading states correctly', async () => {
    // Setup delayed login response
    mockLogin.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));

    // Submit form
    const submitButton = wrapper.find('button[type="submit"]');
    await wrapper.setData({
      email: 'test@example.com',
      password: 'ValidPass123!'
    });
    await submitButton.trigger('click');

    // Verify loading state
    expect(wrapper.vm.isLoading).toBe(true);
    expect(submitButton.attributes('disabled')).toBe('true');

    // Wait for login to complete
    await vi.runAllTimers();
    expect(wrapper.vm.isLoading).toBe(false);
    expect(submitButton.attributes('disabled')).toBeFalsy();
  });

  it('meets accessibility requirements', async () => {
    // Run axe accessibility tests
    const results = await axe(wrapper.element);
    expect(results.violations).toHaveLength(0);

    // Verify ARIA attributes
    expect(wrapper.find('form').attributes('aria-labelledby')).toBe('login-title');
    expect(wrapper.find('#login-title').exists()).toBe(true);
    expect(wrapper.find('input[type="email"]').attributes('aria-required')).toBe('true');
    expect(wrapper.find('input[type="password"]').attributes('aria-required')).toBe('true');

    // Test keyboard navigation
    await wrapper.find('input[type="email"]').trigger('keyup.enter');
    expect(document.activeElement).toBe(wrapper.find('input[type="password"]').element);
  });

  it('implements security monitoring', async () => {
    const securityEventSpy = vi.spyOn(authStore, 'trackSecurityEvent');
    
    // Test failed login attempt tracking
    mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));
    await wrapper.setData({
      email: 'test@example.com',
      password: 'WrongPass123!'
    });
    await wrapper.find('form').trigger('submit');

    expect(securityEventSpy).toHaveBeenCalledWith({
      type: 'LOGIN_FAILURE',
      timestamp: expect.any(Date),
      details: expect.objectContaining({
        error: expect.any(Error)
      })
    });

    // Test rate limiting
    for (let i = 0; i < 5; i++) {
      await wrapper.find('form').trigger('submit');
    }
    expect(wrapper.vm.error).toContain('Too many login attempts');
  });
});