<template>
  <div class="inspector-list" role="region" aria-label="Inspector Management">
    <!-- Search and Filter Section -->
    <QCard class="filter-section q-mb-md">
      <QCardSection>
        <div class="row q-col-gutter-md items-center">
          <!-- Search Bar -->
          <div class="col-12 col-md-6">
            <SearchBar
              :placeholder="t('inspector.search.placeholder')"
              :loading="loading"
              :validation-rules="[validateSearchInput]"
              @search="handleSearch"
              @clear="handleSearchClear"
              class="search-bar"
            />
          </div>

          <!-- Status Filter -->
          <div class="col-12 col-md-6">
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
              class="status-filter"
              @update:model-value="handleStatusFilterChange"
            />
          </div>
        </div>
      </QCardSection>
    </QCard>

    <!-- Data Table -->
    <QCard class="q-mb-md">
      <QTable
        :rows="filteredInspectors"
        :columns="tableColumns"
        :loading="loading"
        row-key="id"
        flat
        bordered
        @row-click="handleInspectorSelect"
        class="cursor-pointer"
      >
        <!-- Status Badge Template -->
        <template #body-cell-status="props">
          <QTd :props="props">
            <QChip
              :color="getStatusColor(props.value)"
              text-color="white"
              size="sm"
              dense
              class="status-chip"
              :label="props.value"
              :aria-label="`Status: ${props.value}`"
            />
          </QTd>
        </template>

        <!-- Actions Template -->
        <template #body-cell-actions="props">
          <QTd :props="props" class="text-right">
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
                :title="getMobilizationTooltip(props.row)"
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

        <template #loading>
          <QTd colspan="100%" class="text-center">
            <QSpinner color="primary" size="2em" />
            <span class="q-ml-sm">Loading inspectors...</span>
          </QTd>
        </template>

        <template #no-data>
          <QTd colspan="100%" class="text-center q-pa-lg text-grey-6">
            No inspectors found
          </QTd>
        </template>
      </QTable>
    </QCard>

    <!-- Drug Test Dialog -->
    <q-dialog v-model="showDrugTestDialog" persistent>
      <DrugTestForm
        v-if="selectedInspectorForDrugTest"
        :inspector-id="selectedInspectorForDrugTest.id"
        @submitted="handleDrugTestSubmitted"
        @cancel="handleDrugTestCancel"
      />
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watchEffect } from 'vue';
import { useRouter } from 'vue-router';
import { QCard, QCardSection, QSelect, QInput, QBtn, QChip, QTd, QSpinner, QTable, QDialog, useQuasar } from 'quasar';
import { debounce } from 'lodash';
import SearchBar from '../common/SearchBar.vue';
import DrugTestForm from './DrugTestForm.vue';
import { useNotification } from '@/composables/useNotification';
import { InspectorStatus, type Inspector } from '@/models/inspector.model';
import type { GeographyPoint } from '@/types/spatial';
import { useI18n } from 'vue-i18n';
import { useInspectorStore } from '@/stores/inspector.store';
import { mobilizeInspector } from '@/api/inspector.api';

// Component state
const { t } = useI18n();
const router = useRouter();
const $q = useQuasar();
const inspectorStore = useInspectorStore();
const loading = computed(() => inspectorStore.isSearching);
const statusFilter = ref<InspectorStatus[]>([]);

// Notifications
const showError = (message: string) => {
  $q.notify({
    type: 'negative',
    message,
    position: 'top'
  });
};

const showSuccess = (message: string) => {
  $q.notify({
    type: 'positive',
    message,
    position: 'top'
  });
};

