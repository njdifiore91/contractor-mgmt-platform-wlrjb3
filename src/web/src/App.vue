<template>
  <div id="q-app" class="app-root" :class="{ 'dark-mode': isDarkMode }">
    <!-- Layout System -->
    <component :is="determineLayout" v-if="layoutReady" @security-event="handleSecurityEvent" />

    <!-- Global Notification System -->
    <AppNotification ref="notificationSystem" role="alert" aria-live="polite" />

    <!-- Accessibility Skip Link -->
    <a href="#main-content" class="skip-link" @click.prevent="skipToContent">
      Skip to main content
    </a>
  </div>
</template>

<script lang="ts">
  import { defineComponent, ref, computed, onMounted, onUnmounted } from 'vue';
  import { useQuasar } from 'quasar';
  import { useRouter, useRoute } from 'vue-router';
  import { useNow } from '@vueuse/core';
  import DefaultLayout from './layouts/DefaultLayout.vue';
  import AuthLayout from './layouts/AuthLayout.vue';
  import AdminLayout from './layouts/AdminLayout.vue';
  import AppNotification from './components/common/AppNotification.vue';
  import { useAuth } from './composables/useAuth';

  // Security monitoring constants
  const SECURITY_CHECK_INTERVAL = 30000; // 30 seconds
  const PERFORMANCE_THRESHOLD = 3000; // 3 seconds

  export default defineComponent({
    name: 'App',

    components: {
      DefaultLayout,
      AuthLayout,
      AdminLayout,
      AppNotification,
    },

    setup() {
      const $q = useQuasar();
      const router = useRouter();
      const route = useRoute();
      const { isAuthenticated, currentUser, error, checkAuthStatus, handleSecurityEvent } =
        useAuth();
      const now = useNow();

      // Custom performance measurement
      const measure = async (label: string) => {
        const start = performance.now();
        await Promise.resolve();
        const end = performance.now();
        return end - start;
      };

      // Reactive state
      const layoutReady = ref(false);
      const isDarkMode = ref(false);
      const notificationSystem = ref<InstanceType<typeof AppNotification> | null>(null);
      const securityCheckInterval = ref<number | null>(null);

      // Computed layout determination with security validation
      const determineLayout = computed(() => {
        const routeMeta = route.meta;

        if (!layoutReady.value) {
          return null;
        }

        // Secure routes require authentication
        if (routeMeta.requiresAuth && !isAuthenticated.value) {
          router.push('/auth/login');
          return AuthLayout;
        }

        // Use the same layout for both dashboard and admin routes
        if (route.path.startsWith('/dashboard') || route.path.startsWith('/admin')) {
          return DefaultLayout;
        }

        // Layout mapping based on route metadata
        switch (routeMeta.layout) {
          case 'auth':
            return AuthLayout;
          default:
            return DefaultLayout;
        }
      });

      // Initialize security monitoring
      const initializeSecurityMonitoring = () => {
        securityCheckInterval.value = window.setInterval(async () => {
          try {
            const isValid = await checkAuthStatus();
            if (!isValid) {
              handleSecurityEvent({
                type: 'SESSION_INVALID',
                timestamp: new Date(),
                details: { reason: 'periodic_check' },
              });
            }
          } catch (error) {
            console.error('Security check failed:', error);
          }
        }, SECURITY_CHECK_INTERVAL);
      };

      // Handle global errors
      const handleError = (error: Error) => {
        console.error('Application error:', error);
        notificationSystem.value?.showNotification({
          type: 'negative',
          message: 'An unexpected error occurred',
          timeout: 5000,
        });
      };

      // Skip to main content for accessibility
      const skipToContent = () => {
        const mainContent = document.querySelector('#main-content');
        if (mainContent) {
          mainContent.setAttribute('tabindex', '-1');
          mainContent.focus();
        }
      };

      // Monitor system theme changes
      const handleThemeChange = (e: MediaQueryListEvent) => {
        isDarkMode.value = e.matches;
        $q.dark.set(isDarkMode.value);
      };

      // Lifecycle hooks
      onMounted(async () => {
        try {
          // Measure initial load performance
          const loadTime = await measure('app-init');
          if (loadTime > PERFORMANCE_THRESHOLD) {
            console.warn(`App initialization took ${loadTime}ms`);
          }

          // Initialize theme
          const darkModeMedia = window.matchMedia('(prefers-color-scheme: dark)');
          isDarkMode.value = darkModeMedia.matches;
          darkModeMedia.addEventListener('change', handleThemeChange);
          $q.dark.set(isDarkMode.value);

          // Initialize security
          const app = (window as any).vueApp;
          if (app?.config?.globalProperties?.$security) {
            await app.config.globalProperties.$security.validateSession();
            initializeSecurityMonitoring();
          } else {
            console.warn('Security validation not available');
          }

          layoutReady.value = true;
        } catch (error) {
          handleError(error as Error);
        }
      });

      onUnmounted(() => {
        if (securityCheckInterval.value) {
          clearInterval(securityCheckInterval.value);
        }
        window
          .matchMedia('(prefers-color-scheme: dark)')
          .removeEventListener('change', handleThemeChange);
      });

      return {
        layoutReady,
        isDarkMode,
        determineLayout,
        notificationSystem,
        handleSecurityEvent,
        skipToContent,
      };
    },
  });
</script>

<style lang="scss">
  .app-root {
    min-height: 100vh;
    position: relative;

    // Skip link for accessibility
    .skip-link {
      position: absolute;
      top: -40px;
      left: 0;
      background: var(--primary);
      color: white;
      padding: var(--space-sm) var(--space-md);
      z-index: var(--z-index-popup);
      transition: top 0.3s ease;

      &:focus {
        top: 0;
      }
    }

    // High contrast mode support
    @media (forced-colors: active) {
      border: 1px solid ButtonText;
    }

    // Reduced motion preference
    @media (prefers-reduced-motion: reduce) {
      * {
        transition: none !important;
      }
    }

    // Print styles
    @media print {
      background: white;
    }
  }
</style>
