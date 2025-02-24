<template>
  <nav class="app-navigation q-pa-md">
    <QList bordered separator class="responsive-list" :class="{ 'mobile-list': isMobileView }">
      <QItem
        v-for="item in filteredNavigationItems"
        :key="item.route"
        clickable
        :active="isActiveRoute(item.route)"
        v-show="checkAccess(item.roles)"
        class="navigation-item"
        @click="handleNavigation(item.route)"
        @touchstart="handleTouchStart"
        @touchend="handleTouchEnd"
      >
        <QItemSection avatar>
          <QIcon :name="item.icon" :size="dynamicIconSize" />
        </QItemSection>
        <QItemSection class="navigation-label">
          {{ item.label }}
        </QItemSection>
      </QItem>
    </QList>
  </nav>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted } from 'vue';
  import { useRouter, useRoute } from 'vue-router';
  import { QList, QItem, QIcon, QItemSection } from 'quasar'; // ^2.0.0
  import { useAuthStore } from '@/stores/auth.store';
  import { UserRoleType } from '@/models/user.model';

  interface Props {
    layoutType?: 'default' | 'admin';
  }

  const props = withDefaults(defineProps<Props>(), {
    layoutType: 'default',
  });

  // Security monitoring constants
  const NAVIGATION_RATE_LIMIT = 10; // Max navigation attempts per minute
  const NAVIGATION_WINDOW = 60 * 1000; // 1 minute window
  const MOBILE_BREAKPOINT = 768;

  // Navigation state
  const router = useRouter();
  const route = useRoute();
  const authStore = useAuthStore();
  const navigationAttempts = ref<Date[]>([]);
  const isMobileView = ref(false);
  const touchStartTime = ref<number>(0);

  // Update the navigation items structure
  const navigationItems = [
    {
      label: 'Dashboard',
      icon: 'dashboard',
      route: '/dashboard',
      roles: [
        UserRoleType.Admin,
        UserRoleType.Operations,
        UserRoleType.Inspector,
        UserRoleType.CustomerService,
      ],
    },
    {
      label: 'Customers',
      icon: 'business',
      route: '/dashboard/customers',
      roles: [UserRoleType.Admin, UserRoleType.Operations],
    },
    {
      label: 'Inspectors',
      icon: 'engineering',
      route: '/dashboard/inspectors',
      roles: [UserRoleType.Admin, UserRoleType.Operations],
    },
    {
      label: 'Equipment',
      icon: 'inventory',
      route: '/dashboard/equipment',
      roles: [UserRoleType.Admin, UserRoleType.Operations, UserRoleType.Inspector],
    },
    // Admin items will be shown based on role
    {
      label: 'User Management',
      icon: 'people',
      route: '/admin/users',
      roles: [UserRoleType.Admin],
    },
    {
      label: 'System Settings',
      icon: 'settings',
      route: '/admin/settings',
      roles: [UserRoleType.Admin],
    },
    {
      label: 'Audit Logs',
      icon: 'history',
      route: '/admin/audit-logs',
      roles: [UserRoleType.Admin],
    },
  ];

  // Update the filtered navigation items computed property
  const filteredNavigationItems = computed(() => {
    return navigationItems.filter((item) => {
      return item.roles.some((role) => authStore.hasRole(role));
    });
  });

  // Responsive design computations
  const dynamicIconSize = computed(() => (isMobileView.value ? 'sm' : 'md'));

  // Security-enhanced role checking with caching
  const roleAccessCache = new Map<string, boolean>();

  function checkAccess(requiredRoles: UserRoleType[]): boolean {
    const cacheKey = requiredRoles.join(',');
    if (roleAccessCache.has(cacheKey)) {
      return roleAccessCache.get(cacheKey)!;
    }

    const hasAccess = requiredRoles.some((role) => authStore.hasRole(role));
    roleAccessCache.set(cacheKey, hasAccess);
    return hasAccess;
  }

  // Navigation rate limiting
  function isNavigationThrottled(): boolean {
    const now = Date.now();
    navigationAttempts.value = navigationAttempts.value.filter(
      (attempt) => now - attempt.getTime() < NAVIGATION_WINDOW
    );
    return navigationAttempts.value.length >= NAVIGATION_RATE_LIMIT;
  }

  // Active route tracking
  function isActiveRoute(path: string): boolean {
    return route.path === path;
  }

  // Navigation handler with security monitoring
  async function handleNavigation(path: string): Promise<void> {
    if (!authStore.isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isNavigationThrottled()) {
      console.warn('Navigation rate limit exceeded');
      return;
    }

    if (route.path !== path) {
      navigationAttempts.value.push(new Date());
      await router.push(path);
      emit('navigationChanged', path);
    }
  }

  // Touch interaction handlers for mobile
  function handleTouchStart(): void {
    touchStartTime.value = Date.now();
  }

  function handleTouchEnd(): void {
    const touchDuration = Date.now() - touchStartTime.value;
    if (touchDuration > 500) {
      // Long press detected - could trigger additional actions
      return;
    }
  }

  // Responsive layout handler
  function handleResize(): void {
    isMobileView.value = window.innerWidth < MOBILE_BREAKPOINT;
  }

  // Lifecycle hooks
  onMounted(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
    roleAccessCache.clear();
  });

  // Event emitter
  const emit = defineEmits<{
    (event: 'navigationChanged', path: string): void;
  }>();
</script>

<style lang="scss">
  .app-navigation {
    .responsive-list {
      transition: all 0.3s ease;

      &.mobile-list {
        .navigation-item {
          padding: 8px;

          .navigation-label {
            font-size: 14px;
          }
        }
      }
    }

    .navigation-item {
      transition: background-color 0.2s ease;
      border-radius: 8px;
      margin: 4px 8px;

      &:hover {
        background-color: rgba(var(--q-primary), 0.05);
      }

      &.q-item--active {
        background-color: rgba(var(--q-primary), 0.1);
        color: var(--q-primary);
        font-weight: 500;

        .q-icon {
          color: var(--q-primary);
        }
      }
    }

    @media (max-width: $breakpoint-sm) {
      .navigation-label {
        font-size: 14px;
      }
    }

    @media (min-width: $breakpoint-md) {
      .navigation-label {
        font-size: 16px;
      }
    }

    // Dark mode support
    :root[data-theme='dark'] & {
      .navigation-item {
        &:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }

        &.q-item--active {
          background-color: rgba(var(--q-primary), 0.2);
        }
      }
    }
  }
</style>
