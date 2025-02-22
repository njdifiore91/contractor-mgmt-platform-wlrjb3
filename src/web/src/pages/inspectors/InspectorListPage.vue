<template>
  <q-page class="inspector-list-page" role="main" aria-label="Inspector Management">
    <!-- Page Header with Breadcrumb -->
    <AppBreadcrumb />
    <h1 class="page-title q-mb-lg">Inspector Management</h1>

    <!-- Error Boundary -->
    <div v-if="error" class="text-negative q-pa-md" role="alert">
      {{ error }}
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-center q-pa-xl">
      <q-spinner size="3em" color="primary" />
      <span class="sr-only">Loading inspectors...</span>
    </div>

    <!-- Main Content -->
    <template v-else>
      <InspectorList
        :inspectors="inspectors"
        :loading="loading"
        @select="handleInspectorSelect"
        @filter="handleFilterChange"
        @location-search="handleLocationSearch"
      />
    </template>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onErrorCaptured } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { QPage, useQuasar } from 'quasar';
import InspectorList from '@/components/inspectors/InspectorList.vue';
import AppBreadcrumb from '@/components/common/AppBreadcrumb.vue';
import { useInspector } from '@/composables/useInspector';
import { Inspector } from '@/models/inspector.model';
import type { GeographyPoint } from '@types/microsoft-spatial';

export default defineComponent({
  name: 'InspectorListPage',

  components: {
    InspectorList,
    AppBreadcrumb
  },

  setup() {
    const router = useRouter();
    const route = useRoute();
    const $q = useQuasar();

    // Initialize inspector composable
    const {
      inspectors,
      loading,
      error,
      searchInspectors,
      selectInspector,
      setSearchLocation,
      setSelectedStatus,
      setSelectedCertifications
    } = useInspector();

    // Handle inspector selection with navigation
    const handleInspectorSelect = async (inspector: Inspector) => {
      try {
        await selectInspector(inspector);
        router.push(`/inspectors/${inspector.id}`);
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: 'Failed to select inspector',
          position: 'top'
        });
      }
    };

    // Handle location-based search
    const handleLocationSearch = async (criteria: { location: GeographyPoint; radius: number }) => {
      try {
        await setSearchLocation(criteria.location);
        // Update URL query parameters
        router.replace({
          query: {
            ...route.query,
            lat: criteria.location.latitude.toString(),
            lng: criteria.location.longitude.toString(),
            radius: criteria.radius.toString()
          }
        });
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: 'Failed to perform location search',
          position: 'top'
        });
      }
    };

    // Handle filter changes
    const handleFilterChange = async (filters: {
      status?: string[];
      certifications?: string[];
      isActive?: boolean;
    }) => {
      try {
        if (filters.status) {
          await setSelectedStatus(filters.status[0] as any);
        }
        if (filters.certifications) {
          await setSelectedCertifications(filters.certifications);
        }
        // Update URL query parameters
        router.replace({
          query: {
            ...route.query,
            status: filters.status?.join(','),
            certifications: filters.certifications?.join(','),
            active: filters.isActive?.toString()
          }
        });
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: 'Failed to apply filters',
          position: 'top'
        });
      }
    };

    // Initialize from URL parameters
    onMounted(async () => {
      const { lat, lng, radius, status, certifications, active } = route.query;
      
      if (lat && lng) {
        await handleLocationSearch({
          location: {
            latitude: parseFloat(lat as string),
            longitude: parseFloat(lng as string)
          },
          radius: radius ? parseInt(radius as string) : 50
        });
      }

      if (status || certifications || active) {
        await handleFilterChange({
          status: status ? (status as string).split(',') : undefined,
          certifications: certifications ? (certifications as string).split(',') : undefined,
          isActive: active ? active === 'true' : undefined
        });
      }

      await searchInspectors();
    });

    // Error boundary
    onErrorCaptured((err) => {
      console.error('Inspector list error:', err);
      $q.notify({
        type: 'negative',
        message: 'An error occurred while loading inspectors',
        position: 'top'
      });
      return false;
    });

    return {
      inspectors,
      loading,
      error,
      handleInspectorSelect,
      handleLocationSearch,
      handleFilterChange
    };
  }
});
</script>

<style lang="scss" scoped>
.inspector-list-page {
  padding: var(--q-page-padding);
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--q-gap-md);

  .page-title {
    font-size: var(--q-font-xl);
    font-weight: 500;
    margin-bottom: var(--q-margin-md);
    color: var(--q-primary);
  }

  // Screen reader only class
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  // High contrast mode support
  @media (forced-colors: active) {
    border: 1px solid CanvasText;
  }

  // Reduced motion preference
  @media (prefers-reduced-motion: reduce) {
    * {
      transition: none !important;
    }
  }

  // Print styles
  @media print {
    padding: 0;
  }
}
</style>