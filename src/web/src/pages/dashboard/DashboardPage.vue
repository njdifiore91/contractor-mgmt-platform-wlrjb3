<template>
  <q-page class="dashboard-page q-pa-md">
    <!-- Welcome Section -->
    <div class="row items-center q-mb-lg">
      <div class="col-12 col-md-8">
        <h1 class="text-h5 q-my-none">
          Welcome back, {{ currentUser?.firstName }}
        </h1>
        <p class="text-subtitle1 text-grey-7">
          Last login: {{ formatDate(currentUser?.lastLoginAt) }}
        </p>
      </div>
      <div class="col-12 col-md-4 text-right">
        <q-btn
          color="primary"
          icon="refresh"
          label="Refresh Data"
          :loading="loading"
          @click="fetchDashboardData"
        />
      </div>
    </div>

    <!-- Metrics Cards -->
    <div class="row q-col-gutter-md q-mb-lg">
      <!-- Equipment Metrics -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="dashboard-card">
          <q-card-section>
            <div class="text-h6">Equipment</div>
            <div class="row items-center justify-between">
              <div class="text-h4">{{ equipmentMetrics.totalCount }}</div>
              <q-icon 
                name="inventory" 
                size="2.5rem" 
                color="primary"
              />
            </div>
            <div class="text-caption">
              {{ equipmentMetrics.availableCount }} Available
            </div>
            <q-linear-progress
              :value="equipmentMetrics.utilization"
              color="primary"
              class="q-mt-sm"
            />
          </q-card-section>
        </q-card>
      </div>

      <!-- Inspector Metrics -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="dashboard-card">
          <q-card-section>
            <div class="text-h6">Inspectors</div>
            <div class="row items-center justify-between">
              <div class="text-h4">{{ inspectorMetrics.totalCount }}</div>
              <q-icon 
                name="engineering" 
                size="2.5rem" 
                color="secondary"
              />
            </div>
            <div class="text-caption">
              {{ inspectorMetrics.mobilizedCount }} Mobilized
            </div>
            <q-linear-progress
              :value="inspectorMetrics.mobilizationRate"
              color="secondary"
              class="q-mt-sm"
            />
          </q-card-section>
        </q-card>
      </div>

      <!-- Quick Actions -->
      <div class="col-12 col-md-6">
        <q-card class="dashboard-card">
          <q-card-section>
            <div class="text-h6">Quick Actions</div>
            <div class="row q-gutter-sm q-mt-sm">
              <q-btn
                v-if="hasPermission('CreateInspector')"
                color="primary"
                icon="person_add"
                label="New Inspector"
                @click="handleQuickAction('newInspector')"
              />
              <q-btn
                v-if="hasPermission('AssignEquipment')"
                color="secondary"
                icon="assignment"
                label="Assign Equipment"
                @click="handleQuickAction('assignEquipment')"
              />
              <q-btn
                v-if="hasPermission('ProcessDrugTest')"
                color="accent"
                icon="science"
                label="Drug Test"
                @click="handleQuickAction('drugTest')"
              />
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Recent Activity Table -->
    <q-card class="dashboard-card">
      <q-card-section>
        <div class="text-h6">Recent Activity</div>
      </q-card-section>

      <data-table
        :columns="activityColumns"
        :data="recentActivity"
        :loading="loading"
        :pagination.sync="pagination"
        title="Recent Activity"
        @pagination-change="handlePaginationChange"
      />
    </q-card>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth.store';
import { useEquipmentStore } from '@/stores/equipment.store';
import { useInspectorStore } from '@/stores/inspector.store';
import { formatDate } from '@/utils/date.util';
import DataTable from '@/components/common/DataTable.vue';

export default defineComponent({
  name: 'DashboardPage',

  components: {
    DataTable
  },

  setup() {
    const authStore = useAuthStore();
    const equipmentStore = useEquipmentStore();
    const inspectorStore = useInspectorStore();

    const loading = ref(false);
    const pagination = ref({
      sortBy: 'timestamp',
      descending: true,
      page: 1,
      rowsPerPage: 10,
      rowsNumber: 0
    });

    const recentActivity = ref([]);

    // Computed metrics
    const equipmentMetrics = computed(() => ({
      totalCount: equipmentStore.equipment.length,
      availableCount: equipmentStore.availableEquipment.length,
      utilization: equipmentStore.equipment.length ? 
        (equipmentStore.equipment.length - equipmentStore.availableEquipment.length) / equipmentStore.equipment.length : 0
    }));

    const inspectorMetrics = computed(() => ({
      totalCount: inspectorStore.allInspectors.length,
      mobilizedCount: inspectorStore.inspectorsByStatus('MOBILIZED').length,
      mobilizationRate: inspectorStore.allInspectors.length ?
        inspectorStore.inspectorsByStatus('MOBILIZED').length / inspectorStore.allInspectors.length : 0
    }));

    const currentUser = computed(() => authStore.currentUser);

    const activityColumns = [
      {
        name: 'timestamp',
        label: 'Date/Time',
        field: 'timestamp',
        sortable: true,
        format: (val: Date) => formatDate(val)
      },
      {
        name: 'type',
        label: 'Type',
        field: 'type',
        sortable: true
      },
      {
        name: 'description',
        label: 'Description',
        field: 'description',
        sortable: false
      },
      {
        name: 'user',
        label: 'User',
        field: 'user',
        sortable: true
      }
    ];

    // Methods
    const fetchDashboardData = async () => {
      try {
        loading.value = true;
        await Promise.all([
          equipmentStore.loadEquipment(),
          inspectorStore.searchInspectors(
            { latitude: 0, longitude: 0 },
            100,
            null,
            [],
            true
          )
        ]);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        loading.value = false;
      }
    };

    const handleQuickAction = (action: string) => {
      switch (action) {
        case 'newInspector':
          // Navigate to new inspector form
          break;
        case 'assignEquipment':
          // Open equipment assignment dialog
          break;
        case 'drugTest':
          // Open drug test form
          break;
      }
    };

    const handlePaginationChange = (newPagination: any) => {
      pagination.value = newPagination;
    };

    // Lifecycle hooks
    onMounted(() => {
      fetchDashboardData();
    });

    return {
      loading,
      pagination,
      recentActivity,
      equipmentMetrics,
      inspectorMetrics,
      currentUser,
      activityColumns,
      formatDate,
      fetchDashboardData,
      handleQuickAction,
      handlePaginationChange,
      hasPermission: authStore.hasPermission
    };
  }
});
</script>

<style lang="scss" scoped>
.dashboard-page {
  .dashboard-card {
    height: 100%;
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
  }

  // Responsive adjustments
  @media (max-width: $breakpoint-sm) {
    .text-h4 {
      font-size: 2rem;
    }
  }

  @media (max-width: $breakpoint-xs) {
    .q-card {
      margin-bottom: 1rem;
    }
  }
}
</style>