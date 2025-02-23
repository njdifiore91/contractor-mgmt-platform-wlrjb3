<template>
  <q-layout view="hHh lpR fFf">
    <!-- Header -->
    <AppHeader
      :navigation-collapsed="leftDrawerOpen"
      @update:navigation-collapsed="handleSidebarToggle"
      @security-event="handleSecurityEvent"
    />

    <!-- Navigation Drawer -->
    <AppSidebar
      v-model:isOpen="leftDrawerOpen"
      :is-elevated="true"
      @sidebar-toggled="handleSidebarToggle"
    />

    <!-- Page Content -->
    <q-page-container>
      <q-page padding>
        <router-view />
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
import { UserRoleType } from '@/models/user.model';
import AppSidebar from '@/components/common/AppSidebar.vue';
import AppHeader from '@/components/common/AppHeader.vue';

const route = useRoute();
const router = useRouter();
const { currentUser, logout } = useAuth();

const leftDrawerOpen = ref(false);

const hasAdminAccess = computed(() => {
  return currentUser.value?.userRoles.some(role => role.roleId === UserRoleType.Admin) ?? false;
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

const handleSidebarToggle = (value: boolean) => {
  leftDrawerOpen.value = value;
};

const handleSecurityEvent = async (event: any) => {
  if (event.type === 'SESSION_INVALID') {
    try {
      await logout();
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }
};
</script>

<style lang="scss" scoped>
@use "sass:color";

:root {
  --header-height: 56px;
  --breadcrumb-height: 40px;
}

.q-toolbar {
  min-height: var(--header-height);
}

.breadcrumbs-toolbar {
  min-height: var(--breadcrumb-height);
  background: rgba($primary, 0.9);
}

// Responsive adjustments
@media (max-width: $breakpoint-xs) {
  .q-toolbar-title {
    font-size: 1rem;
  }

  .breadcrumbs-toolbar {
    display: none;
  }
}

// Print styles
@media print {
  .q-header {
    display: none;
  }

  .q-page-container {
    padding: 0 !important;
  }
}
</style>