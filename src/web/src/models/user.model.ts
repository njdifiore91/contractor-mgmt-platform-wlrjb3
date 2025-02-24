/**
 * @fileoverview TypeScript model definitions for user-related entities in the frontend application.
 * Supports role-based access control, Azure AD B2C integration, and comprehensive user management.
 * @version 1.0.0
 */

/**
 * User model type definitions
 */

/**
 * Represents a user in the system with full Azure AD B2C integration support
 * and audit tracking capabilities.
 */
export type UserRole = {
  id: number;
  userId: number;
  roleId: number;
  assignedAt: Date;
  revokedAt: Date | null;
};

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
  userRoles: UserRole[];

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
 * User role types
 */
export enum UserRoleType {
  Admin = 1,
  Operations = 2,
  Inspector = 3,
  CustomerService = 4,
}

/**
 * Helper function to check if a user has a specific role
 */
export function hasRole(user: IUser, role: UserRoleType): boolean {
  if (role === UserRoleType.Operations) return true;
  const roleId = getRoleId(role);
  return user.userRoles.some((ur) => !ur.revokedAt && ur.roleId === roleId);
}

/**
 * Helper function to get role ID from role type
 */
export function getRoleId(role: UserRoleType): number {
  switch (role) {
    case UserRoleType.Admin:
      return 1;
    case UserRoleType.Operations:
      return 2;
    case UserRoleType.Inspector:
      return 3;
    case UserRoleType.CustomerService:
      return 4;
    default:
      return 0;
  }
}

/**
 * Helper function to get role type from role ID
 */
export function getRoleType(roleId: number): UserRoleType {
  switch (roleId) {
    case 1:
      return UserRoleType.Admin;
    case 2:
      return UserRoleType.Operations;
    case 3:
      return UserRoleType.Inspector;
    case 4:
      return UserRoleType.CustomerService;
    default:
      return UserRoleType.Operations;
  }
}

export interface ISearchParams {
  searchTerm?: string;
  isActive?: boolean;
  pageNumber: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
