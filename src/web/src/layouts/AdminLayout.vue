<template>
  <q-layout view="lHh Lpr lFf">
    <AppHeader
      :navigation-collapsed="leftDrawerOpen"
      @update:navigation-collapsed="handleSidebarToggle"
      @security-event="handleSecurityEvent"
      layout-type="admin"
    />

    <AppSidebar
      v-model:isOpen="leftDrawerOpen"
      :is-elevated="true"
      layout-type="admin"
      @sidebar-toggled="handleSidebarToggle"
    />

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import AppSidebar from '@/components/common/AppSidebar.vue';
import AppHeader from '@/components/common/AppHeader.vue';
import { useAuth } from '@/composables/useAuth';

const router = useRouter();
const { logout } = useAuth();
const leftDrawerOpen = ref(false);

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

<style lang="scss">
@import "@/assets/styles/variables.scss";

// Print styles
@media print {
  .q-page-container {
    padding: 0 !important;
  }
}
</style>