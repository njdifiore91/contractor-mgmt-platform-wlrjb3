<template>
  <q-card class="filter-panel q-pa-md" role="region" aria-label="Filter Panel">
    <!-- Filter Header -->
    <div class="row items-center q-mb-md">
      <div class="text-h6">{{ filterTypeLabel }}</div>
      <q-space />
      <q-btn
        flat
        round
        dense
        icon="refresh"
        @click="resetFilters"
        aria-label="Reset filters"
      />
    </div>

    <!-- Inspector Filters -->
    <template v-if="filterType === 'inspector'">
      <div class="row q-col-gutter-md">
        <!-- Status Filter -->
        <div class="col-12 col-md-6">
          <q-select
            v-model="filters.status"
            :options="statusOptions"
            label="Status"
            multiple
            emit-value
            map-options
            clearable
            use-input
            @update:model-value="applyFilters"
          />
        </div>

        <!-- Location Filter -->
        <div class="col-12 col-md-6">
          <q-input
            v-model="filters.location"
            label="Location"
            clearable
            @update:model-value="applyFilters"
          >
            <template #append>
              <q-input
                v-model="filters.radius"
                type="number"
                label="Radius (miles)"
                style="width: 100px"
                min="0"
                max="500"
                @update:model-value="applyFilters"
              />
            </template>
          </q-input>
        </div>

        <!-- Certifications Filter -->
        <div class="col-12">
          <q-select
            v-model="filters.certifications"
            :options="certificationOptions"
            label="Certifications"
            multiple
            use-chips
            clearable
            @update:model-value="applyFilters"
          />
        </div>

        <!-- Experience Filter -->
        <div class="col-12 col-md-6">
          <q-input
            v-model="filters.minExperience"
            type="number"
            label="Minimum Experience (years)"
            min="0"
            max="50"
            @update:model-value="applyFilters"
          />
        </div>
      </div>
    </template>

    <!-- Equipment Filters -->
    <template v-else-if="filterType === 'equipment'">
      <div class="row q-col-gutter-md">
        <!-- Equipment Type Filter -->
        <div class="col-12 col-md-6">
          <q-select
            v-model="filters.equipmentType"
            :options="equipmentTypeOptions"
            label="Equipment Type"
            multiple
            emit-value
            map-options
            clearable
            @update:model-value="applyFilters"
          />
        </div>

        <!-- Availability Filter -->
        <div class="col-12 col-md-6">
          <q-select
            v-model="filters.availability"
            :options="availabilityOptions"
            label="Availability"
            emit-value
            map-options
            clearable
            @update:model-value="applyFilters"
          />
        </div>

        <!-- Date Range Filter -->
        <div class="col-12">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-input
                v-model="filters.startDate"
                type="date"
                label="Start Date"
                clearable
                @update:model-value="validateAndApplyDateRange"
              />
            </div>
            <div class="col-12 col-md-6">
              <q-input
                v-model="filters.endDate"
                type="date"
                label="End Date"
                clearable
                @update:model-value="validateAndApplyDateRange"
              />
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Customer Filters -->
    <template v-else-if="filterType === 'customer'">
      <div class="row q-col-gutter-md">
        <!-- Region Filter -->
        <div class="col-12 col-md-6">
          <q-select
            v-model="filters.region"
            :options="regionOptions"
            label="Region"
            multiple
            emit-value
            map-options
            clearable
            @update:model-value="applyFilters"
          />
        </div>

        <!-- Status Filter -->
        <div class="col-12 col-md-6">
          <q-select
            v-model="filters.status"
            :options="customerStatusOptions"
            label="Status"
            emit-value
            map-options
            clearable
            @update:model-value="applyFilters"
          />
        </div>

        <!-- Industry Filter -->
        <div class="col-12">
          <q-select
            v-model="filters.industry"
            :options="industryOptions"
            label="Industry"
            multiple
            use-chips
            clearable
            @update:model-value="applyFilters"
          />
        </div>
      </div>
    </template>
  </q-card>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue'; // v3.x
import { QCard, QSelect, QInput, useQuasar } from 'quasar'; // v2.x
import { InspectorStatus } from '../../models/inspector.model';
import { EquipmentType } from '../../models/equipment.model';
import { CustomerStatus } from '../../models/customer.model';
import { validateDateRange } from '../../utils/validation.util';
import debounce from 'lodash/debounce'; // v4.17.21

