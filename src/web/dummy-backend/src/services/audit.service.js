// Dummy data for audit logs
const dummyAuditLogs = [
  {
    id: 1,
    entityType: 'USER',
    entityId: '1',
    action: 'create',
    performedBy: 'admin@example.com',
    performedAt: new Date('2024-03-15T10:00:00'),
    details: { newData: { firstName: 'John', lastName: 'Doe' } },
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    status: 'success',
  },
  {
    id: 2,
    entityType: 'USER',
    entityId: '1',
    action: 'update',
    performedBy: 'admin@example.com',
    performedAt: new Date('2024-03-15T11:30:00'),
    details: {
      oldData: { isActive: true },
      newData: { isActive: false },
    },
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    status: 'success',
  },
  {
    id: 3,
    entityType: 'EQUIPMENT',
    entityId: '123',
    action: 'delete',
    performedBy: 'operations@example.com',
    performedAt: new Date('2024-03-14T09:15:00'),
    details: { deletedData: { equipmentId: '123', name: 'Forklift A' } },
    ipAddress: '192.168.1.2',
    userAgent: 'Mozilla/5.0',
    status: 'success',
  },
  {
    id: 4,
    entityType: 'SYSTEM',
    entityId: 'backup',
    action: 'export',
    performedBy: 'system',
    performedAt: new Date('2024-03-13T00:00:00'),
    details: { backupSize: '2.5GB' },
    ipAddress: 'localhost',
    userAgent: 'system',
    status: 'success',
  },
  {
    id: 5,
    entityType: 'USER',
    entityId: '2',
    action: 'login',
    performedBy: 'jane.smith@example.com',
    performedAt: new Date('2024-03-15T08:00:00'),
    details: { loginMethod: '2FA' },
    ipAddress: '192.168.1.3',
    userAgent: 'Mozilla/5.0',
    status: 'success',
  },
];

class AuditService {
  /**
   * Fetch audit logs with filtering and pagination
   */
  async getLogs(filters = {}, pagination = {}) {
    try {
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

      // Sort by performedAt in descending order
      filteredLogs.sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime());

      // Apply pagination
      const start = (pagination.page - 1) * pagination.rowsPerPage;
      const end = start + pagination.rowsPerPage;
      const logs = filteredLogs.slice(start, end);

      return { logs, total };
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }
  }

  /**
   * Get audit statistics
   */
  async getStatistics() {
    try {
      // Action type distribution
      const actionStats = dummyAuditLogs.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {});

      // Entity type distribution
      const entityStats = dummyAuditLogs.reduce((acc, log) => {
        acc[log.entityType] = (acc[log.entityType] || 0) + 1;
        return acc;
      }, {});

      // Activity timeline (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const timelineStats = dummyAuditLogs
        .filter((log) => log.performedAt >= sevenDaysAgo)
        .reduce((acc, log) => {
          const date = log.performedAt.toISOString().split('T')[0];
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {});

      // Top users
      const userCounts = dummyAuditLogs.reduce((acc, log) => {
        acc[log.performedBy] = (acc[log.performedBy] || 0) + 1;
        return acc;
      }, {});

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
        timeline: timelineStats,
        topUsers,
        errorRate,
      };
    } catch (error) {
      console.error('Error getting audit statistics:', error);
      throw error;
    }
  }

  /**
   * Create new audit log entry
   */
  async createLog(logData) {
    try {
      const newLog = {
        id: dummyAuditLogs.length + 1,
        ...logData,
        performedAt: new Date(),
        status: 'success',
      };
      dummyAuditLogs.push(newLog);
      return newLog;
    } catch (error) {
      console.error('Error creating audit log:', error);
      throw error;
    }
  }
}

module.exports = new AuditService();
