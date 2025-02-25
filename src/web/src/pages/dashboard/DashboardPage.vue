<template>
  <q-page padding>
    <div class="row q-col-gutter-md">
      <!-- Welcome Section -->
      <div class="col-12">
        <div class="welcome-section q-mb-lg">
          <div class="text-h4 text-weight-bold q-mb-sm">Welcome back, {{ userName }}</div>
          <div class="text-subtitle1 text-grey-7">
            Last login: {{ new Date(lastLogin).toLocaleString() }}
          </div>
        </div>
      </div>

      <!-- Statistics Cards -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="dashboard-card">
          <q-card-section>
            <div class="text-grey-8 text-subtitle1">Equipment</div>
            <div class="row items-center justify-between q-mt-sm">
              <div class="text-h4">{{ equipmentCount }}</div>
              <q-icon name="construction" size="32px" class="text-primary" />
            </div>
            <div class="text-caption text-grey-8">{{ availableEquipment }} Available</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="dashboard-card">
          <q-card-section>
            <div class="text-grey-8 text-subtitle1">Inspectors</div>
            <div class="row items-center justify-between q-mt-sm">
              <div class="text-h4">{{ inspectorsCount }}</div>
              <q-icon name="engineering" size="32px" class="text-primary" />
            </div>
            <div class="text-caption text-grey-8">{{ mobilizedInspectors }} Mobilized</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="dashboard-card">
          <q-card-section>
            <div class="text-grey-8 text-subtitle1">Active Projects</div>
            <div class="row items-center justify-between q-mt-sm">
              <div class="text-h4">8</div>
              <q-icon name="work" size="32px" class="text-primary" />
            </div>
            <div class="text-caption text-grey-8">2 Due This Week</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="dashboard-card">
          <q-card-section>
            <div class="text-grey-8 text-subtitle1">Contractors</div>
            <div class="row items-center justify-between q-mt-sm">
              <div class="text-h4">12</div>
              <q-icon name="groups" size="32px" class="text-primary" />
            </div>
            <div class="text-caption text-grey-8">5 Active Now</div>
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
            <q-item clickable v-ripple>
              <q-item-section avatar>
                <q-icon name="add_circle" color="primary" />
              </q-item-section>
              <q-item-section>New Project</q-item-section>
            </q-item>
            <q-item clickable v-ripple>
              <q-item-section avatar>
                <q-icon name="person_add" color="primary" />
              </q-item-section>
              <q-item-section>Add Contractor</q-item-section>
            </q-item>
            <q-item clickable v-ripple>
              <q-item-section avatar>
                <q-icon name="assignment" color="primary" />
              </q-item-section>
              <q-item-section>Schedule Inspection</q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>

      <!-- Recent Activity -->
      <div class="col-12 col-md-8">
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

<script lang="ts" setup>
  import { ref, onMounted, computed } from 'vue';
  import { useAuth } from '@/composables/useAuth';

  const { currentUser } = useAuth();

  const userName = computed(() => currentUser.value?.firstName || 'User');
  const lastLogin = ref(currentUser.value?.lastLoginDate || new Date());
  const equipmentCount = ref(2);
  const availableEquipment = ref('1 Available');
  const inspectorsCount = ref(2);
  const mobilizedInspectors = ref('1 Mobilized');

  const recentActivities = ref([
    {
      id: 1,
      icon: 'engineering',
      color: 'green',
      title: 'Inspector Mike assigned to Project A',
      timestamp: '2 hours ago',
    },
    {
      id: 2,
      icon: 'construction',
      color: 'orange',
      title: 'Equipment #123 maintenance completed',
      timestamp: '4 hours ago',
    },
    {
      id: 3,
      icon: 'work',
      color: 'blue',
      title: 'New project "Site B Development" created',
      timestamp: '1 day ago',
    },
    {
      id: 4,
      icon: 'person',
      color: 'purple',
      title: 'Contractor evaluation submitted',
      timestamp: '2 days ago',
    },
  ]);
</script>

<style lang="scss" scoped>
  .dashboard-card {
    height: 100%;
    transition: all 0.3s ease;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 8px;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    }

    .q-card-section {
      padding: 24px;
    }
  }

  .welcome-section {
    background: linear-gradient(
      to right,
      var(--q-primary),
      color-mix(in srgb, var(--q-primary) 85%, black)
    );
    padding: 32px;
    border-radius: 12px;
    color: white;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

    .text-h4 {
      line-height: 1.2;
    }

    .text-subtitle1 {
      opacity: 0.9;
    }
  }

  // Global text styles
  .text-h4 {
    font-weight: 600;
    margin: 0;
  }

  .text-subtitle1 {
    font-weight: 500;
  }

  .q-list {
    .q-item {
      min-height: 48px;
      border-radius: 8px;
      margin: 4px 0;

      &:hover {
        background: rgba(0, 0, 0, 0.03);
      }
    }
  }
</style>
