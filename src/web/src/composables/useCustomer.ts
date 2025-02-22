/**
 * @fileoverview Vue.js composable providing comprehensive customer management functionality
 * with reactive state, computed properties, and enhanced validation.
 * @version 1.0.0
 */

import { ref, computed, watch, onMounted } from 'vue'; // ^3.0.0
import { storeToRefs } from 'pinia'; // ^2.0.0
import { debounce } from 'lodash'; // ^4.17.21
import { useCustomerStore } from '../stores/customer.store';
import { 
  ICustomer, 
  IContact, 
  IContract, 
  CustomerStatus, 
  ValidationError 
} from '../models/customer.model';

/**
 * Interface for search parameters with validation
 */
interface ISearchParams {
  search: string;
  region: string;
  isActive: boolean | null;
  status: CustomerStatus | null;
  page: number;
  limit: number;
}

/**
 * Composable for managing customer-related functionality
 */
export function useCustomer() {
  // Initialize store and extract reactive refs
  const customerStore = useCustomerStore();
  const { 
    customers, 
    selectedCustomer, 
    loading, 
    error, 
    filters, 
    pagination, 
    sorting 
  } = storeToRefs(customerStore);

  // Local reactive state
  const searchParams = ref<ISearchParams>({
    search: '',
    region: '',
    isActive: null,
    status: null,
    page: 1,
    limit: 10
  });

  // Computed properties
  const activeCustomers = computed(() => 
    customers.value.filter(customer => customer.isActive)
  );

  const inactiveCustomers = computed(() => 
    customers.value.filter(customer => !customer.isActive)
  );

  const totalCustomers = computed(() => 
    pagination.value.total
  );

  const customersByRegion = computed(() => {
    const grouped = new Map<string, ICustomer[]>();
    customers.value.forEach(customer => {
      const region = customer.region || 'Unassigned';
      if (!grouped.has(region)) {
        grouped.set(region, []);
      }
      grouped.get(region)?.push(customer);
    });
    return grouped;
  });

  // Validation functions
  const validateCustomer = (customer: Partial<ICustomer>): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (!customer.name?.trim()) {
      errors.push({ field: 'name', message: 'Customer name is required' });
    }

    if (!customer.code?.trim()) {
      errors.push({ field: 'code', message: 'Customer code is required' });
    }

    if (!customer.region?.trim()) {
      errors.push({ field: 'region', message: 'Region is required' });
    }

    return errors;
  };

  // Debounced search function
  const debouncedSearch = debounce(async () => {
    filters.value = { ...filters.value, ...searchParams.value };
    await customerStore.fetchCustomers();
  }, 300);

  // Customer management functions
  const fetchCustomers = async () => {
    try {
      await customerStore.fetchCustomers();
    } catch (err) {
      console.error('Error fetching customers:', err);
      throw err;
    }
  };

  const fetchCustomerById = async (id: number) => {
    try {
      await customerStore.fetchCustomerById(id);
    } catch (err) {
      console.error('Error fetching customer:', err);
      throw err;
    }
  };

  const createCustomer = async (customer: Omit<ICustomer, 'id' | 'createdAt' | 'modifiedAt'>) => {
    const validationErrors = validateCustomer(customer);
    if (validationErrors.length > 0) {
      throw { validationErrors };
    }

    try {
      await customerStore.createCustomer(customer);
    } catch (err) {
      console.error('Error creating customer:', err);
      throw err;
    }
  };

  const updateCustomer = async (id: number, updates: Partial<ICustomer>) => {
    const validationErrors = validateCustomer(updates);
    if (validationErrors.length > 0) {
      throw { validationErrors };
    }

    try {
      await customerStore.updateCustomer(id, updates);
    } catch (err) {
      console.error('Error updating customer:', err);
      throw err;
    }
  };

  const deleteCustomer = async (id: number) => {
    try {
      await customerStore.deleteCustomer(id);
    } catch (err) {
      console.error('Error deleting customer:', err);
      throw err;
    }
  };

  // Contact management functions
  const fetchCustomerContacts = async (customerId: number) => {
    try {
      await customerStore.fetchCustomerById(customerId);
    } catch (err) {
      console.error('Error fetching customer contacts:', err);
      throw err;
    }
  };

  // Contract management functions
  const fetchCustomerContracts = async (customerId: number) => {
    try {
      await customerStore.fetchCustomerById(customerId);
    } catch (err) {
      console.error('Error fetching customer contracts:', err);
      throw err;
    }
  };

  // Watchers
  watch(
    () => searchParams.value,
    () => {
      debouncedSearch();
    },
    { deep: true }
  );

  // Lifecycle hooks
  onMounted(async () => {
    await fetchCustomers();
  });

  // Return composable interface
  return {
    // State
    customers,
    selectedCustomer,
    loading,
    error,
    searchParams,
    totalCustomers,

    // Computed
    activeCustomers,
    inactiveCustomers,
    customersByRegion,

    // Functions
    fetchCustomers,
    fetchCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    fetchCustomerContacts,
    fetchCustomerContracts,
    validateCustomer,
    debouncedSearch,

    // Store actions
    updateFilters: customerStore.updateFilters,
    updateSorting: customerStore.updateSorting,
    updatePagination: customerStore.updatePagination,
    resetState: customerStore.resetState
  };
}