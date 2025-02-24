<template>
  <div class="dashboard-wrapper">
    <!-- Main content area -->
    <div class="col">
      <component :is="dashboardComponent" />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue';
  import { useAuth } from '@/composables/useAuth';
  import DashboardPage from './DashboardPage.vue';
  import AdminDashboardPage from '../admin/AdminDashboardPage.vue';
  import { UserRoleType, getRoleId } from '@/models/user.model';

  const { currentUser } = useAuth();

  const dashboardComponent = computed(() => {
    const isAdmin = currentUser.value?.userRoles.some(
      (role) => role.roleId === getRoleId(UserRoleType.Admin)
    );
    return isAdmin ? AdminDashboardPage : DashboardPage;
  });
</script>

<style lang="scss" scoped>
  .dashboard-wrapper {
    height: 100%;
    padding: 1rem;
  }
</style>
