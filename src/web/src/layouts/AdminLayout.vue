<template>
  <q-layout
    view="hHh lpR fFf"
    class="admin-layout"
    role="application"
    aria-label="Admin Dashboard"
  >
    <!-- Enhanced Header with Security Monitoring -->
    <AppHeader
      :navigation-collapsed="isNavigationCollapsed"
      @update:navigation-collapsed="handleNavigationToggle"
      @security-event="handleSecurityEvent"
    />

    <!-- Enhanced Sidebar with Accessibility -->
    <AppSidebar
      :access-mode="accessibilityMode"
      @sidebar-toggled="handleNavigationToggle"
      @navigation-changed="handleRouteChange"
    />

    <!-- Main Content Area with ARIA Live Region -->
    <q-page-container
      class="admin-layout__content"
      role="main"
      aria-live="polite"
    >
      <router-view v-slot="{ Component }">
        <suspense>
          <template #default>
            <component :is="Component" />
          </template>
          <template #fallback>
            <div class="loading-placeholder" role="status" aria-busy="true">
              <q-spinner size="3em" color="primary" />
              <span class="sr-only">Loading content...</span>
            </div>
          </template>
        </suspense>
      </router-view>
    </q-page-container>

    <!-- Enhanced Footer -->
    <AppFooter />
  </q-layout>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted } from 'vue'
import { QLayout, QPageContainer } from 'quasar' // v2.0.0
import { useErrorBoundary } from 'vue' // v3.0.0
import AppHeader from '@/components/common/AppHeader.vue'
import AppSidebar from '@/components/common/AppSidebar.vue'
import AppFooter from '@/components/common/AppFooter.vue'
import { useAuth } from '@/composables/useAuth'

// Security monitoring constants
const NAVIGATION_RATE_LIMIT = 10 // Max navigation changes per minute
const SECURITY_CHECK_INTERVAL = 30000 // 30 seconds

export default defineComponent({
  name: 'AdminLayout',

  components: {
    QLayout,
    QPageContainer,
    AppHeader,
    AppSidebar,
    AppFooter
  },

  setup() {
    const { isAuthenticated, userRoles, validateSession, monitorSecurityEvents } = useAuth()
    const { onError } = useErrorBoundary()

    // Reactive state
    const isNavigationCollapsed = ref(false)
    const accessibilityMode = ref(false)
    const navigationAttempts = ref<Date[]>([])
    const securityCheckInterval = ref<number | null>(null)

    // Computed properties
    const hasAdminAccess = computed(() => {
      return isAuthenticated.value && userRoles.value.includes('Admin')
    })

    // Security-enhanced navigation handler
    const handleNavigationToggle = async (collapsed: boolean) => {
      try {
        // Rate limiting check
        const now = Date.now()
        navigationAttempts.value = navigationAttempts.value.filter(
          attempt => now - attempt.getTime() < 60000
        )

        if (navigationAttempts.value.length >= NAVIGATION_RATE_LIMIT) {
          console.warn('Navigation rate limit exceeded')
          return
        }

        // Session validation
        if (!await validateSession()) {
          throw new Error('Invalid session state')
        }

        navigationAttempts.value.push(new Date())
        isNavigationCollapsed.value = collapsed

        // Accessibility announcement
        announceNavigationChange(collapsed)
      } catch (error) {
        handleSecurityEvent({
          type: 'SECURITY_VIOLATION',
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        })
      }
    }

    // Route change handler with security validation
    const handleRouteChange = async (route: string) => {
      try {
        if (!await validateSession()) {
          throw new Error('Invalid session state')
        }

        // Additional security checks can be added here
        monitorSecurityEvents()
      } catch (error) {
        handleSecurityEvent({
          type: 'NAVIGATION_ERROR',
          details: { route, error: error instanceof Error ? error.message : 'Unknown error' }
        })
      }
    }

    // Security event handler
    const handleSecurityEvent = (event: any) => {
      console.warn('Security event detected:', event)
      // Additional security event handling logic
    }

    // Accessibility announcement utility
    const announceNavigationChange = (collapsed: boolean) => {
      const announcement = document.createElement('div')
      announcement.setAttribute('aria-live', 'polite')
      announcement.setAttribute('class', 'sr-only')
      announcement.textContent = `Navigation menu ${collapsed ? 'collapsed' : 'expanded'}`
      document.body.appendChild(announcement)
      setTimeout(() => announcement.remove(), 1000)
    }

    // Error boundary handler
    onError((error) => {
      console.error('Layout error:', error)
      handleSecurityEvent({
        type: 'LAYOUT_ERROR',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      })
    })

    // Lifecycle hooks
    onMounted(() => {
      // Initialize security monitoring
      securityCheckInterval.value = window.setInterval(() => {
        validateSession()
      }, SECURITY_CHECK_INTERVAL)

      // Check system preferences for accessibility
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        accessibilityMode.value = true
      }
    })

    onUnmounted(() => {
      if (securityCheckInterval.value) {
        clearInterval(securityCheckInterval.value)
      }
    })

    return {
      isNavigationCollapsed,
      accessibilityMode,
      hasAdminAccess,
      handleNavigationToggle,
      handleRouteChange,
      handleSecurityEvent
    }
  }
})
</script>

<style lang="scss">
.admin-layout {
  min-height: 100vh;
  background: var(--surface-ground);
  position: relative;
  z-index: var(--z-layout);

  &__content {
    padding: var(--space-lg);
    background: var(--surface-section);
    min-height: calc(100vh - var(--header-height) - var(--footer-height));
    position: relative;
    transition: padding 0.3s ease;

    @media (max-width: $breakpoint-sm) {
      padding: var(--space-md);
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

  // Loading placeholder
  .loading-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 200px;
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
    
    &__content {
      padding: 0;
    }
  }
}
</style>