import { db } from '../db';
import type { IUser, IUserRole } from '../models/user.model';
import { UserRoles } from '../models/user.model';

// Dummy user data
const users: IUser[] = [
  {
    id: 1,
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@example.com',
    isActive: true,
    userRoles: [{ id: 1, roleId: UserRoles.Admin, userId: 1 }], // Use UserRoles enum
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
    userRoles: [{ id: 2, roleId: 3, userId: 2 }], // Inspector role
    createdAt: '2024-02-01',
    lastLoginAt: '2024-03-14',
  },
];

export class UserService {
  async searchUsers(params: {
    searchTerm?: string;
    isActive?: boolean;
    pageNumber: number;
    pageSize: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ users: IUser[]; total: number }> {
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

  async createUser(userData: Partial<IUser>): Promise<IUser> {
    const newUser: IUser = {
      id: users.length + 1,
      firstName: userData.firstName!,
      lastName: userData.lastName!,
      email: userData.email!,
      isActive: true,
      userRoles: userData.userRoles || [],
      emailPreferences: userData.emailPreferences || [],
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
    };
    users.push(newUser);
    return newUser;
  }

  async updateUser(id: number, updates: Partial<IUser>): Promise<IUser> {
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) throw new Error('User not found');

    users[index] = { ...users[index], ...updates };
    return users[index];
  }

  async deleteUser(id: number): Promise<void> {
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) throw new Error('User not found');
    users.splice(index, 1);
  }
}

export const userService = new UserService();
