<template>
  <QCard class="drug-test-form" role="form" aria-labelledby="drug-test-form-title">
    <QCardSection>
      <h2 id="drug-test-form-title" class="text-h6">Drug Test Record</h2>
    </QCardSection>

    <QForm
      ref="drugTestForm"
      @submit="submitForm"
      class="q-pa-md"
      aria-live="polite"
    >
      <QSelect
        v-model="formData.testType"
        :options="testTypeOptions"
        label="Test Type"
        :rules="[val => !!val || 'Test type is required']"
        emit-value
        map-options
        class="q-mb-md"
        aria-required="true"
        :error-message="'Please select a test type'"
      />

      <QInput
        v-model="formData.testKitId"
        label="Test Kit ID"
        :rules="[validateTestKitId]"
        class="q-mb-md"
        aria-required="true"
        :error-message="'Please enter a valid test kit ID'"
      >
        <template v-slot:hint>
          Format: ABC-12345
        </template>
      </QInput>

      <QInput
        v-model="formData.administeredBy"
        label="Administered By"
        :rules="[val => !!val && val.trim().length > 0 || 'Administrator name is required']"
        class="q-mb-md"
        aria-required="true"
        :error-message="'Please enter the administrator name'"
      />

      <QInput
        v-model="formData.testDate"
        type="date"
        label="Test Date"
        :rules="[
          val => !!val || 'Test date is required',
          val => new Date(val) <= new Date() || 'Test date cannot be in the future'
        ]"
        :max="currentDate"
        class="q-mb-md"
        aria-required="true"
        :error-message="'Please enter a valid test date'"
      />

      <QInput
        v-model="formData.notes"
        type="textarea"
        label="Notes"
        class="q-mb-lg"
        aria-label="Additional notes"
      />

      <div class="row justify-end q-gutter-sm">
        <QBtn
          label="Reset"
          type="reset"
          color="secondary"
          flat
          @click="resetForm"
          aria-label="Reset form"
        />
        <QBtn
          label="Submit"
          type="submit"
          color="primary"
          :loading="isSubmitting"
          aria-label="Submit drug test record"
        />
      </div>
    </QForm>
  </QCard>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue'; // ^3.3.0
import { QForm, QInput, QSelect, QBtn, QCard, QCardSection, date } from 'quasar'; // ^2.0.0
import { DrugTest, DrugTestType } from '../../models/drugTest.model';
import { useInspector } from '../../composables/useInspector';
import { useNotification } from '../../composables/useNotification';

export default defineComponent({
  name: 'DrugTestForm',

  components: {
    QForm,
    QInput,
    QSelect,
    QBtn,
    QCard,
    QCardSection
  },

  props: {
    inspectorId: {
      type: Number,
      required: true,
      validator: (value: number) => value > 0
    }
  },

  emits: ['submitted'],

  setup(props, { emit }) {
    const drugTestForm = ref<typeof QForm | null>(null);
    const isSubmitting = ref(false);
    const { createDrugTest } = useInspector();
    const { showSuccessNotification, showErrorNotification } = useNotification();

    const currentDate = computed(() => date.formatDate(new Date(), 'YYYY-MM-DD'));

    const formData = ref({
      testType: null as DrugTestType | null,
      testKitId: '',
      administeredBy: '',
      testDate: currentDate.value,
      notes: ''
    });

    const testTypeOptions = [
      { label: 'Random', value: DrugTestType.RANDOM },
      { label: 'Pre-Mobilization', value: DrugTestType.PRE_MOBILIZATION },
      { label: 'Incident', value: DrugTestType.INCIDENT },
      { label: 'Periodic', value: DrugTestType.PERIODIC }
    ];

    const validateTestKitId = (value: string): boolean | string => {
      if (!value) return 'Test kit ID is required';
      const testKitPattern = /^[A-Z0-9]+-[0-9]+$/;
      return testKitPattern.test(value) || 'Invalid test kit ID format (e.g., ABC-12345)';
    };

    const sanitizeInput = (input: string): string => {
      return input.trim().replace(/[<>]/g, '');
    };

    const submitForm = async () => {
      try {
        const isValid = await drugTestForm.value?.validate();
        if (!isValid) return;

        isSubmitting.value = true;

        const drugTestData = {
          inspectorId: props.inspectorId,
          testType: formData.value.testType!,
          testKitId: sanitizeInput(formData.value.testKitId),
          administeredBy: sanitizeInput(formData.value.administeredBy),
          testDate: new Date(formData.value.testDate),
          notes: sanitizeInput(formData.value.notes)
        };

        const result = await createDrugTest(drugTestData);

        showSuccessNotification('Drug test record created successfully');
        emit('submitted', result);
        resetForm();

      } catch (error) {
        showErrorNotification(
          error instanceof Error ? error.message : 'Failed to create drug test record'
        );
      } finally {
        isSubmitting.value = false;
      }
    };

    const resetForm = () => {
      formData.value = {
        testType: null,
        testKitId: '',
        administeredBy: '',
        testDate: currentDate.value,
        notes: ''
      };
      drugTestForm.value?.resetValidation();
      
      // Announce form reset to screen readers
      const announcement = document.createElement('div');
      announcement.setAttribute('role', 'status');
      announcement.setAttribute('aria-live', 'polite');
      announcement.textContent = 'Form has been reset';
      document.body.appendChild(announcement);
      setTimeout(() => announcement.remove(), 1000);
    };

    return {
      drugTestForm,
      formData,
      isSubmitting,
      currentDate,
      testTypeOptions,
      validateTestKitId,
      submitForm,
      resetForm
    };
  }
});
</script>

<style lang="scss">
.drug-test-form {
  max-width: 600px;
  margin: 0 auto;

  .q-field {
    &--error {
      margin-bottom: 1rem;
    }
  }

  // Enhance focus visibility for accessibility
  .q-field__native:focus,
  .q-field__native:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
}
</style>