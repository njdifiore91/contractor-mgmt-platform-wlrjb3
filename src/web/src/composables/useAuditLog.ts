/**
 * @fileoverview Vue.js composable for audit logging functionality
 * @version 1.0.0
 */

import { ref, computed } from 'vue';
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

  // Computed statistics from logs
  const statistics = computed<AuditStatistics>(() => {
    // Action type distribution
    const actionDistribution = logs.value.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Entity type distribution
    const entityDistribution = logs.value.reduce((acc, log) => {
      acc[log.entityType] = (acc[log.entityType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Activity timeline (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const timeline = logs.value
      .filter((log) => new Date(log.performedAt) >= sevenDaysAgo)
      .reduce((acc, log) => {
        const date = new Date(log.performedAt).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    // Top users
    const userCounts = logs.value.reduce((acc, log) => {
      acc[log.performedBy] = (acc[log.performedBy] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topUsers = Object.entries(userCounts)
      .map(([user, count]) => ({ user, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Error rate
    const errorCount = logs.value.filter((log) => log.status === 'error').length;
    const errorRate = logs.value.length ? (errorCount / logs.value.length) * 100 : 0;

    return {
      actionDistribution,
      entityDistribution,
      timeline,
      topUsers,
      errorRate,
    };
  });

  // Replace API call with computed statistics
  const fetchStatistics = async (): Promise<AuditStatistics> => {
    return statistics.value;
  };

  return {
    logs,
    total,
    isLoading,
    error,
    fetchLogs,
    fetchStatistics,
    statistics, // Export computed statistics
  };
}
