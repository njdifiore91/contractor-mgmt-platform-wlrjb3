<template>
  <div class="user-management">
    <div class="row q-pa-md">
      <div class="col-12">
        <h1 class="text-h4 q-mb-md">User Management</h1>

        <!-- Search and Filter -->
        <div class="row q-mb-md">
          <div class="col-12 col-md-4">
            <q-input
              v-model="searchTerm"
              outlined
              dense
              placeholder="Search users..."
              @update:model-value="handleSearch"
            >
              <template #append>
                <q-icon name="search" />
              </template>
            </q-input>
          </div>
          <div class="col-12 col-md-8 row justify-end items-center">
            <q-btn
              color="primary"
              icon="add"
              label="Add User"
              @click="showAddUserDialog = true"
            />
          </div>
        </div>

        <!-- Users Table -->
        <q-table
          :rows="users"
          :columns="columns"
          row-key="id"
          :loading="loading"
          :pagination="pagination"
          @update:pagination="handlePaginationChange"
        >
          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn-group flat>
                <q-btn
                  flat
                  round
                  color="primary"
                  icon="edit"
                  @click="handleEditUser(props.row)"
                >
                  <q-tooltip>Edit User</q-tooltip>
                </q-btn>
                <q-btn
                  flat
                  round
                  color="negative"
                  icon="delete"
                  @click="handleDeleteUser(props.row)"
                >
                  <q-tooltip>Delete User</q-tooltip>
                </q-btn>
              </q-btn-group>
            </q-td>
          </template>
        </q-table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { IUser, UserRole } from '@/models/user.model';

const searchTerm = ref('');
const loading = ref(false);
const showAddUserDialog = ref(false);
const users = ref<IUser[]>([]);

const columns = [
  {
    name: 'firstName',
    required: true,
    label: 'First Name',
    align: 'left',
    field: 'firstName',
    sortable: true
  },
  {
    name: 'lastName',
    required: true,
    label: 'Last Name',
    align: 'left',
    field: 'lastName',
    sortable: true
  },
  {
    name: 'email',
    required: true,
    label: 'Email',
    align: 'left',
    field: 'email',
    sortable: true
  },
  {
    name: 'roles',
    required: true,
    label: 'Roles',
    align: 'left',
    field: (row: IUser) => row.userRoles.map(r => r.roleId).join(', ')
  },
  {
    name: 'actions',
    required: true,
    label: 'Actions',
    align: 'center'
  }
];

const pagination = ref({
  sortBy: 'lastName',
  descending: false,
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0
});

const handleSearch = () => {
  // Implement search logic
};

const handlePaginationChange = (newPagination: any) => {
  pagination.value = newPagination;
  // Implement pagination logic
};

const handleEditUser = (user: IUser) => {
  // Implement edit logic
};

const handleDeleteUser = (user: IUser) => {
  // Implement delete logic
};
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