<template>
  <div class="inspector-list" role="region" aria-label="Inspector Management">
    <!-- Search and Filter Section -->
    <QCard class="filter-section q-mb-md">
      <QCardSection>
        <div class="row q-col-gutter-md">
          <!-- Search Bar -->
          <div class="col-12 col-md-4">
            <SearchBar
              :placeholder="t('inspector.search.placeholder')"
              :loading="loading"
              :validation-rules="[validateSearchInput]"
              @search="handleSearch"
              @clear="handleSearchClear"
            />
          </div>

          <!-- Status Filter -->
          <div class="col-12 col-md-4">
            <QSelect
              v-model="statusFilter"
              :options="statusOptions"
              outlined
              dense
              emit-value
              map-options
              :label="t('inspector.status.label')"
              multiple
              use-chips
              clearable
              @update:model-value="handleStatusFilterChange"
            />
          </div>

          <!-- Geographic Search -->
          <div class="col-12 col-md-4">
            <div class="row q-col-gutter-sm">
              <div class="col-8">
                <QInput
                  v-model="locationSearch"
                  outlined
                  dense
                  :label="t('inspector.location.label')"
                  :error="!!locationError"
                  :error-message="locationError"
                />
              </div>
              <div class="col-4">
                <QInput
                  v-model.number="searchRadius"
                  type="number"
                  outlined
                  dense
                  :label="t('inspector.radius.label')"
                  suffix="mi"
                  :min="1"
                  :max="500"
                />
              </div>
            </div>
          </div>
        </div>
      </QCardSection>
    </QCard>

    <!-- Data Table -->
    <DataTable
      :columns="tableColumns"
      :data="filteredInspectors"
      :loading="loading"
      :title="t('inspector.list.title')"
      @row-click="handleInspectorSelect"
    >
      <!-- Status Badge Template -->
      <template #body-cell-status="props">
        <QTd :props="props">
          <QChip
            :color="getStatusColor(props.value)"
            text-color="white"
            dense
            :label="props.value"
            :aria-label="`Status: ${props.value}`"
          />
        </QTd>
      </template>

      <!-- Actions Template -->
      <template #body-cell-actions="props">
        <QTd :props="props">
          <div class="row q-gutter-sm justify-end">
            <QBtn
              flat
              round
              dense
              color="primary"
              icon="person"
              :aria-label="t('inspector.actions.view')"
              @click.stop="handleViewInspector(props.row)"
            />
            <QBtn
              flat
              round
              dense
              color="secondary"
              icon="local_shipping"
              :aria-label="t('inspector.actions.mobilize')"
              :disable="!canMobilize(props.row)"
              @click.stop="handleMobilize(props.row)"
            />
            <QBtn
              flat
              round
              dense
              color="accent"
              icon="science"
              :aria-label="t('inspector.actions.drugTest')"
              @click.stop="handleDrugTest(props.row)"
            />
          </div>
        </QTd>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watchEffect } from 'vue';
import { QCard, QCardSection, QSelect, QInput, QBtn, QChip, QTd } from 'quasar'; // v2.0.0
import { debounce } from 'lodash'; // v4.17.21
import DataTable from '../common/DataTable.vue';
import SearchBar from '../common/SearchBar.vue';
import { useNotification } from '@/composables/useNotification';
import { InspectorStatus, type Inspector } from '@/models/inspector.model';
import { validateRequired } from '@/utils/validation.util';

// Custom type for geographic point
interface GeographicPoint {
  latitude: number;
  longitude: number;
}

// Component state
const loading = ref(false);
const statusFilter = ref<InspectorStatus[]>([]);
const locationSearch = ref('');
const searchRadius = ref(50);
const locationError = ref('');
const inspectors = ref<Inspector[]>([]);

// Notifications
const { showError, showSuccess } = useNotification();

// Status options for filter dropdown
const statusOptions = computed(() => [
  { label: 'Available', value: InspectorStatus.Available },
  { label: 'Mobilized', value: InspectorStatus.Mobilized },
  { label: 'Inactive', value: InspectorStatus.Inactive },
  { label: 'Suspended', value: InspectorStatus.Suspended }
]);

