<template>
  <q-form
    ref="formRef"
    @submit.prevent="handleSubmit"
    class="customer-form q-gutter-md"
    aria-label="Customer Information Form"
  >
    <!-- Basic Information Section -->
    <div class="form-section">
      <h2 class="text-h6 q-mb-md">Basic Information</h2>
      <div class="row q-col-gutter-md">
        <div class="col-12 col-md-6">
          <q-input
            v-model="formData.code"
            label="Customer Code *"
            :rules="[validateRequired, val => val && val.length <= 20]"
            @blur="validateField('code')"
            :error="!!errors.code"
            :error-message="errors.code"
            outlined
            dense
          />
        </div>
        <div class="col-12 col-md-6">
          <q-input
            v-model="formData.name"
            label="Business Name *"
            :rules="[validateRequired, validateBusinessName]"
            @blur="validateField('name')"
            :error="!!errors.name"
            :error-message="errors.name"
            outlined
            dense
          />
        </div>
        <div class="col-12 col-md-6">
          <q-select
            v-model="formData.industry"
            :options="industryOptions"
            label="Industry *"
            :rules="[validateRequired]"
            @blur="validateField('industry')"
            :error="!!errors.industry"
            :error-message="errors.industry"
            outlined
            dense
            emit-value
            map-options
          />
        </div>
        <div class="col-12 col-md-6">
          <q-select
            v-model="formData.region"
            :options="regionOptions"
            label="Region *"
            :rules="[validateRequired]"
            @blur="validateField('region')"
            :error="!!errors.region"
            :error-message="errors.region"
            outlined
            dense
            emit-value
            map-options
          />
        </div>
      </div>
    </div>

    <!-- Contact Information Section -->
    <div class="form-section q-mt-lg">
      <h2 class="text-h6 q-mb-md">Contact Information</h2>
      <div class="row q-col-gutter-md">
        <div class="col-12">
          <q-input
            v-model="formData.address"
            label="Address *"
            :rules="[validateRequired]"
            @blur="validateField('address')"
            :error="!!errors.address"
            :error-message="errors.address"
            outlined
            dense
          />
        </div>
        <div class="col-12 col-md-6">
          <q-input
            v-model="formData.city"
            label="City *"
            :rules="[validateRequired]"
            @blur="validateField('city')"
            :error="!!errors.city"
            :error-message="errors.city"
            outlined
            dense
          />
        </div>
        <div class="col-12 col-md-3">
          <q-select
            v-model="formData.state"
            :options="stateOptions"
            label="State *"
            :rules="[validateRequired]"
            @blur="validateField('state')"
            :error="!!errors.state"
            :error-message="errors.state"
            outlined
            dense
            emit-value
            map-options
          />
        </div>
        <div class="col-12 col-md-3">
          <q-input
            v-model="formData.postalCode"
            label="Postal Code *"
            :rules="[validateRequired, validatePostalCode]"
            @blur="validateField('postalCode')"
            :error="!!errors.postalCode"
            :error-message="errors.postalCode"
            outlined
            dense
          />
        </div>
        <div class="col-12 col-md-6">
          <q-select
            v-model="formData.country"
            :options="countryOptions"
            label="Country *"
            :rules="[validateRequired]"
            @blur="validateField('country')"
            :error="!!errors.country"
            :error-message="errors.country"
            outlined
            dense
            emit-value
            map-options
          />
        </div>
      </div>
    </div>

    <!-- Security Information Section -->
    <div class="form-section q-mt-lg">
      <h2 class="text-h6 q-mb-md">Security Information</h2>
      <div class="row q-col-gutter-md">
        <div class="col-12 col-md-6">
          <q-select
            v-model="formData.securityLevel"
            :options="securityLevelOptions"
            label="Security Level *"
            :rules="[validateRequired, validateSecurityLevel]"
            @blur="validateField('securityLevel')"
            :error="!!errors.securityLevel"
            :error-message="errors.securityLevel"
            outlined
            dense
            emit-value
            map-options
          />
        </div>
        <div class="col-12 col-md-6">
          <q-select
            v-model="formData.complianceRequirements"
            :options="complianceOptions"
            label="Compliance Requirements *"
            :rules="[validateRequired]"
            @blur="validateField('complianceRequirements')"
            :error="!!errors.complianceRequirements"
            :error-message="errors.complianceRequirements"
            outlined
            dense
            multiple
            emit-value
            map-options
          />
        </div>
      </div>
    </div>

    <!-- Form Actions -->
    <div class="form-actions q-mt-lg">
      <q-btn
        type="submit"
        color="primary"
        :loading="loading"
        :disable="hasErrors || loading"
        label="Save Customer"
      />
      <q-btn
        flat
        color="grey"
        label="Cancel"
        class="q-ml-sm"
        @click="$emit('cancel')"
      />
    </div>
  </q-form>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onMounted } from 'vue'; // ^3.0.0
