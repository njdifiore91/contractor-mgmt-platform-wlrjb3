<template>
  <QDrawer
    :model-value="localIsOpen"
    bordered
    :class="[
      'app-sidebar',
      { 'app-sidebar--mobile': isMobile },
      { 'app-sidebar--elevated': isElevated }
    ]"
    :behavior="isMobile ? 'mobile' : 'desktop'"
    :breakpoint="1024"
    :width="sidebarWidth"
    show-if-above
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
        :layout-type="layoutType"
        :roles="userRoles"
        :is-authenticated="isAuthenticated"
        @navigation-changed="handleNavigationChange"
        @role-changed="handleRoleChange"
      />
    </QScrollArea>
  </QDrawer>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { QDrawer, QScrollArea, useQuasar } from 'quasar';
import AppNavigation from './AppNavigation.vue';
import { useAuthStore } from '@/stores/auth.store';

interface Props {
  isOpen: boolean;
  isElevated?: boolean;
  layoutType?: 'default' | 'admin';
}

const props = withDefaults(defineProps<Props>(), {
  isElevated: false,
  layoutType: 'default'
});

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void;
  (e: 'sidebarToggled', value: boolean): void;
  (e: 'navigationChanged', route: string): void;
  (e: 'roleChanged'): void;
}>();

// Constants for responsiveness
const MOBILE_BREAKPOINT = 1024;
const DEFAULT_WIDTH = 256;
const MOBILE_WIDTH = 320;

// Component state
const $q = useQuasar();
const authStore = useAuthStore();
const touchStartX = ref(0);
const touchEndX = ref(0);
const localIsOpen = ref(props.isOpen);

// Watch for prop changes
watch(() => props.isOpen, (newValue) => {
  localIsOpen.value = newValue;
});

// Computed properties
const isMobile = computed(() => $q.screen.width < MOBILE_BREAKPOINT);
const sidebarWidth = computed(() => isMobile.value ? MOBILE_WIDTH : DEFAULT_WIDTH);
const userRoles = computed(() => authStore.user?.userRoles.map(role => role.roleId) || []);
const isAuthenticated = computed(() => authStore.isAuthenticated);

// Event handlers
const handleSidebarToggle = (value: boolean): void => {
  localIsOpen.value = value;
  emit('update:isOpen', value);
  emit('sidebarToggled', value);
};

const handleNavigationChange = (route: string): void => {
  if (isMobile.value) {
    handleSidebarToggle(false);
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
    handleSidebarToggle(deltaX > 0);
  }
};

// Lifecycle hooks
onMounted(() => {
  if (isMobile.value) {
    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
  }
});

onUnmounted(() => {
  document.removeEventListener('touchstart', handleTouchStart);
  document.removeEventListener('touchmove', handleTouchMove);
});
</script>

<style lang="scss">
:root {
  --sidebar-default-width: 256px;
  --sidebar-mobile-width: 320px;
  --sidebar-z-index: 1000;
  --sidebar-shadow-light: 0 2px 4px rgba(0, 0, 0, 0.12);
  --sidebar-shadow-elevated: 0 4px 8px rgba(0, 0, 0, 0.2);
  --sidebar-shadow-dark: 0 2px 4px rgba(0, 0, 0, 0.3);
  --sidebar-shadow-dark-elevated: 0 4px 8px rgba(0, 0, 0, 0.4);
}

.app-sidebar {
  width: var(--sidebar-default-width);
  min-height: 100vh;
  background: var(--surface-ground);
  transition: all 0.3s ease-in-out;
  box-shadow: var(--sidebar-shadow-light);
  z-index: var(--sidebar-z-index);

  &--mobile {
    width: 100%;
    max-width: var(--sidebar-mobile-width);
  }

  &--elevated {
    box-shadow: var(--sidebar-shadow-elevated);
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
:root[data-theme="dark"] .app-sidebar {
  background: var(--surface-ground-dark);
  box-shadow: var(--sidebar-shadow-dark);

  &--elevated {
    box-shadow: var(--sidebar-shadow-dark-elevated);
  }
}
</style>