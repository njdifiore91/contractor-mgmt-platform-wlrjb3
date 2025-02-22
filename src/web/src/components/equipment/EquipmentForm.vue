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
        <q-input
          v-model="formData.condition"
          :rules="[
            val => !!val || 'Condition is required',
            val => val.length >= 2 && val.length <= 100 || 'Condition must be between 2 and 100 characters'
          ]"
          label="Condition"
          outlined
          dense
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
    }
  },

  emits: ['save', 'cancel'],

  setup(props, { emit }) {
    const $q = useQuasar();
    const equipmentStore = useEquipmentStore();
    const { showSuccessNotification, showErrorNotification } = useNotification();
    
    const formRef = ref<any>(null);
    const loading = ref(false);
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
    const validateField = async (fieldName: string) => {
      const value = formData.value[fieldName as keyof typeof formData.value];
      let isValid = true;
      let errorMessage = '';

      switch (fieldName) {
        case 'serialNumber':
          isValid = /^[A-Za-z0-9-]{5,20}$/.test(value);
          errorMessage = isValid ? '' : 'Invalid serial number format';
          break;
        case 'model':
          isValid = value.length >= 2 && value.length <= 50;
          errorMessage = isValid ? '' : 'Model must be between 2 and 50 characters';
          break;
        case 'type':
          isValid = Object.values(EquipmentType).includes(value);
          errorMessage = isValid ? '' : 'Invalid equipment type';
          break;
        case 'condition':
          isValid = value.length >= 2 && value.length <= 100;
          errorMessage = isValid ? '' : 'Condition must be between 2 and 100 characters';
          break;
        case 'purchaseDate':
          isValid = new Date(value) <= new Date();
          errorMessage = isValid ? '' : 'Purchase date cannot be in the future';
          break;
        case 'notes':
          isValid = !value || value.length <= 500;
          errorMessage = isValid ? '' : 'Notes cannot exceed 500 characters';
          break;
      }

      if (!isValid) {
        errors.value[fieldName] = errorMessage;
      } else {
        delete errors.value[fieldName];
      }

      return isValid;
    };

    // Form submission
    const handleSubmit = async () => {
      try {
        loading.value = true;

        // Validate all fields
        const validations = await Promise.all(
          Object.keys(formData.value).map(field => validateField(field))
        );

        if (validations.some(v => !v)) {
          showErrorNotification('Please correct the form errors');
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

        emit('save');
      } catch (error) {
        showErrorNotification(`Failed to ${props.equipment ? 'update' : 'create'} equipment: ${error.message}`);
      } finally {
        loading.value = false;
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
      loading,
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
  padding: 1rem;
}
</style>