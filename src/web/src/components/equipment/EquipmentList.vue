<template>
  <div 
    class="equipment-list" 
    role="region" 
    aria-label="Equipment List"
    :aria-busy="loading"
  >
    <!-- Search Bar Only -->
    <div class="equipment-list__controls">
      <SearchBar
        :placeholder="t('search.equipment.placeholder')"
        :loading="loading"
        :debounce-time="300"
        @search="handleSearch"
        @clear="handleSearchClear"
      />
    </div>

    <!-- Equipment Data Table -->
    <q-table
      :columns="tableColumns"
      :rows="filteredEquipment"
      :loading="loading"
      row-key="id"
      @row-click="handleEquipmentSelect"
      class="equipment-list__table"
    >
      <!-- Custom Status Column -->
      <template #body-cell-status="props">
        <q-td :props="props">
          <q-chip
            :color="getStatusColor(props.row.status)"
            text-color="white"
            size="sm"
          >
            {{ props.row.status?.toUpperCase() }}
          </q-chip>
        </q-td>
      </template>

      <!-- Custom Actions Column -->
      <template #body-cell-actions="props">
        <q-td :props="props">
          <q-btn-group flat>
            <q-btn
              v-if="!isInspector"
              flat
              round
              size="sm"
              icon="edit"
              :aria-label="t('equipment.actions.edit')"
              @click.stop="handleEditEquipment(props.row)"
            />
            <q-btn
              flat
              round
              size="sm"
              icon="assignment"
              :aria-label="t('equipment.actions.assign')"
              :disable="props.row.status?.toUpperCase() !== 'AVAILABLE'"
              @click.stop="handleAssignEquipment(props.row)"
            />
            <q-btn
              flat
              round
              size="sm"
              icon="keyboard_return"
              :aria-label="t('equipment.actions.return')"
              :disable="props.row.status?.toUpperCase() !== 'IN_USE'"
              @click.stop="handleReturnEquipment(props.row)"
            />
            <q-btn
              v-if="!isInspector"
              flat
              round
              size="sm"
              icon="build"
              :aria-label="t('equipment.actions.maintenance')"
              :disable="props.row.status?.toUpperCase() === 'MAINTENANCE' || props.row.status?.toUpperCase() === 'IN_USE'"
              @click.stop="handleMaintenanceEquipment(props.row)"
            />
          </q-btn-group>
        </q-td>
      </template>
    </q-table>

    <!-- Error Display -->
    <div 
      v-if="error"
      class="equipment-list__error"
      role="alert"
    >
      {{ error }}
    </div>

    <!-- Loading State -->
    <q-inner-loading :showing="loading">
      <q-spinner size="50px" color="primary" />
    </q-inner-loading>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { QBtn, QSpinner, QChip, QBtnGroup, QInnerLoading, useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import SearchBar from '../common/SearchBar.vue';
import { useEquipmentStore } from '@/stores/equipment.store';
import { useAuthStore } from '@/stores/auth.store';
import { UserRoleType } from '@/models/user.model';
import { Equipment } from '@/models/equipment.model';
import { formatDate } from '@/utils/date.util';
import { useRouter } from 'vue-router';

// Initialize composables
const $q = useQuasar();
const { t } = useI18n();
const equipmentStore = useEquipmentStore();
const authStore = useAuthStore();
const router = useRouter();

// Component state
const searchQuery = ref('');
const error = ref<string | null>(null);
const loading = ref(false);

// Computed properties
const isInspector = computed(() => authStore.hasRole(UserRoleType.Inspector));

// Table column definitions
const tableColumns = computed(() => [
  {
    name: 'serialNumber',
    label: t('equipment.fields.serial_number'),
    field: 'serialNumber',
    sortable: true,
    align: 'left'
  },
  {
    name: 'type',
    label: t('equipment.fields.type'),
    field: 'type',
    sortable: true,
    align: 'left'
  },
  {
    name: 'model',
    label: t('equipment.fields.model'),
    field: 'model',
    sortable: true,
    align: 'left'
  },
  {
    name: 'status',
    label: 'Status',
    field: 'status',
    align: 'left',
    sortable: true
  },
  {
    name: 'lastMaintenanceDate',
    label: t('equipment.fields.last_maintenance'),
    field: 'lastMaintenanceDate',
    format: (val: Date) => formatDate(val),
    sortable: true,
    align: 'left'
  },
  {
    name: 'actions',
    label: t('equipment.fields.actions'),
    field: 'actions',
    align: 'center'
  }
]);

// Filtered equipment list - only search filter remains here
const filteredEquipment = computed(() => {
  try {
    const equipmentList = equipmentStore.equipment || [];
    console.log('Raw equipment list:', equipmentList); // Debug log

    let filtered = equipmentList.map(item => {
      try {
        // Ensure we have the minimum required data
        if (!item || !item.id) {
          console.warn('Invalid equipment item:', item);
          return null;
        }

        const equipment = new Equipment({
          id: item.id,
          serialNumber: item.serialNumber,
          model: item.name || item.model, // Handle both backend and frontend model names
          type: item.type,
          condition: item.condition,
          status: item.status?.toUpperCase(),
          isActive: item.status !== 'retired',
          isAvailable: item.status === 'available',
          purchaseDate: item.purchaseDate ? new Date(item.purchaseDate) : new Date(),
          lastMaintenanceDate: item.lastMaintenanceDate ? new Date(item.lastMaintenanceDate) : null,
          notes: item.notes,
          specifications: item.specifications,
          maintenanceHistory: item.maintenanceHistory || [],
          documents: item.documents || []
        });
        return equipment;
      } catch (error) {
        console.error('Error creating Equipment instance:', error, item);
        return null;
      }
    }).filter((item): item is Equipment => item !== null);

    console.log('Filtered equipment list:', filtered); // Debug log

    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      filtered = filtered.filter(item => 
        item.serialNumber.toLowerCase().includes(query) ||
        item.model.toLowerCase().includes(query) ||
        item.type.toLowerCase().includes(query)
      );
    }

    return filtered;
  } catch (error) {
    console.error('Error filtering equipment:', error);
    return [];
  }
});

