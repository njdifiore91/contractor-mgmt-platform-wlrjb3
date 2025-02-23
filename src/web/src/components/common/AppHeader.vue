<template>
  <q-header
    class="app-header bg-primary text-white"
    role="banner"
    aria-label="Main application header"
    elevated
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

      <!-- Application Logo and Title -->
      <q-toolbar-title class="app-header__title row items-center no-wrap">
        <q-avatar size="38px" class="q-mr-sm app-header__logo">
          <img src="@/assets/logo.svg" alt="Company Logo">
        </q-avatar>
        <span class="text-weight-medium ellipsis">
          {{ layoutType === 'admin' ? 'Admin Dashboard' : 'Service Provider Management' }}
        </span>
      </q-toolbar-title>

      <!-- Right Side Actions -->
      <div class="app-header__actions row items-center no-wrap">
        <!-- Security Status -->
        <q-chip
          v-if="isAuthenticated"
          :color="securityStatus.isValid ? 'positive' : 'negative'"
          text-color="white"
          icon="security"
          size="md"
          class="app-header__security-chip q-mr-md"
          aria-live="polite"
        >
          {{ securityStatus.isValid ? 'Secure' : 'Session Invalid' }}
        </q-chip>

        <!-- Admin Quick Access -->
        <q-btn
          v-if="hasAdminAccess && layoutType !== 'admin'"
          flat
          dense
          round
          to="/admin"
          icon="admin_panel_settings"
          class="q-mr-md app-header__action-btn"
        >
          <q-tooltip>Admin Dashboard</q-tooltip>
        </q-btn>

        <!-- Notifications -->
        <q-btn
          flat
          dense
          round
          icon="notifications"
          class="app-header__notifications q-mr-md app-header__action-btn"
        >
          <q-badge
            v-if="unreadNotifications"
            color="negative"
            floating
          >
            {{ unreadNotifications }}
          </q-badge>
          <q-tooltip>Notifications</q-tooltip>
        </q-btn>

        <!-- User Profile Menu -->
        <q-btn
          v-if="isAuthenticated"
          flat
          dense
          round
          icon="account_circle"
          class="app-header__profile-btn app-header__action-btn"
        >
          <q-menu
            class="app-header__profile-menu"
            transition-show="jump-down"
            transition-hide="jump-up"
            auto-close
          >
            <q-list style="min-width: 250px">
              <!-- User Info -->
              <q-item class="bg-primary text-white">
                <q-item-section>
                  <q-item-label class="text-weight-bold">
                    {{ currentUser?.firstName }} {{ currentUser?.lastName }}
                  </q-item-label>
                  <q-item-label caption class="text-white">
                    {{ currentUser?.email }}
                  </q-item-label>
                </q-item-section>
              </q-item>

              <q-separator />

              <!-- Profile Actions -->
              <q-item clickable v-ripple to="/auth/profile">
                <q-item-section avatar>
                  <q-icon name="person" />
                </q-item-section>
                <q-item-section>Profile Settings</q-item-section>
              </q-item>

              <q-item clickable v-ripple @click="handlePreferences">
                <q-item-section avatar>
                  <q-icon name="settings" />
                </q-item-section>
                <q-item-section>Preferences</q-item-section>
              </q-item>

              <q-separator />

              <!-- Help & Support -->
              <q-item clickable v-ripple to="/help">
                <q-item-section avatar>
                  <q-icon name="help" />
                </q-item-section>
                <q-item-section>Help & Support</q-item-section>
              </q-item>

              <q-separator />

              <!-- Logout -->
              <q-item clickable v-ripple @click="handleLogout" class="text-negative">
                <q-item-section avatar>
                  <q-icon name="logout" color="negative" />
                </q-item-section>
                <q-item-section>Logout</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </div>
    </q-toolbar>

  </q-header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
import { useQuasar } from 'quasar';
import { UserRoleType } from '@/models/user.model';

interface Props {
  navigationCollapsed: boolean;
  layoutType?: 'default' | 'admin';
}

const props = withDefaults(defineProps<Props>(), {
  layoutType: 'default'
});

const emit = defineEmits<{
  (e: 'update:navigation-collapsed', value: boolean): void;
  (e: 'security-event', event: any): void;
}>();

// Composables
const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const { isAuthenticated, currentUser, logout, validateSession } = useAuth();

// State
const securityStatus = ref({ isValid: true });
const unreadNotifications = ref(0); // This would be connected to a notifications system
const sessionCheckInterval = ref<number | null>(null);

// Computed
const hasAdminAccess = computed(() => {
  return currentUser.value?.userRoles.some(role => role.roleId === UserRoleType.Admin) ?? false;
});

