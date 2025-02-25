<template>
  <div class="breadcrumb-wrapper">
    <template v-if="showBreadcrumbs && breadcrumbItems.length > 0">
      <QBreadcrumbs
        class="app-breadcrumbs q-px-md q-py-sm bg-grey-2"
        separator="/"
        role="navigation"
        aria-label="Breadcrumb navigation"
        active-color="primary"
      >
        <template v-for="(breadcrumb, index) in breadcrumbItems" :key="breadcrumb.path">
          <QBreadcrumbsEl
            :label="breadcrumb.label"
            :to="breadcrumb.path"
            :aria-current="index === breadcrumbItems.length - 1 ? 'page' : undefined"
            :class="{ 'current-page': index === breadcrumbItems.length - 1 }"
          />
        </template>
      </QBreadcrumbs>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { QBreadcrumbs, QBreadcrumbsEl } from 'quasar';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuth } from '@/composables/useAuth';
import { routes } from '@/router/routes';
import type { RouteRecordRaw } from 'vue-router';

interface BreadcrumbItem {
  label: string;
  path: string;
}

// Setup composables
const route = useRoute();
const { t, te } = useI18n();
const { checkRouteAccess } = useAuth();

// State
const breadcrumbCache = ref<Map<string, BreadcrumbItem[]>>(new Map());
const isInitialized = ref(false);

// Computed property for breadcrumb visibility
const showBreadcrumbs = computed(() => {
  return Boolean(route.path && route.path !== '/' && !route.path.startsWith('/auth'));
});

// Helper function to find route by path
const findRouteByPath = (path: string, routeList: RouteRecordRaw[] = []): RouteRecordRaw | null => {
  if (!path || !Array.isArray(routeList) || routeList.length === 0) return null;

  for (const route of routeList) {
    if (!route) continue;
    if (route.path === path) return route;
    
    if (Array.isArray(route.children) && route.children.length > 0) {
      const childPath = path.replace(route.path, '').replace(/^\//, '');
      const childRoute = findRouteByPath(childPath, route.children);
      if (childRoute) return childRoute;
    }
  }
  return null;
};

// Format breadcrumb labels with i18n support
const formatBreadcrumbLabel = (routeName: string): string => {
  if (typeof routeName !== 'string' || !routeName) return '';

  try {
    // Try to find translation key
    const translationKey = `breadcrumb.${routeName.toLowerCase()}`;
    if (te(translationKey)) {
      return t(translationKey);
    }

    // Fallback to formatted route name
    return routeName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  } catch (error) {
    console.error('Error formatting breadcrumb label:', error);
    return routeName;
  }
};

// Generate breadcrumbs with security validation
const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
  if (!isInitialized.value || !showBreadcrumbs.value || !route.path) {
    return [];
  }

  try {
    // Check cache first
    const cachedBreadcrumbs = breadcrumbCache.value.get(route.path);
    if (Array.isArray(cachedBreadcrumbs) && cachedBreadcrumbs.length > 0) {
      return cachedBreadcrumbs;
    }

    const items: BreadcrumbItem[] = [];
    const pathSegments = route.path.split('/').filter(Boolean);
    let currentPath = '';

    // Always add home
    items.push({
      label: t('breadcrumb.home'),
      path: '/'
    });

    // Generate breadcrumb trail
    for (const segment of pathSegments) {
      if (!segment) continue;
      
      currentPath += `/${segment}`;
      const matchedRoute = findRouteByPath(currentPath, routes);

      if (matchedRoute) {
        // Skip if no access
        if (matchedRoute.meta?.allowedRoles && !checkRouteAccess(matchedRoute)) {
          continue;
        }

        items.push({
          label: formatBreadcrumbLabel(segment),
          path: currentPath
        });
      }
    }

    // Only cache if we have valid items
    if (items.length > 0) {
      breadcrumbCache.value.set(route.path, items);
    }

    return items;
  } catch (error) {
    console.error('Error generating breadcrumbs:', error);
    return [];
  }
});

// Initialize component
onMounted(() => {
  isInitialized.value = true;
});
</script>

<style lang="scss" scoped>
.breadcrumb-wrapper {
  width: 100%;
}

.app-breadcrumbs {
  font-size: clamp(0.75rem, 2vw, 0.875rem);
  font-weight: 500;
  line-height: 1.2;
  border-radius: var(--border-radius-base);
  transition: background-color 0.3s ease;

  :deep(.q-breadcrumbs__separator) {
    margin: 0 0.5rem;
  }

  :deep(.q-link) {
    color: var(--primary);
    text-decoration: none;
    transition: color 0.2s ease;

    &:hover {
      color: var(--primary-dark);
      text-decoration: underline;
    }

    &:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
    }
  }

  .current-page {
    color: var(--text-secondary);
    pointer-events: none;
  }

  // RTL Support
  &.q-breadcrumbs--rtl {
    direction: rtl;

    :deep(.q-breadcrumbs__separator) {
      transform: scaleX(-1);
    }
  }

  // Responsive adjustments
  @media (max-width: 320px) {
    font-size: 0.75rem;
    padding: 0.5rem !important;
  }

  // High contrast mode support
  @media (forced-colors: active) {
    border: 1px solid CanvasText;

    :deep(.q-link) {
      color: LinkText;

      &:hover {
        color: ActiveText;
      }
    }
  }

  // Reduced motion preference
  @media (prefers-reduced-motion: reduce) {
    transition: none;

    :deep(.q-link) {
      transition: none;
    }
  }

  // Print styles
  @media print {
    background: none !important;
    padding: 0 !important;
  }
}
</style>