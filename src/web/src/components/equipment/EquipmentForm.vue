<template>
  <q-form
    ref="formRef"
    @submit.prevent="handleSubmit"
    class="equipment-form q-gutter-md"
    aria-labelledby="equipment-form-title"
  >
    <h2 id="equipment-form-title" class="text-h6 q-mb-md">
      {{ equipment ? 'Edit Equipment' : 'Add New Equipment' }}
    </h2>

    <div class="row q-col-gutter-md">
      <!-- Serial Number -->
      <div class="col-12 col-md-6">
        <q-input
          v-model="formData.serialNumber"
          :rules="[
            val => !!val || 'Serial number is required',
            val => /^[A-Za-z0-9-]{5,20}$/.test(val) || 'Invalid serial number format'
          ]"
          label="Serial Number"
          :disable="!!equipment"
          outlined
          dense
          :error="!!errors.serialNumber"
          :error-message="errors.serialNumber"
          aria-required="true"
          @blur="validateField('serialNumber')"
        />
      </div>

      <!-- Model -->
      <div class="col-12 col-md-6">
        <q-input
          v-model="formData.model"
          :rules="[
            val => !!val || 'Model is required',
            val => val.length >= 2 && val.length <= 50 || 'Model must be between 2 and 50 characters'
          ]"
          label="Model"
          outlined
          dense
          :error="!!errors.model"
          :error-message="errors.model"
          aria-required="true"
          @blur="validateField('model')"
        />
      </div>

      <!-- Equipment Type -->
      <div class="col-12 col-md-6">
        <q-select
          v-model="formData.type"
          :options="equipmentTypeOptions"
          label="Equipment Type"
          outlined
          dense
          emit-value
          map-options
          :rules="[val => !!val || 'Equipment type is required']"
          :error="!!errors.type"
          :error-message="errors.type"
          aria-required="true"
          @blur="validateField('type')"
        />
      </div>

      <!-- Condition -->
      <div class="col-12 col-md-6">
        <q-select
          v-model="formData.condition"
          :options="['new', 'good', 'fair', 'poor']"
          label="Condition"
          outlined
          dense
          :rules="[val => !!val || 'Condition is required']"
          :error="!!errors.condition"
          :error-message="errors.condition"
          aria-required="true"
          @blur="validateField('condition')"
        />
      </div>

      <!-- Purchase Date -->
      <div class="col-12 col-md-6">
        <q-input
          v-model="formData.purchaseDate"
          type="date"
          :rules="[
            val => !!val || 'Purchase date is required',
            val => new Date(val) <= new Date() || 'Purchase date cannot be in the future'
          ]"
          label="Purchase Date"
          outlined
          dense
          :error="!!errors.purchaseDate"
          :error-message="errors.purchaseDate"
          aria-required="true"
          @blur="validateField('purchaseDate')"
        >
          <template v-slot:append>
            <q-icon name="event" class="cursor-pointer">
              <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                <q-date v-model="formData.purchaseDate" mask="YYYY-MM-DD" />
              </q-popup-proxy>
            </q-icon>
          </template>
        </q-input>
      </div>

      <!-- Notes -->
      <div class="col-12">
        <q-input
          v-model="formData.notes"
          type="textarea"
          label="Notes"
          :rules="[val => !val || val.length <= 500 || 'Notes cannot exceed 500 characters']"
          outlined
          autogrow
          :error="!!errors.notes"
          :error-message="errors.notes"
          @blur="validateField('notes')"
        />
      </div>
    </div>

    <!-- Form Actions -->
    <div class="row justify-end q-gutter-sm q-mt-md">
      <q-btn
        flat
        label="Cancel"
        color="grey"
        :disable="loading"
        @click="$emit('cancel')"
        aria-label="Cancel equipment form"
      />
      <q-btn
        :loading="loading"
        :label="equipment ? 'Update Equipment' : 'Create Equipment'"
        type="submit"
        color="primary"
        :disable="!isFormValid"
        aria-label="Save equipment"
      >
        <template v-slot:loading>
          <q-spinner-dots class="on-left" />
          {{ equipment ? 'Updating...' : 'Creating...' }}
        </template>
      </q-btn>
    </div>
  </q-form>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { Equipment, EquipmentType } from '../../models/equipment.model';
import { useEquipmentStore } from '../../stores/equipment.store';
import { useNotification } from '../../composables/useNotification';

