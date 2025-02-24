const { UserRoles } = require('../models/user.model');

const users = [
  {
    id: 1,
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@example.com',
    isActive: true,
    userRoles: [{ id: 1, roleId: UserRoles.Admin, userId: 1 }],
    emailPreferences: ['notifications', 'reports'],
    createdAt: '2024-01-01',
    lastLoginAt: '2024-03-15',
  },
  {
    id: 2,
    firstName: 'John',
    lastName: 'Inspector',
    email: 'john@example.com',
    isActive: true,
    userRoles: [{ id: 2, roleId: 3, userId: 2 }],
    createdAt: '2024-02-01',
    lastLoginAt: '2024-03-14',
  },
];

class UserService {
  async searchUsers(params) {
    let filteredUsers = [...users];

    if (params.searchTerm) {
      const term = params.searchTerm.toLowerCase();
      filteredUsers = filteredUsers.filter(
        (user) =>
          user.firstName.toLowerCase().includes(term) ||
          user.lastName.toLowerCase().includes(term) ||
          user.email.toLowerCase().includes(term)
      );
    }

    if (typeof params.isActive === 'boolean') {
      filteredUsers = filteredUsers.filter((user) => user.isActive === params.isActive);
    }

    const total = filteredUsers.length;
    const start = (params.pageNumber - 1) * params.pageSize;
    const paginatedUsers = filteredUsers.slice(start, start + params.pageSize);

    return { users: paginatedUsers, total };
  }

  async createUser(userData) {
    const newUser = {
      id: users.length + 1,
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      isActive: true,
      userRoles: userData.userRoles || [],
      emailPreferences: userData.emailPreferences || [],
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
    };
    users.push(newUser);
    return newUser;
  }

  async updateUser(id, updates) {
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) throw new Error('User not found');

    users[index] = { ...users[index], ...updates };
    return users[index];
  }

  async deleteUser(id) {
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) throw new Error('User not found');
    users.splice(index, 1);
  }
}

const userService = new UserService();
module.exports = { userService };
