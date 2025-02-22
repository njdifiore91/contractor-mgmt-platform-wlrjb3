<template>
  <div 
    class="equipment-list" 
    role="region" 
    aria-label="Equipment List"
    :aria-busy="loading"
  >
    <!-- Search and Filter Section -->
    <div class="equipment-list__controls">
      <SearchBar
        :placeholder="t('equipment.search.placeholder')"
        :loading="loading"
        :debounce-time="300"
        @search="handleSearch"
        @clear="handleSearchClear"
      />
      
      <div class="equipment-list__filters" role="group" aria-label="Equipment filters">
        <q-select
          v-model="selectedType"
          :options="equipmentTypeOptions"
          outlined
          dense
          emit-value
          map-options
          :label="t('equipment.type')"
          class="q-mr-sm"
          @update:model-value="handleFilterChange"
        />
        <q-toggle
          v-model="showAvailableOnly"
          :label="t('equipment.filters.available_only')"
          @update:model-value="handleFilterChange"
        />
      </div>
    </div>

    <!-- Equipment Data Table -->
    <DataTable
      :columns="tableColumns"
      :data="filteredEquipment"
      :loading="loading"
      :virtual-scroll="true"
      row-key="id"
      @row-click="handleEquipmentSelect"
      class="equipment-list__table"
    >
      <!-- Custom Status Column -->
      <template #body-cell-status="props">
        <q-td :props="props">
          <q-chip
            :color="getStatusColor(props.value)"
            text-color="white"
            size="sm"
          >
            {{ props.value }}
          </q-chip>
        </q-td>
      </template>

      <!-- Custom Actions Column -->
      <template #body-cell-actions="props">
        <q-td :props="props">
          <q-btn-group flat>
            <q-btn
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
              :disable="!props.row.isAvailable"
              @click.stop="handleAssignEquipment(props.row)"
            />
          </q-btn-group>
        </q-td>
      </template>
    </DataTable>

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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'; // ^3.0.0
import { QBtn, QSpinner, useQuasar } from 'quasar'; // ^2.0.0
import { useI18n } from 'vue-i18n'; // ^9.0.0
import { DataTable } from '../common/DataTable.vue';
import { SearchBar } from '../common/SearchBar.vue';
import { useEquipmentStore } from '@/stores/equipment.store';
import { Equipment, EquipmentType } from '@/models/equipment.model';
import { formatDate } from '@/utils/date.util';

// Initialize composables
const $q = useQuasar();
const { t } = useI18n();
const equipmentStore = useEquipmentStore();

// Component state
const selectedType = ref<EquipmentType | null>(null);
const showAvailableOnly = ref(false);
const searchQuery = ref('');

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
    label: t('equipment.fields.status'),
    field: row => row.isAvailable ? 'Available' : 'Assigned',
    sortable: true,
    align: 'center'
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

// Equipment type options for filter
const equipmentTypeOptions = computed(() => 
  Object.values(EquipmentType).map(type => ({
    label: t(`equipment.types.${type.toLowerCase()}`),
    value: type
  }))
);

// Filtered equipment list
const filteredEquipment = computed(() => {
  let filtered = [...equipmentStore.equipment];

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(item => 
      item.serialNumber.toLowerCase().includes(query) ||
      item.model.toLowerCase().includes(query)
    );
  }

  if (selectedType.value) {
    filtered = filtered.filter(item => item.type === selectedType.value);
  }

  if (showAvailableOnly.value) {
    filtered = filtered.filter(item => item.isAvailable);
  }

  return filtered;
});

// Event handlers
const handleSearch = (value: string) => {
  searchQuery.value = value;
};

const handleSearchClear = () => {
  searchQuery.value = '';
};

const handleFilterChange = () => {
  equipmentStore.loadEquipment(true);
};

const handleEquipmentSelect = (evt: Event, row: Equipment) => {
  emit('equipment-selected', row);
};

const handleEditEquipment = (equipment: Equipment) => {
  emit('edit-equipment', equipment);
};

const handleAssignEquipment = (equipment: Equipment) => {
  emit('assign-equipment', equipment);
};

// Status color mapping
const getStatusColor = (status: string): string => {
  const colors = {
    'Available': 'positive',
    'Assigned': 'warning',
    'Maintenance': 'negative'
  };
  return colors[status] || 'grey';
};

// Component lifecycle
onMounted(async () => {
  try {
    await equipmentStore.loadEquipment();
    equipmentStore.subscribeToUpdates();
  } catch (err) {
    console.error('Failed to initialize equipment list:', err);
  }
});

onUnmounted(() => {
  equipmentStore.clearCache();
});

// Watch for store updates
watch(() => equipmentStore.loading, (newValue) => {
  emit('loading-state-change', newValue);
});

// Emits
const emit = defineEmits<{
  (e: 'equipment-selected', equipment: Equipment): void;
  (e: 'edit-equipment', equipment: Equipment): void;
  (e: 'assign-equipment', equipment: Equipment): void;
  (e: 'loading-state-change', loading: boolean): void;
}>();
</script>

<style lang="scss" scoped>
.equipment-list {
  width: 100%;
  height: 100%;
  min-height: 400px;
  position: relative;
  background-color: var(--q-primary-light);
  border-radius: 8px;
  box-shadow: var(--q-shadow-2);
  padding: 16px;

  &__controls {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 16px;
    align-items: center;

    @media (max-width: $breakpoint-sm) {
      flex-direction: column;
      align-items: stretch;
    }
  }

  &__filters {
    display: flex;
    align-items: center;
    gap: 8px;

    @media (max-width: $breakpoint-sm) {
      flex-wrap: wrap;
    }
  }

  &__table {
    height: calc(100% - 80px);
    border-radius: 4px;
    background-color: white;
  }

  &__error {
    margin-top: 8px;
    padding: 8px;
    border-radius: 4px;
    background-color: var(--q-negative-light);
    color: var(--q-negative);
  }

  // High contrast mode support
  @media (forced-colors: active) {
    border: 1px solid CanvasText;
    
    :deep(.q-btn) {
      border: 1px solid CanvasText;
    }
  }
}
</style>