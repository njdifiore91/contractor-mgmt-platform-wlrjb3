const express = require('express');
const router = express.Router();
const auditService = require('../services/audit.service');

// Get audit logs with filtering and pagination
router.get('/logs', async (req, res) => {
  try {
    const filters = {
      entityType: req.query.entityType,
      action: req.query.action,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      search: req.query.search,
    };

    const pagination = {
      page: parseInt(req.query.page) || 1,
      rowsPerPage: parseInt(req.query.rowsPerPage) || 20,
    };

    const result = await auditService.getLogs(filters, pagination);
    res.json(result);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Get audit statistics
router.get('/statistics', async (req, res) => {
  try {
    const statistics = await auditService.getStatistics();
    res.json(statistics);
  } catch (error) {
    console.error('Error fetching audit statistics:', error);
    res.status(500).json({ error: 'Failed to fetch audit statistics' });
  }
});

// Create new audit log entry
router.post('/logs', async (req, res) => {
  try {
    const logData = {
      entityType: req.body.entityType,
      entityId: req.body.entityId,
      action: req.body.action,
      performedBy: req.headers['x-user-email'] || 'system',
      details: req.body.details,
    };

    const newLog = await auditService.createLog(logData);
    res.status(201).json(newLog);
  } catch (error) {
    console.error('Error creating audit log:', error);
    res.status(500).json({ error: 'Failed to create audit log' });
  }
});

module.exports = router;
