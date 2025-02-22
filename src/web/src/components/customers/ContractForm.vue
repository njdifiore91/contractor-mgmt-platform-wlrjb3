<template>
  <q-form
    ref="formRef"
    @submit.prevent="submitForm"
    class="contract-form"
    aria-labelledby="contract-form-title"
  >
    <h2 id="contract-form-title" class="text-h6 q-mb-md">
      {{ contract ? 'Edit Contract' : 'New Contract' }}
    </h2>

    <div class="row q-col-gutter-md">
      <!-- Contract Number -->
      <div class="col-12 col-md-6">
        <q-input
          v-model="formData.contractNumber"
          label="Contract Number *"
          :rules="[validateRequired]"
          :error="!!errors.contractNumber"
          :error-message="errors.contractNumber"
          @blur="setTouched('contractNumber')"
          aria-required="true"
          maxlength="50"
          outlined
          dense
        />
      </div>

      <!-- Contract Value -->
      <div class="col-12 col-md-6">
        <q-input
          v-model="formData.value"
          type="number"
          label="Contract Value ($) *"
          :rules="[validateRequired]"
          :error="!!errors.value"
          :error-message="errors.value"
          @blur="setTouched('value')"
          aria-required="true"
          prefix="$"
          min="0"
          step="0.01"
          outlined
          dense
        />
      </div>

      <!-- Start Date -->
      <div class="col-12 col-md-6">
        <q-input
          v-model="formData.startDate"
          type="date"
          label="Start Date *"
          :rules="[validateRequired]"
          :error="!!errors.startDate"
          :error-message="errors.startDate"
          @blur="setTouched('startDate')"
          aria-required="true"
          outlined
          dense
        >
          <template v-slot:append>
            <q-icon name="event" class="cursor-pointer">
              <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                <q-date v-model="formData.startDate" mask="YYYY-MM-DD" />
              </q-popup-proxy>
            </q-icon>
          </template>
        </q-input>
      </div>

      <!-- End Date -->
      <div class="col-12 col-md-6">
        <q-input
          v-model="formData.endDate"
          type="date"
          label="End Date *"
          :rules="[validateRequired]"
          :error="!!errors.endDate"
          :error-message="errors.endDate"
          @blur="setTouched('endDate')"
          aria-required="true"
          outlined
          dense
        >
          <template v-slot:append>
            <q-icon name="event" class="cursor-pointer">
              <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                <q-date v-model="formData.endDate" mask="YYYY-MM-DD" />
              </q-popup-proxy>
            </q-icon>
          </template>
        </q-input>
      </div>

      <!-- Status -->
      <div class="col-12 col-md-6">
        <q-select
          v-model="formData.status"
          :options="statusOptions"
          label="Status *"
          :rules="[validateRequired]"
          :error="!!errors.status"
          :error-message="errors.status"
          @blur="setTouched('status')"
          aria-required="true"
          emit-value
          map-options
          outlined
          dense
        />
      </div>

      <!-- Description -->
      <div class="col-12">
        <q-input
          v-model="formData.description"
          type="textarea"
          label="Description"
          rows="3"
          maxlength="500"
          counter
          outlined
        />
      </div>
    </div>

    <!-- Form Actions -->
    <div class="row q-col-gutter-md q-mt-md">
      <div class="col-12 flex justify-end">
        <q-btn
          label="Cancel"
          flat
          color="grey"
          class="q-mr-sm"
          @click="$emit('cancel')"
          :disable="loading"
        />
        <q-btn
          type="submit"
          :label="contract ? 'Update Contract' : 'Create Contract'"
          color="primary"
          :loading="loading"
        />
      </div>
    </div>
  </q-form>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch } from 'vue'; // v3.x
import { useQuasar } from '@quasar/vue'; // v2.x
import { IContract, ContractStatus } from '../../models/customer.model';
import { useCustomerStore } from '../../stores/customer.store';
import { validateRequired, validateDateRange, useValidation } from '../../utils/validation.util';
import sanitizeHtml from 'sanitize-html'; // v2.x
import { auditLogger } from '@company/audit-logger'; // v1.x

