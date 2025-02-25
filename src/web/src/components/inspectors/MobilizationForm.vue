<template>
  <q-form
    ref="mobilizationForm"
    @submit.prevent="handleSubmit"
    class="mobilization-form"
    aria-labelledby="mobilization-form-title"
  >
    <h2 id="mobilization-form-title" class="text-h6 q-mb-md">Inspector Mobilization</h2>

    <!-- Location Section -->
    <div class="location-section q-mb-lg">
      <h3 class="text-subtitle1 q-mb-sm">Location Details</h3>
      <div class="row q-col-gutter-md">
        <div class="col-12 col-sm-6">
          <q-input
            v-model.number="formData.latitude"
            type="number"
            label="Latitude"
            :rules="[
              val => !!val || 'Latitude is required',
              val => (val >= -90 && val <= 90) || 'Latitude must be between -90 and 90 degrees'
            ]"
            :error="!!errors.latitude"
            :error-message="errors.latitude"
            step="0.000001"
            clearable
            aria-label="Enter latitude coordinate"
            aria-describedby="latitude-hint"
          />
          <div id="latitude-hint" class="text-caption q-mt-sm">Enter a value between -90 and 90 degrees</div>
        </div>
        <div class="col-12 col-sm-6">
          <q-input
            v-model.number="formData.longitude"
            type="number"
            label="Longitude"
            :rules="[
              val => !!val || 'Longitude is required',
              val => (val >= -180 && val <= 180) || 'Longitude must be between -180 and 180 degrees'
            ]"
            :error="!!errors.longitude"
            :error-message="errors.longitude"
            step="0.000001"
            clearable
            aria-label="Enter longitude coordinate"
            aria-describedby="longitude-hint"
          />
          <div id="longitude-hint" class="text-caption q-mt-sm">Enter a value between -180 and 180 degrees</div>
        </div>
      </div>
    </div>

    <!-- Date Section -->
    <div class="date-section q-mb-lg">
      <h3 class="text-subtitle1 q-mb-sm">Mobilization Date</h3>
      <q-date
        v-model="formData.mobilizationDate"
        :min="minDate"
        mask="YYYY-MM-DD"
        :rules="[val => !!val || 'Mobilization date is required']"
        :error="!!errors.mobilizationDate"
        :error-message="errors.mobilizationDate"
        class="full-width"
        aria-label="Select mobilization start date"
        aria-describedby="date-hint"
      >
        <div class="row items-center justify-end">
          <q-btn
            label="Today"
            flat
            color="primary"
            @click="setToday"
            aria-label="Set date to today"
          />
        </div>
      </q-date>
      <div id="date-hint" class="text-caption q-mt-sm">Select a future date for mobilization</div>
    </div>

    <!-- Notes Section -->
    <div class="notes-section q-mb-lg">
      <q-input
        v-model="formData.notes"
        type="textarea"
        label="Mobilization Notes"
        rows="3"
        maxlength="500"
        counter
        class="full-width"
        aria-label="Enter mobilization notes"
      />
    </div>

    <!-- Form Actions -->
    <div class="row q-gutter-md justify-end">
      <q-btn
        flat
        label="Reset"
        type="reset"
        color="grey"
        :disable="loading"
        @click="resetForm"
        aria-label="Reset form"
      />
      <q-btn
        :loading="loading"
        :disable="!isFormValid"
        label="Submit"
        type="submit"
        color="primary"
        aria-label="Submit mobilization form"
      >
        <template v-slot:loading>
          <q-spinner-dots class="on-left" />
          Processing...
        </template>
      </q-btn>
    </div>
  </q-form>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { QForm, QInput, QBtn, QDate, QSpinner } from 'quasar';
import { useInspector } from '@/composables/useInspector';
import type { Inspector, GeographyPoint } from '@/models/inspector.model';

interface FormData {
  latitude: number | null;
  longitude: number | null;
  mobilizationDate: string;
  notes: string;
}