export default defineComponent({
  name: 'EquipmentForm',

  props: {
    equipment: {
      type: Object as () => Equipment | null,
      default: null
    },
    loading: {
      type: Boolean,
      default: false
    }
  },

  emits: ['save', 'cancel'],

  setup(props, { emit }) {
    const $q = useQuasar();
    const equipmentStore = useEquipmentStore();
    const { showSuccessNotification, showErrorNotification } = useNotification();
    
    const formRef = ref<any>(null);
    const errors = ref<Record<string, string>>({});

    // Form data initialization
    const formData = ref({
      serialNumber: props.equipment?.serialNumber || '',
      model: props.equipment?.model || '',
      type: props.equipment?.type || null,
      condition: props.equipment?.condition || '',
      purchaseDate: props.equipment?.purchaseDate ? new Date(props.equipment.purchaseDate).toISOString().split('T')[0] : '',
      notes: props.equipment?.notes || ''
    });

    // Equipment type options
    const equipmentTypeOptions = computed(() => 
      Object.entries(EquipmentType).map(([label, value]) => ({
        label,
        value
      }))
    );

    // Form validation state
    const isFormValid = computed(() => {
      return Object.keys(errors.value).length === 0 &&
        formData.value.serialNumber &&
        formData.value.model &&
        formData.value.type &&
        formData.value.condition &&
        formData.value.purchaseDate;
    });

    // Field validation
    const validateField = async (field: string): Promise<boolean> => {
      const value = formData.value[field as keyof typeof formData.value];
      
      switch (field) {
        case 'serialNumber':
          if (!value) {
            errors.value[field] = 'Serial number is required';
            return false;
          }
          if (!/^[A-Za-z0-9-]{5,20}$/.test(value)) {
            errors.value[field] = 'Invalid serial number format';
            return false;
          }
          break;

        case 'model':
          if (!value) {
            errors.value[field] = 'Model is required';
            return false;
          }
          if (value.length < 2 || value.length > 50) {
            errors.value[field] = 'Model must be between 2 and 50 characters';
            return false;
          }
          break;

        case 'type':
        case 'condition':
        case 'purchaseDate':
          if (!value) {
            errors.value[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
            return false;
          }
          break;
      }

      delete errors.value[field];
      return true;
    };

    // Form submission
    const handleSubmit = async () => {
      try {
        // Validate all fields
        const validations = await Promise.all(
          Object.keys(formData.value).map(field => validateField(field))
        );

        if (validations.some(v => !v)) {
          return;
        }

        const equipmentData = {
          ...formData.value,
          purchaseDate: new Date(formData.value.purchaseDate),
          isActive: true,
          isAvailable: true
        };

        if (props.equipment) {
          await equipmentStore.updateExistingEquipment(props.equipment.id, equipmentData);
          showSuccessNotification('Equipment updated successfully');
        } else {
          await equipmentStore.createNewEquipment(equipmentData);
          showSuccessNotification('Equipment created successfully');
        }

        emit('save', equipmentData);
      } catch (error) {
        showErrorNotification(`Failed to ${props.equipment ? 'update' : 'create'} equipment: ${error.message}`);
      }
    };

    // Initialize form validation
    onMounted(() => {
      if (formRef.value) {
        formRef.value.validate();
      }
    });

    return {
      formRef,
      formData,
      errors,
      equipmentTypeOptions,
      isFormValid,
      validateField,
      handleSubmit
    };
  }
});
</script>

<style lang="scss" scoped>
.equipment-form {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  background: var(--q-primary-light, #f8fafc);
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);

  :deep(.q-field) {
    background: white;
    border-radius: 8px;
    
    .q-field__control {
      background: white;
    }

    .q-field__native,
    .q-field__prefix,
    .q-field__suffix,
    .q-field__input {
      color: var(--q-dark);
    }
  }

  @media (max-width: $breakpoint-sm) {
    padding: 1rem;
  }
}

// Dark mode support
.body--dark .equipment-form {
  background: var(--q-dark);

  :deep(.q-field) {
    background: var(--q-dark-page);
    
    .q-field__control {
      background: var(--q-dark-page);
    }

    .q-field__native,
    .q-field__prefix,
    .q-field__suffix,
    .q-field__input {
      color: white;
    }

    &.q-field--focused {
      .q-field__control {
        box-shadow: 0 0 0 2px var(--q-primary);
      }
    }
  }

  // Dark mode button adjustments
  :deep(.q-btn) {
    &.q-btn--flat {
      color: rgba(255, 255, 255, 0.7);
      
      &:hover {
        color: white;
      }
    }
  }
}

// High contrast mode support
@media (forced-colors: active) {
  .equipment-form {
    border: 1px solid CanvasText;
  }
}
</style>