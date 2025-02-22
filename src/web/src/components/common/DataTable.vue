<template>
  <div 
    class="data-table" 
    role="region" 
    :aria-label="title || 'Data Table'"
    :aria-busy="loading"
  >
    <q-table
      v-bind="tableProps"
      :columns="responsiveColumns"
      :rows="data"
      :loading="loading"
      :selected="selectedRows"
      :pagination.sync="internalPagination"
      :filter="filter"
      row-key="id"
      :visible-columns="visibleColumns"
      @row-click="handleRowClick"
      @selection="handleSelectionChange"
      @request="handlePaginationChange"
    >
      <!-- Top Slot: Title and Global Actions -->
      <template v-slot:top>
        <div class="row full-width items-center q-pb-md">
          <h2 v-if="title" class="text-h6 q-my-none">{{ title }}</h2>
          <q-space />
          <q-input
            v-if="filterable"
            v-model="filter"
            dense
            outlined
            placeholder="Search"
            class="q-ml-md"
            :aria-label="'Search ' + (title || 'data')"
          >
            <template v-slot:append>
              <q-icon name="search" />
            </template>
          </q-input>
        </div>
      </template>

      <!-- Loading State -->
      <template v-slot:loading>
        <loading-spinner 
          size="large"
          color="primary"
          :aria-label="'Loading ' + (title || 'data')"
        />
      </template>

      <!-- Custom Cell Rendering -->
      <template v-slot:body-cell="props">
        <q-td :props="props">
          <template v-if="props.col.format === 'date'">
            {{ formatDate(props.value) }}
          </template>
          <template v-else-if="props.col.format === 'currency'">
            {{ new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(props.value) }}
          </template>
          <template v-else>
            {{ props.value }}
          </template>
        </q-td>
      </template>

      <!-- No Data Message -->
      <template v-slot:no-data>
        <div class="text-center q-pa-md">
          <p class="text-body1">No data available</p>
        </div>
      </template>

      <!-- Pagination -->
      <template v-slot:pagination="scope">
        <q-pagination
          v-model="scope.pagination.page"
          :max="scope.pagesNumber"
          :direction-links="true"
          :boundary-links="true"
          :aria-label="'Page navigation for ' + (title || 'data')"
        />
      </template>
    </q-table>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'; // v3.0.0
import { useQuasar } from 'quasar'; // v2.0.0
import LoadingSpinner from './LoadingSpinner.vue';
import { formatDate } from '@/utils/date.util';
import { validateRequired } from '@/utils/validation.util';

export default {
  name: 'DataTable',

  components: {
    LoadingSpinner
  },

  props: {
    // Core data props
    columns: {
      type: Array,
      required: true,
      validator: cols => cols.every(col => validateRequired(col.name) && validateRequired(col.field))
    },
    data: {
      type: Array,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: ''
    },

    // Feature flags
    selectable: {
      type: Boolean,
      default: false
    },
    filterable: {
      type: Boolean,
      default: true
    },

    // Pagination configuration
    pagination: {
      type: Object,
      default: () => ({
        sortBy: '',
        descending: false,
        page: 1,
        rowsPerPage: 10,
        rowsNumber: 0
      })
    }
  },

  setup(props, { emit }) {
    const $q = useQuasar();
    
    // Reactive state
    const selectedRows = ref([]);
    const filter = ref('');
    const internalPagination = ref({ ...props.pagination });
    const visibleColumns = ref(props.columns.map(col => col.name));

    // Computed properties
    const responsiveColumns = computed(() => {
      const breakpoint = $q.screen.name;
      return props.columns.filter(col => {
        if (breakpoint === 'xs') return !col.hideXs;
        if (breakpoint === 'sm') return !col.hideSm;
        return true;
      });
    });

    const tableProps = computed(() => ({
      flat: true,
      bordered: true,
      square: true,
      separator: 'horizontal',
      color: 'primary',
      dense: $q.screen.lt.sm,
      rowsPerPageOptions: [5, 10, 20, 50],
      'aria-multiselectable': props.selectable,
      class: {
        'mobile-optimized': $q.screen.lt.sm
      }
    }));

    // Event handlers
    const handleRowClick = (evt, row) => {
      if (!props.selectable) {
        emit('row-click', { row, event: evt });
        return;
      }

      const index = selectedRows.value.findIndex(r => r.id === row.id);
      if (index === -1) {
        selectedRows.value.push(row);
      } else {
        selectedRows.value.splice(index, 1);
      }

      // Announce selection change to screen readers
      const message = index === -1 ? 'Row selected' : 'Row deselected';
      $q.notify({ message, type: 'info', position: 'top', timeout: 0 });
    };

    const handleSelectionChange = selection => {
      selectedRows.value = selection;
      emit('selection-change', selection);
    };

    const handlePaginationChange = newPagination => {
      internalPagination.value = newPagination;
      emit('pagination-change', newPagination);
    };

    // Watchers
    watch(() => props.pagination, newVal => {
      internalPagination.value = { ...newVal };
    });

    // Lifecycle hooks
    onMounted(() => {
      // Initialize responsive behavior
      if ($q.screen.lt.sm) {
        visibleColumns.value = props.columns
          .filter(col => !col.hideXs)
          .map(col => col.name);
      }
    });

    return {
      // State
      selectedRows,
      filter,
      internalPagination,
      visibleColumns,

      // Computed
      responsiveColumns,
      tableProps,

      // Methods
      handleRowClick,
      handleSelectionChange,
      handlePaginationChange,
      formatDate
    };
  }
};
</script>

<style lang="scss" scoped>
.data-table {
  width: 100%;
  border-radius: 8px;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.2);
  background-color: var(--q-primary);

  :deep(.q-table) {
    // Ensure proper contrast for accessibility
    th {
      font-weight: 500;
      color: var(--q-primary);
      background-color: var(--q-secondary);
    }

    td {
      color: var(--q-primary);
    }

    // Responsive optimizations
    &.mobile-optimized {
      th, td {
        padding: 8px;
        font-size: 0.875rem;
      }
    }

    // Focus indicators for keyboard navigation
    tbody tr:focus {
      outline: 2px solid var(--q-primary);
      outline-offset: -2px;
    }

    // Selection styling
    .selected {
      background-color: rgba(var(--q-primary), 0.1);
    }
  }

  // Media queries for responsive design
  @media (max-width: 768px) {
    border-radius: 0;
    box-shadow: none;

    :deep(.q-table__top) {
      flex-direction: column;
      gap: 8px;
    }
  }
}
</style>