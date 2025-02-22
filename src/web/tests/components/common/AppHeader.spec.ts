import { mount } from '@vue/test-utils'; // ^2.0.0
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'; // ^0.34.0
import { createTestingPinia } from '@pinia/testing'; // ^0.1.0
import axe from '@axe-core/vue'; // ^4.7.0
import AppHeader from '@/components/common/AppHeader.vue';
import { useAuth } from '@/composables/useAuth';
import { UserRoleType } from '@/models/user.model';

// Mock the composables
vi.mock('@/composables/useAuth', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: vi.ref(false),
    handleLogout: vi.fn(),
    userRole: vi.ref('admin'),
    validateSession: vi.fn(() => true),
    refreshToken: vi.fn(),
    securityEvents: vi.fn()
  }))
}));

// Helper function to mount component with test configuration
const mountComponent = (options = {}) => {
  const wrapper = mount(AppHeader, {
    global: {
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          initialState: {
            auth: {
              isAuthenticated: false,
              user: null,
              securityEvents: []
            }
          }
        })
      ],
      stubs: {
        'q-header': true,
        'q-toolbar': true,
        'q-btn': true,
        'q-toolbar-title': true,
        'q-chip': true,
        'q-menu': true,
        'UserProfile': true,
        'AppNavigation': true
      }
    },
    props: {
      navigationCollapsed: false
    },
    ...options
  });

  return wrapper;
};

describe('AppHeader.vue', () => {
  let wrapper: ReturnType<typeof mountComponent>;

  beforeEach(() => {
    wrapper = mountComponent();
  });

  afterEach(() => {
    wrapper.unmount();
    vi.clearAllMocks();
  });

  describe('Accessibility Compliance', () => {
    it('should pass WCAG 2.1 Level AA compliance checks', async () => {
      const results = await axe(wrapper.element);
      expect(results.violations).toHaveLength(0);
    });

    it('should have proper ARIA attributes for navigation toggle', () => {
      const navBtn = wrapper.find('.app-header__nav-btn');
      expect(navBtn.attributes('aria-label')).toBeDefined();
      expect(navBtn.attributes('aria-expanded')).toBeDefined();
    });

    it('should announce navigation state changes to screen readers', async () => {
      const navBtn = wrapper.find('.app-header__nav-btn');
      await navBtn.trigger('click');
      
      // Check for screen reader announcement element
      const announcement = document.querySelector('.sr-only');
      expect(announcement).toBeTruthy();
      expect(announcement?.textContent).toContain('Navigation');
    });

    it('should support keyboard navigation in profile menu', async () => {
      const profileBtn = wrapper.find('[aria-label="User profile menu"]');
      
      // Test Enter key
      await profileBtn.trigger('keydown', { key: 'Enter' });
      expect(wrapper.vm.profileMenuOpen).toBe(true);

      // Test Escape key
      await profileBtn.trigger('keydown', { key: 'Escape' });
      expect(wrapper.vm.profileMenuOpen).toBe(false);
    });
  });

  describe('Responsive Design', () => {
    it('should adapt layout for mobile viewport', async () => {
      // Simulate mobile viewport
      window.innerWidth = 320;
      await wrapper.trigger('resize');
      
      expect(wrapper.classes()).toContain('app-header--mobile');
      expect(wrapper.find('.app-header__security-indicator').exists()).toBe(false);
    });

    it('should adapt layout for tablet viewport', async () => {
      window.innerWidth = 768;
      await wrapper.trigger('resize');
      
      expect(wrapper.classes()).toContain('app-header--tablet');
      expect(wrapper.find('.app-header__title').attributes('style'))
        .toContain('font-size: 1rem');
    });

    it('should adapt layout for desktop viewport', async () => {
      window.innerWidth = 1024;
      await wrapper.trigger('resize');
      
      expect(wrapper.classes()).toContain('app-header--desktop');
      expect(wrapper.find('.app-header__toolbar').attributes('style'))
        .toContain('min-height: 64px');
    });
  });

  describe('Security Monitoring', () => {
    it('should monitor and emit security events', async () => {
      const securityEventSpy = vi.fn();
      wrapper = mountComponent({
        props: {
          navigationCollapsed: false
        },
        listeners: {
          securityEvent: securityEventSpy
        }
      });

      // Simulate security event
      await wrapper.vm.handleSecurityEvent({ type: 'SESSION_EXPIRED' });
      expect(securityEventSpy).toHaveBeenCalledWith({
        type: 'SESSION_EXPIRED'
      });
    });

    it('should handle session expiration', async () => {
      const mockAuth = useAuth();
      mockAuth.validateSession.mockReturnValueOnce(false);
      
      await wrapper.vm.toggleProfileMenu();
      expect(mockAuth.handleLogout).toHaveBeenCalled();
    });

    it('should refresh token periodically', () => {
      vi.useFakeTimers();
      const mockAuth = useAuth();
      
      // Fast-forward 30 seconds
      vi.advanceTimersByTime(30000);
      expect(mockAuth.refreshToken).toHaveBeenCalled();
      
      vi.useRealTimers();
    });
  });

  describe('Role-based Navigation', () => {
    it('should show admin menu items for admin role', async () => {
      const mockAuth = useAuth();
      mockAuth.userRole.value = UserRoleType.Admin;
      
      await wrapper.vm.$nextTick();
      expect(wrapper.find('[data-test="admin-menu"]').exists()).toBe(true);
    });

    it('should hide admin menu items for non-admin roles', async () => {
      const mockAuth = useAuth();
      mockAuth.userRole.value = UserRoleType.Inspector;
      
      await wrapper.vm.$nextTick();
      expect(wrapper.find('[data-test="admin-menu"]').exists()).toBe(false);
    });
  });

  describe('Authentication State', () => {
    it('should show login state when authenticated', async () => {
      const mockAuth = useAuth();
      mockAuth.isAuthenticated.value = true;
      
      await wrapper.vm.$nextTick();
      expect(wrapper.find('.app-header__profile').exists()).toBe(true);
      expect(wrapper.find('.app-header__security-indicator').exists()).toBe(true);
    });

    it('should hide secure elements when not authenticated', async () => {
      const mockAuth = useAuth();
      mockAuth.isAuthenticated.value = false;
      
      await wrapper.vm.$nextTick();
      expect(wrapper.find('.app-header__profile').exists()).toBe(false);
      expect(wrapper.find('.app-header__security-indicator').exists()).toBe(false);
    });
  });
});