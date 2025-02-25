const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      required: true,
      enum: ['USER', 'EQUIPMENT', 'SYSTEM'],
    },
    entityId: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'create',
        'read',
        'update',
        'delete',
        'login',
        'logout',
        'export',
        'import',
        'assign',
        'unassign',
      ],
    },
    performedBy: {
      type: String,
      required: true,
    },
    performedAt: {
      type: Date,
      default: Date.now,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: String,
    userAgent: String,
    status: {
      type: String,
      enum: ['success', 'error'],
      default: 'success',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Add indexes for common queries
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ performedAt: -1 });
auditLogSchema.index({ performedBy: 1 });
auditLogSchema.index({ action: 1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

/**
 * Represents the statistics for audit logs
 */
class AuditStatistics {
  constructor({
    actionDistribution = {},
    entityDistribution = {},
    timeline = {},
    topUsers = [],
    errorRate = 0,
  }) {
    this.actionDistribution = actionDistribution;
    this.entityDistribution = entityDistribution;
    this.timeline = timeline;
    this.topUsers = topUsers;
    this.errorRate = errorRate;
  }

  toJSON() {
    return {
      actionDistribution: this.actionDistribution,
      entityDistribution: this.entityDistribution,
      timeline: this.timeline,
      topUsers: this.topUsers,
      errorRate: this.errorRate,
    };
  }
}

module.exports = {
  AuditLog,
  AuditStatistics,
};
