/**
 * @fileoverview Pinia store for managing customer-related state and operations.
 * Implements comprehensive customer data management with optimistic updates and enhanced error handling.
 * @version 1.0.0
 */

import { defineStore } from 'pinia';
import { useNotificationStore } from './notification.store';
import customerApi from '../api/customer.api';
import type { ICustomer } from '../models/customer.model';
import { CustomerStatus } from '../models/customer.model';

/**
 * Interface defining the API response structure
 */
interface ApiResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Interface defining pagination metadata
 */
interface PaginationState {
  page: number;
  limit: number;
  total: number;
}

/**
 * Interface defining filter criteria
 */
interface FilterState {
  search: string;
  region: string;
  status: CustomerStatus | null;
}

/**
 * Interface defining sorting criteria
 */
interface SortingState {
  field: string;
  order: 'asc' | 'desc';
}

/**
 * Interface defining the customer store state
 */
interface CustomerState {
  customers: Map<number, ICustomer>;
  loading: boolean;
  error: string | null;
  filters: FilterState;
  pagination: PaginationState;
  sorting: SortingState;
  selectedCustomerId: number | null;
}

/**
 * Pinia store for managing customer state
 */
export const useCustomerStore = defineStore('customer', {
  state: (): CustomerState => ({
    customers: new Map(),
    loading: false,
    error: null,
    selectedCustomerId: null,
    filters: {
      search: '',
      region: '',
      status: null
    },
    pagination: {
      page: 1,
      limit: 10,
      total: 0
    },
    sorting: {
      field: 'name',
      order: 'asc'
    }
  }),

  getters: {
    customerList: (state): ICustomer[] => {
      return Array.from(state.customers.values());
    },

    selectedCustomer: (state): ICustomer | null => {
      if (!state.selectedCustomerId) return null;
      return state.customers.get(state.selectedCustomerId) || null;
    },

    totalPages: (state): number => {
      return Math.ceil(state.pagination.total / state.pagination.limit);
    }
  },

  actions: {
    /**
     * Fetches customers with pagination and filtering support
     */
    async fetchCustomers(): Promise<void> {
      try {
        this.loading = true;
        this.error = null;

        const response = await customerApi.getCustomers({
          page: this.pagination.page,
          limit: this.pagination.limit,
          search: this.filters.search,
          region: this.filters.region,
          status: this.filters.status || undefined,
          sortBy: this.sorting.field,
          sortOrder: this.sorting.order
        });

        // Clear existing customers
        this.customers.clear();

        // Update store with Map-based storage
        if (response.items && Array.isArray(response.items)) {
          response.items.forEach((customer: ICustomer) => {
            this.customers.set(customer.id, customer);
          });
        }

        // Update pagination
        this.pagination.total = response.total || 0;
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to fetch customers';
        useNotificationStore().error(this.error);
      } finally {
        this.loading = false;
      }
    },

    /**
     * Fetches a single customer
     */
    async fetchCustomerById(id: number): Promise<void> {
      try {
        this.loading = true;
        this.error = null;

        const customer = await customerApi.getCustomerById(id);
        this.customers.set(customer.id, customer);
        this.selectedCustomerId = customer.id;
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to fetch customer details';
        useNotificationStore().error(this.error);
      } finally {
        this.loading = false;
      }
    },

    /**
     * Creates a new customer
     */
    async createCustomer(customer: Omit<ICustomer, 'id' | 'createdAt' | 'modifiedAt'>): Promise<void> {
      try {
        this.loading = true;
        this.error = null;

        const createdCustomer = await customerApi.createCustomer(customer);
        this.customers.set(createdCustomer.id, createdCustomer);
        
        useNotificationStore().success('Customer created successfully');
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to create customer';
        useNotificationStore().error(this.error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Updates customer
     */
    async updateCustomer(id: number, updates: Partial<ICustomer>): Promise<void> {
      const previousData = this.customers.get(id);
      if (!previousData) return;

      try {
        this.loading = true;
        this.error = null;

        // Optimistic update
        this.customers.set(id, { ...previousData, ...updates });

        const updatedCustomer = await customerApi.updateCustomer(id, updates);
        this.customers.set(id, updatedCustomer);
        
        useNotificationStore().success('Customer updated successfully');
      } catch (error) {
        // Rollback on error
        if (previousData) {
          this.customers.set(id, previousData);
        }
        this.error = error instanceof Error ? error.message : 'Failed to update customer';
        useNotificationStore().error(this.error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Deletes customer
     */
    async deleteCustomer(id: number): Promise<void> {
      const previousData = this.customers.get(id);
      if (!previousData) return;

      try {
        this.loading = true;
        this.error = null;

        // Optimistic delete
        this.customers.delete(id);

        await customerApi.deleteCustomer(id);
        useNotificationStore().success('Customer deleted successfully');
      } catch (error) {
        // Rollback on error
        if (previousData) {
          this.customers.set(id, previousData);
        }
        this.error = error instanceof Error ? error.message : 'Failed to delete customer';
        useNotificationStore().error(this.error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Updates filter criteria and refreshes data
     */
    async updateFilters(filters: Partial<FilterState>): Promise<void> {
      this.filters = { ...this.filters, ...filters };
      this.pagination.page = 1; // Reset to first page
      await this.fetchCustomers();
    },

    /**
     * Updates sorting criteria and refreshes data
     */
    async updateSorting(field: string, order: 'asc' | 'desc'): Promise<void> {
      this.sorting = { field, order };
      await this.fetchCustomers();
    },

    /**
     * Updates pagination settings and refreshes data
     */
    async updatePagination(page: number, limit?: number): Promise<void> {
      this.pagination.page = page;
      if (limit) this.pagination.limit = limit;
      await this.fetchCustomers();
    },

    /**
     * Resets store state to initial values
     */
    resetState(): void {
      this.customers.clear();
      this.selectedCustomerId = null;
      this.error = null;
      this.loading = false;
      this.filters = {
        search: '',
        region: '',
        status: null
      };
      this.pagination = {
        page: 1,
        limit: 10,
        total: 0
      };
      this.sorting = {
        field: 'name',
        order: 'asc'
      };
    }
  }
});