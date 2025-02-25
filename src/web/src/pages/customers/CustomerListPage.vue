<template>
  <q-page 
    class="customer-list-page"
    role="main"
    aria-label="Customer List Page"
  >
    <!-- Page Header -->
    <div class="customer-list-page__header">
      <h1 class="text-h5 q-my-none" role="heading" aria-level="1">
        Customer Management
      </h1>
      <div class="customer-list-page__actions">
        <q-btn
          v-if="hasCreatePermission"
          color="primary"
          icon="add"
          label="New Customer"
          no-caps
          :loading="loading"
          @click="handleCreateCustomer"
          aria-label="Create new customer"
        />
        <q-btn
          color="secondary"
          icon="download"
          label="Export"
          no-caps
          :loading="loading"
          @click="handleExport"
          aria-label="Export customer list"
          class="q-ml-sm"
        />
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="customer-list-page__content">
      <div class="row q-col-gutter-md">
        <!-- Filter Panel -->
        <div class="col-12 col-md-3">
          <FilterPanel
            filter-type="customer"
            :initial-filters="initialFilters"
            @filter="handleFilterChange"
            @reset="handleFilterReset"
          />
        </div>

        <!-- Customer List -->
        <div class="col-12 col-md-9">
          <CustomerList
            :loading="loading"
            @row-click="handleCustomerSelect"
            @search="handleSearch"
            @sort="handleSort"
            @create-customer="handleCreateCustomer"
          />
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <q-inner-loading :showing="loading">
      <q-spinner
        size="50px"
        color="primary"
        :thickness="5"
        aria-label="Loading customers"
      />
    </q-inner-loading>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'; // v3.0.0
import { useRouter, useRoute } from 'vue-router'; // v4.0.0
import { QPage, QBtn, QSpinner, useQuasar } from 'quasar'; // v2.0.0
import debounce from 'lodash/debounce'; // v4.17.21

// Internal imports
import CustomerList from '../../components/customers/CustomerList.vue';
import FilterPanel from '../../components/common/FilterPanel.vue';
import { useCustomerStore } from '../../stores/customer.store';
import { CustomerStatus } from '../../models/customer.model';

// Router and store setup
const router = useRouter();
const route = useRoute();
const $q = useQuasar();
const customerStore = useCustomerStore();

// Component state
const loading = computed(() => customerStore.loading);
const hasCreatePermission = computed(() => ['admin', 'operations'].includes(route.meta?.role as string));

const initialFilters = ref({
  region: route.query.region || '',
  status: route.query.status || null,
  search: route.query.search || ''
});

// Event handlers
const handleSearch = debounce(async (searchText: string) => {
  try {
    await customerStore.updateFilters({ search: searchText });
    updateRouteQuery({ search: searchText });
  } catch (error) {
    handleError('Search failed', error);
  }
}, 300);

const handleFilterChange = async (filters: Record<string, any>) => {
  try {
    await customerStore.updateFilters(filters);
    updateRouteQuery(filters);
  } catch (error) {
    handleError('Filter update failed', error);
  }
};

const handleFilterReset = async () => {
  try {
    await customerStore.updateFilters({
      search: '',
      region: '',
      status: null
    });
    router.replace({ query: {} });
  } catch (error) {
    handleError('Filter reset failed', error);
  }
};

const handleSort = async (field: string, order: 'asc' | 'desc') => {
  try {
    await customerStore.updateSorting(field, order);
  } catch (error) {
    handleError('Sorting failed', error);
  }
};

const handleCustomerSelect = async (customerId: number) => {
  try {
    await router.push({
      name: 'customer-details',
      params: { id: customerId.toString() }
    });
  } catch (error) {
    handleError('Navigation failed', error);
  }
};

const handleCreateCustomer = () => {
  router.push({ name: 'customers-create' });
};

const handleExport = async () => {
  try {
    await customerStore.exportCustomers();
    $q.notify({
      type: 'positive',
      message: 'Customer list exported successfully',
      position: 'top'
    });
  } catch (error) {
    handleError('Export failed', error);
  }
};

// Error handling
const handleError = (message: string, error: any) => {
  console.error(message, error);
  $q.notify({
    type: 'negative',
    message: `${message}. Please try again.`,
    position: 'top'
  });
};

// Route query management
const updateRouteQuery = (query: Record<string, any>) => {
  router.replace({
    query: {
      ...route.query,
      ...query
    }
  });
};

// Lifecycle hooks
onMounted(async () => {
  try {
    await customerStore.fetchCustomers();
  } catch (error) {
    handleError('Failed to load customers', error);
  }
});

onUnmounted(() => {
  handleSearch.cancel();
});

// Watch route changes
watch(
  () => route.query,
  async (newQuery) => {
    try {
      await customerStore.updateFilters({
        search: newQuery.search || '',
        region: newQuery.region || '',
        status: newQuery.status || null
      });
    } catch (error) {
      handleError('Failed to update filters from URL', error);
    }
  },
  { immediate: true }
);
</script>

<style lang="scss" scoped>
@import '@/assets/styles/variables.scss';

.customer-list-page {
  padding: $space-lg;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: $space-md;
  background-color: var(--q-page-background);

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: $space-md;
    margin-bottom: $space-lg;
    background-color: var(--q-primary);
    padding: $space-md;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(25, 118, 210, 0.15);

    h1 {
      color: white;
      margin: 0;
    }

    @media (max-width: $breakpoint-sm) {
      flex-direction: column;
      align-items: stretch;
    }
  }

  &__actions {
    display: flex;
    gap: $space-sm;
    flex-wrap: wrap;

    .q-btn {
      background: white;
      color: var(--q-primary);
      
      &:hover {
        background: rgba(255, 255, 255, 0.9);
      }
    }

    @media (max-width: $breakpoint-xs) {
      width: 100%;
      
      .q-btn {
        flex: 1;
      }
    }
  }

  &__content {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }

  // High contrast mode support
  @media (forced-colors: active) {
    border: 1px solid ButtonText;
    
    .q-btn {
      border: 1px solid ButtonText;
    }
  }

  // Focus indicators for accessibility
  :deep(.q-btn:focus-visible) {
    outline: 2px solid var(--q-primary);
    outline-offset: 2px;
  }
}
</style>