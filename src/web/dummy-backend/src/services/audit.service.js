const { AuditLog } = require('../models/audit.model');

class AuditService {
  /**
   * Fetch audit logs with filtering and pagination
   */
  async getLogs(filters = {}, pagination = {}) {
    try {
      const query = {};

      if (filters.entityType) {
        query.entityType = filters.entityType;
      }

      if (filters.action) {
        query.action = filters.action;
      }

      if (filters.startDate) {
        query.performedAt = { $gte: new Date(filters.startDate) };
      }

      if (filters.endDate) {
        query.performedAt = { ...query.performedAt, $lte: new Date(filters.endDate) };
      }

      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        query.$or = [
          { entityType: { $regex: searchTerm, $options: 'i' } },
          { action: { $regex: searchTerm, $options: 'i' } },
          { performedBy: { $regex: searchTerm, $options: 'i' } },
        ];
      }

      const total = await AuditLog.countDocuments(query);
      const logs = await AuditLog.find(query)
        .sort({ performedAt: -1 })
        .skip((pagination.page - 1) * pagination.rowsPerPage)
        .limit(pagination.rowsPerPage);

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
      const actionStats = await AuditLog.aggregate([
        { $group: { _id: '$action', count: { $sum: 1 } } },
      ]);

      // Entity type distribution
      const entityStats = await AuditLog.aggregate([
        { $group: { _id: '$entityType', count: { $sum: 1 } } },
      ]);

      // Activity timeline (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const timelineStats = await AuditLog.aggregate([
        {
          $match: {
            performedAt: { $gte: sevenDaysAgo },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$performedAt' } },
            count: { $sum: 1 },
          },
        },
      ]);

      // Top users
      const topUsers = await AuditLog.aggregate([
        { $group: { _id: '$performedBy', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]);

      // Error rate
      const totalCount = await AuditLog.countDocuments();
      const errorCount = await AuditLog.countDocuments({ status: 'error' });
      const errorRate = totalCount > 0 ? (errorCount / totalCount) * 100 : 0;

      return {
        actionDistribution: actionStats.reduce(
          (acc, { _id, count }) => ({ ...acc, [_id]: count }),
          {}
        ),
        entityDistribution: entityStats.reduce(
          (acc, { _id, count }) => ({ ...acc, [_id]: count }),
          {}
        ),
        timeline: timelineStats.reduce((acc, { _id, count }) => ({ ...acc, [_id]: count }), {}),
        topUsers: topUsers.map(({ _id, count }) => ({ user: _id, count })),
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
      const newLog = new AuditLog({
        ...logData,
        performedAt: new Date(),
      });
      await newLog.save();
      return newLog;
    } catch (error) {
      console.error('Error creating audit log:', error);
      throw error;
    }
  }
}

module.exports = new AuditService();
