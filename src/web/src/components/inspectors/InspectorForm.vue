<template>
  <QForm
    ref="formRef"
    @submit.prevent="onSubmit"
    class="inspector-form"
    aria-labelledby="form-title"
  >
    <QCard flat bordered>
      <QCardSection>
        <h2 id="form-title" class="text-h6 q-mb-md">
          {{ modelValue?.id ? 'Edit Inspector' : 'Create Inspector' }}
        </h2>

        <!-- Basic Information Section -->
        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-6">
            <QInput
              v-model="formData.badgeNumber"
              :error="v$.badgeNumber.$error"
              :error-message="v$.badgeNumber.$errors[0]?.$message"
              label="Badge Number *"
              outlined
              dense
              @blur="v$.badgeNumber.$touch"
              aria-required="true"
            />
          </div>

          <div class="col-12 col-md-6">
            <QSelect
              v-model="formData.status"
              :options="statusOptions"
              :error="v$.status.$error"
              :error-message="v$.status.$errors[0]?.$message"
              label="Status *"
              outlined
              dense
              emit-value
              map-options
              @blur="v$.status.$touch"
              aria-required="true"
            />
          </div>
        </div>

        <!-- Location Section -->
        <div class="row q-col-gutter-md q-mt-md">
          <div class="col-12">
            <h3 class="text-subtitle1 q-mb-sm">Location</h3>
          </div>
          <div class="col-12 col-md-6">
            <QInput
              v-model.number="formData.location.latitude"
              type="number"
              :error="v$.location.latitude.$error"
              :error-message="v$.location.latitude.$errors[0]?.$message"
              label="Latitude *"
              outlined
              dense
              step="0.000001"
              @blur="v$.location.latitude.$touch"
              aria-required="true"
            />
          </div>
          <div class="col-12 col-md-6">
            <QInput
              v-model.number="formData.location.longitude"
              type="number"
              :error="v$.location.longitude.$error"
              :error-message="v$.location.longitude.$errors[0]?.$message"
              label="Longitude *"
              outlined
              dense
              step="0.000001"
              @blur="v$.location.longitude.$touch"
              aria-required="true"
            />
          </div>
        </div>

        <!-- Certifications Section -->
        <div class="row q-col-gutter-md q-mt-md">
          <div class="col-12">
            <h3 class="text-subtitle1 q-mb-sm">Certifications</h3>
          </div>
          
          <div class="col-12" v-for="(cert, index) in formData.certifications" :key="index">
            <QCard flat bordered class="q-pa-sm">
              <div class="row q-col-gutter-sm">
                <div class="col-12 col-md-4">
                  <QInput
                    v-model="cert.name"
                    :error="v$.certifications.$each.$response.$errors[index]?.name?.[0]?.$message"
                    label="Certification Name *"
                    outlined
                    dense
                    @blur="v$.certifications.$each[index].name.$touch"
                    aria-required="true"
                  />
                </div>
                <div class="col-12 col-md-4">
                  <QInput
                    v-model="cert.issuingAuthority"
                    :error="v$.certifications.$each.$response.$errors[index]?.issuingAuthority?.[0]?.$message"
                    label="Issuing Authority *"
                    outlined
                    dense
                    @blur="v$.certifications.$each[index].issuingAuthority.$touch"
                    aria-required="true"
                  />
                </div>
                <div class="col-12 col-md-3">
                  <QInput
                    v-model="cert.expiryDate"
                    type="date"
                    :error="v$.certifications.$each.$response.$errors[index]?.expiryDate?.[0]?.$message"
                    label="Expiry Date *"
                    outlined
                    dense
                    :min="minExpiryDate"
                    @blur="v$.certifications.$each[index].expiryDate.$touch"
                    aria-required="true"
                  />
                </div>
                <div class="col-12 col-md-1 flex items-center">
                  <QBtn
                    flat
                    round
                    color="negative"
                    icon="delete"
                    @click="removeCertification(index)"
                    :aria-label="`Remove certification ${index + 1}`"
                  />
                </div>
              </div>
            </QCard>
          </div>

          <div class="col-12">
            <QBtn
              flat
              color="primary"
              icon="add"
              label="Add Certification"
              @click="addCertification"
              :disable="formData.certifications.length >= 5"
              aria-label="Add new certification"
            />
          </div>
        </div>
      </QCardSection>

      <QCardActions align="right" class="q-pa-md">
        <QBtn
          flat
          label="Cancel"
          color="primary"
          @click="$emit('cancel')"
          :disable="isSubmitting"
          type="button"
        />
        <QBtn
          :loading="isSubmitting"
          :label="modelValue?.id ? 'Update' : 'Create'"
          color="primary"
          type="submit"
        />
      </QCardActions>
    </QCard>
  </QForm>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue'; // ^3.3.0
