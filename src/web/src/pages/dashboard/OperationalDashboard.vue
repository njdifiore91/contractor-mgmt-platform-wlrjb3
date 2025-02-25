<template>
  <q-page padding>
    <div class="row q-col-gutter-md">
      <!-- Welcome Section -->
      <div class="col-12">
        <div class="welcome-section q-mb-lg">
          <div class="text-h4 text-weight-bold q-mb-sm">Operations Dashboard</div>
          <div class="text-subtitle1 text-grey-7">
            Last sync: {{ new Date(lastSyncTime).toLocaleString() }}
          </div>
        </div>
      </div>

      <!-- Equipment Statistics -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="dashboard-card">
          <q-card-section>
            <div class="text-grey-8 text-subtitle1">Available Equipment</div>
            <div class="row items-center justify-between q-mt-sm">
              <div class="text-h4">{{ availableEquipmentCount }}</div>
              <q-icon name="check_circle" size="32px" class="text-positive" />
            </div>
            <div class="text-caption text-grey-8">Ready for Assignment</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="dashboard-card">
          <q-card-section>
            <div class="text-grey-8 text-subtitle1">Assigned Equipment</div>
            <div class="row items-center justify-between q-mt-sm">
              <div class="text-h4">{{ assignedEquipmentCount }}</div>
              <q-icon name="assignment_turned_in" size="32px" class="text-warning" />
            </div>
            <div class="text-caption text-grey-8">Currently in Use</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="dashboard-card">
          <q-card-section>
            <div class="text-grey-8 text-subtitle1">Maintenance Required</div>
            <div class="row items-center justify-between q-mt-sm">
              <div class="text-h4">{{ maintenanceRequiredCount }}</div>
              <q-icon name="build" size="32px" class="text-negative" />
            </div>
            <div class="text-caption text-grey-8">Needs Attention</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="dashboard-card">
          <q-card-section>
            <div class="text-grey-8 text-subtitle1">Available Inspectors</div>
            <div class="row items-center justify-between q-mt-sm">
              <div class="text-h4">{{ availableInspectorsCount }}</div>
              <q-icon name="engineering" size="32px" class="text-primary" />
            </div>
            <div class="text-caption text-grey-8">Ready for Assignment</div>
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
            <q-item clickable v-ripple @click="navigateTo('/equipment/new')">
              <q-item-section avatar>
                <q-icon name="add_circle" color="primary" />
              </q-item-section>
              <q-item-section>Add New Equipment</q-item-section>
            </q-item>
            <q-item clickable v-ripple @click="navigateTo('/equipment')">
              <q-item-section avatar>
                <q-icon name="assignment" color="primary" />
              </q-item-section>
              <q-item-section>Manage Equipment</q-item-section>
            </q-item>
            <q-item clickable v-ripple @click="navigateTo('/inspectors')">
              <q-item-section avatar>
                <q-icon name="people" color="primary" />
              </q-item-section>
              <q-item-section>View Inspectors</q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>

      <!-- Recent Equipment Activity -->
      <div class="col-12 col-md-8">
        <q-card class="dashboard-card">
          <q-card-section class="row items-center justify-between">
            <div class="text-h6">Recent Equipment Activity</div>
            <q-btn flat color="primary" label="View All" @click="navigateTo('/equipment')" />
          </q-card-section>
          <q-list padding>
            <q-item v-for="activity in recentEquipmentActivity" :key="activity.id">
              <q-item-section avatar>
                <q-icon :name="activity.icon" :color="activity.color" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ activity.description }}</q-item-label>
                <q-item-label caption>{{ formatDate(activity.timestamp) }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn
                  flat
                  round
                  color="grey"
                  icon="chevron_right"
                  @click="navigateToEquipment(activity.equipmentId)"
                />
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>

      <!-- Equipment Maintenance Schedule -->
      <div class="col-12">
        <q-card class="dashboard-card">
          <q-card-section class="row items-center justify-between">
            <div class="text-h6">Upcoming Maintenance</div>
            <q-btn flat color="primary" label="Schedule Maintenance" @click="scheduleNewMaintenance" />
          </q-card-section>
          <q-table
            :rows="upcomingMaintenance"
            :columns="maintenanceColumns"
            row-key="id"
            flat
            bordered
          >
            <template v-slot:body-cell-status="props">
              <q-td :props="props">
                <q-chip
                  :color="getMaintenanceStatusColor(props.value)"
                  text-color="white"
                  size="sm"
                >
                  {{ props.value }}
                </q-chip>
              </q-td>
            </template>
            <template v-slot:body-cell-actions="props">
              <q-td :props="props" class="q-gutter-sm">
                <q-btn
                  flat
                  round
                  size="sm"
                  color="primary"
                  icon="visibility"
                  @click="viewMaintenanceDetails(props.row)"
                />
                <q-btn
                  flat
                  round
                  size="sm"
                  color="positive"
                  icon="check"
                  @click="completeMaintenance(props.row)"
                />
              </q-td>
            </template>
          </q-table>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useEquipment } from '@/composables/useEquipment';
