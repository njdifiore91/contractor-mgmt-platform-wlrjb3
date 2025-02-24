import { ref } from 'vue';
import type { IUser } from '@/models/user.model';

export function useUserManagement() {
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchUsers(params: any) {
    loading.value = true;
    try {
      const response = await fetch('/api/v1/users?' + new URLSearchParams(params));
      const data = await response.json();
      return data;
    } catch (err) {
      error.value = 'Failed to fetch users';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createUser(userData: Partial<IUser>) {
    loading.value = true;
    try {
      const response = await fetch('/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      return await response.json();
    } catch (err) {
      error.value = 'Failed to create user';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateUser(id: number, updates: Partial<IUser>) {
    loading.value = true;
    try {
      const response = await fetch(`/api/v1/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      return await response.json();
    } catch (err) {
      error.value = 'Failed to update user';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteUser(id: number) {
    loading.value = true;
    try {
      await fetch(`/api/v1/users/${id}`, { method: 'DELETE' });
    } catch (err) {
      error.value = 'Failed to delete user';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
  };
}