export default defineComponent({
  name: 'ContractForm',

  props: {
    customerId: {
      type: Number,
      required: true
    },
    contract: {
      type: Object as () => IContract,
      default: null
    }
  },

  emits: ['submit', 'cancel', 'error'],

  setup(props, { emit }) {
    const $q = useQuasar();
    const customerStore = useCustomerStore();
    const formRef = ref(null);
    const loading = ref(false);
    const { errors, touched, setError, clearError, setTouched } = useValidation();

    // Form data with type safety
    const formData = ref<Partial<IContract>>({
      contractNumber: '',
      customerId: props.customerId,
      value: 0,
      startDate: '',
      endDate: '',
      status: ContractStatus.Active,
      description: '',
      isActive: true
    });

    // Status options for dropdown
    const statusOptions = [
      { label: 'Active', value: ContractStatus.Active },
      { label: 'Terminated', value: ContractStatus.Terminated },
      { label: 'Renewed', value: ContractStatus.Renewed }
    ];

    // Initialize form with existing contract data
    onMounted(() => {
      if (props.contract) {
        formData.value = {
          ...props.contract,
          startDate: new Date(props.contract.startDate).toISOString().split('T')[0],
          endDate: new Date(props.contract.endDate).toISOString().split('T')[0]
        };
      }
    });

    // Watch for date changes to validate range
    watch([() => formData.value.startDate, () => formData.value.endDate], ([start, end]) => {
      if (start && end) {
        const isValid = validateDateRange(new Date(start), new Date(end));
        if (!isValid) {
          setError('endDate', 'End date must be after start date and within one year');
        } else {
          clearError('endDate');
        }
      }
    });

    // Form submission handler with security and validation
    const submitForm = async () => {
      try {
        loading.value = true;

        // Validate form
        const isValid = await validateForm();
        if (!isValid) return;

        // Sanitize inputs
        const sanitizedData = {
          ...formData.value,
          description: formData.value.description ? 
            sanitizeHtml(formData.value.description, {
              allowedTags: [],
              allowedAttributes: {}
            }) : '',
          customerId: props.customerId,
          value: Number(formData.value.value)
        };

        // Create or update contract
        const result = props.contract
          ? await customerStore.updateContract(props.contract.id, sanitizedData)
          : await customerStore.createContract(props.customerId, sanitizedData);

        // Log audit trail
        await auditLogger.log({
          action: props.contract ? 'UPDATE_CONTRACT' : 'CREATE_CONTRACT',
          entityType: 'Contract',
          entityId: result.id,
          changes: sanitizedData
        });

        // Show success notification
        $q.notify({
          type: 'positive',
          message: `Contract ${props.contract ? 'updated' : 'created'} successfully`,
          position: 'top-right'
        });

        emit('submit', result);
      } catch (error) {
        console.error('Contract form error:', error);
        $q.notify({
          type: 'negative',
          message: 'Failed to save contract. Please try again.',
          position: 'top-right'
        });
        emit('error', error);
      } finally {
        loading.value = false;
      }
    };

    // Comprehensive form validation
    const validateForm = async (): Promise<boolean> => {
      if (!formRef.value) return false;

      const isFormValid = await formRef.value.validate();
      if (!isFormValid) return false;

      // Additional validation checks
      if (!validateDateRange(new Date(formData.value.startDate!), new Date(formData.value.endDate!))) {
        setError('endDate', 'End date must be after start date and within one year');
        return false;
      }

      if (Number(formData.value.value) <= 0) {
        setError('value', 'Contract value must be greater than zero');
        return false;
      }

      return true;
    };

    return {
      formRef,
      formData,
      loading,
      errors,
      statusOptions,
      validateRequired,
      setTouched,
      submitForm
    };
  }
});
</script>

<style lang="scss" scoped>
.contract-form {
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;

  // Enhance form accessibility
  :deep(.q-field) {
    &--error {
      .q-field__bottom {
        color: var(--q-negative);
      }
    }

    &__label {
      font-weight: 500;
    }

    &__native,
    &__input {
      &:focus {
        outline: 2px solid var(--q-primary);
        outline-offset: -2px;
      }
    }
  }
}
</style>