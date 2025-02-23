declare module '@/models/user.model' {
    export interface IUser {
        id: number;
        email: string;
        firstName: string;
        lastName: string;
        phoneNumber: string | null;
        isActive: boolean;
        azureAdB2CId: string;
        userRoles: UserRole[];
        createdAt: Date;
        modifiedAt: Date | null;
        lastLoginAt: Date | null;
    }

    export interface IRole {
        id: number;
        name: string;
        description: string;
        isActive: boolean;
        createdAt: Date;
        modifiedAt: Date | null;
    }

    export interface IUserRole {
        id: number;
        userId: number;
        roleId: number;
        assignedAt: Date;
        revokedAt: Date | null;
    }

    export enum UserRoleType {
        Admin = 'Admin',
        Operations = 'Operations',
        Inspector = 'Inspector',
        CustomerService = 'CustomerService',
        Any = '*'
    }

    export interface UserRole {
        id: number;
        userId: number;
        roleId: number;
        assignedAt: Date;
        revokedAt: Date | null;
    }

    export function hasRole(user: IUser, role: UserRoleType): boolean;
    export function getRoleId(role: UserRoleType): number;
    export function getRoleType(roleId: number): UserRoleType;
} 