/**
 * @fileoverview Customer API client module providing comprehensive CRUD operations
 * for customer management with caching, validation, and error handling.
 * @version 1.0.0
 */

import api from '../utils/api.util';
import type { ICustomer } from '../models/customer.model';
import type { IContact } from '../models/customer.model';
import type { IContract } from '../models/customer.model';
import { CustomerStatus } from '../models/customer.model';

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { data: any; timestamp: number }>();

interface CustomerApiResponse {
  items: ICustomer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface CustomerParams {
  page?: number;
  limit?: number;
  search?: string;
  region?: string;
  status?: CustomerStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Retrieves a paginated and filtered list of customers
 * @param params Query parameters for filtering and pagination
 * @returns Promise resolving to customer list with metadata
 */
export const getCustomers = async (params: CustomerParams): Promise<CustomerApiResponse> => {
  const response = await api.get('/v1/customers', { params });
  return response.data;
};

/**
 * Retrieves a single customer by ID
 * @param id Customer ID
 * @returns Promise resolving to customer details
 */
export const getCustomerById = async (id: number): Promise<ICustomer> => {
  const cacheKey = `customer:${id}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const response = await api.get(`/v1/customers/${id}`);
  cache.set(cacheKey, { data: response.data, timestamp: Date.now() });
  return response.data;
};

/**
 * Creates a new customer
 * @param customer Customer data
 * @returns Promise resolving to created customer
 */
export const createCustomer = async (customer: Omit<ICustomer, 'id' | 'createdAt' | 'modifiedAt'>): Promise<ICustomer> => {
  const response = await api.post('/v1/customers', customer);
  invalidateCustomerCache();
  return response.data;
};

/**
 * Updates an existing customer
 * @param id Customer ID
 * @param customer Updated customer data
 * @returns Promise resolving to updated customer
 */
export const updateCustomer = async (id: number, updates: Partial<ICustomer>): Promise<ICustomer> => {
  const response = await api.put(`/v1/customers/${id}`, updates);
  invalidateCustomerCache(id);
  return response.data;
};

/**
 * Deletes a customer (soft delete)
 * @param id Customer ID
 * @returns Promise resolving to void
 */
export const deleteCustomer = async (id: number): Promise<void> => {
  await api.delete(`/v1/customers/${id}`);
  invalidateCustomerCache(id);
};

/**
 * Creates a new contact for a customer
 * @param customerId Customer ID
 * @param contact Contact data
 * @returns Promise resolving to created contact
 */
export const createContact = async (
  customerId: number,
  contact: Omit<IContact, 'id' | 'customerId' | 'createdAt' | 'modifiedAt'>
): Promise<IContact> => {
  const response = await api.post(`/v1/customers/${customerId}/contacts`, contact);
  invalidateCustomerCache(customerId);
  return response.data;
};

/**
 * Updates an existing contact
 * @param customerId Customer ID
 * @param contactId Contact ID
 * @param contact Updated contact data
 * @returns Promise resolving to updated contact
 */
export const updateContact = async (
  customerId: number,
  contactId: number,
  contact: Partial<IContact>
): Promise<IContact> => {
  const response = await api.put(`/v1/customers/${customerId}/contacts/${contactId}`, contact);
  invalidateCustomerCache(customerId);
  return response.data;
};

/**
 * Creates a new contract for a customer
 * @param customerId Customer ID
 * @param contract Contract data
 * @returns Promise resolving to created contract
 */
export const createContract = async (
  customerId: number,
  contract: Omit<IContract, 'id' | 'customerId' | 'createdAt' | 'modifiedAt'>
): Promise<IContract> => {
  const response = await api.post(`/v1/customers/${customerId}/contracts`, contract);
  invalidateCustomerCache(customerId);
  return response.data;
};

/**
 * Updates an existing contract
 * @param customerId Customer ID
 * @param contractId Contract ID
 * @param contract Updated contract data
 * @returns Promise resolving to updated contract
 */
export const updateContract = async (
  customerId: number,
  contractId: number,
  contract: Partial<IContract>
): Promise<IContract> => {
  const response = await api.put(`/v1/customers/${customerId}/contracts/${contractId}`, contract);
  invalidateCustomerCache(customerId);
  return response.data;
};

/**
 * Updates customer status
 * @param id Customer ID
 * @param status New status
 * @returns Promise resolving to updated customer
 */
export const updateCustomerStatus = async (id: number, status: CustomerStatus): Promise<ICustomer> => {
  const response = await api.put(`/v1/customers/${id}/status`, { status });
  invalidateCustomerCache(id);
  return response.data;
};

/**
 * Invalidates customer-related cache entries
 * @param customerId Optional specific customer ID to invalidate
 */
const invalidateCustomerCache = (customerId?: number): void => {
  if (customerId) {
    cache.delete(`customer:${customerId}`);
  }
  // Invalidate list cache entries
  for (const key of cache.keys()) {
    if (key.startsWith('customers:')) {
      cache.delete(key);
    }
  }
};

export default {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  createContact,
  updateContact,
  createContract,
  updateContract,
  updateCustomerStatus
};