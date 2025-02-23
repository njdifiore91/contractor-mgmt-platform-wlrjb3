/**
 * @fileoverview Vue.js composable for security validation functionality
 * @version 1.0.0
 */

import { ref, computed } from 'vue';
import { useAuth } from './useAuth';
import { UserRoleType } from '@/models/user.model';

interface SecurityValidationResult {
  isValid: boolean;
  reason?: string;
}

export function useSecurityValidation() {
  const { currentUser, isAuthenticated } = useAuth();
  const validationErrors = ref<string[]>([]);

  const validateAccess = async (
    requiredPermissions: string[],
    resourceType?: string,
    resourceId?: string
  ): Promise<SecurityValidationResult> => {
    try {
      if (!isAuthenticated.value) {
        return {
          isValid: false,
          reason: 'User is not authenticated'
        };
      }

      // Check if user has required permissions
      const hasPermissions = requiredPermissions.every(permission => 
        hasPermission(permission)
      );

      if (!hasPermissions) {
        return {
          isValid: false,
          reason: 'User lacks required permissions'
        };
      }

      // Additional resource-specific checks can be added here
      if (resourceType && resourceId) {
        // TODO: Implement resource-specific validation
      }

      return { isValid: true };
    } catch (error) {
      console.error('Security validation error:', error);
      return {
        isValid: false,
        reason: 'Security validation failed'
      };
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!currentUser.value || !currentUser.value.userRoles) {
      return false;
    }

    // Role ID to UserRoleType mapping
    const roleMap: { [key: number]: UserRoleType } = {
      1: UserRoleType.Admin,
      2: UserRoleType.Operations,
      3: UserRoleType.Inspector,
      4: UserRoleType.CustomerService
    };

    // Map permissions to roles
    const permissionMap: Record<string, UserRoleType[]> = {
      'customer:view': [UserRoleType.Admin, UserRoleType.Operations, UserRoleType.CustomerService],
      'customer:edit': [UserRoleType.Admin, UserRoleType.Operations],
      'customer:export': [UserRoleType.Admin, UserRoleType.Operations],
      'contract:view': [UserRoleType.Admin, UserRoleType.Operations, UserRoleType.CustomerService],
      'contract:create': [UserRoleType.Admin, UserRoleType.Operations],
      'contract:edit': [UserRoleType.Admin, UserRoleType.Operations],
      'contact:view': [UserRoleType.Admin, UserRoleType.Operations, UserRoleType.CustomerService],
      'contact:create': [UserRoleType.Admin, UserRoleType.Operations],
      'contact:edit': [UserRoleType.Admin, UserRoleType.Operations]
    };

    const requiredRoles = permissionMap[permission] || [];
    return currentUser.value.userRoles.some(role => {
      const userRole = roleMap[role.roleId];
      return userRole && requiredRoles.includes(userRole);
    });
  };

  const clearValidationErrors = () => {
    validationErrors.value = [];
  };

  const hasErrors = computed(() => validationErrors.value.length > 0);

  return {
    validateAccess,
    hasPermission,
    validationErrors,
    hasErrors,
    clearValidationErrors
  };
} 