/**
 * @fileoverview Pinia store for managing equipment state in the service provider management system.
 * Implements comprehensive equipment tracking, real-time status management, caching, and error handling.
 * @version 1.0.0
 */

import { defineStore } from 'pinia'; // ^2.1.0
import { ref, computed, watch } from 'vue'; // ^3.3.0
import { 
  Equipment, 
  EquipmentAssignment, 
  EquipmentType 
} from '../models/equipment.model';
import { 
  getEquipmentList, 
  getEquipmentById, 
  createEquipment, 
  updateEquipment, 
  assignEquipment, 
  returnEquipment, 
  getEquipmentHistory 
} from '../api/equipment.api';
import { useNotificationStore } from './notification.store';

// Constants for store configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second

interface EquipmentState {
  equipment: Equipment[];
  selectedEquipment: Equipment | null;
  assignments: EquipmentAssignment[];
  history: EquipmentHistory[];
  loading: boolean;
  error: string | null;
  lastSync: Date | null;
  cache: { [key: string]: Equipment };
  retryCount: number;
}

export const useEquipmentStore = defineStore('equipment', () => {
  // State initialization
  const equipment = ref<Equipment[]>([]);
  const selectedEquipment = ref<Equipment | null>(null);
  const assignments = ref<EquipmentAssignment[]>([]);
  const history = ref<EquipmentHistory[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const lastSync = ref<Date | null>(null);
  const cache = ref<{ [key: string]: Equipment }>({});
  const retryCount = ref(0);

  // Store instance for notifications
  const notificationStore = useNotificationStore();

  // Computed properties
  const availableEquipment = computed(() => 
    equipment.value.filter(item => item.isAvailable)
  );

  const assignedEquipment = computed(() => 
    equipment.value.filter(item => !item.isAvailable)
  );

  const maintenanceRequired = computed(() => 
    equipment.value.filter(item => {
      const lastMaintenance = new Date(item.lastMaintenanceDate || 0);
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return lastMaintenance < threeMonthsAgo;
    })
  );

  // Cache management
  const isCacheValid = computed(() => {
    if (!lastSync.value) return false;
    return (new Date().getTime() - lastSync.value.getTime()) < CACHE_DURATION;
  });

  // Watchers
  watch(equipment, (newEquipment) => {
    // Update cache when equipment changes
    newEquipment.forEach(item => {
      cache.value[item.id] = item;
    });
    lastSync.value = new Date();
  });

  // Actions
  const loadEquipment = async (forceRefresh = false) => {
    if (!forceRefresh && isCacheValid.value) {
      return equipment.value;
    }

    loading.value = true;
    error.value = null;

    try {
      const response = await getEquipmentList();
      equipment.value = response;
      lastSync.value = new Date();
      retryCount.value = 0;
      notificationStore.success('Equipment list updated successfully');
    } catch (err) {
      error.value = err.message;
      notificationStore.error('Failed to load equipment list');
      if (retryCount.value < MAX_RETRY_ATTEMPTS) {
        retryCount.value++;
        setTimeout(() => loadEquipment(forceRefresh), RETRY_DELAY * retryCount.value);
      }
    } finally {
      loading.value = false;
    }
  };

  const selectEquipment = async (id: number) => {
    // Check cache first
    if (cache.value[id]) {
      selectedEquipment.value = cache.value[id];
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const response = await getEquipmentById(id);
      selectedEquipment.value = response;
      cache.value[id] = response;
    } catch (err) {
      error.value = err.message;
      notificationStore.error(`Failed to load equipment details: ${err.message}`);
    } finally {
      loading.value = false;
    }
  };

  const createNewEquipment = async (equipmentData: Omit<Equipment, 'id'>) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await createEquipment(equipmentData);
      equipment.value.push(response);
      cache.value[response.id] = response;
      notificationStore.success('Equipment created successfully');
      return response;
    } catch (err) {
      error.value = err.message;
      notificationStore.error(`Failed to create equipment: ${err.message}`);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateExistingEquipment = async (id: number, updates: Partial<Equipment>) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await updateEquipment(id, updates);
      const index = equipment.value.findIndex(item => item.id === id);
      if (index !== -1) {
        equipment.value[index] = response;
      }
      cache.value[id] = response;
      notificationStore.success('Equipment updated successfully');
      return response;
    } catch (err) {
      error.value = err.message;
      notificationStore.error(`Failed to update equipment: ${err.message}`);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const assignEquipmentToInspector = async (assignment: Omit<EquipmentAssignment, 'id'>) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await assignEquipment(assignment);
      assignments.value.push(response);
      // Update equipment availability
      const equipmentIndex = equipment.value.findIndex(item => item.id === assignment.equipmentId);
      if (equipmentIndex !== -1) {
        equipment.value[equipmentIndex].isAvailable = false;
        cache.value[assignment.equipmentId] = equipment.value[equipmentIndex];
      }
      notificationStore.success('Equipment assigned successfully');
      return response;
    } catch (err) {
      error.value = err.message;
      notificationStore.error(`Failed to assign equipment: ${err.message}`);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const processEquipmentReturn = async (
    assignmentId: number,
    returnDetails: { returnCondition: string; notes?: string }
  ) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await returnEquipment(assignmentId, returnDetails);
      const assignmentIndex = assignments.value.findIndex(item => item.id === assignmentId);
      if (assignmentIndex !== -1) {
        assignments.value[assignmentIndex] = response;
      }
      // Update equipment availability
      const equipmentIndex = equipment.value.findIndex(item => item.id === response.equipmentId);
      if (equipmentIndex !== -1) {
        equipment.value[equipmentIndex].isAvailable = true;
        cache.value[response.equipmentId] = equipment.value[equipmentIndex];
      }
      notificationStore.success('Equipment return processed successfully');
      return response;
    } catch (err) {
      error.value = err.message;
      notificationStore.error(`Failed to process equipment return: ${err.message}`);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const loadEquipmentHistory = async (equipmentId: number) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await getEquipmentHistory(equipmentId);
      history.value = response;
      return response;
    } catch (err) {
      error.value = err.message;
      notificationStore.error(`Failed to load equipment history: ${err.message}`);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const clearCache = () => {
    cache.value = {};
    lastSync.value = null;
  };

  return {
    // State
    equipment,
    selectedEquipment,
    assignments,
    history,
    loading,
    error,
    lastSync,

    // Getters
    availableEquipment,
    assignedEquipment,
    maintenanceRequired,
    isCacheValid,

    // Actions
    loadEquipment,
    selectEquipment,
    createNewEquipment,
    updateExistingEquipment,
    assignEquipmentToInspector,
    processEquipmentReturn,
    loadEquipmentHistory,
    clearCache
  };
});