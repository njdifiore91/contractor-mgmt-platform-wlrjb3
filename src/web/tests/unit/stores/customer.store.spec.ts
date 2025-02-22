import { describe, it, expect, beforeEach, vi } from 'vitest'; // ^0.34.0
import { setActivePinia, createPinia } from 'pinia'; // ^2.1.0
import { useCustomerStore } from '../../src/stores/customer.store';
import { ICustomer, CustomerStatus } from '../../src/models/customer.model';
import customerApi from '../../src/api/customer.api';

// Mock the customer API
vi.mock('../../src/api/customer.api');

// Mock the notification store
vi.mock('../../src/stores/notification.store', () => ({
  useNotificationStore: () => ({
    success: vi.fn(),
    error: vi.fn()
  })
}));

describe('CustomerStore', () => {
  let store: ReturnType<typeof useCustomerStore>;

  const mockCustomer: ICustomer = {
    id: 1,
    code: 'CUST-001',
    name: 'Test Customer',
    industry: 'Energy',
    region: 'North',
    address: '123 Test St',
    city: 'Test City',
    state: 'TX',
    postalCode: '12345',
    country: 'USA',
    status: CustomerStatus.Active,
    isActive: true,
    createdAt: new Date(),
    modifiedAt: null,
    contacts: [],
    contracts: [],
    location: {
      latitude: 0,
      longitude: 0
    }
  };

  const mockPaginatedResponse = {
    data: [mockCustomer],
    total: 1,
    cached: false
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useCustomerStore();
    
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup API mock implementations
    vi.mocked(customerApi.getCustomers).mockResolvedValue(mockPaginatedResponse);
    vi.mocked(customerApi.getCustomerById).mockResolvedValue(mockCustomer);
    vi.mocked(customerApi.createCustomer).mockResolvedValue(mockCustomer);
    vi.mocked(customerApi.updateCustomer).mockResolvedValue(mockCustomer);
    vi.mocked(customerApi.deleteCustomer).mockResolvedValue();
  });

  describe('initial state', () => {
    it('should have empty customers map', () => {
      expect(store.customers.size).toBe(0);
    });

    it('should have default pagination values', () => {
      expect(store.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 0
      });
    });

    it('should have default filter values', () => {
      expect(store.filters).toEqual({
        search: '',
        region: '',
        isActive: null,
        status: null
      });
    });

    it('should have default sorting values', () => {
      expect(store.sorting).toEqual({
        field: 'name',
        order: 'asc'
      });
    });
  });

  describe('fetchCustomers', () => {
    it('should fetch customers with correct parameters', async () => {
      await store.fetchCustomers();

      expect(customerApi.getCustomers).toHaveBeenCalledWith({
        page: store.pagination.page,
        limit: store.pagination.limit,
        search: store.filters.search,
        region: store.filters.region,
        isActive: store.filters.isActive,
        sortBy: store.sorting.field,
        sortOrder: store.sorting.order
      });
    });

    it('should update store state with fetched customers', async () => {
      await store.fetchCustomers();

      expect(store.customers.get(mockCustomer.id)).toEqual(mockCustomer);
      expect(store.pagination.total).toBe(mockPaginatedResponse.total);
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      vi.mocked(customerApi.getCustomers).mockRejectedValue(error);

      await expect(store.fetchCustomers()).rejects.toThrow();
      expect(store.error).toBe(error.message);
    });

    it('should manage loading state correctly', async () => {
      const fetchPromise = store.fetchCustomers();
      expect(store.loading).toBe(true);
      
      await fetchPromise;
      expect(store.loading).toBe(false);
    });
  });

  describe('fetchCustomerById', () => {
    it('should return cached customer if available', async () => {
      store.customers.set(mockCustomer.id, mockCustomer);
      await store.fetchCustomerById(mockCustomer.id);

      expect(customerApi.getCustomerById).not.toHaveBeenCalled();
    });

    it('should fetch customer from API if not cached', async () => {
      await store.fetchCustomerById(mockCustomer.id);

      expect(customerApi.getCustomerById).toHaveBeenCalledWith(mockCustomer.id);
      expect(store.customers.get(mockCustomer.id)).toEqual(mockCustomer);
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      vi.mocked(customerApi.getCustomerById).mockRejectedValue(error);

      await expect(store.fetchCustomerById(1)).rejects.toThrow();
      expect(store.error).toBe(error.message);
    });
  });

  describe('createCustomer', () => {
    const newCustomer = {
      name: 'New Customer',
      code: 'CUST-002',
      industry: 'Technology',
      region: 'South',
      status: CustomerStatus.Active,
      isActive: true
    };

    it('should create customer and update store', async () => {
      await store.createCustomer(newCustomer);

      expect(customerApi.createCustomer).toHaveBeenCalledWith(newCustomer);
      expect(store.customers.get(mockCustomer.id)).toEqual(mockCustomer);
    });

    it('should handle validation errors', async () => {
      const error = new Error('Validation Error');
      vi.mocked(customerApi.createCustomer).mockRejectedValue(error);

      await expect(store.createCustomer(newCustomer)).rejects.toThrow();
      expect(store.error).toBe(error.message);
    });
  });

  describe('updateCustomer', () => {
    const updates = {
      name: 'Updated Customer',
      status: CustomerStatus.Inactive
    };

    it('should implement optimistic updates', async () => {
      store.customers.set(mockCustomer.id, mockCustomer);
      const updatePromise = store.updateCustomer(mockCustomer.id, updates);

      // Check optimistic update
      expect(store.customers.get(mockCustomer.id)).toEqual({
        ...mockCustomer,
        ...updates
      });

      await updatePromise;
    });

    it('should rollback on API error', async () => {
      store.customers.set(mockCustomer.id, mockCustomer);
      const error = new Error('API Error');
      vi.mocked(customerApi.updateCustomer).mockRejectedValue(error);

      await expect(store.updateCustomer(mockCustomer.id, updates)).rejects.toThrow();
      expect(store.customers.get(mockCustomer.id)).toEqual(mockCustomer);
    });
  });

  describe('deleteCustomer', () => {
    it('should implement optimistic deletion', async () => {
      store.customers.set(mockCustomer.id, mockCustomer);
      const deletePromise = store.deleteCustomer(mockCustomer.id);

      // Check optimistic deletion
      expect(store.customers.has(mockCustomer.id)).toBe(false);

      await deletePromise;
      expect(customerApi.deleteCustomer).toHaveBeenCalledWith(mockCustomer.id);
    });

    it('should rollback on API error', async () => {
      store.customers.set(mockCustomer.id, mockCustomer);
      const error = new Error('API Error');
      vi.mocked(customerApi.deleteCustomer).mockRejectedValue(error);

      await expect(store.deleteCustomer(mockCustomer.id)).rejects.toThrow();
      expect(store.customers.get(mockCustomer.id)).toEqual(mockCustomer);
    });
  });

  describe('filters and pagination', () => {
    it('should update filters and refresh data', async () => {
      const newFilters = {
        search: 'test',
        region: 'North'
      };

      await store.updateFilters(newFilters);

      expect(store.filters).toEqual({
        ...store.filters,
        ...newFilters
      });
      expect(store.pagination.page).toBe(1);
      expect(customerApi.getCustomers).toHaveBeenCalled();
    });

    it('should update pagination and refresh data', async () => {
      await store.updatePagination(2, 20);

      expect(store.pagination.page).toBe(2);
      expect(store.pagination.limit).toBe(20);
      expect(customerApi.getCustomers).toHaveBeenCalled();
    });

    it('should update sorting and refresh data', async () => {
      await store.updateSorting('code', 'desc');

      expect(store.sorting).toEqual({
        field: 'code',
        order: 'desc'
      });
      expect(customerApi.getCustomers).toHaveBeenCalled();
    });
  });

  describe('getters', () => {
    it('should return filtered and sorted customer list', () => {
      store.customers.set(mockCustomer.id, mockCustomer);
      store.customers.set(2, {
        ...mockCustomer,
        id: 2,
        name: 'Another Customer',
        region: 'South'
      });

      store.filters.region = 'North';
      const filtered = store.customerList;

      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe(mockCustomer.id);
    });

    it('should calculate total pages correctly', () => {
      store.pagination.total = 25;
      store.pagination.limit = 10;

      expect(store.totalPages).toBe(3);
    });
  });

  describe('state reset', () => {
    it('should reset store state to initial values', () => {
      store.customers.set(mockCustomer.id, mockCustomer);
      store.filters.search = 'test';
      store.pagination.page = 2;

      store.resetState();

      expect(store.customers.size).toBe(0);
      expect(store.filters.search).toBe('');
      expect(store.pagination.page).toBe(1);
      expect(store.error).toBeNull();
    });
  });
});