<template>
  <component :is="currentDashboard" />
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { useAuthStore } from '@/stores/auth.store';
import { UserRoleType } from '@/models/user.model';
import DashboardPage from './DashboardPage.vue';
import OperationalDashboard from './OperationalDashboard.vue';
import InspectorDashboard from './InspectorDashboard.vue';

export default defineComponent({
  name: 'RoleBasedDashboard',

  components: {
    DashboardPage,
    OperationalDashboard,
    InspectorDashboard
  },

  setup() {
    const authStore = useAuthStore();

    const currentDashboard = computed(() => {
      if (authStore.hasRole(UserRoleType.Operations)) {
        return OperationalDashboard;
      }
      if (authStore.hasRole(UserRoleType.Inspector)) {
        return InspectorDashboard;
      }
      return DashboardPage;
    });

    return {
      currentDashboard
    };
  }
});
</script> 