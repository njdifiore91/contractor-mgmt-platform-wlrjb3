const auditService = require('../services/audit.service');

const auditLogger = async (req, res, next) => {
  // Store the original send function
  const originalSend = res.send;

  // Override the send function to log after successful responses
  res.send = function (body) {
    const shouldAudit = req.shouldAudit !== false; // Allow skipping audit in specific routes

    if (shouldAudit && res.statusCode >= 200 && res.statusCode < 300) {
      const logData = {
        entityType: req.auditEntityType || getEntityTypeFromPath(req.path),
        entityId: req.auditEntityId || getEntityIdFromRequest(req),
        action: req.auditAction || getActionFromMethod(req.method),
        performedBy: req.user?.email || 'system',
        details: {
          path: req.path,
          method: req.method,
          params: req.params,
          query: req.query,
          body: sanitizeRequestBody(req.body),
          statusCode: res.statusCode,
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      };

      // Async log creation - don't wait for it
      auditService.createLog(logData).catch((error) => {
        console.error('Error creating audit log:', error);
      });
    }

    // Call the original send function
    return originalSend.apply(res, arguments);
  };

  next();
};

// Helper functions
const getEntityTypeFromPath = (path) => {
  const pathParts = path.split('/').filter(Boolean);
  return pathParts[1]?.toUpperCase() || 'SYSTEM';
};

const getEntityIdFromRequest = (req) => {
  return req.params.id || 'N/A';
};

const getActionFromMethod = (method) => {
  const actionMap = {
    GET: 'read',
    POST: 'create',
    PUT: 'update',
    PATCH: 'update',
    DELETE: 'delete',
  };
  return actionMap[method.toUpperCase()] || 'access';
};

const sanitizeRequestBody = (body) => {
  if (!body) return {};

  // Create a copy to avoid modifying the original
  const sanitized = { ...body };

  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'secret'];
  sensitiveFields.forEach((field) => {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
};

module.exports = auditLogger;