// Event handlers
const handleSearch = (value: string) => {
  searchQuery.value = value;
};

const handleSearchClear = () => {
  searchQuery.value = '';
};

const handleEquipmentSelect = async (evt: Event, row: Equipment) => {
  try {
    console.log('Selected row data:', row); // Debug log
    
    if (!row || !row.id) {
      console.error('No valid row data received:', row);
      $q.notify({
        type: 'negative',
        message: 'Invalid equipment data',
        position: 'top'
      });
      return;
    }

    // Emit the selection event
    emit('equipment-selected', row);
  } catch (error) {
    console.error('Error processing equipment selection:', error);
    $q.notify({
      type: 'negative',
      message: 'Failed to process equipment selection',
      position: 'top'
    });
  }
};

const handleEditEquipment = (equipment: Equipment) => {
  emit('edit-equipment', equipment);
};

const handleAssignEquipment = (equipment: Equipment) => {
  emit('assign-equipment', equipment);
};

const handleReturnEquipment = (equipment: Equipment) => {
  emit('return-equipment', equipment);
};

const handleMaintenanceEquipment = (equipment: Equipment) => {
  emit('maintenance-equipment', equipment);
};

// Status color mapping
const getStatusColor = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'AVAILABLE':
      return 'positive';
    case 'IN_USE':
      return 'warning';
    case 'MAINTENANCE':
      return 'orange';
    case 'RETIRED':
      return 'negative';
    default:
      return 'grey';
  }
};

// Component lifecycle and cleanup
onMounted(async () => {
  try {
    loading.value = true;
    await equipmentStore.loadEquipment();
  } catch (err) {
    console.error('Failed to initialize equipment list:', err);
    error.value = err instanceof Error ? err.message : 'Failed to load equipment';
  } finally {
    loading.value = false;
  }
});

