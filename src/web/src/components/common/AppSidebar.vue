<template>
  <QDrawer
    v-model="isOpen"
    bordered
    :class="[
      'app-sidebar',
      { 'app-sidebar--mobile': isMobile },
      { 'app-sidebar--elevated': isElevated }
    ]"
    :behavior="isMobile ? 'mobile' : 'desktop'"
    :breakpoint="1024"
    :width="sidebarWidth"
    elevated
    aria-label="Main Navigation"
    role="navigation"
    @update:model-value="handleSidebarToggle"
  >
    <QScrollArea
      class="fit"
      :thumb-style="{ width: '4px', opacity: 0.75 }"
      visible
    >
      <AppNavigation
        :roles="userRoles"
        :is-authenticated="isAuthenticated"
        @navigation-changed="handleNavigationChange"
        @role-changed="handleRoleChange"
      />
    </QScrollArea>
  </QDrawer>
</template>

<script setup lang="ts">
// Vue imports - v3.0.0
import { ref, computed, onMounted, onUnmounted } from 'vue';

// Quasar imports - v2.0.0
import { QDrawer, QScrollArea, useQuasar } from 'quasar';

// Internal imports
import AppNavigation from './AppNavigation.vue';
import { useAuthStore } from '@/stores/auth.store';

// Constants for rate limiting and responsiveness
const TOGGLE_RATE_LIMIT = 5; // Max toggles per second
const TOGGLE_WINDOW = 1000; // 1 second window in milliseconds
const MOBILE_BREAKPOINT = 1024;
const DEFAULT_WIDTH = 256;
const MOBILE_WIDTH = 320;

// Component state
const $q = useQuasar();
const authStore = useAuthStore();
const isOpen = ref(true);
const isElevated = ref(false);
const toggleAttempts = ref<number[]>([]);
const touchStartX = ref(0);
const touchEndX = ref(0);

// Computed properties
const isMobile = computed(() => $q.screen.width < MOBILE_BREAKPOINT);
const sidebarWidth = computed(() => isMobile.value ? MOBILE_WIDTH : DEFAULT_WIDTH);
const userRoles = computed(() => authStore.user?.userRoles.map(role => role.roleId) || []);
const isAuthenticated = computed(() => authStore.isAuthenticated);

// Rate limiting check
const isToggleThrottled = (): boolean => {
  const now = Date.now();
  toggleAttempts.value = toggleAttempts.value.filter(
    timestamp => now - timestamp < TOGGLE_WINDOW
  );
  return toggleAttempts.value.length >= TOGGLE_RATE_LIMIT;
};

// Event handlers
const handleSidebarToggle = (value: boolean): void => {
  if (isToggleThrottled()) {
    console.warn('Sidebar toggle rate limit exceeded');
    return;
  }

  toggleAttempts.value.push(Date.now());
  isOpen.value = value;
  emit('sidebarToggled', value);
};

const handleNavigationChange = (route: string): void => {
  if (isMobile.value) {
    isOpen.value = false;
  }
  emit('navigationChanged', route);
};

const handleRoleChange = (): void => {
  emit('roleChanged');
};

// Touch interaction handlers
const handleTouchStart = (event: TouchEvent): void => {
  touchStartX.value = event.touches[0].clientX;
};

const handleTouchMove = (event: TouchEvent): void => {
  touchEndX.value = event.touches[0].clientX;
  const deltaX = touchEndX.value - touchStartX.value;

  if (Math.abs(deltaX) > 50) {
    isOpen.value = deltaX > 0;
  }
};

// Scroll and elevation handlers
const handleScroll = (): void => {
  isElevated.value = window.scrollY > 0;
};

// Lifecycle hooks
onMounted(() => {
  if (isMobile.value) {
    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
  }
  window.addEventListener('scroll', handleScroll);
});

onUnmounted(() => {
  document.removeEventListener('touchstart', handleTouchStart);
  document.removeEventListener('touchmove', handleTouchMove);
  window.removeEventListener('scroll', handleScroll);
});

// Event emitter
const emit = defineEmits<{
  (event: 'sidebarToggled', value: boolean): void;
  (event: 'navigationChanged', route: string): void;
  (event: 'roleChanged'): void;
}>();
</script>

<style lang="scss">
.app-sidebar {
  width: $DEFAULT_WIDTH;
  min-height: 100vh;
  background: var(--q-primary);
  color: white;
  transition: all 0.3s ease-in-out;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  z-index: 1000;

  &--mobile {
    width: 100%;
    max-width: $MOBILE_WIDTH;
  }

  &--elevated {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  }

  // Accessibility enhancements
  &:focus-visible {
    outline: 2px solid var(--q-primary);
    outline-offset: -2px;
  }

  // High contrast mode support
  @media (forced-colors: active) {
    border: 1px solid ButtonText;
  }

  // Reduced motion preference
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  // Print styles
  @media print {
    display: none;
  }
}

// Dark mode adjustments
.body--dark {
  .app-sidebar {
    background: var(--q-dark);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);

    &--elevated {
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
    }
  }
}
</style>