<template>
  <div class="login-page">
    <!-- Loading state -->
    <loading-spinner
      v-if="isLoading"
      size="large"
      color="primary"
      aria-label="Loading authentication..."
    />

    <!-- Login form -->
    <div v-else>
      <login-form
        @submit="handleAuthSuccess"
        @error="handleAuthError"
      />
    </div>

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
      try {
        // Initialize authentication state
        await initializeAuth();

        // Redirect if already authenticated
        if (isAuthenticated.value) {
          await router.replace('/dashboard');
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
      } catch (error) {
        console.error('Error during login page initialization:', error);
        handleAuthError(error as Error);
      }
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
  .error-banner {
    margin-top: 1rem;
    border-radius: 8px;
  }
}
</style>