export default defineComponent({
  name: 'FilterPanel',

  components: {
    QCard,
    QSelect,
    QInput
  },

  props: {
    filterType: {
      type: String,
      required: true,
      validator: (value: string) => ['inspector', 'equipment', 'customer'].includes(value)
    },
    initialFilters: {
      type: Object,
      default: () => ({})
    }
  },

  emits: ['filter', 'reset'],

  setup(props, { emit }) {
    const $q = useQuasar();
    const filters = ref({ ...props.initialFilters });

    // Computed properties for filter options
    const statusOptions = computed(() => [
      { label: 'Available', value: InspectorStatus.Available },
      { label: 'Mobilized', value: InspectorStatus.Mobilized }
    ]);

    const equipmentTypeOptions = computed(() => 
      Object.values(EquipmentType).map(type => ({
        label: type,
        value: type
      }))
    );

    const availabilityOptions = computed(() => [
      { label: 'Available', value: true },
      { label: 'Assigned', value: false }
    ]);

    const regionOptions = computed(() => [
      { label: 'North America', value: 'NA' },
      { label: 'South America', value: 'SA' },
      { label: 'Europe', value: 'EU' },
      { label: 'Asia', value: 'AS' },
      { label: 'Africa', value: 'AF' },
      { label: 'Oceania', value: 'OC' }
    ]);

    const customerStatusOptions = computed(() => [
      { label: 'Active', value: CustomerStatus.Active },
      { label: 'Inactive', value: CustomerStatus.Inactive },
      { label: 'Pending', value: CustomerStatus.Pending }
    ]);

    const industryOptions = computed(() => [
      'Energy',
      'Manufacturing',
      'Construction',
      'Transportation',
      'Utilities'
    ]);

    const certificationOptions = computed(() => [
      'API',
      'AWS',
      'Safety',
      'Quality Control',
      'Environmental'
    ]);

    const filterTypeLabel = computed(() => {
      const labels = {
        inspector: 'Inspector Filters',
        equipment: 'Equipment Filters',
        customer: 'Customer Filters'
      };
      return labels[props.filterType] || 'Filters';
    });

    // Methods
    const validateFilters = (): boolean => {
      const { startDate, endDate, radius, minExperience } = filters.value;

      if (startDate && endDate) {
        if (!validateDateRange(new Date(startDate), new Date(endDate))) {
          $q.notify({
            type: 'warning',
            message: 'Invalid date range selected'
          });
          return false;
        }
      }

      if (radius && (isNaN(radius) || radius < 0 || radius > 500)) {
        $q.notify({
          type: 'warning',
          message: 'Radius must be between 0 and 500 miles'
        });
        return false;
      }

      if (minExperience && (isNaN(minExperience) || minExperience < 0 || minExperience > 50)) {
        $q.notify({
          type: 'warning',
          message: 'Experience must be between 0 and 50 years'
        });
        return false;
      }

      return true;
    };

    const applyFilters = debounce(() => {
      if (!validateFilters()) return;

      // Sanitize and prepare filter values
      const sanitizedFilters = Object.entries(filters.value).reduce((acc, [key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          acc[key] = typeof value === 'string' ? value.trim() : value;
        }
        return acc;
      }, {} as Record<string, any>);

      emit('filter', sanitizedFilters);
    }, 300);

    const validateAndApplyDateRange = () => {
      const { startDate, endDate } = filters.value;
      if (startDate && endDate) {
        if (validateDateRange(new Date(startDate), new Date(endDate))) {
          applyFilters();
        }
      }
    };

    const resetFilters = () => {
      filters.value = {};
      emit('reset');
      applyFilters();
    };

    return {
      filters,
      statusOptions,
      equipmentTypeOptions,
      availabilityOptions,
      regionOptions,
      customerStatusOptions,
      industryOptions,
      certificationOptions,
      filterTypeLabel,
      applyFilters,
      resetFilters,
      validateAndApplyDateRange
    };
  }
});
</script>

<style lang="scss" scoped>
.filter-panel {
  background: var(--q-primary-fade);
  border-radius: 8px;

  :deep(.q-field) {
    margin-bottom: 8px;
  }

  .q-btn {
    margin-left: 8px;
  }
}
</style>