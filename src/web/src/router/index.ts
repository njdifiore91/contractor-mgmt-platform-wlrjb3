import { createRouter, createWebHistory } from 'vue-router';
import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router';
import { auth_routes, default_routes, admin_routes } from './routes';
import { useAuth } from '@/composables/useAuth';
import { useAuthStore } from '@/stores/auth.store';
import { UserRoleType } from '@/models/user.model';

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
  const auth = useAuth();
  if (!auth) throw new Error('Auth composable not available');

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

    // Initialize auth state if not already done
    await auth.initializeAuth();

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
          query: { redirect: to.fullPath }
        });
      }

      // Check role-based access
      const allowedRoles = to.meta.allowedRoles as string[];
      if (allowedRoles && allowedRoles.length > 0 && allowedRoles[0] !== '*') {
        const authStore = useAuthStore();
        const hasAccess = allowedRoles.some(role => 
          authStore.hasRole(role as UserRoleType)
        );
        
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
      component: () => import('@/pages/error/NotFoundPage.vue' as any),
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
      auth.checkAuthStatus().catch(error => {
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