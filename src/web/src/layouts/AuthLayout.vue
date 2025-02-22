<template>
  <q-layout view="lHh Lpr lff" class="auth-layout">
    <!-- Main content area with security boundaries -->
    <q-page-container>
      <q-page class="auth-page flex flex-center">
        <!-- Authentication container with error handling -->
        <div class="auth-container">
          <!-- Security event monitoring wrapper -->
          <div 
            class="auth-content"
            :class="{ 'security-alert': hasSecurityViolation }"
            role="main"
            aria-live="polite"
          >
            <!-- Login form with enhanced security -->
            <login-form
              v-if="!isLoading"
              @submit="handleAuthSubmit"
              @error="handleAuthError"
              ref="loginForm"
            />

            <!-- Loading state -->
            <loading-spinner
              v-else
              size="large"
              color="primary"
              :aria-label="$t('auth.authenticating')"
            />

            <!-- Security alert display -->
            <q-banner
              v-if="securityAlert"
              class="security-banner q-mt-md"
              rounded
              dense
              :type="securityAlert.type"
              role="alert"
            >
              {{ securityAlert.message }}
            </q-banner>
          </div>
        </div>
      </q-page>
    </q-page-container>

    <!-- Application footer -->
    <app-footer />
  </q-layout>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'
import LoginForm from '../components/auth/LoginForm.vue'
import AppFooter from '../components/common/AppFooter.vue'
import { useAuth } from '../composables/useAuth'

// Security monitoring constants
const SECURITY_CHECK_INTERVAL = 30 * 1000 // 30 seconds
const MAX_SECURITY_VIOLATIONS = 3

export default defineComponent({
  name: 'AuthLayout',

  components: {
    LoginForm,
    AppFooter
  },

  setup() {
    const $q = useQuasar()
    const { 
      login, 
      isAuthenticated, 
      handleSecurityEvent,
      securityStatus 
    } = useAuth()

    // Reactive references
    const isLoading = ref(false)
    const securityAlert = ref<{ type: string; message: string } | null>(null)
    const securityViolations = ref(0)
    const securityCheckTimer = ref<number | null>(null)
    const loginForm = ref<InstanceType<typeof LoginForm> | null>(null)

    // Computed properties
    const hasSecurityViolation = computed(() => securityViolations.value > 0)

    /**
     * Handles authentication submission with security checks
     */
    const handleAuthSubmit = async (credentials: any) => {
      try {
        isLoading.value = true
        securityAlert.value = null

        // Enhance credentials with security context
        const enhancedCredentials = {
          ...credentials,
          deviceInfo: await captureDeviceInfo()
        }

        await login(enhancedCredentials)

        // Start security monitoring on successful auth
        initializeSecurityMonitoring()

      } catch (error: any) {
        handleAuthError(error)
      } finally {
        isLoading.value = false
      }
    }

    /**
     * Handles authentication errors with user feedback
     */
    const handleAuthError = (error: any) => {
      securityViolations.value++
      
      if (securityViolations.value >= MAX_SECURITY_VIOLATIONS) {
        handleSecurityEvent({
          type: 'SECURITY_VIOLATION',
          timestamp: new Date(),
          details: { error }
        })
      }

      securityAlert.value = {
        type: 'negative',
        message: error.message || 'Authentication failed'
      }

      // Clear alert after delay
      setTimeout(() => {
        securityAlert.value = null
      }, 5000)
    }

    /**
     * Captures device information for security tracking
     */
    const captureDeviceInfo = async () => {
      return {
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        colorDepth: window.screen.colorDepth,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    }

    /**
     * Initializes security monitoring
     */
    const initializeSecurityMonitoring = () => {
      cleanupSecurityMonitoring()

      securityCheckTimer.value = window.setInterval(() => {
        // Check for security status changes
        if (!securityStatus.value.deviceTrusted) {
          handleSecurityEvent({
            type: 'SECURITY_VIOLATION',
            timestamp: new Date(),
            details: { reason: 'untrusted_device' }
          })
        }

        // Monitor for suspicious activity
        if (securityViolations.value > 0) {
          handleSecurityEvent({
            type: 'SECURITY_ALERT',
            timestamp: new Date(),
            details: { violations: securityViolations.value }
          })
        }
      }, SECURITY_CHECK_INTERVAL)
    }

    /**
     * Cleans up security monitoring
     */
    const cleanupSecurityMonitoring = () => {
      if (securityCheckTimer.value) {
        clearInterval(securityCheckTimer.value)
        securityCheckTimer.value = null
      }
    }

    // Lifecycle hooks
    onMounted(() => {
      if (isAuthenticated.value) {
        initializeSecurityMonitoring()
      }
    })

    onUnmounted(() => {
      cleanupSecurityMonitoring()
    })

    return {
      isLoading,
      securityAlert,
      hasSecurityViolation,
      loginForm,
      handleAuthSubmit,
      handleAuthError
    }
  }
})
</script>

<style lang="scss" scoped>
@import '../assets/styles/app.scss';

.auth-layout {
  min-height: 100vh;
  background: var(--primary);
  background: linear-gradient(
    135deg,
    var(--primary) 0%,
    var(--primary-dark) 100%
  );
  position: relative;
  overflow: hidden;

  // Material Design elevation
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    z-index: 0;
  }
}

.auth-container {
  position: relative;
  z-index: 1;
  max-width: 400px;
  width: 100%;
  margin: 0 auto;
  padding: map-get(responsive-spacing(padding, $space-base), md);
  background: var(--surface-ground);
  border-radius: $border-radius-lg;
  box-shadow: $elevation-3;

  @media (max-width: $breakpoint-xs) {
    margin: $space-md;
    width: calc(100% - #{$space-md * 2});
  }

  @media (min-width: $breakpoint-sm) {
    margin-top: $space-2xl;
    transform: translateY(calc(50vh - 100%));
  }

  // High contrast mode support
  @media (forced-colors: active) {
    border: 2px solid CanvasText;
  }
}

.auth-content {
  position: relative;

  &.security-alert {
    animation: shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  }
}

.security-banner {
  margin-top: $space-md;
  border-left: 4px solid currentColor;
  transition: all 0.3s $transition-timing;
}

@keyframes shake {
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
  40%, 60% { transform: translate3d(4px, 0, 0); }
}

// Print styles
@media print {
  .auth-layout {
    display: none !important;
  }
}
</style>