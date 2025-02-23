<template>
  <q-page
    class="profile-page q-pa-md"
    role="main"
    aria-label="User Profile Management"
  >
    <!-- Security Context Provider -->
    <div
      v-if="!securityContext.isValid"
      class="security-overlay flex flex-center"
      role="alert"
      aria-live="assertive"
    >
      <q-banner class="bg-negative text-white">
        {{ $t('security.invalidSession') }}
      </q-banner>
    </div>

    <!-- Breadcrumbs Navigation -->
    <q-breadcrumbs class="q-mb-lg">
      <q-breadcrumbs-el
        label="Home"
        icon="home"
        to="/"
      />
      <q-breadcrumbs-el
        label="Profile"
        icon="person"
      />
    </q-breadcrumbs>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex flex-center q-pa-lg">
      <q-spinner
        color="primary"
        size="3em"
        aria-label="Loading profile data"
      />
    </div>

    <!-- Error Boundary -->
    <q-banner
      v-if="error"
      class="bg-negative text-white q-mb-md"
      rounded
      role="alert"
    >
      <template v-slot:avatar>
        <q-icon name="error" />
      </template>
      {{ error }}
    </q-banner>

    <!-- Profile Content -->
    <q-card
      v-else-if="!isLoading"
      flat
      bordered
      class="profile-container"
    >
      <user-profile
        :user-data="userData"
        :security-context="securityContext"
        :is-loading="isLoading"
        @update:profile="handleProfileUpdate"
        @security-event="handleSecurityEvent"
      />
    </q-card>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from 'vue';
import { useRateLimiter } from '@vueuse/core';
import { useSecurityMonitor } from '@/composables/useSecurityMonitor';
import { useValidation } from '@vuelidate/core';
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import UserProfile from '@/components/auth/UserProfile.vue';
import type { IUser } from '@/models/user.model';

// Security monitoring constants
const PROFILE_UPDATE_LIMIT = 5; // Max updates per minute
const SECURITY_CHECK_INTERVAL = 30000; // 30 seconds

export default defineComponent({
  name: 'ProfilePage',

  components: {
    DefaultLayout,
    UserProfile
  },

  setup() {
    // Reactive state
    const userData = ref<IUser | null>(null);
    const isLoading = ref(true);
    const error = ref<string | null>(null);
    const securityCheckInterval = ref<number | null>(null);

    // Security monitoring setup
    const { monitor, securityContext } = useSecurityMonitor();
    const rateLimiter = useRateLimiter(PROFILE_UPDATE_LIMIT, 60000);

    // Form validation setup
    const rules = {
      firstName: { required: true, minLength: 2 },
      lastName: { required: true, minLength: 2 },
      email: { required: true, email: true },
      phoneNumber: { pattern: /^\+?[\d\s-()]+$/ }
    };
    const v$ = useValidation(rules);

    // Profile update handler with rate limiting and validation
    const handleProfileUpdate = async (updatedProfile: Partial<IUser>): Promise<boolean> => {
      try {
        if (!rateLimiter.tryAcquire()) {
          error.value = 'Too many update attempts. Please try again later.';
          return false;
        }

        isLoading.value = true;
        error.value = null;

        // Validate security context
        if (!securityContext.value.isValid) {
          throw new Error('Invalid security context');
        }

        // Validate form data
        const isValid = await v$.value.$validate();
        if (!isValid) {
          throw new Error('Invalid form data');
        }

        // Update profile
        userData.value = { ...userData.value, ...updatedProfile };
        monitor.logEvent('PROFILE_UPDATE', { success: true });
        return true;

      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Profile update failed';
        monitor.logEvent('PROFILE_UPDATE', { success: false, error: error.value });
        return false;

      } finally {
        isLoading.value = false;
      }
    };

    // Security event handler
    const handleSecurityEvent = (event: any) => {
      monitor.handleSecurityEvent(event);
      if (event.type === 'SESSION_EXPIRED') {
        error.value = 'Your session has expired. Please log in again.';
      }
    };

    // Initialize security monitoring
    const startSecurityMonitoring = () => {
      securityCheckInterval.value = window.setInterval(() => {
        monitor.checkSecurityContext();
      }, SECURITY_CHECK_INTERVAL);
    };

    // Lifecycle hooks
    onMounted(() => {
      startSecurityMonitoring();
    });

    onUnmounted(() => {
      if (securityCheckInterval.value) {
        clearInterval(securityCheckInterval.value);
      }
    });

    return {
      userData,
      isLoading,
      error,
      securityContext,
      handleProfileUpdate,
      handleSecurityEvent
    };
  }
});
</script>

<style lang="scss">
.profile-page {
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100vh;
  position: relative;

  .profile-container {
    background: var(--surface-ground);
    border-radius: var(--border-radius-base);
    transition: all 0.3s ease;

    @media (max-width: $breakpoint-sm) {
      margin: var(--space-sm);
    }

    @media (min-width: $breakpoint-md) {
      margin: var(--space-lg);
    }
  }

  .security-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    backdrop-filter: blur(4px);
  }

  // High contrast mode support
  @media (forced-colors: active) {
    .profile-container {
      border: 1px solid ButtonText;
    }
  }

  // Reduced motion preference
  @media (prefers-reduced-motion: reduce) {
    .profile-container {
      transition: none;
    }
  }

  // Print styles
  @media print {
    .security-overlay {
      display: none;
    }
  }
}
</style>