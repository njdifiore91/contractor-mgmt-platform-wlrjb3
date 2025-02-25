// Dummy data for users
const dummyUsers = [
  {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'U2FsdGVkX1+8AwzBBqyqOtqh5cg4tgGRQPgGqAzK8Xw=', // Encrypted "john.doe@example.com"
    isActive: true,
    userRoles: [{ roleId: 1 }], // Admin
    emailPreferences: ['daily', 'weekly'],
    createdAt: new Date('2024-01-01'),
    lastLoginAt: new Date('2024-03-15'),
  },
  {
    id: 2,
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'U2FsdGVkX1+9BxzCCrzrPurh6dh5uhHSRQqHrBzL9Yw=', // Encrypted "jane.smith@example.com"
    isActive: true,
    userRoles: [{ roleId: 2 }], // Operations
    emailPreferences: ['weekly'],
    createdAt: new Date('2024-01-15'),
    lastLoginAt: new Date('2024-03-14'),
  },
  {
    id: 3,
    firstName: 'Mike',
    lastName: 'Johnson',
    email: 'U2FsdGVkX1+7CyzAArxsPtqi4ch3thFQQPfFpAyJ7Xv=', // Encrypted "mike.johnson@example.com"
    isActive: false,
    userRoles: [{ roleId: 3 }], // Inspector
    emailPreferences: ['monthly'],
    createdAt: new Date('2024-02-01'),
    lastLoginAt: new Date('2024-03-10'),
  },
];

const UserRoles = {
  Admin: 1,
  Operations: 2,
  Inspector: 3,
  CustomerService: 4,
};

class UserService {
  async searchUsers(params) {
    try {
      let filteredUsers = [...dummyUsers];

      // Apply search term filter
      if (params.searchTerm) {
        const term = params.searchTerm.toLowerCase();
        filteredUsers = filteredUsers.filter(
          (user) =>
            user.firstName.toLowerCase().includes(term) ||
            user.lastName.toLowerCase().includes(term)
        );
      }

      // Apply active status filter
      if (typeof params.isActive === 'boolean') {
        filteredUsers = filteredUsers.filter((user) => user.isActive === params.isActive);
      }

      // Calculate pagination
      const total = filteredUsers.length;
      const start = (params.pageNumber - 1) * params.pageSize;
      const end = start + params.pageSize;

      // Sort users
      const sortField = params.sortBy || 'lastName';
      const sortOrder = params.sortOrder === 'desc' ? -1 : 1;
      filteredUsers.sort((a, b) => {
        return sortOrder * a[sortField].localeCompare(b[sortField]);
      });

      // Apply pagination
      const users = filteredUsers.slice(start, end);

      return { users, total };
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }

  async createUser(userData) {
    try {
      const newUser = {
        ...userData,
        id: dummyUsers.length + 1,
        isActive: true,
        createdAt: new Date(),
        lastLoginAt: null,
      };
      dummyUsers.push(newUser);
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id, updates) {
    try {
      const userIndex = dummyUsers.findIndex((user) => user.id === parseInt(id));
      if (userIndex === -1) throw new Error('User not found');

      dummyUsers[userIndex] = {
        ...dummyUsers[userIndex],
        ...updates,
      };
      return dummyUsers[userIndex];
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async deleteUser(id) {
    try {
      const userIndex = dummyUsers.findIndex((user) => user.id === parseInt(id));
      if (userIndex === -1) throw new Error('User not found');

      const deletedUser = dummyUsers[userIndex];
      dummyUsers.splice(userIndex, 1);
      return deletedUser;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
}

const userService = new UserService();
module.exports = { userService, UserRoles };
