const { User, UserRoles } = require('../models/user.model');

class UserService {
  async searchUsers(params) {
    try {
      const query = {};

      if (params.searchTerm) {
        const term = params.searchTerm.toLowerCase();
        query.$or = [
          { firstName: { $regex: term, $options: 'i' } },
          { lastName: { $regex: term, $options: 'i' } },
          { email: { $regex: term, $options: 'i' } },
        ];
      }

      if (typeof params.isActive === 'boolean') {
        query.isActive = params.isActive;
      }

      const total = await User.countDocuments(query);
      const users = await User.find(query)
        .sort({ [params.sortBy || 'lastName']: params.sortOrder === 'desc' ? -1 : 1 })
        .skip((params.pageNumber - 1) * params.pageSize)
        .limit(params.pageSize);

      return { users, total };
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }

  async createUser(userData) {
    try {
      const newUser = new User({
        ...userData,
        isActive: true,
      });
      await newUser.save();
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id, updates) {
    try {
      const user = await User.findByIdAndUpdate(
        id,
        { ...updates },
        { new: true, runValidators: true }
      );
      if (!user) throw new Error('User not found');
      return user;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async deleteUser(id) {
    try {
      const user = await User.findByIdAndDelete(id);
      if (!user) throw new Error('User not found');
      return user;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
}

const userService = new UserService();
module.exports = { userService, UserRoles };
