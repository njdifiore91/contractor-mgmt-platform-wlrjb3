/**
 * @fileoverview Audit API client module providing comprehensive audit logging functionality
 * with enhanced error handling, validation, retry logic, and logging capabilities.
 * @version 1.0.0
 */

import type {
  AuditLogEntry,
  AuditLogFilters,
  AuditLogPagination,
  AuditStatistics,
} from '../models/audit.model';
import api from '../utils/api.util';
import retry from 'axios-retry';
import rateLimit from 'axios-rate-limit';
import createError from 'http-errors';

// API endpoint constants
const API_VERSION = import.meta.env.VITE_APP_API_VERSION || 'v1';
const BASE_URL = import.meta.env.VITE_APP_API_URL || 'http://localhost:8080/api';
const API_ENDPOINTS = {
  AUDIT: `/${API_VERSION}/audit`,
  STATISTICS: `/${API_VERSION}/audit/statistics`,
} as const;

// Retry configuration for failed requests
const RETRY_CONFIG = {
  retries: 3,
  retryDelay: retry.exponentialDelay,
  retryCondition: retry.isNetworkOrIdempotentRequestError,
};

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  maxRequests: 50,
  perMilliseconds: 1000,
};

// Simple logger for browser environment
const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`[INFO] ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },
};

// Generate dummy audit log data
const generateDummyAuditLogs = () => {
  const logs: AuditLogEntry[] = [];
  const actions = ['create', 'update', 'delete', 'login', 'export', 'assign', 'review'];
  const entityTypes = ['USER', 'EQUIPMENT', 'INSPECTION', 'SYSTEM', 'REPORT'];
  const users = [
    'admin@example.com',
    'john.doe@example.com',
    'jane.smith@example.com',
    'operations@example.com',
    'inspector1@example.com',
    'system',
  ];

  // Generate logs for the last 30 days
  const now = new Date();
  for (let i = 0; i < 200; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const hoursAgo = Math.floor(Math.random() * 24);
    const minutesAgo = Math.floor(Math.random() * 60);

    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(date.getHours() - hoursAgo);
    date.setMinutes(date.getMinutes() - minutesAgo);

    const action = actions[Math.floor(Math.random() * actions.length)];
    const entityType = entityTypes[Math.floor(Math.random() * entityTypes.length)];
    const performedBy = users[Math.floor(Math.random() * users.length)];

    const log: AuditLogEntry = {
      id: String(i + 1),
      entityType,
      entityId: String(Math.floor(Math.random() * 1000)),
      action,
      performedBy,
      performedAt: date,
      details: generateDetails(action, entityType),
      ipAddress: generateIpAddress(),
      userAgent: 'Mozilla/5.0',
      status: Math.random() > 0.1 ? 'success' : 'error', // 10% error rate
    };

    logs.push(log);
  }

  return logs.sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime());
};

// Helper function to generate details
const generateDetails = (action: string, entityType: string): Record<string, unknown> => {
  switch (action) {
    case 'create':
      return {
        newData: {
          id: Math.floor(Math.random() * 1000),
          name: entityType === 'USER' ? 'John Doe' : 'Equipment XYZ',
          timestamp: new Date().toISOString(),
        },
      };
    case 'update':
      return {
        oldData: { status: 'inactive' },
        newData: { status: 'active' },
        changes: ['status'],
      };
    case 'delete':
      return {
        deletedData: {
          id: Math.floor(Math.random() * 1000),
          type: entityType.toLowerCase(),
        },
      };
    case 'login':
      return {
        loginMethod: Math.random() > 0.5 ? 'password' : '2FA',
        deviceInfo: {
          browser: 'Chrome',
          os: 'Windows',
        },
      };
    case 'assign':
      return {
        assignedTo: 'inspector1@example.com',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
    case 'review':
      return {
        status: Math.random() > 0.5 ? 'approved' : 'rejected',
        comments: 'Standard review process completed',
      };
    default:
      return {};
  }
};

// Helper function to generate IP addresses
const generateIpAddress = (): string => {
  const segment = () => Math.floor(Math.random() * 256);
  return `${segment()}.${segment()}.${segment()}.${segment()}`;
};

// Initialize dummy data
const dummyAuditLogs = generateDummyAuditLogs();

/**
 * Audit API client class providing comprehensive audit logging functionality
 * with error handling, validation, and logging capabilities.
 */
export class AuditApiClient {
  constructor() {
    // Configure retry and rate limiting
    retry(api, RETRY_CONFIG);
    rateLimit(api, RATE_LIMIT_CONFIG);
  }

  /**
   * Retrieves audit logs with pagination and filtering
   * @param filters Optional filters for audit logs
   * @param pagination Pagination parameters
   * @returns Promise resolving to filtered and paginated audit logs
   * @throws {ApiError} If the request fails
   */
  async getAuditLogs(
    filters: AuditLogFilters = {},
    pagination: AuditLogPagination = { page: 1, rowsPerPage: 20 }
  ): Promise<{ logs: AuditLogEntry[]; total: number }> {
    try {
      logger.info('Fetching audit logs', { filters, pagination });
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 200));

      let filteredLogs = [...dummyAuditLogs];

      // Apply filters
      if (filters.entityType) {
        filteredLogs = filteredLogs.filter((log) => log.entityType === filters.entityType);
      }

      if (filters.action) {
        filteredLogs = filteredLogs.filter((log) => log.action === filters.action);
      }

      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        filteredLogs = filteredLogs.filter((log) => log.performedAt >= startDate);
      }

      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        filteredLogs = filteredLogs.filter((log) => log.performedAt <= endDate);
      }

      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredLogs = filteredLogs.filter(
          (log) =>
            log.entityType.toLowerCase().includes(searchTerm) ||
            log.action.toLowerCase().includes(searchTerm) ||
            log.performedBy.toLowerCase().includes(searchTerm)
        );
      }

      // Calculate total before pagination
      const total = filteredLogs.length;

      // Apply pagination
      const start = (pagination.page - 1) * pagination.rowsPerPage;
      const end = start + pagination.rowsPerPage;
      const logs = filteredLogs.slice(start, end);

      return { logs, total };
    } catch (error) {
      logger.error('Failed to fetch audit logs', { error, filters, pagination });
      throw createError(500, 'Failed to fetch audit logs', { cause: error });
    }
  }

  /**
   * Retrieves audit statistics
   * @returns Promise resolving to audit statistics
   * @throws {ApiError} If the request fails
   */
  async getAuditStatistics(): Promise<AuditStatistics> {
    try {
      logger.info('Fetching audit statistics');
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Action type distribution
      const actionStats = dummyAuditLogs.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Entity type distribution
      const entityStats = dummyAuditLogs.reduce((acc, log) => {
        acc[log.entityType] = (acc[log.entityType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Activity timeline (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const timeline = dummyAuditLogs
        .filter((log) => log.performedAt >= sevenDaysAgo)
        .reduce((acc, log) => {
          const date = log.performedAt.toISOString().split('T')[0];
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      // Top users
      const userCounts = dummyAuditLogs.reduce((acc, log) => {
        acc[log.performedBy] = (acc[log.performedBy] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topUsers = Object.entries(userCounts)
        .map(([user, count]) => ({ user, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Error rate
      const errorCount = dummyAuditLogs.filter((log) => log.status === 'error').length;
      const errorRate = (errorCount / dummyAuditLogs.length) * 100;

      return {
        actionDistribution: actionStats,
        entityDistribution: entityStats,
        timeline,
        topUsers,
        errorRate,
      };
    } catch (error) {
      logger.error('Failed to fetch audit statistics', { error });
      throw createError(500, 'Failed to fetch audit statistics', { cause: error });
    }
  }
}

// Export singleton instance
const auditApiClient = new AuditApiClient();
export default auditApiClient;

// Export individual functions for convenience
export const getAuditLogs = (
  filters: Parameters<AuditApiClient['getAuditLogs']>[0],
  pagination: Parameters<AuditApiClient['getAuditLogs']>[1]
) => auditApiClient.getAuditLogs(filters, pagination);

export const getAuditStatistics = () => auditApiClient.getAuditStatistics();
