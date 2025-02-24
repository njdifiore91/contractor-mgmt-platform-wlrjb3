export interface IUserRole {
  id: number;
  roleId: number;
  userId: number;
  roleName?: string;
}

export interface IUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  userRoles: IUserRole[];
  emailPreferences?: string[];
  createdAt: string;
  lastLoginAt: string | null;
}

export enum UserRoleType {
  Admin = 1,
  Operations = 2,
  Inspector = 3,
  CustomerService = 4,
}

export const UserRoles = {
  Admin: 1,
  Operations: 2,
  Inspector: 3,
  CustomerService: 4,
} as const;
