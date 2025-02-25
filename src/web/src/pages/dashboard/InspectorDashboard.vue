<template>
  <q-page padding>
    <div class="row q-col-gutter-md">
      <!-- Welcome Section -->
      <div class="col-12">
        <div class="welcome-section q-mb-lg">
          <div class="text-h4 text-weight-bold q-mb-sm">Welcome, {{ inspectorName }}</div>
          <div class="text-subtitle1 text-grey-7">
            <q-chip
              :color="statusColor"
              text-color="white"
              class="q-mr-md"
            >
              {{ currentStatus }}
            </q-chip>
            Badge #{{ badgeNumber }}
          </div>
        </div>
      </div>

      <!-- Status Cards -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="dashboard-card">
          <q-card-section>
            <div class="text-grey-8 text-subtitle1">Assigned Equipment</div>
            <div class="row items-center justify-between q-mt-sm">
              <div class="text-h4">{{ assignedEquipmentCount }}</div>
              <q-icon name="construction" size="32px" class="text-primary" />
            </div>
            <div class="text-caption text-grey-8">Active Assignments</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="dashboard-card">
          <q-card-section>
            <div class="text-grey-8 text-subtitle1">Next Drug Test</div>
            <div class="row items-center justify-between q-mt-sm">
              <div class="text-h4">{{ daysUntilNextDrugTest }}</div>
              <q-icon name="science" size="32px" :color="drugTestColor" />
            </div>
            <div class="text-caption text-grey-8">Days Remaining</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="dashboard-card">
          <q-card-section>
            <div class="text-grey-8 text-subtitle1">Active Certifications</div>
            <div class="row items-center justify-between q-mt-sm">
              <div class="text-h4">{{ activeCertificationsCount }}</div>
              <q-icon name="verified" size="32px" class="text-positive" />
            </div>
            <div class="text-caption text-grey-8">Valid Certifications</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="dashboard-card" v-if="lastMobilizedDate">
          <q-card-section>
            <div class="text-grey-8 text-subtitle1">Last Mobilized</div>
            <div class="row items-center justify-between q-mt-sm">
              <div class="text-subtitle1">{{ formatDate(lastMobilizedDate) }}</div>
              <q-icon name="send" size="32px" class="text-secondary" />
            </div>
            <div class="text-caption text-grey-8">Previous Assignment</div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Assigned Equipment Section -->
      <div class="col-12 col-md-6">
        <q-card class="dashboard-card">
          <q-card-section>
            <div class="text-h6">Assigned Equipment</div>
          </q-card-section>
          <q-table
            :rows="assignedEquipment"
            :columns="equipmentColumns"
            row-key="id"
            flat
            bordered
            :pagination="{ rowsPerPage: 5 }"
          >
            <template v-slot:body-cell-status="props">
              <q-td :props="props">
                <q-chip
                  :color="getEquipmentStatusColor(props.value)"
                  text-color="white"
                  size="sm"
                  dense
                >
                  {{ props.value }}
                </q-chip>
              </q-td>
            </template>
          </q-table>
        </q-card>
      </div>

      <!-- Certifications Section -->
      <div class="col-12 col-md-6">
        <q-card class="dashboard-card">
          <q-card-section>
            <div class="text-h6">Certifications</div>
          </q-card-section>
          <q-table
            :rows="certifications"
            :columns="certificationColumns"
            row-key="id"
            flat
            bordered
            :pagination="{ rowsPerPage: 5 }"
          >
            <template v-slot:body-cell-status="props">
              <q-td :props="props">
                <q-chip
                  :color="getCertificationStatusColor(props.value)"
                  text-color="white"
                  size="sm"
                  dense
                >
                  {{ props.value }}
                </q-chip>
              </q-td>
            </template>
          </q-table>
        </q-card>
      </div>

      <!-- Recent Activity -->
      <div class="col-12">
        <q-card class="dashboard-card">
          <q-card-section>
            <div class="text-h6">Recent Activity</div>
          </q-card-section>
          <q-list separator>
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

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import { useInspectorStore } from '@/stores/inspector.store';
import { useAuthStore } from '@/stores/auth.store';
import { InspectorStatus } from '@/models/inspector.model';

