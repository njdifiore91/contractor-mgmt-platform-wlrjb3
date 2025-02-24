import express from 'express';
import { body, query } from 'express-validator';
import { validateRequest } from '../middleware/validate-request';
import { requireAuth } from '../middleware/require-auth';
import { requireAdmin } from '../middleware/require-admin';
import { userService } from '../services/user.service';

const router = express.Router();

// Get users with search and pagination
router.get('/users', async (req, res) => {
  try {
    const users = await userService.searchUsers({
      searchTerm: req.query.searchTerm,
      isActive: req.query.isActive === 'true',
      pageNumber: parseInt(req.query.pageNumber as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 10,
      sortBy: req.query.sortBy || 'lastName',
      sortOrder: req.query.sortOrder || 'asc',
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

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
    if ((error as Error).message === 'User not found') {
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
    if ((error as Error).message === 'User not found') {
      res.status(404).json({ message: 'User not found' });
    } else {
      res.status(500).json({ message: 'Failed to delete user' });
    }
  }
});

export { router as userRouter };
