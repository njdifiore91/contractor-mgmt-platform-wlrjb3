<template>
  <div class="user-management">
    <div class="row q-pa-md">
      <div class="col-12">
        <div class="row items-center justify-between q-mb-md">
          <h1 class="text-h4 q-my-none">User Management</h1>
          <q-btn color="primary" icon="add" label="New User" @click="openUserDialog()" />
        </div>

        <!-- Search and Filters -->
        <div class="row q-col-gutter-md q-mb-md">
          <div class="col-12 col-md-4">
            <q-input
              v-if="filters.searchEnabled"
              v-model="filters.searchTerm"
              dense
              outlined
              placeholder="Search users..."
              @update:model-value="handleSearch"
            >
              <template #append>
                <q-icon name="search" />
              </template>
            </q-input>
          </div>
          <div class="col-12 col-md-4">
            <q-select
              v-model="filters.status"
              :options="[
                // { label: 'All Users', value: null },
                { label: 'Active', value: true },
                { label: 'Inactive', value: false },
              ]"
              dense
              outlined
              label="Status"
              emit-value
              map-options
              @update:model-value="handleSearch"
            />
          </div>
        </div>

        <!-- Users Table -->
        <q-table
          :rows="users"
          :columns="columns"
          :loading="loading"
          :pagination="pagination"
          row-key="id"
          @request="handleSearch"
        >
          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn-group flat>
                <q-btn flat round color="primary" icon="edit" @click="openUserDialog(props.row)">
                  <q-tooltip>Edit User</q-tooltip>
                </q-btn>
                <q-btn flat round color="negative" icon="delete" @click="confirmDelete(props.row)">
                  <q-tooltip>Delete User</q-tooltip>
                </q-btn>
              </q-btn-group>
            </q-td>
          </template>
        </q-table>
      </div>
    </div>

    <!-- User Dialog -->
    <q-dialog v-model="userDialog" persistent>
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">{{ editingUser ? 'Edit User' : 'New User' }}</div>
        </q-card-section>

        <q-card-section>
          <q-form @submit="saveUser">
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-6">
                <q-input
                  v-model="userForm.firstName"
                  label="First Name"
                  :rules="[(val) => !!val || 'First name is required']"
                />
              </div>
              <div class="col-12 col-md-6">
                <q-input
                  v-model="userForm.lastName"
                  label="Last Name"
                  :rules="[(val) => !!val || 'Last name is required']"
                />
              </div>
              <div class="col-12">
                <q-input
                  v-model="userForm.email"
                  label="Email"
                  type="email"
                  :rules="[
                    (val) => !!val || 'Email is required',
                    (val) => /^[^@]+@[^@]+\.[^@]+$/.test(val) || 'Invalid email',
                  ]"
                />
              </div>
              <div class="col-12">
                <q-select
                  v-model="userForm.roles"
                  :options="roleOptions.map((role) => role.name)"
                  label="Roles"
                  multiple
                  :rules="[(val) => val.length > 0 || 'At least one role is required']"
                />
              </div>
            </div>
          </q-form>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" v-close-popup />
          <q-btn flat label="Save" color="primary" @click="saveUser" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, computed, onMounted, watch } from 'vue';
  import { useQuasar } from 'quasar';
  import type { IUser, UserRole } from '@/models/user.model';
  import { getRoleType, UserRoleType } from '@/models/user.model';
  import { debounce } from 'lodash';
  import { useEncryption } from '@/composables/useEncryption';
  import { auditService } from '@/services/audit.service';
  import { useUserStore } from '@/stores/user.store';

  const $q = useQuasar();
  const userStore = useUserStore();
  const { decrypt } = useEncryption();

  const userDialog = ref(false);
  const editingUser = ref<IUser | null>(null);

  const columns = [
    { name: 'firstName', label: 'First Name', field: 'firstName', sortable: true },
    { name: 'lastName', label: 'Last Name', field: 'lastName', sortable: true },
    {
      name: 'email',
      label: 'Email',
      field: (row: any) => {
        try {
          const decrypted = decrypt(row.email) || row.email;
          return decrypted;
        } catch (error) {
          console.warn('Failed to decrypt email:', error);
          return row.email;
        }
      },
      sortable: true,
    },
    {
      name: 'roles',
      label: 'Roles',
      field: (row: any) => row.userRoles?.map((r: any) => r.roles).join(', ') || '',
    },
    { name: 'status', label: 'Status', field: 'isActive' },
    { name: 'actions', label: 'Actions', field: 'actions' },
  ];

  const pagination = reactive({
    page: 1,
    rowsPerPage: 20,
    rowsNumber: 0,
  });

  const filters = reactive({
    searchTerm: '',
    status: null,
    searchEnabled: false,
  });

  const roleOptions = [
    { id: UserRoleType.Admin, name: 'Admin' },
    { id: UserRoleType.Operations, name: 'Operations' },
    { id: UserRoleType.Inspector, name: 'Inspector' },
    { id: UserRoleType.CustomerService, name: 'Customer Service' },
  ];

  interface UserFormData {
    firstName: string;
    lastName: string;
    email: string;
    roles: number[];
  }

  const userForm = ref<UserFormData>({
    firstName: '',
    lastName: '',
    email: '',
    roles: [],
  });

  const handleSearch = async () => {
    try {
      const searchParams = {
        ...(filters.searchEnabled ? { searchTerm: filters.searchTerm } : {}),
        isActive: filters.status ?? undefined,
        pageNumber: pagination.page,
        pageSize: pagination.rowsPerPage,
        sortBy: 'lastName',
        sortOrder: 'asc' as const,
      };

      await userStore.fetchUsers(searchParams);
      pagination.rowsNumber = userStore.total;
    } catch (error) {
      $q.notify({
        type: 'negative',
        message: 'Failed to search users',
        position: 'top',
      });
    }
  };

  const handlePaginationChange = async (newPagination: any) => {
    pagination.page = newPagination.page;
    pagination.rowsPerPage = newPagination.rowsPerPage;
    await handleSearch();
  };

  const openUserDialog = (user?: IUser) => {
    editingUser.value = user || null;
    userForm.value = {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      roles: user?.userRoles.map((role) => role.roleId) || [],
    };
    userDialog.value = true;
  };

  const validateUserData = (data: any) => {
    return data.firstName && data.lastName && data.email && data.roles.length > 0;
  };

  const saveUser = async () => {
    try {
      if (!validateUserData(userForm.value)) {
        throw new Error('Please fill in all required fields');
      }

      if (editingUser.value) {
        await userStore.updateExistingUser(editingUser.value.id, userForm.value);
        // Log user update action
        await auditService.logAction('USER', editingUser.value.id.toString(), 'update', {
          changes: userForm.value,
          previousState: editingUser.value,
        });
        $q.notify({
          type: 'positive',
          message: 'User updated successfully',
          position: 'top',
        });
      } else {
        const newUser = await userStore.createNewUser(userForm.value);
        // Log user creation action
        await auditService.logAction('USER', newUser.id.toString(), 'create', {
          userData: userForm.value,
        });
        $q.notify({
          type: 'positive',
          message: 'User created successfully',
          position: 'top',
        });
      }

      userDialog.value = false;
      await handleSearch();
    } catch (error: any) {
      $q.notify({
        type: 'negative',
        message: error.message || 'Failed to save user',
        position: 'top',
      });
    }
  };

  const confirmDelete = (user: IUser) => {
    $q.dialog({
      title: 'Confirm Delete',
      message: `Are you sure you want to delete ${user.firstName} ${user.lastName}?`,
      persistent: true,
      ok: {
        color: 'negative',
        label: 'Delete',
        icon: 'delete',
      },
      cancel: {
        color: 'grey',
        flat: true,
      },
    }).onOk(async () => {
      try {
        // Store user data for audit log before deletion
        const userData = {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          roles: user.userRoles,
        };

        // Call the delete API endpoint
        await userStore.removeUser(user.id);

        // Log the deletion action
        await auditService.logAction('USER', user.id.toString(), 'delete', {
          deletedUser: userData,
          performedBy: 'admin@example.com', // In real app, this would be the current user
          timestamp: new Date().toISOString(),
        });

        // Refresh the user list
        await handleSearch();

        $q.notify({
          type: 'positive',
          message: 'User deleted successfully',
          position: 'top',
          timeout: 2000,
        });
      } catch (error) {
        console.error('Failed to delete user:', error);
        $q.notify({
          type: 'negative',
          message: 'Failed to delete user',
          position: 'top',
          timeout: 2000,
        });
      }
    });
  };

  onMounted(async () => {
    try {
      await handleSearch();
    } catch (error) {
      console.error('Error fetching users:', error);
      $q.notify({
        type: 'negative',
        message: 'Failed to load users',
        position: 'top',
      });
    }
  });

  watch(
    [filters.searchTerm, filters.status],
    debounce(() => {
      handleSearch();
    }, 300)
  );

  // Computed properties for template
  const users = computed(() => userStore.users);
  const loading = computed(() => userStore.loading);
  const error = computed(() => userStore.error);
</script>

<style lang="scss" scoped>
  .user-management {
    .q-table {
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
  }
</style>
