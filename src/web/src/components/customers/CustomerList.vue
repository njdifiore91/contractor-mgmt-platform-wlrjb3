<template>
  <div 
    class="customer-list" 
    role="region" 
    aria-label="Customer List"
  >
    <!-- Search and Filter Section -->
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-md-4">
        <SearchBar
          :placeholder="t('customer.search.placeholder')"
          :loading="loading"
          :debounce-time="300"
          @search="handleSearch"
          @clear="handleSearchClear"
        />
      </div>
      <div class="col-12 col-md-8">
        <div class="row q-col-gutter-sm">
          <div class="col-12 col-sm-4">
            <q-select
              v-model="filters.region"
              :options="regionOptions"
              outlined
              dense
              emit-value
              map-options
              :label="t('customer.filters.region')"
              @update:model-value="handleFilterChange"
            />
          </div>
          <div class="col-12 col-sm-4">
            <q-select
              v-model="filters.status"
              :options="statusOptions"
              outlined
              dense
              emit-value
              map-options
              :label="t('customer.filters.status')"
              @update:model-value="handleFilterChange"
            />
          </div>
          <div class="col-12 col-sm-4">
            <q-btn
              color="primary"
              :label="t('customer.actions.add')"
              icon="add"
              no-caps
              @click="handleAddCustomer"
              :aria-label="t('customer.actions.add_aria')"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Customer Data Table -->
    <DataTable
      :columns="columns"
      :data="customerList"
      :loading="loading"
      :pagination.sync="pagination"
      row-key="id"
      :virtual-scroll="true"
      @row-click="handleRowClick"
    >
      <!-- Custom Status Column -->
      <template #body-cell-status="props">
        <q-td :props="props">
          <q-chip
            :color="getStatusColor(props.value)"
            text-color="white"
            dense
            :label="props.value"
          />
        </q-td>
      </template>

      <!-- Custom Actions Column -->
      <template #body-cell-actions="props">
        <q-td :props="props">
          <q-btn-group flat>
            <q-btn
              flat
              round
              color="primary"
              icon="edit"
              :aria-label="t('customer.actions.edit')"
              @click.stop="handleEditCustomer(props.row)"
            />
            <q-btn
              flat
              round
              color="negative"
              icon="delete"
              :aria-label="t('customer.actions.delete')"
              @click.stop="handleDeleteCustomer(props.row)"
            />
          </q-btn-group>
        </q-td>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar'; // v2.0.0
import { useI18n } from 'vue-i18n'; // v9.0.0
import DataTable from '../common/DataTable.vue';
import SearchBar from '../common/SearchBar.vue';
import { useCustomerStore } from '@/stores/customer.store';
import { CustomerStatus, type ICustomer } from '@/models/customer.model';
import { validateRequired } from '@/utils/validation.util';

// Initialize composables
const router = useRouter();
const $q = useQuasar();
const { t } = useI18n();
const customerStore = useCustomerStore();

// Component state
const filters = ref({
  region: '',
  status: null as CustomerStatus | null,
  search: ''
});

const pagination = ref({
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0
});

// Table columns definition
const columns = [
  {
    name: 'code',
    field: 'code',
    label: t('customer.fields.code'),
    align: 'left',
    sortable: true,
    required: true
  },
  {
    name: 'name',
    field: 'name',
    label: t('customer.fields.name'),
    align: 'left',
    sortable: true,
    required: true
  },
  {
    name: 'region',
    field: 'region',
    label: t('customer.fields.region'),
    align: 'left',
    sortable: true
  },
  {
    name: 'status',
    field: 'status',
    label: t('customer.fields.status'),
    align: 'center',
    sortable: true
  },
  {
    name: 'actions',
    field: 'actions',
    label: t('customer.fields.actions'),
    align: 'center',
    required: true
  }
];

// Computed properties
const regionOptions = computed(() => [
  { label: t('customer.regions.all'), value: '' },
  { label: t('customer.regions.north'), value: 'North' },
  { label: t('customer.regions.south'), value: 'South' },
  { label: t('customer.regions.east'), value: 'East' },
  { label: t('customer.regions.west'), value: 'West' }
]);

const statusOptions = computed(() => [
  { label: t('customer.status.all'), value: null },
  { label: t('customer.status.active'), value: CustomerStatus.Active },
  { label: t('customer.status.inactive'), value: CustomerStatus.Inactive },
  { label: t('customer.status.pending'), value: CustomerStatus.Pending }
]);

const customerList = computed(() => customerStore.customerList);
const loading = computed(() => customerStore.loading);

// Event handlers
const handleSearch = async (searchText: string) => {
  try {
    filters.value.search = searchText;
    pagination.value.page = 1;
    await customerStore.updateFilters(filters.value);
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: t('customer.errors.search_failed'),
      position: 'top'
    });
  }
};

const handleSearchClear = async () => {
  filters.value.search = '';
  await customerStore.updateFilters(filters.value);
};

const handleFilterChange = async () => {
  try {
    pagination.value.page = 1;
    await customerStore.updateFilters(filters.value);
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: t('customer.errors.filter_failed'),
      position: 'top'
    });
  }
};

const handleRowClick = async (evt: Event, row: ICustomer) => {
  if (!validateRequired(row.id)) return;
  
  try {
    await router.push({
      name: 'customer-details',
      params: { id: row.id.toString() }
    });
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: t('customer.errors.navigation_failed'),
      position: 'top'
    });
  }
};

const handleAddCustomer = () => {
  router.push({ name: 'customer-create' });
};

const handleEditCustomer = (customer: ICustomer) => {
  router.push({
    name: 'customer-edit',
    params: { id: customer.id.toString() }
  });
};

const handleDeleteCustomer = (customer: ICustomer) => {
  $q.dialog({
    title: t('customer.delete.title'),
    message: t('customer.delete.confirm', { name: customer.name }),
    cancel: true,
    persistent: true,
    ok: {
      color: 'negative',
      label: t('common.delete'),
      'aria-label': t('customer.delete.confirm_aria')
    }
  }).onOk(async () => {
    try {
      await customerStore.deleteCustomer(customer.id);
      $q.notify({
        type: 'positive',
        message: t('customer.delete.success'),
        position: 'top'
      });
    } catch (error) {
      $q.notify({
        type: 'negative',
        message: t('customer.delete.error'),
        position: 'top'
      });
    }
  });
};

const getStatusColor = (status: CustomerStatus): string => {
  const statusColors = {
    [CustomerStatus.Active]: 'positive',
    [CustomerStatus.Inactive]: 'negative',
    [CustomerStatus.Pending]: 'warning',
    [CustomerStatus.Suspended]: 'grey'
  };
  return statusColors[status] || 'grey';
};

// Lifecycle hooks
onMounted(async () => {
  try {
    await customerStore.fetchCustomers();
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: t('customer.errors.load_failed'),
      position: 'top'
    });
  }
});
</script>

<style lang="scss" scoped>
.customer-list {
  padding: $space-md;
  background-color: white;
  border-radius: $border-radius-base;
  box-shadow: $elevation-1;

  :deep(.q-table) {
    // Ensure proper contrast for accessibility
    th {
      font-weight: 500;
      color: var(--q-primary);
    }

    // Focus indicators for keyboard navigation
    tbody tr:focus {
      outline: 2px solid var(--q-primary);
      outline-offset: -2px;
    }
  }

  // Responsive adjustments
  @media (max-width: $breakpoint-sm) {
    padding: $space-sm;

    .q-btn-group {
      flex-direction: column;
    }
  }
}
</style>