<template>
  <q-page class="login-page" role="main" aria-labelledby="login-title">
    <!-- Security monitoring overlay (hidden) -->
    <div class="security-overlay" aria-hidden="true"></div>

    <!-- Main login container -->
    <div class="form-container">
      <!-- Accessibility announcement for screen readers -->
      <div 
        role="status" 
        aria-live="polite" 
        class="sr-only"
      >
        {{ error }}
      </div>

      <!-- Loading state -->
      <loading-spinner
        v-if="isLoading"
        size="large"
        color="primary"
        :aria-label="$t('auth.loading')"
      />

      <!-- Login form -->
      <login-form
        v-else
        @submit="handleAuthSuccess"
        @error="handleAuthError"
      />

      <!-- Error display -->
      <q-banner
        v-if="error"
        class="error-banner q-mt-md"
        type="negative"
        rounded
        dense
        role="alert"
      >
        {{ error }}
      </q-banner>
    </div>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted } from 'vue'; // ^3.3.0
import { useRouter } from 'vue-router'; // ^4.0.0
import { useQuasar } from 'quasar'; // ^2.0.0
import LoginForm from '../../components/auth/LoginForm.vue';
import LoadingSpinner from '../../components/common/LoadingSpinner.vue';
import { useAuth } from '../../composables/useAuth';

export default defineComponent({
  name: 'LoginPage',

  components: {
    LoginForm,
    LoadingSpinner
  },

  setup() {
    const router = useRouter();
    const $q = useQuasar();
    const { 
      isLoading,
      error,
      isAuthenticated,
      initializeAuth,
      handleMFA,
      securityStatus
    } = useAuth();

    // Security monitoring interval
    let securityMonitorInterval: number | null = null;

    onMounted(async () => {
      // Initialize authentication state
      await initializeAuth();

      // Redirect if already authenticated
      if (isAuthenticated.value) {
        router.push('/dashboard');
        return;
      }

      // Setup security monitoring
      securityMonitorInterval = window.setInterval(() => {
        if (securityStatus.value.isLocked) {
          handleAuthError(new Error('Security violation detected'));
        }
      }, 30000);

      // Announce page load to screen readers
      announcePageLoad();
    });

    onUnmounted(() => {
      if (securityMonitorInterval) {
        clearInterval(securityMonitorInterval);
      }
    });

    const handleAuthSuccess = async (): Promise<void> => {
      try {
        // Check if MFA is required
        if (securityStatus.value.mfaEnabled) {
          await handleMFA();
        }

        // Show success notification with screen reader announcement
        $q.notify({
          type: 'positive',
          message: 'Successfully authenticated',
          position: 'top',
          timeout: 2000,
          role: 'status',
          attrs: {
            'aria-live': 'polite'
          }
        });

        // Navigate to dashboard
        await router.push('/dashboard');
      } catch (err) {
        handleAuthError(err);
      }
    };

    const handleAuthError = async (err: Error): Promise<void> => {
      const errorMessage = err.message || 'Authentication failed';
      
      error.value = errorMessage;

      // Show error notification with screen reader announcement
      $q.notify({
        type: 'negative',
        message: errorMessage,
        position: 'top',
        timeout: 5000,
        role: 'alert',
        attrs: {
          'aria-live': 'assertive'
        }
      });
    };

    const announcePageLoad = (): void => {
      const announcement = document.createElement('div');
      announcement.setAttribute('role', 'status');
      announcement.setAttribute('aria-live', 'polite');
      announcement.classList.add('sr-only');
      announcement.textContent = 'Login page loaded';
      document.body.appendChild(announcement);
      
      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
    };

    return {
      isLoading,
      error,
      handleAuthSuccess,
      handleAuthError
    };
  }
});
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary);
  padding: map-get(responsive-spacing(padding, $space-base), md);
  position: relative;

  .form-container {
    max-width: 400px;
    width: 100%;
    background: white;
    border-radius: $border-radius-lg;
    padding: map-get(responsive-spacing(padding, $space-base), lg);
    box-shadow: $elevation-3;
    position: relative;
    z-index: 1;

    @media (max-width: $breakpoint-xs) {
      padding: map-get(responsive-spacing(padding, $space-base), md);
      margin: map-get(responsive-spacing(margin, $space-base), sm);
    }

    @media (min-width: $breakpoint-sm) {
      max-width: 450px;
      margin: map-get(responsive-spacing(margin, $space-base), md);
    }
  }

  .security-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: transparent;
    z-index: 0;
  }

  .error-banner {
    margin-top: map-get(responsive-spacing(margin, $space-base), md);
    border-radius: $border-radius-base;
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
}
</style>