import { useQuasar } from '@quasar/vue'; // ^2.0.0
import { useI18n } from 'vue-i18n'; // ^9.0.0
import { ICustomer } from '@/models/customer.model';
import { useCustomer } from '@/composables/useCustomer';
import {
  validateEmail,
  validatePhoneNumber,
  validateRequired,
  validatePostalCode,
  validateSecurityLevel,
  useValidation
} from '@/utils/validation.util';

export default defineComponent({
  name: 'CustomerForm',

  props: {
    modelValue: {
      type: Object as () => ICustomer | null,
      default: null
    }
  },

  emits: [
    'update:modelValue',
    'submit',
    'success',
    'error',
    'cancel',
    'securityViolation'
  ],

  setup(props, { emit }) {
    const $q = useQuasar();
    const { t } = useI18n();
    const { createCustomer, updateCustomer } = useCustomer();
    const formRef = ref<any>(null);
    const loading = ref(false);
    const { errors, touched, setError, clearError, setTouched } = useValidation();

    // Form data with security tracking
    const formData = ref<Partial<ICustomer>>({
      code: '',
      name: '',
      industry: '',
      region: '',
      address: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      securityLevel: '',
      complianceRequirements: [],
      status: 'Active',
      isActive: true
    });

    // Options for select fields
    const industryOptions = ref([
      { label: 'Energy', value: 'energy' },
      { label: 'Manufacturing', value: 'manufacturing' },
      { label: 'Technology', value: 'technology' },
      { label: 'Transportation', value: 'transportation' }
    ]);

    const regionOptions = ref([
      { label: 'North America', value: 'NA' },
      { label: 'South America', value: 'SA' },
      { label: 'Europe', value: 'EU' },
      { label: 'Asia', value: 'AS' }
    ]);

    const securityLevelOptions = ref([
      { label: 'Standard', value: 'standard' },
      { label: 'Enhanced', value: 'enhanced' },
      { label: 'High', value: 'high' }
    ]);

    const complianceOptions = ref([
      { label: 'ISO 27001', value: 'iso27001' },
      { label: 'GDPR', value: 'gdpr' },
      { label: 'SOC 2', value: 'soc2' }
    ]);

    // Computed properties
    const hasErrors = computed(() => Object.keys(errors.value).length > 0);

    // Initialize form with existing data
    const initializeForm = () => {
      if (props.modelValue) {
        // Validate security classification before populating
        if (!validateSecurityLevel(props.modelValue.securityLevel)) {
          emit('securityViolation', {
            type: 'invalid_security_level',
            message: 'Invalid security level detected'
          });
          return;
        }

        // Sanitize and populate form data
        Object.keys(formData.value).forEach(key => {
          if (key in props.modelValue!) {
            formData.value[key as keyof ICustomer] = props.modelValue![key as keyof ICustomer];
          }
        });
      }
    };

    // Form validation
    const validateForm = async (): Promise<boolean> => {
      if (!formRef.value) return false;

      const isValid = await formRef.value.validate();
      if (!isValid) return false;

      // Additional security validation
      if (!validateSecurityLevel(formData.value.securityLevel)) {
        setError('securityLevel', t('validation.invalidSecurityLevel'));
        return false;
      }

      return true;
    };

    // Form submission
    const handleSubmit = async () => {
      try {
        loading.value = true;
        
        const isValid = await validateForm();
        if (!isValid) return;

        const customerData = { ...formData.value };
        
        if (props.modelValue?.id) {
          await updateCustomer(props.modelValue.id, customerData);
        } else {
          await createCustomer(customerData);
        }

        emit('success', customerData);
        $q.notify({
          type: 'positive',
          message: t('customer.saveSuccess')
        });
      } catch (error) {
        console.error('Error saving customer:', error);
        emit('error', error);
        $q.notify({
          type: 'negative',
          message: t('customer.saveError')
        });
      } finally {
        loading.value = false;
      }
    };

    // Field validation
    const validateField = (field: string) => {
      setTouched(field);
      clearError(field);

      const value = formData.value[field as keyof ICustomer];
      if (!validateRequired(value)) {
        setError(field, t('validation.required'));
      }
    };

    // Watchers
    watch(() => props.modelValue, initializeForm, { immediate: true });

    // Lifecycle hooks
    onMounted(() => {
      initializeForm();
    });

    return {
      formRef,
      formData,
      loading,
      errors,
      hasErrors,
      industryOptions,
      regionOptions,
      securityLevelOptions,
      complianceOptions,
      validateRequired,
      validateField,
      handleSubmit
    };
  }
});
</script>

<style lang="scss" scoped>
.customer-form {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;

  .form-section {
    background: #fff;
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
  }
}
</style>