// Watch for store updates
watch(() => equipmentStore.loading, (newValue) => {
  loading.value = newValue;
  emit('loading-state-change', newValue);
});

// Watch for store errors
watch(() => equipmentStore.error, (newValue) => {
  error.value = newValue;
});

// Emits
const emit = defineEmits<{
  (e: 'edit-equipment', equipment: Equipment): void;
  (e: 'assign-equipment', equipment: Equipment): void;
  (e: 'return-equipment', equipment: Equipment): void;
  (e: 'maintenance-equipment', equipment: Equipment): void;
  (e: 'loading-state-change', loading: boolean): void;
  (e: 'equipment-selected', equipment: Equipment): void;
}>();
</script>

<style lang="scss" scoped>
.equipment-list {
  width: 100%;
  height: 100%;
  min-height: 400px;
  position: relative;
  background-color: var(--q-primary-light, #f8fafc);
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  padding: 1.5rem;

  &__controls {
    display: flex;
    margin-bottom: 1.5rem;
    align-items: stretch;
    background: var(--q-primary);
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(25, 118, 210, 0.15);
    width: 100%;

    :deep(.search-bar) {
      width: 100%;
      margin: 0;

      .q-field {
        height: 100%;
        
        &__control {
          height: 44px;
          background: white;
          border-radius: 8px;
        }

        &__native {
          padding: 0 12px;
          color: var(--q-dark);
          font-size: 0.875rem;

          &::placeholder {
            color: rgba(0, 0, 0, 0.6);
          }
        }

        .q-icon {
          color: var(--q-primary);
        }
      }

      .q-field--outlined .q-field__control:before {
        border-color: transparent;
      }

      .q-field--focused .q-field__control {
        box-shadow: 0 0 0 2px var(--q-primary-light);
      }
    }

    @media (max-width: $breakpoint-sm) {
      padding: 1rem;
    }
  }

  &__table {
    height: calc(100% - 80px);
    border-radius: 8px;
    overflow: hidden;
    background-color: white;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  }

  &__error {
    margin-top: 1rem;
    padding: 1rem;
    border-radius: 8px;
    background-color: var(--q-negative-light, #ffebee);
    color: var(--q-negative, #c10015);
    font-weight: 500;
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

// Deep selectors for Quasar components
:deep(.q-table) {
  background-color: white;
  
  thead {
    tr {
      background-color: var(--q-primary-light, #e3f2fd);
      
      th {
        font-weight: 600;
        color: var(--q-primary, #1976d2);
        padding: 1rem;
        font-size: 0.875rem;
        border-bottom: 2px solid var(--q-primary-light, rgba(25, 118, 210, 0.1));
      }
    }
  }

  tbody {
    tr {
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
}

:deep(.q-chip) {
  font-weight: 500;
  padding: 4px 12px;
  border-radius: 16px;

  &.bg-positive {
    background: var(--q-positive) !important;
    box-shadow: 0 2px 4px rgba(33, 186, 69, 0.2);
  }

  &.bg-warning {
    background: var(--q-warning) !important;
    box-shadow: 0 2px 4px rgba(242, 192, 55, 0.2);
  }

  &.bg-negative {
    background: var(--q-negative) !important;
    box-shadow: 0 2px 4px rgba(193, 0, 21, 0.2);
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
.body--dark .equipment-list {
  background-color: var(--q-dark);

  &__controls {
    background: var(--q-primary-dark, #1565c0);

    :deep(.search-bar) {
      .q-field {
        &__control {
          background: var(--q-dark-page);
        }

        &__native {
          color: white;

          &::placeholder {
            color: rgba(255, 255, 255, 0.7);
          }
        }

        .q-icon {
          color: white;
        }
      }

      .q-field--focused .q-field__control {
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2);
      }
    }
  }

  &__table {
    background-color: var(--q-dark-page);
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

    tbody {
      tr {
        td {
          color: rgba(255, 255, 255, 0.9);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        &:hover {
          background-color: rgba(255, 255, 255, 0.05);
        }
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
  .equipment-list {
    padding: 1rem;

    &__controls {
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
}
</style>