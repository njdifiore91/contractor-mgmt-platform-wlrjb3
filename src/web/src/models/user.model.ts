/**
 * @fileoverview TypeScript model definitions for user-related entities in the frontend application.
 * Supports role-based access control, Azure AD B2C integration, and comprehensive user management.
 * @version 1.0.0
 */

/**
 * Represents a user in the system with full Azure AD B2C integration support
 * and audit tracking capabilities.
 */
export interface IUser {
    /** Unique identifier for the user */
    id: number;
    
    /** User's email address, used as unique login identifier */
    email: string;
    
    /** User's first name */
    firstName: string;
    
    /** User's last name */
    lastName: string;
    
    /** Optional phone number for user contact */
    phoneNumber: string | null;
    
    /** Indicates if the user account is currently active */
    isActive: boolean;
    
    /** Azure AD B2C unique identifier for SSO integration */
    azureAdB2CId: string;
    
    /** Collection of roles assigned to the user */
    userRoles: IUserRole[];
    
    /** Timestamp of user account creation */
    createdAt: Date;
    
    /** Timestamp of last user account modification */
    modifiedAt: Date | null;
    
    /** Timestamp of user's last successful login */
    lastLoginAt: Date | null;
}

/**
 * Represents a role definition in the system with audit tracking support.
 */
export interface IRole {
    /** Unique identifier for the role */
    id: number;
    
    /** Name of the role */
    name: string;
    
    /** Detailed description of the role's purpose and permissions */
    description: string;
    
    /** Indicates if the role is currently active in the system */
    isActive: boolean;
    
    /** Timestamp of role creation */
    createdAt: Date;
    
    /** Timestamp of last role modification */
    modifiedAt: Date | null;
}

/**
 * Represents the relationship between users and roles with temporal tracking
 * for role assignments and revocations.
 */
export interface IUserRole {
    /** Unique identifier for the user-role relationship */
    id: number;
    
    /** Reference to the user */
    userId: number;
    
    /** Reference to the role */
    roleId: number;
    
    /** Timestamp when the role was assigned to the user */
    assignedAt: Date;
    
    /** Timestamp when the role was revoked from the user, if applicable */
    revokedAt: Date | null;
}

/**
 * Enumeration of available user role types in the system.
 * Aligns with the authorization matrix defined in the technical specifications.
 */
export enum UserRoleType {
    /** Full system access with user and configuration management capabilities */
    Admin = 'Admin',
    
    /** Access to manage inspectors, equipment, and view customer data */
    Operations = 'Operations',
    
    /** Limited access to self-management and assigned equipment */
    Inspector = 'Inspector',
    
    /** View-only access to customer data and equipment information */
    CustomerService = 'CustomerService'
}