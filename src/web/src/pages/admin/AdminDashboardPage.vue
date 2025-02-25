<template>
  <q-page padding>
    <div class="row q-col-gutter-md">
      <!-- Overview Stats Cards -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="dashboard-card">
          <q-card-section>
            <div class="text-grey-8 text-subtitle1">Users</div>
            <div class="row items-center justify-between q-mt-sm">
              <div class="text-h4">{{ userStats.total }}</div>
              <q-icon name="people" size="32px" class="text-primary" />
            </div>
            <div class="text-caption text-grey-8">{{ userStats.active }} Active</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="dashboard-card">
          <q-card-section>
            <div class="text-grey-8 text-subtitle1">System Health</div>
            <div class="row items-center justify-between q-mt-sm">
              <div class="text-h4">{{ systemHealth.status }}</div>
              <q-icon :name="systemHealth.icon" :color="systemHealth.color" size="32px" />
            </div>
            <div class="text-caption text-grey-8">{{ systemHealth.message }}</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="dashboard-card">
          <q-card-section>
            <div class="text-grey-8 text-subtitle1">Pending Items</div>
            <div class="row items-center justify-between q-mt-sm">
              <div class="text-h4">{{ pendingItems.total }}</div>
              <q-icon name="pending_actions" size="32px" class="text-warning" />
            </div>
            <div class="text-caption text-grey-8">{{ pendingItems.details }}</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="dashboard-card">
          <q-card-section>
            <div class="text-grey-8 text-subtitle1">Equipment Status</div>
            <div class="row items-center justify-between q-mt-sm">
              <div class="text-h4">{{ equipmentStats.total }}</div>
              <q-icon name="construction" size="32px" class="text-primary" />
            </div>
            <div class="text-caption text-grey-8">{{ equipmentStats.assigned }} Assigned</div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Quick Actions -->
      <div class="col-12 col-md-4">
        <q-card class="dashboard-card">
          <q-card-section>
            <div class="text-h6">Quick Actions</div>
          </q-card-section>
          <q-list padding>
            <q-item clickable v-ripple to="/admin/users">
              <q-item-section avatar>
                <q-icon name="person_add" color="primary" />
              </q-item-section>
              <q-item-section>User Management</q-item-section>
            </q-item>
            <q-item clickable v-ripple to="/admin/settings">
              <q-item-section avatar>
                <q-icon name="settings" color="primary" />
              </q-item-section>
              <q-item-section>System Settings</q-item-section>
            </q-item>
            <q-item clickable v-ripple to="/admin/audit-logs">
              <q-item-section avatar>
                <q-icon name="assessment" color="primary" />
              </q-item-section>
              <q-item-section>Audit Reports</q-item-section>
            </q-item>
            <q-item clickable v-ripple to="/admin/documentation">
              <q-item-section avatar>
                <q-icon name="description" color="primary" />
              </q-item-section>
              <q-item-section>Documentation</q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>

      <!-- System Status -->
      <div class="col-12 col-md-8">
        <q-card class="dashboard-card">
          <q-card-section>
            <div class="text-h6">System Status</div>
          </q-card-section>
          <q-list padding>
            <q-item v-for="status in systemStatus" :key="status.id">
              <q-item-section avatar>
                <q-icon :name="status.icon" :color="status.color" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ status.name }}</q-item-label>
                <q-item-label caption>{{ status.status }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-chip :color="status.color" text-color="white" size="sm">
                  {{ status.metric }}
                </q-chip>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>

      <!-- Recent Activity -->
      <div class="col-12">
        <q-card class="dashboard-card">
          <q-card-section>
            <div class="text-h6">Recent Activity</div>
          </q-card-section>
          <q-list padding>
            <q-item v-for="activity in recentActivities" :key="activity.id">
              <q-item-section avatar>
                <q-icon :name="activity.icon" :color="activity.color" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ activity.title }}</q-item-label>
                <q-item-label caption>{{ activity.timestamp }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue';
  import { useUser } from '@/composables/useUser';
  import { useAuditLog } from '@/composables/useAuditLog';
  import { useRoute } from 'vue-router';

  const { users, fetchUsers } = useUser();
  const { logs } = useAuditLog();
  const route = useRoute();

  // Stats
  const userStats = ref({
    total: 0,
    active: 0,
  });

  const systemHealth = ref({
    status: 'Good',
    icon: 'check_circle',
    color: 'positive',
    message: 'All systems operational',
  });

  const pendingItems = ref({
    total: 0,
    details: 'No pending approvals',
  });

  const equipmentStats = ref({
    total: 0,
    assigned: 0,
  });

  const systemStatus = ref([
    {
      id: 1,
      name: 'Database',
      status: 'Connected',
      icon: 'storage',
      color: 'positive',
      metric: '45ms',
    },
    {
      id: 2,
      name: 'OneDrive Integration',
      status: 'Operational',
      icon: 'cloud_done',
      color: 'positive',
      metric: '98%',
    },
    {
      id: 3,
      name: 'Authentication Service',
      status: 'Active',
      icon: 'security',
      color: 'positive',
      metric: '2ms',
    },
    {
      id: 4,
      name: 'Scheduled Tasks',
      status: 'Running',
      icon: 'schedule',
      color: 'positive',
      metric: '100%',
    },
  ]);

  const recentActivities = ref([
    {
      id: 1,
      icon: 'person_add',
      color: 'primary',
      title: 'New user account created',
      timestamp: '10 minutes ago',
    },
    {
      id: 2,
      icon: 'security_update_good',
      color: 'positive',
      title: 'System security update completed',
      timestamp: '1 hour ago',
    },
    {
      id: 3,
      icon: 'manage_accounts',
      color: 'warning',
      title: 'User role modifications',
      timestamp: '2 hours ago',
    },
    {
      id: 4,
      icon: 'login',
      color: 'info',
      title: 'Multiple user login attempts detected',
      timestamp: '3 hours ago',
    },
  ]);

  const fetchDashboardStats = async () => {
    try {
      // Only fetch users if we're on the dashboard
      if (route.path === '/admin') {
        await fetchUsers({
          pageNumber: 1,
          pageSize: 10,
          isActive: true,
          sortBy: 'lastName',
          sortOrder: 'asc',
        });

        userStats.value = {
          total: users.value.length,
          active: users.value.filter((user) => user.isActive).length,
        };
      }

      // Update pending items with actual data
      const pendingApprovals = users.value.filter((user) => !user.isActive).length;
      pendingItems.value = {
        total: pendingApprovals,
        details: `${pendingApprovals} User${pendingApprovals !== 1 ? 's' : ''} Pending Approval`,
      };

      // Update equipment stats
      equipmentStats.value = {
        total: 25,
        assigned: 18,
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  onMounted(async () => {
    await fetchDashboardStats();
  });
</script>

<style lang="scss" scoped>
  .dashboard-card {
    height: 100%;
    transition: all 0.3s ease;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 8px;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
  }
</style>
