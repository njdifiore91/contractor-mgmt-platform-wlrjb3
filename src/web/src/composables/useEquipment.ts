/**
 * @fileoverview Vue.js composable providing comprehensive equipment management functionality
 * with reactive state management, optimistic updates, error handling, and API integration.
 * @version 1.0.0
 */

import { ref, computed, onMounted, watchEffect } from 'vue'; // v3.x
import { useQuasar } from 'quasar'; // v2.x
import { debounce } from 'lodash'; // v4.x
import { Equipment, type EquipmentTypeValue } from '../models/equipment.model';
import type { EquipmentAssignment } from '../models/equipment-types';
import { useEquipmentStore } from '../stores/equipment.store';

// Constants for equipment management
const DEBOUNCE_DELAY = 300;
const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MAX_BATCH_SIZE = 50;

/**
 * Composable function providing comprehensive equipment management functionality
 * with optimistic updates and enhanced error handling.
 */
export function useEquipment() {
  // Initialize Quasar utilities
  const $q = useQuasar();
  
  // Initialize equipment store
  const equipmentStore = useEquipmentStore();
  
  // Local reactive state
  const loading = ref(false);
  const error = ref<string | null>(null);
  const filters = ref({
    type: null as EquipmentTypeValue | null,
    isAvailable: null as boolean | null,
    search: '' as string
  });
  const selectedEquipmentId = ref<number | null>(null);

  // Computed properties from store
  const equipment = computed(() => {
    if (equipmentStore.selectedEquipment) {
      return [equipmentStore.selectedEquipment];
    }
    return equipmentStore.equipment;
  });
  const selectedEquipment = computed(() => equipmentStore.selectedEquipment);
  
  const availableEquipment = computed(() => 
    equipmentStore.availableEquipment.filter(item => 
      applyFilters(item, filters.value)
    )
  );
  
  const assignedEquipment = computed(() => 
    equipmentStore.assignedEquipment.filter(item => 
      applyFilters(item, filters.value)
    )
  );
  
  const maintenanceRequired = computed(() => 
    equipmentStore.maintenanceRequired.filter(item => 
      applyFilters(item, filters.value)
    )
  );

  const lastUpdateTime = computed(() => {
    return equipmentStore.lastSync 
      ? new Date(equipmentStore.lastSync).toLocaleString()
      : 'Never';
  });

  // Filter application logic
  const applyFilters = (item: Equipment, currentFilters: typeof filters.value) => {
    if (currentFilters.type && item.type !== currentFilters.type) {
      return false;
    }
    if (currentFilters.isAvailable !== null && item.isAvailable !== currentFilters.isAvailable) {
      return false;
    }
    if (currentFilters.search) {
      const searchTerm = currentFilters.search.toLowerCase();
      return (
        item.serialNumber.toLowerCase().includes(searchTerm) ||
        item.model.toLowerCase().includes(searchTerm)
      );
    }
    return true;
  };

  // Debounced fetch implementation
  const debouncedFetch = debounce(async () => {
    try {
      await equipmentStore.loadEquipment();
    } catch (err) {
      handleError(err);
    }
  }, DEBOUNCE_DELAY);

  /**
   * Fetches equipment list or single equipment details
   * @param equipmentIdOrForceRefresh Optional ID to fetch a single equipment or boolean to force refresh
   */
  const fetchEquipment = async (equipmentIdOrForceRefresh?: number | boolean) => {
    loading.value = true;
    error.value = null;

    try {
      if (typeof equipmentIdOrForceRefresh === 'number') {
        // Fetch single equipment details
        await equipmentStore.selectEquipment(equipmentIdOrForceRefresh);
      } else {
        // Fetch equipment list
        await equipmentStore.loadEquipment(equipmentIdOrForceRefresh || false);
      }
    } catch (err) {
      handleError(err);
    } finally {
      loading.value = false;
    }
  };

  /**
   * Handles errors with user notifications
   */
  const handleError = (err: any) => {
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
    error.value = errorMessage;
    $q.notify({
      type: 'negative',
      message: errorMessage,
      position: 'top'
    });
  };

  // Lifecycle hooks
  onMounted(() => {
    fetchEquipment();
    
    // Setup auto-refresh interval
    const refreshInterval = setInterval(() => {
      if (!loading.value) {
        fetchEquipment(true);
      }
    }, AUTO_REFRESH_INTERVAL);

    // Cleanup interval on component unmount
    return () => clearInterval(refreshInterval);
  });

  // Watch for filter changes
  watchEffect(() => {
    if (!loading.value) {
      debouncedFetch();
    }
  });

  return {
    // State
    loading,
    error,
    filters,
    selectedEquipmentId,

    // Computed
    equipment,
    selectedEquipment,
    availableEquipment,
    assignedEquipment,
    maintenanceRequired,
    lastUpdateTime,

    // Methods
    fetchEquipment,
    assignEquipment: equipmentStore.assignEquipmentToInspector,
    returnEquipment: equipmentStore.processEquipmentReturn,
    updateEquipment: equipmentStore.updateExistingEquipment,
    
    // Filter helpers
    applyFilters
  };
}

export default useEquipment;