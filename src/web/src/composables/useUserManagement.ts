import { ref } from 'vue';
import type { IUser } from '@/models/user.model';

interface DummyUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  userRoles: Array<{ roleId: number }>;
  emailPreferences: string[];
  createdAt: Date;
  lastLoginAt: Date | null;
  phoneNumber: string | null;
  azureAdB2CId?: string;
  modifiedAt?: Date | null;
}

// Dummy data for users
const dummyUsers: DummyUser[] = [
  {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    isActive: true,
    userRoles: [{ roleId: 1 }], // Admin
    emailPreferences: ['daily', 'weekly'],
    createdAt: new Date('2024-01-01'),
    lastLoginAt: new Date('2024-03-15'),
    phoneNumber: '+1234567890',
    azureAdB2CId: 'dummy-azure-id-1',
  },
  {
    id: 2,
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    isActive: true,
    userRoles: [{ roleId: 2 }], // Operations
    emailPreferences: ['weekly'],
    createdAt: new Date('2024-01-15'),
    lastLoginAt: new Date('2024-03-14'),
    phoneNumber: '+0987654321',
    azureAdB2CId: 'dummy-azure-id-2',
  },
  {
    id: 3,
    firstName: 'Mike',
    lastName: 'Johnson',
    email: 'mike.johnson@example.com',
    isActive: false,
    userRoles: [{ roleId: 3 }], // Inspector
    emailPreferences: ['monthly'],
    createdAt: new Date('2024-02-01'),
    lastLoginAt: new Date('2024-03-10'),
    phoneNumber: '+1122334455',
    azureAdB2CId: 'dummy-azure-id-3',
  },
];

export function useUserManagement() {
  const users = ref<IUser[]>([]);
  const total = ref<number>(0);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchUsers(params: {
    pageNumber: number;
    pageSize: number;
    searchTerm?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    loading.value = true;
    error.value = null;

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 200));

      let filteredUsers = [...dummyUsers];

      // Apply search term filter
      if (params.searchTerm) {
        const term = params.searchTerm.toLowerCase();
        filteredUsers = filteredUsers.filter(
          (user) =>
            user.firstName.toLowerCase().includes(term) ||
            user.lastName.toLowerCase().includes(term) ||
            user.email.toLowerCase().includes(term)
        );
      }

      // Apply active status filter
      if (typeof params.isActive === 'boolean') {
        filteredUsers = filteredUsers.filter((user) => user.isActive === params.isActive);
      }

      // Calculate pagination
      total.value = filteredUsers.length;
      const start = (params.pageNumber - 1) * params.pageSize;
      const end = start + params.pageSize;

      // Sort users
      const sortField = params.sortBy || 'lastName';
      const sortOrder = params.sortOrder === 'desc' ? -1 : 1;
      filteredUsers.sort((a, b) => {
        const aValue = a[sortField as keyof DummyUser];
        const bValue = b[sortField as keyof DummyUser];
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortOrder * aValue.localeCompare(bValue);
        }
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortOrder * (aValue - bValue);
        }
        return 0;
      });

      // Apply pagination and convert to IUser type
      users.value = filteredUsers.slice(start, end).map((user) => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isActive: user.isActive,
        phoneNumber: user.phoneNumber,
        azureAdB2CId: user.azureAdB2CId || '',
        userRoles: user.userRoles.map((role) => ({
          id: 0, // Dummy value
          userId: user.id,
          roleId: role.roleId,
          assignedAt: new Date(),
          revokedAt: null,
        })),
        createdAt: user.createdAt,
        modifiedAt: user.modifiedAt || null,
        lastLoginAt: user.lastLoginAt,
      }));

      return { users: users.value, total: total.value };
    } catch (err) {
      console.error('Error fetching users:', err);
      error.value = 'Failed to fetch users';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createUser(userData: Partial<IUser>) {
    loading.value = true;
    error.value = null;

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 300));

      const newUser: DummyUser = {
        id: Math.max(...dummyUsers.map((u) => u.id)) + 1,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData.email || '',
        isActive: userData.isActive ?? true,
        userRoles: userData.userRoles?.map((role) => ({ roleId: role.roleId })) || [],
        emailPreferences: [],
        createdAt: new Date(),
        lastLoginAt: null,
        phoneNumber: userData.phoneNumber || null,
        azureAdB2CId: userData.azureAdB2CId || '',
        modifiedAt: null,
      };

      dummyUsers.push(newUser);

      return {
        ...newUser,
        userRoles: newUser.userRoles.map((role) => ({
          id: 0,
          userId: newUser.id,
          roleId: role.roleId,
          assignedAt: new Date(),
          revokedAt: null,
        })),
      } as IUser;
    } catch (err) {
      console.error('Error creating user:', err);
      error.value = 'Failed to create user';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateUser(id: number, updates: Partial<IUser>) {
    loading.value = true;
    error.value = null;

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 300));

      const userIndex = dummyUsers.findIndex((user) => user.id === id);
      if (userIndex === -1) throw new Error('User not found');

      const updatedUser: DummyUser = {
        ...dummyUsers[userIndex],
        firstName: updates.firstName || dummyUsers[userIndex].firstName,
        lastName: updates.lastName || dummyUsers[userIndex].lastName,
        email: updates.email || dummyUsers[userIndex].email,
        isActive: updates.isActive ?? dummyUsers[userIndex].isActive,
        phoneNumber: updates.phoneNumber ?? dummyUsers[userIndex].phoneNumber,
        azureAdB2CId: updates.azureAdB2CId || dummyUsers[userIndex].azureAdB2CId,
        userRoles:
          updates.userRoles?.map((role) => ({ roleId: role.roleId })) ||
          dummyUsers[userIndex].userRoles,
        emailPreferences: dummyUsers[userIndex].emailPreferences,
        createdAt: dummyUsers[userIndex].createdAt,
        lastLoginAt: dummyUsers[userIndex].lastLoginAt,
        modifiedAt: new Date(),
      };

      dummyUsers[userIndex] = updatedUser;

      return {
        ...updatedUser,
        userRoles: updatedUser.userRoles.map((role) => ({
          id: 0,
          userId: updatedUser.id,
          roleId: role.roleId,
          assignedAt: new Date(),
          revokedAt: null,
        })),
      } as IUser;
    } catch (err) {
      console.error('Error updating user:', err);
      error.value = 'Failed to update user';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteUser(id: number) {
    loading.value = true;
    error.value = null;

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 300));

      const userIndex = dummyUsers.findIndex((user) => user.id === id);
      if (userIndex === -1) throw new Error('User not found');

      dummyUsers.splice(userIndex, 1);
    } catch (err) {
      console.error('Error deleting user:', err);
      error.value = 'Failed to delete user';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    users,
    total,
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
  };
}
