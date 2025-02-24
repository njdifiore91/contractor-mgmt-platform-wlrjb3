import type { RouteRecordRaw } from 'vue-router';

// Authentication related routes
export const auth_routes: RouteRecordRaw[] = [
  {
    path: '/login',
    redirect: '/auth/login',
  },
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/auth',
    component: () => import('../layouts/AuthLayout.vue' as any),
    meta: {
      requiresAuth: false,
      layout: 'auth',
    },
    children: [
      {
        path: 'login',
        name: 'login',
        component: () => import('../pages/auth/LoginPage.vue' as any),
        meta: {
          requiresAuth: false,
          title: 'Login',
          allowedRoles: ['*'],
          layout: 'auth',
        },
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('../pages/auth/ProfilePage.vue' as any),
        meta: {
          requiresAuth: true,
          title: 'User Profile',
          allowedRoles: ['Admin', 'Operations', 'Inspector', 'CustomerService'],
          layout: 'auth',
        },
      },
    ],
  },
];

// Main application routes
export const default_routes: RouteRecordRaw[] = [
  {
    path: '/dashboard',
    meta: {
      requiresAuth: true,
      layout: 'default',
      allowedRoles: ['Admin', 'Operations', 'Inspector', 'CustomerService'],
    },
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('../pages/dashboard/DashboardWrapper.vue'),
        meta: {
          requiresAuth: true,
          title: 'Dashboard',
          layout: 'default',
        },
      },
      {
        path: 'customers',
        children: [
          {
            path: '',
            name: 'customer-list',
            component: () => import('../pages/customers/CustomerListPage.vue' as any),
            meta: {
              requiresAuth: true,
              title: 'Customers',
              allowedRoles: ['Admin', 'Operations'],
              layout: 'default',
            },
          },
          {
            path: ':id',
            name: 'customer-detail',
            component: () => import('../pages/customers/CustomerDetailPage.vue' as any),
            meta: {
              requiresAuth: true,
              title: 'Customer Details',
              allowedRoles: ['Admin', 'Operations'],
              layout: 'default',
            },
          },
        ],
      },
      {
        path: 'inspectors',
        children: [
          {
            path: '',
            name: 'inspector-list',
            component: () => import('../pages/inspectors/InspectorListPage.vue' as any),
            meta: {
              requiresAuth: true,
              title: 'Inspectors',
              allowedRoles: ['Admin', 'Operations'],
              layout: 'default',
            },
          },
          {
            path: ':id',
            name: 'inspector-detail',
            component: () => import('../pages/inspectors/InspectorDetailPage.vue' as any),
            meta: {
              requiresAuth: true,
              title: 'Inspector Details',
              allowedRoles: ['Admin', 'Operations'],
              layout: 'default',
            },
          },
        ],
      },
      {
        path: 'equipment',
        children: [
          {
            path: '',
            name: 'equipment-list',
            component: () => import('../pages/equipment/EquipmentListPage.vue' as any),
            meta: {
              requiresAuth: true,
              title: 'Equipment',
              allowedRoles: ['Admin', 'Operations'],
              layout: 'default',
            },
          },
          {
            path: ':id',
            name: 'equipment-detail',
            component: () => import('../pages/equipment/EquipmentDetailPage.vue' as any),
            meta: {
              requiresAuth: true,
              title: 'Equipment Details',
              allowedRoles: ['Admin', 'Operations'],
              layout: 'default',
            },
          },
        ],
      },
    ],
  },
];

// Admin-specific routes
export const admin_routes: RouteRecordRaw[] = [
  {
    path: '/admin',
    meta: {
      requiresAuth: true,
      layout: 'admin',
      allowedRoles: ['Admin'],
    },
    children: [
      {
        path: 'users',
        name: 'user-management',
        component: () => import('../pages/admin/UserManagementPage.vue'),
        meta: {
          requiresAuth: true,
          title: 'User Management',
          allowedRoles: ['Admin'],
          layout: 'admin',
        },
      },
      {
        path: 'settings',
        name: 'system-settings',
        component: () => import('../pages/admin/SystemSettingsPage.vue' as any),
        meta: {
          title: 'System Settings',
          allowedRoles: ['Admin'],
        },
      },
      {
        path: 'audit-logs',
        name: 'audit-logs',
        component: () => import('../pages/admin/AuditLogsPage.vue' as any),
        meta: {
          title: 'Audit Logs',
          allowedRoles: ['Admin'],
        },
      },
    ],
  },
];

// Combine all routes
export const routes: RouteRecordRaw[] = [
  ...auth_routes,
  ...default_routes,
  ...admin_routes,
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../pages/error/NotFoundPage.vue' as any),
    meta: {
      title: 'Page Not Found',
      layout: 'default',
    },
  },
];

export default routes;