const showBreadcrumbs = computed(() => {
  return !['/', '/login', '/register'].includes(route.path);
});

const breadcrumbs = computed(() => {
  const pathSegments = route.path.split('/').filter(Boolean);
  return pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    return {
      path,
      label: segment.charAt(0).toUpperCase() + segment.slice(1)
    };
  });
});

// Methods
const toggleNavigation = () => {
  emit('update:navigation-collapsed', !props.navigationCollapsed);
};

const handleLogout = async () => {
  try {
    await logout();
    router.push('/auth/login');
    $q.notify({
      type: 'positive',
      message: 'Successfully logged out',
      position: 'top-right'
    });
  } catch (error) {
    console.error('Logout failed:', error);
    $q.notify({
      type: 'negative',
      message: 'Failed to logout',
      position: 'top-right'
    });
  }
};

const handlePreferences = () => {
  router.push('/auth/preferences');
};

const updateSecurityStatus = async () => {
  const isValid = await validateSession();
  securityStatus.value = {
    isValid,
    lastCheck: new Date()
  };

  if (!isValid) {
    emit('security-event', { type: 'SESSION_INVALID' });
  }
};

// Lifecycle
onMounted(() => {
  updateSecurityStatus();
  sessionCheckInterval.value = window.setInterval(updateSecurityStatus, 30000);
});

onUnmounted(() => {
  if (sessionCheckInterval.value) {
    clearInterval(sessionCheckInterval.value);
  }
});
</script>

<style lang="scss">
.app-header {
  &__toolbar {
    min-height: var(--header-height, 72px);
    padding: 0 var(--space-md, 16px);
    display: flex;
    align-items: center;
    gap: var(--space-sm, 8px);
  }

  &__nav-btn {
    margin-right: var(--space-sm, 8px);
  }

  &__title {
    flex: 1 1 auto;
    font-size: 1.25rem;
    font-weight: 500;
    line-height: 1.2;
    padding: 0 var(--space-md, 16px);
    min-width: 0;
    
    .q-avatar {
      flex-shrink: 0;
      width: 42px;
      height: 42px;
    }

    span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  &__actions {
    flex: 0 0 auto;
    gap: var(--space-sm, 12px);
    margin-left: auto;
    padding-left: var(--space-md, 16px);
    height: 100%;
    display: flex;
    align-items: center;
  }

  &__action-btn {
    width: 42px !important;
    height: 42px !important;
    
    .q-icon {
      font-size: 26px !important;
    }
  }

  &__security-chip {
    height: 32px;
    font-size: 13px;
    flex-shrink: 0;
    padding: 0 14px;

    .q-icon {
      font-size: 20px;
      margin-right: 6px;
    }
  }

  &__notifications {
    position: relative;
    
    .q-badge {
      top: 6px;
      right: 6px;
      transform: translate(50%, -50%);
      font-size: 11px;
      height: 20px;
      min-width: 20px;
      padding: 0 5px;
    }
  }

  &__profile-menu {
    .q-item {
      min-height: 44px;
      padding: var(--space-sm, 8px) var(--space-md, 16px);
    }

    .q-item-section--avatar {
      min-width: 40px;
      
      .q-icon {
        font-size: 24px;
      }
    }
  }

  &__logo {
    background: transparent;
    transition: transform 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;

    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    &:hover {
      transform: scale(1.05);
    }
  }

  // Responsive adjustments
  @media (max-width: $breakpoint-xs) {
    &__toolbar {
      min-height: var(--header-height, 56px);
      padding: 0 var(--space-sm, 8px);
    }

    &__title {
      font-size: 1.125rem;
      padding: 0 var(--space-sm, 8px);

      .q-avatar {
        width: 36px;
        height: 36px;
      }
    }

    &__action-btn {
      width: 42px !important;
      height: 42px !important;
      
      .q-icon {
        font-size: 28px !important;
      }
    }

    &__security-chip {
      height: 32px;
      font-size: 13px;
      padding: 0 12px;

      .q-icon {
        font-size: 20px;
      }
    }

    &__actions {
      padding-left: var(--space-sm, 8px);
      gap: var(--space-xs, 8px);
    }
  }

  @media (min-width: $breakpoint-sm) and (max-width: $breakpoint-md) {
    &__title {
      font-size: 1.25rem;
    }
  }

  // Dark mode adjustments
  :root[data-theme="dark"] & {
    &__breadcrumbs {
      background: rgba(0, 0, 0, 0.2);
    }
  }

  // Print styles
  @media print {
    display: none;
  }
}
</style>