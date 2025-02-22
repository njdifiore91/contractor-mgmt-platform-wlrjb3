import { RouteRecordRaw } from 'vue-router'; // ^4.0.0
import AuthLayout from '@/layouts/AuthLayout';
import DefaultLayout from '@/layouts/DefaultLayout';
import AdminLayout from '@/layouts/AdminLayout';

// Authentication related routes
export const auth_routes: RouteRecordRaw[] = [
  {
    path: '/auth',
    component: AuthLayout,
    children: [
      {
        path: 'login',
        name: 'login',
        component: () => import('@/views/auth/LoginPage.vue'),
        meta: {
          requiresAuth: false,
          title: 'Login',
          allowedRoles: ['*'],
          layout: 'auth'
        }
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/views/auth/ProfilePage.vue'),
        meta: {
          requiresAuth: true,
          title: 'User Profile',
          allowedRoles: ['Admin', 'Operations', 'Inspector', 'Customer Service'],
          layout: 'auth'
        }
      }
    ]
  }
];

// Main application routes
export const default_routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: DefaultLayout,
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('@/views/DashboardPage.vue'),
        meta: {
          requiresAuth: true,
          title: 'Dashboard',
          allowedRoles: ['Admin', 'Operations', 'Inspector', 'Customer Service'],
          layout: 'default'
        }
      },
      {
        path: 'customers',
        children: [
          {
            path: '',
            name: 'customer-list',
            component: () => import('@/views/customers/CustomerListPage.vue'),
            meta: {
              requiresAuth: true,
              title: 'Customers',
              allowedRoles: ['Admin', 'Operations', 'Customer Service'],
              layout: 'default'
            }
          },
          {
            path: ':id',
            name: 'customer-detail',
            component: () => import('@/views/customers/CustomerDetailPage.vue'),
            meta: {
              requiresAuth: true,
              title: 'Customer Details',
              allowedRoles: ['Admin', 'Operations', 'Customer Service'],
              layout: 'default'
            }
          }
        ]
      },
      {
        path: 'inspectors',
        children: [
          {
            path: '',
            name: 'inspector-list',
            component: () => import('@/views/inspectors/InspectorListPage.vue'),
            meta: {
              requiresAuth: true,
              title: 'Inspectors',
              allowedRoles: ['Admin', 'Operations'],
              layout: 'default'
            }
          },
          {
            path: ':id',
            name: 'inspector-detail',
            component: () => import('@/views/inspectors/InspectorDetailPage.vue'),
            meta: {
              requiresAuth: true,
              title: 'Inspector Details',
              allowedRoles: ['Admin', 'Operations'],
              layout: 'default'
            }
          }
        ]
      },
      {
        path: 'equipment',
        children: [
          {
            path: '',
            name: 'equipment-list',
            component: () => import('@/views/equipment/EquipmentListPage.vue'),
            meta: {
              requiresAuth: true,
              title: 'Equipment',
              allowedRoles: ['Admin', 'Operations'],
              layout: 'default'
            }
          },
          {
            path: ':id',
            name: 'equipment-detail',
            component: () => import('@/views/equipment/EquipmentDetailPage.vue'),
            meta: {
              requiresAuth: true,
              title: 'Equipment Details',
              allowedRoles: ['Admin', 'Operations'],
              layout: 'default'
            }
          }
        ]
      }
    ]
  }
];

// Admin-specific routes
export const admin_routes: RouteRecordRaw[] = [
  {
    path: '/admin',
    component: AdminLayout,
    meta: {
      requiresAuth: true,
      requiresAdmin: true,
      allowedRoles: ['Admin'],
      layout: 'admin'
    },
    children: [
      {
        path: 'users',
        name: 'user-management',
        component: () => import('@/views/admin/UserManagementPage.vue'),
        meta: {
          title: 'User Management',
          allowedRoles: ['Admin']
        }
      },
      {
        path: 'settings',
        name: 'system-settings',
        component: () => import('@/views/admin/SystemSettingsPage.vue'),
        meta: {
          title: 'System Settings',
          allowedRoles: ['Admin']
        }
      },
      {
        path: 'audit-logs',
        name: 'audit-logs',
        component: () => import('@/views/admin/AuditLogsPage.vue'),
        meta: {
          title: 'Audit Logs',
          allowedRoles: ['Admin']
        }
      }
    ]
  }
];

// Combine all routes
const routes: RouteRecordRaw[] = [
  ...auth_routes,
  ...default_routes,
  ...admin_routes,
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundPage.vue'),
    meta: {
      title: 'Page Not Found',
      layout: 'default'
    }
  }
];

export default routes;