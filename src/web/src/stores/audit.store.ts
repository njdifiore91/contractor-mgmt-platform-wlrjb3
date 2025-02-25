/**
 * @fileoverview Pinia store for managing audit logs in the service provider management system.
 * Implements comprehensive audit logging, real-time statistics, caching, and error handling.
 * @version 1.0.0
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  AuditLogEntry,
  AuditLogFilters,
  AuditLogPagination,
  AuditStatistics,
} from '../models/audit.model';
import { getAuditLogs, getAuditStatistics } from '../api/audit.api';
import { useNotificationStore } from './notification.store';

// Constants for store configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useAuditStore = defineStore('audit', () => {
  // State initialization
  const logs = ref<AuditLogEntry[]>([]);
  const statistics = ref<AuditStatistics | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const lastSync = ref<Date | null>(null);
  const total = ref<number>(0);

  // Store instance for notifications
  const notificationStore = useNotificationStore();

  // Computed properties
  const isCacheValid = computed(() => {
    if (!lastSync.value) return false;
    return new Date().getTime() - lastSync.value.getTime() < CACHE_DURATION;
  });

  const errorLogs = computed(() => logs.value.filter((log) => log.status === 'error'));

  const successLogs = computed(() => logs.value.filter((log) => log.status === 'success'));

  // Actions
  const fetchLogs = async (
    filters: AuditLogFilters = {},
    pagination: AuditLogPagination = { page: 1, rowsPerPage: 20 },
    forceRefresh = false
  ) => {
    if (!forceRefresh && isCacheValid.value) {
      return { logs: logs.value, total: total.value };
    }

    loading.value = true;
    error.value = null;

    try {
      const response = await getAuditLogs(filters, pagination);
      logs.value = response.logs;
      total.value = response.total;
      lastSync.value = new Date();

      if (forceRefresh) {
        notificationStore.success('Audit logs updated successfully');
      }

      return response;
    } catch (err: any) {
      error.value = err.message;
      notificationStore.error(`Failed to fetch audit logs: ${err.message}`);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchStatistics = async (forceRefresh = false) => {
    if (!forceRefresh && statistics.value && isCacheValid.value) {
      return statistics.value;
    }

    loading.value = true;
    error.value = null;

    try {
      const stats = await getAuditStatistics();
      statistics.value = stats;
      lastSync.value = new Date();

      if (forceRefresh) {
        notificationStore.success('Audit statistics updated successfully');
      }

      return stats;
    } catch (err: any) {
      error.value = err.message;
      notificationStore.error(`Failed to fetch audit statistics: ${err.message}`);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const clearCache = () => {
    lastSync.value = null;
    statistics.value = null;
  };

  return {
    // State
    logs,
    statistics,
    loading,
    error,
    lastSync,
    total,

    // Getters
    isCacheValid,
    errorLogs,
    successLogs,

    // Actions
    fetchLogs,
    fetchStatistics,
    clearCache,
  };
});
