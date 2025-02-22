<template>
  <QLayout
    view="hHh lpR fFf"
    class="app-layout"
    role="application"
    aria-label="Main application layout"
  >
    <!-- Header Component -->
    <AppHeader
      :navigation-collapsed="isNavigationCollapsed"
      :user-profile="userProfile"
      role="banner"
      @update:navigation-collapsed="handleNavigationToggle"
      @security-event="handleSecurityEvent"
    />

    <!-- Sidebar Navigation -->
    <AppSidebar
      :role-based-menu="menuItems"
      role="navigation"
      aria-label="Main navigation"
      @sidebar-toggled="handleSidebarToggle"
      @navigation-changed="handleNavigationChange"
      @security-event="handleSecurityEvent"
    />

    <!-- Main Content Area -->
    <QPageContainer
      role="main"
      class="page-container"
      :class="{ 'content-shifted': !isNavigationCollapsed }"
    >
      <router-view v-slot="{ Component }">
        <transition
          name="fade"
          mode="out-in"
          @before-leave="handleTransitionStart"
          @after-enter="handleTransitionEnd"
        >
          <component :is="Component" />
        </transition>
      </router-view>
    </QPageContainer>

    <!-- Footer Component -->
    <AppFooter role="contentinfo" />

    <!-- Global Notification System -->
    <AppNotification
      role="alert"
      aria-live="polite"
      ref="notificationSystem"
    />
  </QLayout>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted } from 'vue';
import { useQuasar } from 'quasar';
import { useAuth } from '@/composables/useAuth';
import AppHeader from '@/components/common/AppHeader.vue';
import AppSidebar from '@/components/common/AppSidebar.vue';
import AppFooter from '@/components/common/AppFooter.vue';
import AppNotification from '@/components/common/AppNotification.vue';

// Security monitoring constants
const NAVIGATION_RATE_LIMIT = 10; // Max navigation changes per minute
const SECURITY_CHECK_INTERVAL = 30000; // 30 seconds
const IDLE_TIMEOUT = 1800000; // 30 minutes

export default defineComponent({
  name: 'DefaultLayout',

  components: {
    AppHeader,
    AppSidebar,
    AppFooter,
    AppNotification
  },

  setup() {
    const $q = useQuasar();
    const { isAuthenticated, currentUser, handleSecurityEvent } = useAuth();
    
    // Reactive state
    const isNavigationCollapsed = ref(false);
    const lastActivity = ref(Date.now());
    const navigationAttempts = ref<Date[]>([]);
    const notificationSystem = ref(null);
    const isTransitioning = ref(false);

    // Security interval reference
    let securityCheckInterval: number | null = null;

    // Computed properties
    const userProfile = computed(() => ({
      ...currentUser.value,
      lastActivity: lastActivity.value
    }));

    const menuItems = computed(() => {
      if (!isAuthenticated.value) return [];
      return currentUser.value?.userRoles.map(role => ({
        label: role.name,
        icon: role.icon,
        route: role.route,
        permissions: role.permissions
      })) || [];
    });

    // Navigation security check
    const isNavigationThrottled = (): boolean => {
      const now = Date.now();
      navigationAttempts.value = navigationAttempts.value.filter(
        attempt => now - attempt.getTime() < 60000
      );
      return navigationAttempts.value.length >= NAVIGATION_RATE_LIMIT;
    };

    // Event handlers
    const handleNavigationToggle = (collapsed: boolean) => {
      if (isNavigationThrottled()) {
        handleSecurityEvent({
          type: 'SECURITY_VIOLATION',
          details: { reason: 'navigation_throttled' }
        });
        return;
      }

      isNavigationCollapsed.value = collapsed;
      navigationAttempts.value.push(new Date());
      
      // Announce state change for screen readers
      const announcement = collapsed ? 'Navigation collapsed' : 'Navigation expanded';
      announceToScreenReader(announcement);
    };

    const handleSidebarToggle = (isOpen: boolean) => {
      // Update layout state and trigger resize event
      $q.nextTick(() => {
        window.dispatchEvent(new Event('resize'));
      });
    };

    const handleNavigationChange = (route: string) => {
      lastActivity.value = Date.now();
      handleSecurityEvent({
        type: 'NAVIGATION',
        details: { route, timestamp: new Date() }
      });
    };

    const handleTransitionStart = () => {
      isTransitioning.value = true;
    };

    const handleTransitionEnd = () => {
      isTransitioning.value = false;
      // Announce page change for screen readers
      announceToScreenReader('Page content updated');
    };

    // Security monitoring
    const startSecurityMonitoring = () => {
      securityCheckInterval = window.setInterval(() => {
        // Check for idle timeout
        if (Date.now() - lastActivity.value > IDLE_TIMEOUT) {
          handleSecurityEvent({
            type: 'SESSION_EXPIRED',
            details: { reason: 'idle_timeout' }
          });
        }

        // Validate session state
        if (!isAuthenticated.value) {
          handleSecurityEvent({
            type: 'SECURITY_VIOLATION',
            details: { reason: 'invalid_session' }
          });
        }
      }, SECURITY_CHECK_INTERVAL);
    };

    // Accessibility helper
    const announceToScreenReader = (message: string) => {
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('class', 'sr-only');
      announcement.textContent = message;
      document.body.appendChild(announcement);
      setTimeout(() => announcement.remove(), 1000);
    };

    // Activity tracking
    const updateLastActivity = () => {
      lastActivity.value = Date.now();
    };

    // Lifecycle hooks
    onMounted(() => {
      startSecurityMonitoring();
      document.addEventListener('mousemove', updateLastActivity);
      document.addEventListener('keypress', updateLastActivity);
    });

    onUnmounted(() => {
      if (securityCheckInterval) {
        clearInterval(securityCheckInterval);
      }
      document.removeEventListener('mousemove', updateLastActivity);
      document.removeEventListener('keypress', updateLastActivity);
    });

    return {
      isNavigationCollapsed,
      userProfile,
      menuItems,
      notificationSystem,
      handleNavigationToggle,
      handleSidebarToggle,
      handleNavigationChange,
      handleTransitionStart,
      handleTransitionEnd,
      handleSecurityEvent
    };
  }
});
</script>

<style lang="scss">
.app-layout {
  min-height: 100vh;
  background: var(--surface-ground);
  position: relative;
  z-index: 1;

  .page-container {
    padding: var(--space-md);
    transition: all 0.3s ease;
    margin: 0 auto;
    max-width: 1440px;

    &.content-shifted {
      @media (min-width: $breakpoint-md) {
        margin-left: 256px; // Sidebar width
      }
    }
  }

  // Screen reader only class
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  // Page transitions
  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.3s ease;
  }

  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }

  // High contrast mode support
  @media (forced-colors: active) {
    border: 1px solid ButtonText;
  }

  // Reduced motion preference
  @media (prefers-reduced-motion: reduce) {
    .page-container {
      transition: none;
    }
  }

  // Print styles
  @media print {
    background: white;
    
    .page-container {
      margin: 0;
      padding: 0;
    }
  }
}
</style>