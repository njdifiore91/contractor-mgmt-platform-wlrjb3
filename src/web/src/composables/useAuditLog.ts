/**
 * @fileoverview Vue.js composable for audit logging functionality using the audit API client
 * @version 1.0.0
 */

import { ref } from 'vue';
import type {
  AuditLogEntry,
  AuditLogFilters,
  AuditLogPagination,
  AuditStatistics,
} from '../models/audit.model';
import auditApiClient from '../api/audit.api';
import { AuditService } from '../services/audit.service';

export function useAuditLog() {
  const logs = ref<AuditLogEntry[]>([]);
  const total = ref<number>(0);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const statistics = ref<AuditStatistics | null>(null);
  const auditService = AuditService.getInstance();

  const fetchLogs = async (
    filters: AuditLogFilters = {},
    pagination: AuditLogPagination = { page: 1, rowsPerPage: 20 }
  ): Promise<void> => {
    try {
      isLoading.value = true;
      error.value = null;

      const response = await auditApiClient.getAuditLogs(filters, pagination);
      logs.value = response.logs;
      total.value = response.total;
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      error.value = 'Failed to fetch audit logs';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const fetchStatistics = async (): Promise<AuditStatistics> => {
    try {
      isLoading.value = true;
      error.value = null;

      const stats = await auditApiClient.getAuditStatistics();
      statistics.value = stats;
      return stats;
    } catch (err) {
      console.error('Error fetching audit statistics:', err);
      error.value = 'Failed to fetch audit statistics';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const logAction = async (
    entityType: string,
    entityId: string | number,
    action: string,
    details: Record<string, unknown> = {}
  ): Promise<void> => {
    return auditService.logAction(entityType, entityId.toString(), action, details);
  };

  return {
    logs,
    total,
    isLoading,
    error,
    statistics,
    fetchLogs,
    fetchStatistics,
    logAction
  };
}
