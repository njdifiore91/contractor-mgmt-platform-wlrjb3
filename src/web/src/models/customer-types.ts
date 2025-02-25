/**
 * @fileoverview Type definitions for customer-related entities
 * @version 1.0.0
 */

export namespace CustomerTypes {
  export enum Status {
    Active = 'Active',
    Inactive = 'Inactive',
    Pending = 'Pending',
    Suspended = 'Suspended'
  }

  export enum ContractStatus {
    Draft = 'Draft',
    Active = 'Active',
    Terminated = 'Terminated',
    Expired = 'Expired',
    Renewed = 'Renewed'
  }

  export interface Contact {
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

  export interface Contract {
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

  export interface Customer {
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
    status: Status;
    isActive: boolean;
    createdAt: Date;
    modifiedAt: Date | null;
    contacts: Contact[];
    contracts: Contract[];
    location: {
      latitude: number;
      longitude: number;
    };
  }

  export interface ValidationError {
    field: string;
    message: string;
  }
} 