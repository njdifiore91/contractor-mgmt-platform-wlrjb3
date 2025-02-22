<template>
  <QBreadcrumbs
    v-if="showBreadcrumbs"
    class="app-breadcrumbs q-px-md q-py-sm bg-grey-2"
    separator="/"
    role="navigation"
    aria-label="Breadcrumb navigation"
  >
    <QBreadcrumbsEl
      v-for="(breadcrumb, index) in breadcrumbs"
      :key="breadcrumb.path"
      :label="breadcrumb.label"
      :to="breadcrumb.path"
      :aria-current="index === breadcrumbs.length - 1 ? 'page' : undefined"
      :class="{ 'current-page': index === breadcrumbs.length - 1 }"
    />
  </QBreadcrumbs>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import { QBreadcrumbs, QBreadcrumbsEl } from 'quasar'; // ^2.0.0
import { useRoute } from 'vue-router'; // ^4.0.0
import { useI18n } from 'vue-i18n'; // ^9.0.0
import { useAuth } from '@/composables/useAuth';
import { routes } from '@/router/routes';

interface BreadcrumbItem {
  label: string;
  path: string;
}

export default defineComponent({
  name: 'AppBreadcrumb',

  components: {
    QBreadcrumbs,
    QBreadcrumbsEl
  },

  setup() {
    const route = useRoute();
    const { t } = useI18n();
    const { checkRouteAccess } = useAuth();
    const breadcrumbCache = ref<Map<string, BreadcrumbItem[]>>(new Map());

    // Computed property for breadcrumb visibility
    const showBreadcrumbs = computed(() => {
      return route.path !== '/' && !route.path.startsWith('/auth');
    });

    // Generate breadcrumbs with security validation
    const breadcrumbs = computed(() => {
      if (!showBreadcrumbs.value) return [];

      // Check cache first
      const cachedBreadcrumbs = breadcrumbCache.value.get(route.path);
      if (cachedBreadcrumbs) return cachedBreadcrumbs;

      const pathSegments = route.path.split('/').filter(Boolean);
      const breadcrumbItems: BreadcrumbItem[] = [];
      let currentPath = '';

      // Always add home
      breadcrumbItems.push({
        label: t('breadcrumb.home'),
        path: '/'
      });

      // Generate breadcrumb trail
      for (const segment of pathSegments) {
        currentPath += `/${segment}`;
        const matchedRoute = routes.find(r => r.path === currentPath);

        if (matchedRoute) {
          // Validate route access
          if (!checkRouteAccess(matchedRoute)) continue;

          breadcrumbItems.push({
            label: formatBreadcrumbLabel(segment),
            path: currentPath
          });
        }
      }

      // Cache the result
      breadcrumbCache.value.set(route.path, breadcrumbItems);
      return breadcrumbItems;
    });

    // Format breadcrumb labels with i18n support
    const formatBreadcrumbLabel = (routeName: string): string => {
      // Try to find translation key
      const translationKey = `breadcrumb.${routeName}`;
      const hasTranslation = t.te(translationKey);

      if (hasTranslation) {
        return t(translationKey);
      }

      // Fallback to formatted route name
      return routeName
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };

    return {
      breadcrumbs,
      showBreadcrumbs
    };
  }
});
</script>

<style lang="scss" scoped>
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