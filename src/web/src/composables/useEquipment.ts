/**
 * @fileoverview Vue.js composable providing comprehensive equipment management functionality
 * with reactive state management, optimistic updates, error handling, and API integration.
 * @version 1.0.0
 */

import { ref, computed, onMounted, watchEffect } from 'vue'; // v3.x
import { useQuasar } from '@quasar/app'; // v2.x
import { debounce } from 'lodash'; // v4.x
import { 
  Equipment, 
  EquipmentAssignment, 
  EquipmentType, 
  EquipmentCondition 
} from '../models/equipment.model';
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
    type: null as EquipmentType | null,
    isAvailable: null as boolean | null,
    search: '' as string
  });
  const selectedEquipmentId = ref<number | null>(null);

  // Computed properties
  const equipment = computed(() => equipmentStore.equipment);
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
      await equipmentStore.loadEquipment(true);
    } catch (err) {
      handleError(err);
    }
  }, DEBOUNCE_DELAY);

  /**
   * Fetches equipment list with filtering and error handling
   * @param forceRefresh Forces a refresh bypassing cache
   */
  const fetchEquipment = async (forceRefresh = false) => {
    loading.value = true;
    error.value = null;

    try {
      await equipmentStore.loadEquipment(forceRefresh);
    } catch (err) {
      handleError(err);
    } finally {
      loading.value = false;
    }
  };

  /**
   * Assigns equipment to an inspector with validation and optimistic updates
   * @param assignment Equipment assignment details
   */
  const assignEquipment = async (assignment: Omit<EquipmentAssignment, 'id'>): Promise<boolean> => {
    loading.value = true;
    error.value = null;

    try {
      await equipmentStore.assignEquipmentToInspector(assignment);
      $q.notify({
        type: 'positive',
        message: 'Equipment assigned successfully'
      });
      return true;
    } catch (err) {
      handleError(err);
      return false;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Processes equipment return with condition assessment
   * @param assignmentId Assignment identifier
   * @param returnData Return condition and notes
   */
  const returnEquipment = async (
    assignmentId: number,
    returnData: { returnCondition: string; notes?: string }
  ): Promise<boolean> => {
    loading.value = true;
    error.value = null;

    try {
      await equipmentStore.processEquipmentReturn(assignmentId, returnData);
      $q.notify({
        type: 'positive',
        message: 'Equipment return processed successfully'
      });
      return true;
    } catch (err) {
      handleError(err);
      return false;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Updates equipment details with optimistic updates
   * @param id Equipment identifier
   * @param updates Equipment updates
   */
  const updateEquipment = async (
    id: number,
    updates: Partial<Equipment>
  ): Promise<boolean> => {
    loading.value = true;
    error.value = null;

    try {
      await equipmentStore.updateExistingEquipment(id, updates);
      $q.notify({
        type: 'positive',
        message: 'Equipment updated successfully'
      });
      return true;
    } catch (err) {
      handleError(err);
      return false;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Handles errors with user notifications
   * @param err Error object
   */
  const handleError = (err: any) => {
    error.value = err.message || 'An unexpected error occurred';
    $q.notify({
      type: 'negative',
      message: error.value,
      timeout: 5000
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
    assignEquipment,
    returnEquipment,
    updateEquipment,
    
    // Filter helpers
    applyFilters
  };
}

export default useEquipment;