// Table column definitions with accessibility support
const tableColumns = computed(() => [
  {
    name: 'badgeNumber',
    label: 'Badge',
    field: 'badgeNumber',
    sortable: true,
    align: 'left'
  },
  {
    name: 'status',
    label: 'Status',
    field: 'status',
    sortable: true,
    align: 'center'
  },
  {
    name: 'location',
    label: 'Location',
    field: (row: Inspector) => formatLocation(row.location),
    sortable: false,
    align: 'left'
  },
  {
    name: 'lastDrugTest',
    label: 'Last Drug Test',
    field: 'lastDrugTestDate',
    format: (val: Date | null) => val ? formatDate(val) : 'Never',
    sortable: true,
    align: 'left'
  },
  {
    name: 'actions',
    label: 'Actions',
    field: 'actions',
    align: 'right'
  }
]);

// Computed filtered inspectors based on search criteria
const filteredInspectors = computed(() => {
  let filtered = [...inspectors.value];

  // Apply status filter
  if (statusFilter.value.length > 0) {
    filtered = filtered.filter(inspector => 
      statusFilter.value.includes(inspector.status)
    );
  }

  return filtered;
});

// Input validation
const validateSearchInput = (value: string): boolean => {
  return value.length <= 100 && !/[<>{}()]/.test(value);
};

// Event handlers
const handleSearch = debounce(async (searchText: string) => {
  try {
    loading.value = true;
    // API call would go here
    // const response = await searchInspectors(searchText);
    // inspectors.value = response.data;
    showSuccess('Search completed successfully');
  } catch (error) {
    showError('Failed to search inspectors');
    console.error('Search error:', error);
  } finally {
    loading.value = false;
  }
}, 300);

const handleSearchClear = () => {
  // Reset search state
  inspectors.value = [];
  locationSearch.value = '';
  locationError.value = '';
};

const handleStatusFilterChange = (statuses: InspectorStatus[]) => {
  statusFilter.value = statuses;
};

const handleGeographicSearch = async (location: GeographicPoint, radius: number) => {
  try {
    loading.value = true;
    // API call would go here
    // const response = await searchInspectorsByLocation(location, radius);
    // inspectors.value = response.data;
    showSuccess('Location search completed');
  } catch (error) {
    showError('Failed to search by location');
    console.error('Location search error:', error);
  } finally {
    loading.value = false;
  }
};

const handleInspectorSelect = (inspector: Inspector) => {
  emit('select', inspector);
};

const handleViewInspector = (inspector: Inspector) => {
  emit('view', inspector);
};

const handleMobilize = (inspector: Inspector) => {
  emit('mobilize', inspector);
};

const handleDrugTest = (inspector: Inspector) => {
  emit('drugTest', inspector);
};

// Utility functions
const getStatusColor = (status: InspectorStatus): string => {
  const colors = {
    [InspectorStatus.Available]: 'positive',
    [InspectorStatus.Mobilized]: 'primary',
    [InspectorStatus.Inactive]: 'grey',
    [InspectorStatus.Suspended]: 'negative'
  };
  return colors[status] || 'grey';
};

const formatLocation = (location: GeographicPoint): string => {
  if (!location) return 'Unknown';
  return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
};

const canMobilize = (inspector: Inspector): boolean => {
  return inspector.status === InspectorStatus.Available && 
         inspector.isActive &&
         !!inspector.lastDrugTestDate;
};

// Component events
const emit = defineEmits<{
  (e: 'select', inspector: Inspector): void;
  (e: 'view', inspector: Inspector): void;
  (e: 'mobilize', inspector: Inspector): void;
  (e: 'drugTest', inspector: Inspector): void;
}>();

// Lifecycle hooks
onMounted(() => {
  // Initial data load would go here
});

// Watch for changes that require search updates
watchEffect(() => {
  if (locationSearch.value && searchRadius.value) {
    // Validate and perform geographic search
    try {
      const [lat, lon] = locationSearch.value.split(',').map(Number);
      if (isNaN(lat) || isNaN(lon)) {
        locationError.value = 'Invalid coordinates format';
        return;
      }
      handleGeographicSearch({ latitude: lat, longitude: lon }, searchRadius.value);
    } catch (error) {
      locationError.value = 'Invalid location format';
    }
  }
});
</script>

<style lang="scss" scoped>
.inspector-list {
  .filter-section {
    background-color: var(--q-primary);
    border-radius: $border-radius-base;
  }

  :deep(.q-table) {
    th {
      font-weight: 500;
    }
  }

  // Ensure proper contrast for accessibility
  .q-chip {
    font-weight: 500;
  }

  // Responsive adjustments
  @media (max-width: $breakpoint-sm) {
    .filter-section {
      .row {
        flex-direction: column;
      }
    }
  }
}
</style>