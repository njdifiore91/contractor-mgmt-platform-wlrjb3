import { createRouter, createWebHistory, RouteLocationNormalized, NavigationGuardNext } from 'vue-router'; // ^4.0.0
import { auth_routes, default_routes, admin_routes } from './routes';
import { useAuth } from '@/composables/useAuth';

// Security monitoring constants
const NAVIGATION_RATE_LIMIT = 10; // Max navigation attempts per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds
const SECURITY_CHECK_INTERVAL = 30 * 1000; // 30 seconds

// Navigation attempt tracking
let navigationAttempts: Date[] = [];

/**
 * Enhanced navigation guard that enforces authentication, authorization,
 * and security monitoring
 */
const setupAuthGuard = async (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
): Promise<void> => {
  const { isAuthenticated, checkAuthStatus, hasRole } = useAuth();

  try {
    // Rate limiting check
    const now = Date.now();
    navigationAttempts = navigationAttempts.filter(
      attempt => now - attempt.getTime() < RATE_LIMIT_WINDOW
    );

    if (navigationAttempts.length >= NAVIGATION_RATE_LIMIT) {
      throw new Error('Navigation rate limit exceeded');
    }

    navigationAttempts.push(new Date());

    // Check if route requires authentication
    if (to.meta.requiresAuth) {
      // Verify authentication status
      if (!isAuthenticated.value) {
        return next({
          path: '/auth/login',
          query: { redirect: to.fullPath }
        });
      }

      // Validate session status
      const sessionValid = await checkAuthStatus();
      if (!sessionValid) {
        throw new Error('Invalid session state');
      }

      // Check role-based access
      const allowedRoles = to.meta.allowedRoles as string[];
      if (allowedRoles && allowedRoles.length > 0 && allowedRoles[0] !== '*') {
        const hasAccess = allowedRoles.some(role => hasRole(role));
        if (!hasAccess) {
          throw new Error('Insufficient permissions');
        }
      }
    }

    // Special handling for admin routes
    if (to.meta.requiresAdmin && !hasRole('Admin')) {
      return next({ path: '/dashboard' });
    }

    next();
  } catch (error) {
    console.error('Navigation guard error:', error);
    return next({ 
      path: '/auth/login',
      query: { 
        error: 'security_violation',
        redirect: to.fullPath
      }
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
  document.title = pageTitle ? 
    `${pageTitle} | ${baseTitle}`.replace(/[<>]/g, '') : 
    baseTitle;

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
    from: from.fullPath
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
      component: () => import('@/views/NotFoundPage.vue'),
      meta: {
        title: 'Page Not Found',
        requiresAuth: false
      }
    }
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    return { top: 0, behavior: 'smooth' };
  }
});

// Register enhanced navigation guards
router.beforeEach(setupAuthGuard);
router.beforeEach(setupTitleGuard);
router.onError(setupErrorBoundary);

// Setup security monitoring interval
let securityInterval: number;

router.isReady().then(() => {
  securityInterval = window.setInterval(() => {
    const { checkAuthStatus } = useAuth();
    checkAuthStatus().catch(error => {
      console.error('Security check failed:', error);
      router.push('/auth/login');
    });
  }, SECURITY_CHECK_INTERVAL);
});

// Cleanup on window unload
window.addEventListener('unload', () => {
  if (securityInterval) {
    clearInterval(securityInterval);
  }
});

export default router;