export default defineComponent({
  name: 'InspectorDashboard',

  setup() {
    const inspectorStore = useInspectorStore();
    const authStore = useAuthStore();

    // Mock data - replace with actual API calls
    const inspectorName = ref(authStore.currentUser?.firstName || 'Inspector');
    const badgeNumber = ref('B12345');
    const currentStatus = ref(InspectorStatus.Available);
    const lastMobilizedDate = ref(new Date('2024-02-15'));
    const assignedEquipmentCount = ref(3);
    const activeCertificationsCount = ref(2);

    // Equipment table configuration
    const assignedEquipment = ref([
      {
        id: 1,
        serialNumber: 'EQ-001',
        type: 'Testing Kit',
        status: 'IN_USE',
        assignedDate: '2024-02-01'
      },
      {
        id: 2,
        serialNumber: 'EQ-002',
        type: 'Tablet',
        status: 'IN_USE',
        assignedDate: '2024-02-10'
      }
    ]);

    const equipmentColumns = [
      { name: 'serialNumber', label: 'Serial Number', field: 'serialNumber', sortable: true },
      { name: 'type', label: 'Type', field: 'type', sortable: true },
      { name: 'status', label: 'Status', field: 'status', sortable: true },
      { name: 'assignedDate', label: 'Assigned Date', field: 'assignedDate', sortable: true }
    ];

    // Certifications table configuration
    const certifications = ref([
      {
        id: 1,
        name: 'API Level 2',
        issuingAuthority: 'ASNT',
        expiryDate: '2024-12-31',
        status: 'ACTIVE'
      },
      {
        id: 2,
        name: 'Safety Certification',
        issuingAuthority: 'OSHA',
        expiryDate: '2024-08-15',
        status: 'ACTIVE'
      }
    ]);

    const certificationColumns = [
      { name: 'name', label: 'Certification', field: 'name', sortable: true },
      { name: 'issuingAuthority', label: 'Authority', field: 'issuingAuthority', sortable: true },
      { name: 'expiryDate', label: 'Expiry Date', field: 'expiryDate', sortable: true },
      { name: 'status', label: 'Status', field: 'status', sortable: true }
    ];

    // Recent activities
    const recentActivities = ref([
      {
        id: 1,
        icon: 'construction',
        color: 'primary',
        title: 'Equipment EQ-001 assigned',
        timestamp: '2 hours ago'
      },
      {
        id: 2,
        icon: 'science',
        color: 'positive',
        title: 'Drug test completed',
        timestamp: '2 days ago'
      },
      {
        id: 3,
        icon: 'verified',
        color: 'secondary',
        title: 'API Level 2 certification renewed',
        timestamp: '1 week ago'
      }
    ]);

    // Computed properties
    const statusColor = computed(() => {
      switch (currentStatus.value) {
        case InspectorStatus.Available:
          return 'positive';
        case InspectorStatus.Mobilized:
          return 'primary';
        case InspectorStatus.Suspended:
          return 'negative';
        default:
          return 'grey';
      }
    });

    const daysUntilNextDrugTest = computed(() => {
      // Mock calculation - replace with actual logic
      return 45;
    });

    const drugTestColor = computed(() => {
      const days = daysUntilNextDrugTest.value;
      if (days > 30) return 'positive';
      if (days > 14) return 'warning';
      return 'negative';
    });

    // Utility functions
    const formatDate = (date: Date) => {
      return date.toLocaleDateString();
    };

    const getEquipmentStatusColor = (status: string) => {
      switch (status.toUpperCase()) {
        case 'IN_USE':
          return 'primary';
        case 'MAINTENANCE':
          return 'warning';
        default:
          return 'grey';
      }
    };

    const getCertificationStatusColor = (status: string) => {
      switch (status.toUpperCase()) {
        case 'ACTIVE':
          return 'positive';
        case 'EXPIRING':
          return 'warning';
        case 'EXPIRED':
          return 'negative';
        default:
          return 'grey';
      }
    };

    return {
      inspectorName,
      badgeNumber,
      currentStatus,
      statusColor,
      lastMobilizedDate,
      assignedEquipmentCount,
      activeCertificationsCount,
      daysUntilNextDrugTest,
      drugTestColor,
      assignedEquipment,
      equipmentColumns,
      certifications,
      certificationColumns,
      recentActivities,
      formatDate,
      getEquipmentStatusColor,
      getCertificationStatusColor
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

// Global text styles
.text-h4 {
  font-weight: 600;
  margin: 0;
}

.text-subtitle1 {
  font-weight: 500;
}
</style> 