import { useInspectorStore } from '@/stores/inspector.store';
import { formatDate } from '@/utils/date.util';

export default defineComponent({
  name: 'OperationalDashboard',

  setup() {
    const router = useRouter();
    const $q = useQuasar();
    const { 
      equipment,
      availableEquipment,
      assignedEquipment,
      maintenanceRequired,
      lastUpdateTime
    } = useEquipment();
    const inspectorStore = useInspectorStore();

    // Computed values for statistics
    const availableEquipmentCount = computed(() => availableEquipment.value.length);
    const assignedEquipmentCount = computed(() => assignedEquipment.value.length);
    const maintenanceRequiredCount = computed(() => maintenanceRequired.value.length);
    const availableInspectorsCount = computed(() => 
      inspectorStore.inspectorsByStatus('AVAILABLE').length
    );

    // Recent activity tracking
    const recentEquipmentActivity = ref([
      {
        id: 1,
        equipmentId: 1,
        icon: 'assignment_turned_in',
        color: 'positive',
        description: 'Test Kit Pro assigned to Inspector John',
        timestamp: new Date()
      },
      {
        id: 2,
        equipmentId: 2,
        icon: 'build',
        color: 'warning',
        description: 'Inspector Tablet scheduled for maintenance',
        timestamp: new Date(Date.now() - 86400000)
      }
    ]);

    // Maintenance schedule
    const maintenanceColumns = [
      { name: 'equipmentId', label: 'Equipment ID', field: 'equipmentId', sortable: true },
      { name: 'name', label: 'Equipment Name', field: 'name', sortable: true },
      { name: 'type', label: 'Type', field: 'type', sortable: true },
      { name: 'dueDate', label: 'Due Date', field: 'dueDate', sortable: true },
      { name: 'status', label: 'Status', field: 'status', sortable: true },
      { name: 'actions', label: 'Actions', field: 'actions' }
    ];

    const upcomingMaintenance = ref([
      {
        id: 1,
        equipmentId: 'EQ001',
        name: 'Test Kit Pro',
        type: 'Calibration',
        dueDate: '2024-06-01',
        status: 'SCHEDULED'
      },
      {
        id: 2,
        equipmentId: 'EQ002',
        name: 'Inspector Tablet',
        type: 'Software Update',
        dueDate: '2024-05-15',
        status: 'PENDING'
      }
    ]);

    // Navigation functions
    const navigateTo = (path: string) => {
      router.push(path);
    };

    const navigateToEquipment = (equipmentId: number) => {
      router.push(`/equipment/${equipmentId}`);
    };

    // Maintenance functions
    const getMaintenanceStatusColor = (status: string) => {
      const colors: Record<string, string> = {
        SCHEDULED: 'primary',
        PENDING: 'warning',
        OVERDUE: 'negative',
        COMPLETED: 'positive'
      };
      return colors[status] || 'grey';
    };

    const scheduleNewMaintenance = () => {
      // TODO: Implement maintenance scheduling
      $q.notify({
        message: 'Maintenance scheduling feature coming soon',
        color: 'info'
      });
    };

    const viewMaintenanceDetails = (maintenance: any) => {
      router.push(`/equipment/${maintenance.equipmentId}/maintenance/${maintenance.id}`);
    };

    const completeMaintenance = (maintenance: any) => {
      // TODO: Implement maintenance completion
      $q.notify({
        message: 'Maintenance marked as complete',
        color: 'positive'
      });
    };

    // Lifecycle hooks
    onMounted(async () => {
      try {
        await Promise.all([
          inspectorStore.searchInspectors(null, null, ['AVAILABLE'], [], false),
          // Add other initialization calls here
        ]);
      } catch (error) {
        console.error('Failed to initialize dashboard:', error);
      }
    });

    return {
      // Stats
      availableEquipmentCount,
      assignedEquipmentCount,
      maintenanceRequiredCount,
      availableInspectorsCount,
      lastSyncTime: lastUpdateTime,

      // Activity and maintenance
      recentEquipmentActivity,
      upcomingMaintenance,
      maintenanceColumns,

      // Functions
      navigateTo,
      navigateToEquipment,
      formatDate,
      getMaintenanceStatusColor,
      scheduleNewMaintenance,
      viewMaintenanceDetails,
      completeMaintenance
    };
  }
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
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }

  .q-card-section {
    padding: 24px;
  }
}

.welcome-section {
  background: linear-gradient(to right, var(--q-primary), color-mix(in srgb, var(--q-primary) 85%, black));
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

.q-table {
  border-radius: 8px;
  
  ::v-deep thead tr th {
    font-weight: 600;
    color: var(--q-primary);
  }

  ::v-deep tbody tr:hover {
    background-color: rgba(0, 0, 0, 0.03);
  }
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