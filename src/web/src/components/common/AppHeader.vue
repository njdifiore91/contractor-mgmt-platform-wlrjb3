<template>
  <q-header
    class="app-header bg-primary text-white"
    role="banner"
    aria-label="Main application header"
  >
    <q-toolbar class="app-header__toolbar">
      <!-- Navigation Toggle Button -->
      <q-btn
        flat
        dense
        round
        icon="menu"
        class="app-header__nav-btn"
        :aria-label="navigationCollapsed ? 'Expand navigation' : 'Collapse navigation'"
        :aria-expanded="!navigationCollapsed"
        @click="toggleNavigation"
      />

      <!-- Application Logo -->
      <q-toolbar-title class="app-header__title">
        Service Provider Management System
      </q-toolbar-title>

      <!-- Security Status Indicator -->
      <q-chip
        v-if="isAuthenticated"
        :color="securityStatus.isValid ? 'positive' : 'negative'"
        text-color="white"
        icon="security"
        class="app-header__security-indicator q-mr-sm"
        aria-live="polite"
      >
        {{ securityStatus.isValid ? 'Secure' : 'Session Invalid' }}
      </q-chip>

      <!-- User Profile Menu -->
      <div class="app-header__profile" v-if="isAuthenticated">
        <q-btn
          flat
          dense
          round
          icon="account_circle"
          aria-label="User profile menu"
          aria-haspopup="true"
          :aria-expanded="profileMenuOpen"
          @click="toggleProfileMenu"
          @keydown="handleKeyboardNavigation"
        >
          <q-menu
            v-model="profileMenuOpen"
            auto-close
            anchor="bottom right"
            self="top right"
            class="app-header__profile-menu"
          >
            <UserProfile />
          </q-menu>
        </q-btn>
      </div>

      <!-- App Navigation -->
      <AppNavigation
        v-model:navigationCollapsed="navigationCollapsed"
        @securityEvent="handleSecurityEvent"
      />
    </q-toolbar>
  </q-header>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted } from 'vue';
import { useAuth } from '@/composables/useAuth';
import UserProfile from '@/components/auth/UserProfile.vue';
import AppNavigation from '@/components/common/AppNavigation.vue';

export default defineComponent({
  name: 'AppHeader',

  components: {
    UserProfile,
    AppNavigation
  },

  props: {
    navigationCollapsed: {
      type: Boolean,
      default: false
    }
  },

  emits: ['update:navigationCollapsed', 'securityEvent'],

  setup(props, { emit }) {
    const { isAuthenticated, handleLogout, validateSession, refreshToken } = useAuth();
    const profileMenuOpen = ref(false);
    const sessionCheckInterval = ref<number | null>(null);
    const securityStatusRef = ref({ isValid: true });

    // Security status monitoring
    const updateSecurityStatus = async () => {
      const isValid = await validateSession();
      securityStatusRef.value = {
        isValid,
        lastActivity: new Date(),
        deviceTrusted: true
      };
    };

    // Toggle navigation menu with accessibility
    const toggleNavigation = () => {
      emit('update:navigationCollapsed', !props.navigationCollapsed);
      // Announce state change for screen readers
      const announcement = props.navigationCollapsed ? 'Navigation expanded' : 'Navigation collapsed';
      announceToScreenReader(announcement);
    };

    // Toggle profile menu with security validation
    const toggleProfileMenu = async () => {
      if (await validateSession()) {
        profileMenuOpen.value = !profileMenuOpen.value;
      } else {
        await handleLogout();
      }
    };

    // Handle keyboard navigation for accessibility
    const handleKeyboardNavigation = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          profileMenuOpen.value = false;
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          toggleProfileMenu();
          break;
      }
    };

    // Screen reader announcement utility
    const announceToScreenReader = (message: string) => {
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('class', 'sr-only');
      announcement.textContent = message;
      document.body.appendChild(announcement);
      setTimeout(() => announcement.remove(), 1000);
    };

    // Security event handler
    const handleSecurityEvent = (event: any) => {
      emit('securityEvent', event);
    };

    // Initialize security monitoring
    onMounted(async () => {
      if (isAuthenticated.value) {
        await updateSecurityStatus();
        sessionCheckInterval.value = window.setInterval(async () => {
          await updateSecurityStatus();
          if (!securityStatusRef.value.isValid) {
            await handleLogout();
          }
          await refreshToken();
        }, 30000); // Check every 30 seconds
      }
    });

    // Cleanup
    onUnmounted(() => {
      if (sessionCheckInterval.value) {
        clearInterval(sessionCheckInterval.value);
      }
    });

    return {
      isAuthenticated,
      profileMenuOpen,
      securityStatus: computed(() => securityStatusRef.value),
      toggleNavigation,
      toggleProfileMenu,
      handleKeyboardNavigation,
      handleSecurityEvent
    };
  }
});
</script>

<style lang="scss" scoped>
.app-header {
  &__toolbar {
    min-height: 56px;
    padding: 0 16px;
  }

  &__nav-btn {
    margin-right: 12px;
  }

  &__title {
    font-size: 1.25rem;
    font-weight: 500;
    line-height: 1.2;
  }

  &__security-indicator {
    font-size: 0.875rem;
  }

  &__profile {
    margin-left: 8px;
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
    border: 0;
  }

  // Responsive breakpoints
  @media (max-width: 768px) {
    &__title {
      font-size: 1rem;
    }

    &__security-indicator {
      display: none;
    }
  }

  @media (min-width: 769px) and (max-width: 1024px) {
    &__title {
      font-size: 1.125rem;
    }
  }

  @media (min-width: 1025px) {
    &__toolbar {
      min-height: 64px;
    }
  }
}
</style>