// Status options for filter dropdown
const statusOptions = computed(() => [
  { label: t('inspector.status.available'), value: InspectorStatus.Available },
  { label: t('inspector.status.mobilized'), value: InspectorStatus.Mobilized },
  { label: t('inspector.status.inactive'), value: InspectorStatus.Inactive },
  { label: t('inspector.status.suspended'), value: InspectorStatus.Suspended }
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
    name: 'name',
    label: 'Inspector Name',
    field: (row: Inspector) => `${row.firstName} ${row.lastName}`,
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
    format: (val: Date | null) => val ? new Date(val).toLocaleDateString() : 'Never',
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
const filteredInspectors = computed(() => inspectorStore.allInspectors);

// Input validation
const validateSearchInput = (value: string): boolean => {
  return value.length <= 100 && !/[<>{}()]/.test(value);
};

// Event handlers
const handleSearch = debounce(async (searchText: string) => {
  try {
    if (!searchText.trim()) {
      await loadInitialData();
      return;
    }

    await inspectorStore.searchInspectors(
      null, // location
      null, // radius
      statusFilter.value, // Pass the entire status array
      [], // certifications
      null // includeUnavailable - set to null instead of true
    );
    showSuccess(t('inspector.search.success'));
  } catch (error) {
    showError(t('inspector.search.error'));
    console.error('Search error:', error);
  }
}, 300);

const handleSearchClear = async () => {
  statusFilter.value = [];
  await loadInitialData();
};

const handleStatusFilterChange = async (statuses: InspectorStatus[]) => {
  try {
    statusFilter.value = statuses;
    await inspectorStore.searchInspectors(
      null, // location
      null, // radius
      statuses, // Pass the selected statuses
      [], // certifications
      null // includeUnavailable - set to null instead of true
    );
  } catch (error) {
    console.error('Status filter error:', error);
    showError(t('inspector.search.error'));
  }
};

const handleInspectorSelect = (inspector: Inspector) => {
  if (inspector && inspector.id) {
    router.push(`/inspectors/${inspector.id}`);
  }
};

const handleViewInspector = (inspector: Inspector) => {
  emit('view', inspector);
};

const handleMobilize = async (inspector: Inspector) => {
  if (!inspector || !inspector.id) return;
  
  try {
    await mobilizeInspector(inspector.id.toString());
    showSuccess('Inspector successfully mobilized');
    // Refresh the inspector list to show updated status
    await loadInitialData();
  } catch (error) {
    showError('Failed to mobilize inspector');
    console.error('Mobilization error:', error);
  }
};

// Drug test state
const showDrugTestDialog = ref(false);
const selectedInspectorForDrugTest = ref<Inspector | null>(null);

const handleDrugTest = (inspector: Inspector) => {
  selectedInspectorForDrugTest.value = inspector;
  showDrugTestDialog.value = true;
};

const handleDrugTestSubmitted = () => {
  showDrugTestDialog.value = false;
  selectedInspectorForDrugTest.value = null;
  // Refresh the inspector list to show updated drug test status
  loadInitialData();
};

const handleDrugTestCancel = () => {
  showDrugTestDialog.value = false;
  selectedInspectorForDrugTest.value = null;
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

const formatLocation = (location: GeographyPoint): string => {
  if (!location) return 'Unknown';
  return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
};

const canMobilize = (inspector: Inspector): boolean => {
  // Allow mobilization if:
  // 1. Inspector is Available (not Inactive, Suspended, or Mobilized)
  // 2. Inspector is Active in the system
  // 3. Has a drug test within last 90 days
  // 4. Has at least one valid certification
  const hasRecentDrugTest = inspector.lastDrugTestDate && 
    (new Date().getTime() - new Date(inspector.lastDrugTestDate).getTime()) <= 90 * 24 * 60 * 60 * 1000;
  
  const hasValidCertification = inspector.certifications?.some(cert => 
    new Date(cert.expiryDate) > new Date()
  );

  const status = inspector.status.toUpperCase();
  return status === InspectorStatus.Available && 
         inspector.isActive &&
         hasRecentDrugTest &&
         hasValidCertification;
};

const getMobilizationTooltip = (inspector: Inspector): string => {
  if (!inspector.isActive) return 'Inspector is not active';
  if (inspector.status === InspectorStatus.Suspended) return 'Inspector is suspended';
  if (inspector.status === InspectorStatus.Mobilized) return 'Inspector is already mobilized';
  if (inspector.status === InspectorStatus.Inactive) return 'Inspector is inactive';
  
  const hasRecentDrugTest = inspector.lastDrugTestDate && 
    (new Date().getTime() - new Date(inspector.lastDrugTestDate).getTime()) <= 90 * 24 * 60 * 60 * 1000;
  if (!hasRecentDrugTest) return 'Requires drug test within last 90 days';
  
  const hasValidCertification = inspector.certifications?.some(cert => 
    new Date(cert.expiryDate) > new Date()
  );
  if (!hasValidCertification) return 'Requires valid certification';
  
  return 'Click to mobilize inspector';
};

// Component events
const emit = defineEmits<{
  (e: 'select', inspector: Inspector): void;
  (e: 'view', inspector: Inspector): void;
  (e: 'mobilize', inspector: Inspector): void;
  (e: 'drugTest', inspector: Inspector): void;
}>();

// Load initial data
const loadInitialData = async () => {
  try {
    await inspectorStore.searchInspectors(
      null, // location
      null, // radius
      statusFilter.value, // Pass current status filter
      [], // No certification filter
      null // includeUnavailable - set to null instead of true
    );
  } catch (error) {
    console.error('Failed to load initial data:', error);
  }
};

// Lifecycle hooks
onMounted(() => {
  loadInitialData();
});
</script>

<style lang="scss" scoped>
.inspector-list {
  width: 100%;
  height: 100%;
  min-height: 400px;
  position: relative;
  background-color: var(--q-primary-light, #f8fafc);
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  padding: 1.5rem;

  .filter-section {
    margin-bottom: 1.5rem;
    background: var(--q-primary);
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(25, 118, 210, 0.15);
    width: 100%;

    .q-card__section {
      padding: 1.5rem;
    }

    .row {
      margin: 0 -0.75rem;
      width: 100%;

      > .col-12 {
        padding: 0.75rem;
      }
    }

    :deep(.search-bar) {
      width: 100%;

      .q-field__control {
        height: 44px;
        background: white;
        border-radius: 8px;
        padding: 0 12px;
      }

      .q-field__native {
        padding: 0 12px;
        color: var(--q-dark);
        font-size: 0.875rem;
      }

      .q-field__native::placeholder {
        color: rgba(0, 0, 0, 0.6);
      }

      .q-field__label {
        color: white;
        font-weight: 500;
        font-size: 0.875rem;
        padding-left: 12px;
      }

      .q-icon {
        color: var(--q-primary);
      }
    }

    :deep(.status-filter) {
      width: 100%;

      .q-field__control {
        height: 44px;
        background: white;
        border-radius: 8px;
        padding: 0 12px;
      }

      .q-field__label {
        color: white;
        font-weight: 500;
        font-size: 0.875rem;
        padding-left: 12px;
      }

      .q-chip {
        background: rgba(255, 255, 255, 0.9) !important;
        color: var(--q-primary);
        font-weight: 500;
        margin: 2px;
      }
    }

    :deep(.q-field--outlined) {
      .q-field__control:before {
        border-color: rgba(255, 255, 255, 0.3);
      }

      &:hover .q-field__control:before {
        border-color: white;
      }

      &.q-field--focused .q-field__control {
        border-color: white;
      }
    }

    @media (max-width: $breakpoint-sm) {
      .q-card__section {
        padding: 1rem;
      }

      .row {
        margin: 0 -0.5rem;

        > .col-12 {
          padding: 0.5rem;
        }
      }
    }
  }

  :deep(.q-table) {
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
    
    thead tr {
      background-color: var(--q-primary-light, #e3f2fd);
      
      th {
        font-weight: 600;
        color: var(--q-primary, #1976d2);
        padding: 1rem;
        font-size: 0.875rem;
        border-bottom: 2px solid var(--q-primary-light, rgba(25, 118, 210, 0.1));
      }
    }

    tbody tr {
      transition: all 0.2s ease;
      
      td {
        color: var(--q-dark, #1d1d1d);
        font-size: 0.875rem;
        padding: 0.75rem 1rem;
        border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      }

      &:hover {
        background-color: var(--q-primary-light, rgba(25, 118, 210, 0.05));
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      }
    }
  }

  :deep(.status-chip) {
    font-weight: 500;
    padding: 4px 12px;
    border-radius: 16px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

    &.q-chip--colored {
      .q-chip__content {
        color: white;
      }
    }
  }

  :deep(.q-btn-group) {
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;

    .q-btn {
      padding: 8px;
      min-height: 36px;
      
      &:hover {
        background-color: var(--q-primary-light, #e3f2fd);
        color: var(--q-primary);
      }
      
      &[disabled] {
        opacity: 0.6;
        background-color: rgba(0, 0, 0, 0.03);
      }
    }
  }

  // Dark mode support
  .body--dark & {
    background-color: var(--q-dark);

    .filter-section {
      background: var(--q-primary-dark, #1565c0);

      :deep(.search-bar),
      :deep(.status-filter),
      :deep(.location-input),
      :deep(.radius-input) {
        .q-field__control {
          background: var(--q-dark-page);
        }

        .q-field__native {
          color: white;

          &::placeholder {
            color: rgba(255, 255, 255, 0.7);
          }
        }

        .q-icon {
          color: white;
        }
      }
    }

    :deep(.q-table) {
      background-color: var(--q-dark-page);
      
      thead tr {
        background-color: var(--q-primary-dark, rgba(25, 118, 210, 0.2));
        
        th {
          color: white;
          border-bottom: 2px solid rgba(255, 255, 255, 0.1);
        }
      }

      tbody tr {
        td {
          color: rgba(255, 255, 255, 0.9);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        &:hover {
          background-color: rgba(255, 255, 255, 0.05);
        }
      }
    }

    :deep(.q-btn-group) {
      background-color: var(--q-dark-page);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);

      .q-btn {
        color: white;
        
        &:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }
      }
    }
  }

  // Responsive design
  @media (max-width: $breakpoint-sm) {
    padding: 1rem;

    .filter-section {
      padding: 1rem;
    }

    :deep(.q-table) {
      thead tr th,
      tbody tr td {
        padding: 0.75rem;
        font-size: 0.8125rem;
      }
    }
  }

  // High contrast mode support
  @media (forced-colors: active) {
    & {
      border: 1px solid CanvasText;
    }

    :deep(.q-btn) {
      border: 1px solid CanvasText;
    }
  }
}
</style>