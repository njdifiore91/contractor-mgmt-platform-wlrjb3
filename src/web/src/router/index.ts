import { createRouter, createWebHistory } from 'vue-router';
import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router';
import { auth_routes, default_routes, admin_routes } from './routes';
import { useAuth } from '@/composables/useAuth';
import { UserRoleType } from '@/models/user.model';

// Security monitoring constants
const NAVIGATION_RATE_LIMIT = 10; // Max navigation attempts per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds
const SECURITY_CHECK_INTERVAL = 30 * 1000; // 30 seconds

// Navigation attempt tracking
let navigationAttempts: Date[] = [];

// Add TEST_USERS at the top with the role mapping
const TEST_USERS: Record<string, string> = {
  'admin@test.com': 'Admin',
  'operations@test.com': 'Operations',
  'inspector@test.com': 'Inspector',
  'customer.service@test.com': 'CustomerService',
};

/**
 * Enhanced navigation guard that enforces authentication, authorization,
 * and security monitoring
 */
const setupAuthGuard = async (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
): Promise<void> => {
  const auth = useAuth();

  try {
    if (!auth) {
      console.error('Auth composable not available');
      return next({ path: '/auth/login' });
    }

    // Skip auth checks for public routes
    if (!to.meta.requiresAuth) {
      return next();
    }

    // Initialize auth
    const isInitialized = await auth.initializeAuth().catch((err) => {
      console.error('Auth initialization failed:', err);
      return false;
    });

    if (!isInitialized) {
      return next({
        path: '/auth/login',
        query: { redirect: to.fullPath },
      });
    }

    // Rate limiting check
    const now = Date.now();
    navigationAttempts = navigationAttempts.filter(
      (attempt) => now - attempt.getTime() < RATE_LIMIT_WINDOW
    );

    if (navigationAttempts.length >= NAVIGATION_RATE_LIMIT) {
      throw new Error('Navigation rate limit exceeded');
    }

    navigationAttempts.push(new Date());

    // For auth routes (like login), redirect to dashboard if already authenticated
    if (to.path.startsWith('/auth') && auth.isAuthenticated.value) {
      return next({ name: 'dashboard', replace: true });
    }

    // For protected routes, check authentication and role access
    if (to.meta.requiresAuth) {
      const isValid = await auth.checkAuthStatus();
      if (!isValid) {
        return next({
          path: '/auth/login',
          query: { redirect: to.fullPath },
        });
      }

      // Check role-based access
      const allowedRoles = to.meta.allowedRoles as string[];
      if (allowedRoles && allowedRoles.length > 0) {
        const hasAccess = allowedRoles.some((role) => {
          // Check if current user is a test user
          const userEmail = auth.currentUser.value?.email;
          if (userEmail && TEST_USERS[userEmail]) {
            return allowedRoles.includes(TEST_USERS[userEmail]);
          }

          // Normal role check for non-test users
          const roleId = UserRoleType[role as keyof typeof UserRoleType];
          return auth.currentUser.value?.userRoles.some((userRole) => userRole.roleId === +roleId);
        });

        if (!hasAccess) {
          console.warn('Access denied - insufficient permissions');
          return next({ name: 'dashboard' });
        }
      }
    }

    // Allow navigation
    return next();
  } catch (error: unknown) {
    console.error('Navigation guard error:', error);
    await auth.logout();
    return next({
      path: '/auth/login',
      query: {
        error: 'security_violation',
        redirect: to.fullPath,
      },
    });
  }
};

/**
 * Title management and performance monitoring guard
 */
const setupTitleGuard = (to: RouteLocationNormalized): void => {
  const baseTitle = 'Service Provider Management System';
  const pageTitle = to.meta.title as string;

  // Update document title with proper escaping
  document.title = pageTitle ? `${pageTitle} | ${baseTitle}`.replace(/[<>]/g, '') : baseTitle;

  // Track page load performance
  if (window.performance && window.performance.mark) {
    window.performance.mark('route_change_start');
  }
};

/**
 * Error boundary for navigation failures
 */
const setupErrorBoundary = (
  error: Error,
  to: RouteLocationNormalized,
  from: RouteLocationNormalized
): void => {
  console.error('Navigation error:', {
    error,
    to: to.fullPath,
    from: from.fullPath,
  });

  // Clear rate limiting on error
  navigationAttempts = [];
};

// Create router instance with security-enhanced configuration
const router = createRouter({
  history: createWebHistory(),
  routes: [
    ...auth_routes,
    ...default_routes,
    ...admin_routes,
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/pages/error/NotFoundPage.vue' as any),
      meta: {
        title: 'Page Not Found',
        requiresAuth: false,
      },
    },
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    return { top: 0, behavior: 'smooth' };
  },
});

// Register navigation guards
router.beforeEach(setupAuthGuard);
router.beforeEach(setupTitleGuard);
router.onError(setupErrorBoundary);

// Setup security monitoring interval
let securityInterval: number;

router.isReady().then(() => {
  securityInterval = window.setInterval(() => {
    const auth = useAuth();
    if (auth) {
      auth.checkAuthStatus().catch((error) => {
        console.error('Security check failed:', error);
        router.push('/auth/login');
      });
    }
  }, SECURITY_CHECK_INTERVAL);
});

// Cleanup on window unload
window.addEventListener('unload', () => {
  if (securityInterval) {
    clearInterval(securityInterval);
  }
});

export default router;
