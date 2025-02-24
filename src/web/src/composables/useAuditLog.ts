/**
 * @fileoverview Vue.js composable for audit logging functionality
 * @version 1.0.0
 */

import { ref } from 'vue';
import axios from 'axios';

interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  performedBy: string;
  performedAt: Date;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'error';
}

interface AuditLogFilters {
  entityType?: string | null;
  action?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  search?: string | null;
}

interface AuditLogPagination {
  page: number;
  rowsPerPage: number;
}

interface AuditLogResponse {
  logs: AuditLogEntry[];
  total: number;
}

interface AuditStatistics {
  actionDistribution: Record<string, number>;
  entityDistribution: Record<string, number>;
  timeline: Record<string, number>;
  topUsers: Array<{ user: string; count: number }>;
  errorRate: number;
}

export function useAuditLog() {
  const logs = ref<AuditLogEntry[]>([]);
  const total = ref<number>(0);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const fetchLogs = async (
    filters: AuditLogFilters = {},
    pagination: AuditLogPagination = { page: 1, rowsPerPage: 20 }
  ): Promise<void> => {
    try {
      isLoading.value = true;
      error.value = null;

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        rowsPerPage: pagination.rowsPerPage.toString(),
        ...(filters.entityType && { entityType: filters.entityType }),
        ...(filters.action && { action: filters.action }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.search && { search: filters.search }),
      });

      const response = await axios.get<AuditLogResponse>(`/api/audit/logs?${params}`);
      logs.value = response.data.logs;
      total.value = response.data.total;
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
      const response = await axios.get<AuditStatistics>('/api/audit/statistics');
      return response.data;
    } catch (err) {
      console.error('Error fetching audit statistics:', err);
      error.value = 'Failed to fetch audit statistics';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  return {
    logs,
    total,
    isLoading,
    error,
    fetchLogs,
    fetchStatistics,
  };
}