interface FormErrors {
  latitude?: string;
  longitude?: string;
  mobilizationDate?: string;
}

export default defineComponent({
  name: 'MobilizationForm',

  props: {
    inspector: {
      type: Object as () => Inspector,
      required: true
    }
  },

  emits: ['mobilization-complete', 'mobilization-error'],

  setup(props, { emit }) {
    const { mobilizeInspector, loading, validateCoordinates } = useInspector();
    const mobilizationForm = ref<typeof QForm | null>(null);
    const errors = ref<FormErrors>({});

    const formData = ref<FormData>({
      latitude: props.inspector.location?.latitude ?? null,
      longitude: props.inspector.location?.longitude ?? null,
      mobilizationDate: new Date().toISOString().split('T')[0],
      notes: ''
    });

    const minDate = computed(() => {
      const today = new Date();
      return today.toISOString().split('T')[0];
    });

    const isFormValid = computed(() => {
      return !!(
        formData.value.latitude &&
        formData.value.longitude &&
        formData.value.mobilizationDate &&
        Object.keys(errors.value).length === 0
      );
    });

    const validateLocation = (): boolean => {
      errors.value = {};

      if (!formData.value.latitude || !formData.value.longitude) {
        errors.value.latitude = 'Both latitude and longitude are required';
        return false;
      }

      try {
        const location: GeographyPoint = {
          latitude: formData.value.latitude,
          longitude: formData.value.longitude
        };
        validateCoordinates(location);
        return true;
      } catch (error) {
        errors.value.latitude = error instanceof Error ? error.message : 'Invalid coordinates';
        return false;
      }
    };

    const validateDate = (): boolean => {
      const selectedDate = new Date(formData.value.mobilizationDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        errors.value.mobilizationDate = 'Mobilization date must be today or later';
        return false;
      }
      return true;
    };

    const handleSubmit = async () => {
      if (!mobilizationForm.value) return;

      const isValid = await mobilizationForm.value.validate();
      if (!isValid || !validateLocation() || !validateDate()) {
        emit('mobilization-error', 'Please correct the form errors');
        return;
      }

      try {
        await mobilizeInspector(props.inspector.id);
        emit('mobilization-complete', {
          inspectorId: props.inspector.id,
          location: {
            latitude: formData.value.latitude,
            longitude: formData.value.longitude
          },
          mobilizationDate: formData.value.mobilizationDate,
          notes: formData.value.notes
        });
      } catch (error) {
        emit('mobilization-error', error instanceof Error ? error.message : 'Mobilization failed');
      }
    };

    const resetForm = () => {
      formData.value = {
        latitude: null,
        longitude: null,
        mobilizationDate: new Date().toISOString().split('T')[0],
        notes: ''
      };
      errors.value = {};
      mobilizationForm.value?.resetValidation();
    };

    const setToday = () => {
      formData.value.mobilizationDate = new Date().toISOString().split('T')[0];
    };

    onMounted(() => {
      if (props.inspector.location) {
        formData.value.latitude = props.inspector.location.latitude;
        formData.value.longitude = props.inspector.location.longitude;
      }
    });

    return {
      formData,
      errors,
      loading,
      minDate,
      isFormValid,
      mobilizationForm,
      handleSubmit,
      resetForm,
      setToday
    };
  }
});
</script>

<style lang="scss" scoped>
.mobilization-form {
  max-width: 800px;
  margin: 0 auto;
  padding: 1.5rem;

  .location-section,
  .date-section,
  .notes-section {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 1rem;
    background-color: #f8f8f8;
  }

  // Enhance focus visibility for accessibility
  :deep(.q-field__native:focus),
  :deep(.q-field__native:focus-visible) {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }

  // High contrast focus indicators for keyboard navigation
  :deep(.q-btn:focus-visible) {
    outline: 3px solid #1976d2;
    outline-offset: 2px;
  }
}
</style>