const express = require('express');
const { body, query } = require('express-validator');
const { validateRequest } = require('../middleware/validate-request');
const { requireAuth } = require('../middleware/require-auth');
const { requireAdmin } = require('../middleware/require-admin');
const { userService } = require('../services/user.service');

const router = express.Router();

// Get users with search and pagination
router.get(
  '/users',
  // requireAuth,
  requireAdmin,
  [
    query('searchTerm').optional().isString(),
    query('isActive').optional().isBoolean(),
    query('pageNumber').optional().isInt({ min: 1 }),
    query('pageSize').optional().isInt({ min: 1, max: 100 }),
    query('sortBy').optional().isString(),
    query('sortOrder').optional().isIn(['asc', 'desc']),
  ],
  // validateRequest,
  async (req, res) => {
    try {
      const isActive =
        req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;

      const users = await userService.searchUsers({
        searchTerm: req.query.searchTerm || '',
        isActive: isActive,
        pageNumber: parseInt(req.query.pageNumber) || 1,
        pageSize: parseInt(req.query.pageSize) || 10,
        sortBy: req.query.sortBy || 'lastName',
        sortOrder: req.query.sortOrder || 'asc',
      });
      res.json(users);
    } catch (error) {
      console.error('Error in user search:', error);
      res.status(500).json({
        message: 'Failed to fetch users',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// Create new user
router.post('/users', async (req, res) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create user' });
  }
});

// Update user
router.put('/users/:id', async (req, res) => {
  try {
    const user = await userService.updateUser(parseInt(req.params.id), req.body);
    res.json(user);
  } catch (error) {
    if (error.message === 'User not found') {
      res.status(404).json({ message: 'User not found' });
    } else {
      res.status(500).json({ message: 'Failed to update user' });
    }
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    await userService.deleteUser(parseInt(req.params.id));
    res.status(204).send();
  } catch (error) {
    if (error.message === 'User not found') {
      res.status(404).json({ message: 'User not found' });
    } else {
      res.status(500).json({ message: 'Failed to delete user' });
    }
  }
});

exports.router = router;
