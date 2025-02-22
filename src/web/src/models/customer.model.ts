/**
 * Customer-related data models for the Service Provider Management System
 * @version 1.0.0
 * @module CustomerModels
 */

/**
 * Enumeration of possible customer status values
 */
export enum CustomerStatus {
  Active = 'Active',
  Inactive = 'Inactive',
  Pending = 'Pending',
  Suspended = 'Suspended'
}

/**
 * Enumeration of possible contract status values
 */
export enum ContractStatus {
  Draft = 'Draft',
  Active = 'Active',
  Terminated = 'Terminated',
  Expired = 'Expired',
  Renewed = 'Renewed'
}

/**
 * Interface representing a customer contact
 */
export interface IContact {
  id: number;
  customerId: number;
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  phoneNumber: string;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: Date;
  modifiedAt: Date | null;
  preferredContactMethod: string;
}

/**
 * Interface representing a customer contract
 */
export interface IContract {
  id: number;
  contractNumber: string;
  customerId: number;
  description: string;
  value: number;
  startDate: Date;
  endDate: Date;
  status: ContractStatus;
  isActive: boolean;
  createdAt: Date;
  modifiedAt: Date | null;
  terms: string;
  attachments: Array<{
    id: number;
    name: string;
    url: string;
  }>;
}

/**
 * Interface representing a customer entity
 */
export interface ICustomer {
  id: number;
  code: string;
  name: string;
  industry: string;
  region: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  status: CustomerStatus;
  isActive: boolean;
  createdAt: Date;
  modifiedAt: Date | null;
  contacts: IContact[];
  contracts: IContract[];
  location: {
    latitude: number;
    longitude: number;
  };
}