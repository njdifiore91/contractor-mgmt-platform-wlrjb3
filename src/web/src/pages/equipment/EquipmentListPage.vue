<template>
  <q-page class="equipment-list-page" role="main">
    <!-- Page Title and Actions -->
    <div class="row items-center justify-between q-mb-md">
      <h1 class="text-h5 q-my-none">Equipment Management</h1>
      <q-btn
        v-if="canCreateEquipment"
        color="primary"
        icon="add"
        label="Add Equipment"
        @click="handleCreateEquipment"
        :loading="loading"
        :disable="loading"
      />
    </div>

    <!-- Filter Panel -->
    <FilterPanel
      filter-type="equipment"
      @filter="handleFilterChange"
      @reset="handleFilterReset"
      class="q-mb-md"
    />

    <!-- Equipment List Component -->
    <EquipmentList
      ref="equipmentListRef"
      :loading="loading"
      @equipment-selected="handleEquipmentSelected"
      @edit-equipment="handleEditEquipment"
      @assign-equipment="handleAssignEquipment"
      @return-equipment="handleReturnEquipment"
      @maintenance-equipment="handleMaintenanceEquipment"
    />

    <!-- Error Display -->
    <q-banner
      v-if="error"
      class="bg-negative text-white q-mt-md"
      rounded
      dense
      role="alert"
    >
      {{ error }}
    </q-banner>

    <!-- Loading State -->
    <q-inner-loading :showing="loading">
      <q-spinner size="50px" color="primary" />
    </q-inner-loading>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { QPage, QBtn, QSpinner, useQuasar } from 'quasar';
import EquipmentList from '@/components/equipment/EquipmentList.vue';
import FilterPanel from '@/components/common/FilterPanel.vue';
import { useEquipmentStore } from '@/stores/equipment.store';
import { useAuthStore } from '@/stores/auth.store';
import { Equipment } from '@/models/equipment.model';

export default defineComponent({
  name: 'EquipmentListPage',

  components: {
    QPage,
    QBtn,
    QSpinner,
    EquipmentList,
    FilterPanel
  },

  setup() {
    const $q = useQuasar();
    const router = useRouter();
    const route = useRoute();
    const equipmentStore = useEquipmentStore();
    const authStore = useAuthStore();
    const equipmentListRef = ref<InstanceType<typeof EquipmentList> | null>(null);

    // Reactive state
    const loading = ref(false);
    const error = ref<string | null>(null);

    // Computed properties
    const canCreateEquipment = computed(() => 
      authStore.hasRole('Admin') || authStore.hasRole('Operations')
    );

    // Initialize component
    const initializeComponent = async () => {
      try {
        loading.value = true;
        error.value = null;

        // Load initial data with query params
        const queryParams = route.query;
        if (Object.keys(queryParams).length) {
          await handleFilterChange(queryParams);
        } else {
          await equipmentStore.loadEquipment();
        }
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load equipment';
        $q.notify({
          type: 'negative',
          message: error.value,
          position: 'top'
        });
      } finally {
        loading.value = false;
      }
    };

    // Event handlers
    const handleEquipmentSelected = async (equipment: Equipment) => {
      try {
        if (!equipment || typeof equipment !== 'object') {
          throw new Error('Invalid equipment data received');
        }

        if (!equipment.id) {
          throw new Error('Equipment ID is missing');
        }

        await router.push({ 
          path: `/dashboard/equipment/${equipment.id}`
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to view equipment details';
        error.value = errorMessage;
        $q.notify({
          type: 'negative',
          message: errorMessage,
          position: 'top',
          timeout: 3000
        });
      }
    };

    const handleCreateEquipment = async () => {
      try {
        if (!canCreateEquipment.value) {
          throw new Error('Insufficient permissions');
        }
        await router.push({ name: 'equipment-create' });
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to create equipment';
        $q.notify({
          type: 'negative',
          message: error.value,
          position: 'top'
        });
      }
    };

    const handleFilterChange = async (filters: Record<string, any>) => {
      try {
        loading.value = true;
        error.value = null;

        // Update URL query params
        await router.replace({ query: { ...filters } });
        
        // Apply filters
        await equipmentStore.loadEquipment(true, filters);
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to apply filters';
        $q.notify({
          type: 'negative',
          message: error.value,
          position: 'top'
        });
      } finally {
        loading.value = false;
      }
    };

    const handleFilterReset = async () => {
      try {
        loading.value = true;
        error.value = null;

        // Clear URL query params
        await router.replace({ query: {} });
        
        // Reset filters and reload
        await equipmentStore.loadEquipment(true);
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to reset filters';
        $q.notify({
          type: 'negative',
          message: error.value,
          position: 'top'
        });
      } finally {
        loading.value = false;
      }
    };

    const handleEditEquipment = async (equipment: Equipment) => {
      try {
        if (!equipment || !equipment.id) {
          throw new Error('Invalid equipment data');
        }
        await router.push({ 
          path: `/dashboard/equipment/${equipment.id}`,
          query: { edit: 'true' }
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to edit equipment';
        $q.notify({
          type: 'negative',
          message: errorMessage,
          position: 'top'
        });
      }
    };

    const handleAssignEquipment = async (equipment: Equipment) => {
      try {
        if (!equipment || !equipment.id) {
          throw new Error('Invalid equipment data');
        }
        await router.push({ 
          path: `/dashboard/equipment/${equipment.id}`,
          query: { assign: 'true' }
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to assign equipment';
        $q.notify({
          type: 'negative',
          message: errorMessage,
          position: 'top'
        });
      }
    };

    const handleReturnEquipment = async (equipment: Equipment) => {
      try {
        if (!equipment || !equipment.id) {
          throw new Error('Invalid equipment data');
        }
        await router.push({ 
          path: `/dashboard/equipment/${equipment.id}`,
          query: { return: 'true' }
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to return equipment';
        $q.notify({
          type: 'negative',
          message: errorMessage,
          position: 'top'
        });
      }
    };

    const handleMaintenanceEquipment = async (equipment: Equipment) => {
      try {
        if (!equipment || !equipment.id) {
          throw new Error('Invalid equipment data');
        }
        await router.push({ 
          path: `/dashboard/equipment/${equipment.id}`,
          query: { maintenance: 'true' }
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initiate maintenance';
        $q.notify({
          type: 'negative',
          message: errorMessage,
          position: 'top'
        });
      }
    };

    // Lifecycle hooks
    onMounted(() => {
      initializeComponent();
    });

    onUnmounted(() => {
      equipmentStore.clearCache();
    });

    return {
      loading,
      error,
      canCreateEquipment,
      equipmentListRef,
      handleEquipmentSelected,
      handleCreateEquipment,
      handleFilterChange,
      handleFilterReset,
      handleEditEquipment,
      handleAssignEquipment,
      handleReturnEquipment,
      handleMaintenanceEquipment
    };
  }
});
</script>

<style lang="scss" scoped>
.equipment-list-page {
  padding: var(--space-md);
  min-height: 100vh;
  background: var(--surface-ground);

  h1 {
    color: var(--text-primary);
    margin-bottom: var(--space-lg);
  }

  // Responsive adjustments
  @media (max-width: $breakpoint-sm) {
    padding: var(--space-sm);

    h1 {
      font-size: 1.5rem;
    }
  }

  // High contrast mode support
  @media (forced-colors: active) {
    border: 1px solid CanvasText;
  }

  // Print styles
  @media print {
    padding: 0;
    background: white;
  }
}
</style>