import { useVuelidate } from '@vuelidate/core'; // ^2.0.0
import { required, minValue, maxValue, helpers } from '@vuelidate/validators'; // ^2.0.0
import { QForm, QInput, QSelect, QBtn, QCard, QCardSection, QCardActions } from 'quasar'; // ^2.0.0
import { Inspector, InspectorStatus } from '../../models/inspector.model';
import { useInspector } from '../../composables/useInspector';
import { useNotificationStore } from '../../stores/notification.store';

export default defineComponent({
  name: 'InspectorForm',

  components: {
    QForm,
    QInput,
    QSelect,
    QBtn,
    QCard,
    QCardSection,
    QCardActions
  },

  props: {
    modelValue: {
      type: Object as () => Inspector | null,
      default: null
    }
  },

  emits: ['update:modelValue', 'submit', 'cancel', 'error'],

  setup(props, { emit }) {
    const formRef = ref<typeof QForm | null>(null);
    const isSubmitting = ref(false);
    const notificationStore = useNotificationStore();
    const { createInspector, updateInspector, validateLocation } = useInspector();

    // Form data initialization
    const formData = ref({
      badgeNumber: props.modelValue?.badgeNumber || '',
      status: props.modelValue?.status || InspectorStatus.Inactive,
      location: {
        latitude: props.modelValue?.location?.latitude || 0,
        longitude: props.modelValue?.location?.longitude || 0
      },
      certifications: props.modelValue?.certifications || []
    });

    // Validation rules
    const rules = computed(() => ({
      badgeNumber: { required: helpers.withMessage('Badge number is required', required) },
      status: { required: helpers.withMessage('Status is required', required) },
      location: {
        latitude: { 
          required: helpers.withMessage('Latitude is required', required),
          minValue: helpers.withMessage('Latitude must be between -90 and 90', minValue(-90)),
          maxValue: helpers.withMessage('Latitude must be between -90 and 90', maxValue(90))
        },
        longitude: {
          required: helpers.withMessage('Longitude is required', required),
          minValue: helpers.withMessage('Longitude must be between -180 and 180', minValue(-180)),
          maxValue: helpers.withMessage('Longitude must be between -180 and 180', maxValue(180))
        }
      },
      certifications: {
        $each: helpers.forEach({
          name: { required: helpers.withMessage('Certification name is required', required) },
          issuingAuthority: { required: helpers.withMessage('Issuing authority is required', required) },
          expiryDate: { 
            required: helpers.withMessage('Expiry date is required', required),
            futureDate: helpers.withMessage('Expiry date must be in the future', (value) => new Date(value) > new Date())
          }
        })
      }
    }));

    const v$ = useVuelidate(rules, formData);

    // Computed properties
    const statusOptions = computed(() => Object.entries(InspectorStatus).map(([label, value]) => ({
      label,
      value
    })));

    const minExpiryDate = computed(() => {
      const today = new Date();
      return today.toISOString().split('T')[0];
    });

    // Methods
    const addCertification = () => {
      formData.value.certifications.push({
        name: '',
        issuingAuthority: '',
        expiryDate: '',
        certificationNumber: '',
        issueDate: new Date(),
        isActive: true
      });
    };

    const removeCertification = (index: number) => {
      formData.value.certifications.splice(index, 1);
    };

    const onSubmit = async () => {
      try {
        isSubmitting.value = true;
        const isValid = await v$.value.$validate();
        
        if (!isValid) {
          notificationStore.error('Please correct the form errors before submitting');
          return;
        }

        // Validate location
        if (!validateLocation(formData.value.location)) {
          notificationStore.error('Invalid location coordinates');
          return;
        }

        const inspectorData = {
          ...props.modelValue,
          ...formData.value
        };

        if (props.modelValue?.id) {
          await updateInspector(inspectorData);
          notificationStore.success('Inspector updated successfully');
        } else {
          const newInspectorId = await createInspector(inspectorData);
          notificationStore.success('Inspector created successfully');
        }

        emit('submit', inspectorData);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An error occurred';
        notificationStore.error(errorMessage);
        emit('error', error);
      } finally {
        isSubmitting.value = false;
      }
    };

    return {
      formRef,
      formData,
      v$,
      isSubmitting,
      statusOptions,
      minExpiryDate,
      addCertification,
      removeCertification,
      onSubmit
    };
  }
});
</script>

<style lang="scss" scoped>
.inspector-form {
  max-width: 1200px;
  margin: 0 auto;
}

// Ensure form elements are accessible via keyboard navigation
:deep(.q-field) {
  &:focus-within {
    outline: 2px solid $primary;
    outline-offset: 2px;
  }
}

// High contrast focus indicators for accessibility
:deep(.q-btn) {
  &:focus-visible {
    outline: 3px solid $primary;
    outline-offset: 2px;
  }
}
</style>