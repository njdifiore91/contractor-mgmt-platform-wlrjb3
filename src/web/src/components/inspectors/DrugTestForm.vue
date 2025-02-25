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

      <QSelect
        v-model="formData.result"
        :options="resultOptions"
        label="Test Result"
        :rules="[val => !!val || 'Test result is required']"
        emit-value
        map-options
        class="q-mb-md"
        aria-required="true"
        :error-message="'Please select a test result'"
      />

      <QInput
        v-model="formData.notes"
        type="textarea"
        label="Notes"
        class="q-mb-lg"
        aria-label="Additional notes"
        :rules="[val => !val || val.length <= 500 || 'Notes cannot exceed 500 characters']"
      />

      <div class="row justify-end q-gutter-sm">
        <QBtn
          label="Cancel"
          color="grey"
          flat
          @click="handleCancel"
          aria-label="Cancel drug test"
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
import { defineComponent, ref, computed } from 'vue';
import { QForm, QInput, QSelect, QBtn, QCard, QCardSection, date } from 'quasar';
import type { DrugTest } from '@/models/inspector.model';
import { useNotification } from '@/composables/useNotification';
import { addDrugTest } from '@/api/inspector.api';

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
      type: [Number, String],
      required: true,
      validator: (value: number | string) => {
        const numValue = typeof value === 'string' ? parseInt(value) : value;
        return !isNaN(numValue) && numValue > 0;
      }
    }
  },

  emits: ['submitted', 'cancel'],

  setup(props, { emit }) {
    const drugTestForm = ref<typeof QForm | null>(null);
    const isSubmitting = ref(false);
    const { showSuccess, showError } = useNotification();

    const currentDate = computed(() => date.formatDate(new Date(), 'YYYY-MM-DD'));

    const formData = ref({
      testDate: currentDate.value,
      result: '',
      notes: ''
    });

    const resultOptions = [
      { label: 'Negative', value: 'Negative' },
      { label: 'Positive', value: 'Positive' }
    ];

    const sanitizeInput = (input: string): string => {
      return input.trim().replace(/[<>]/g, '');
    };

    const submitForm = async () => {
      try {
        const isValid = await drugTestForm.value?.validate();
        if (!isValid) return;

        isSubmitting.value = true;

        await addDrugTest(props.inspectorId.toString(), {
          testDate: new Date(formData.value.testDate),
          result: formData.value.result,
          notes: sanitizeInput(formData.value.notes)
        });

        showSuccess('Drug test record created successfully');
        emit('submitted');

      } catch (error) {
        showError(error instanceof Error ? error.message : 'Failed to create drug test record');
      } finally {
        isSubmitting.value = false;
      }
    };

    const handleCancel = () => {
      formData.value = {
        testDate: currentDate.value,
        result: '',
        notes: ''
      };
      emit('cancel');
    };

    return {
      drugTestForm,
      formData,
      isSubmitting,
      currentDate,
      resultOptions,
      submitForm,
      handleCancel
    };
  }
});
</script>

<style lang="scss">
.drug-test-form {
  min-width: 400px;
  max-width: 600px;
  margin: 0 auto;
}
</style>