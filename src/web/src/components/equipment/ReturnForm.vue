<template>
  <q-form
    ref="returnForm"
    class="return-form"
    aria-labelledby="return-form-title"
    @submit.prevent="submitReturn"
  >
    <h2 id="return-form-title" class="text-h6 q-mb-md">{{ t('equipment.return.title') }}</h2>

    <!-- Equipment Details Summary -->
    <div class="equipment-summary q-mb-md">
      <div class="text-subtitle2">{{ t('equipment.return.currentEquipment') }}</div>
      <div class="q-pl-md">
        <div>{{ t('equipment.serialNumber') }}: {{ assignment.equipment?.serialNumber }}</div>
        <div>{{ t('equipment.model') }}: {{ assignment.equipment?.model }}</div>
      </div>
    </div>

    <!-- Return Condition Selection -->
    <q-select
      v-model="returnCondition"
      :options="conditionOptions"
      :label="t('equipment.return.condition')"
      :rules="[val => !!val || t('equipment.return.conditionRequired')]"
      :error="!!errors.condition"
      :error-message="errors.condition"
      outlined
      class="q-mb-md"
      emit-value
      map-options
      aria-required="true"
      :disable="isProcessing"
    />

    <!-- Return Notes -->
    <q-input
      v-model="notes"
      type="textarea"
      :label="t('equipment.return.notes')"
      :rules="[
        val => !!val || t('equipment.return.notesRequired'),
        val => val.length >= 10 || t('equipment.return.notesMinLength')
      ]"
      :error="!!errors.notes"
      :error-message="errors.notes"
      outlined
      autogrow
      class="q-mb-md"
      aria-required="true"
      :disable="isProcessing"
    />

    <!-- Form Actions -->
    <div class="row justify-end q-gutter-sm">
      <q-btn
        flat
        :label="t('common.cancel')"
        color="grey"
        :disable="isProcessing"
        @click="cancelReturn"
        data-cy="cancel-return"
      />
      <q-btn
        type="submit"
        :label="t('equipment.return.submit')"
        color="primary"
        :loading="isProcessing"
        :disable="!isValid || isProcessing"
        data-cy="submit-return"
      >
        <template #loading>
          <q-spinner-dots />
        </template>
      </q-btn>
    </div>
  </q-form>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue'; // v3.x
import { useI18n } from 'vue-i18n'; // v9.x
import { QForm, QInput, QSelect, QBtn, QSpinner } from '@quasar/components'; // v2.x
import { Equipment, EquipmentAssignment } from '../../models/equipment.model';
import { useEquipment } from '../../composables/useEquipment';
import { useNotification } from '../../composables/useNotification';

export default defineComponent({
  name: 'ReturnForm',

  components: {
    QForm,
    QInput,
    QSelect,
    QBtn,
    QSpinner
  },

  props: {
    assignment: {
      type: Object as () => EquipmentAssignment,
      required: true,
      validator: (value: EquipmentAssignment) => {
        return !!value && !!value.id && !!value.equipmentId;
      }
    }
  },

  emits: {
    'return-submitted': (success: boolean) => typeof success === 'boolean',
    'return-cancelled': () => true,
    'return-error': (error: string) => typeof error === 'string'
  },

  setup(props, { emit }) {
    const { t } = useI18n();
    const { returnEquipment, isProcessing } = useEquipment();
    const { showError, showSuccess } = useNotification();

    // Form refs and state
    const returnForm = ref<typeof QForm | null>(null);
    const returnCondition = ref<string>('');
    const notes = ref<string>('');
    const errors = ref({
      condition: '',
      notes: ''
    });

    // Condition options for selection
    const conditionOptions = [
      { label: t('equipment.condition.excellent'), value: 'Excellent' },
      { label: t('equipment.condition.good'), value: 'Good' },
      { label: t('equipment.condition.fair'), value: 'Fair' },
      { label: t('equipment.condition.poor'), value: 'Poor' },
      { label: t('equipment.condition.damaged'), value: 'Damaged' }
    ];

    // Computed properties
    const isValid = computed(() => {
      return !!returnCondition.value && 
             !!notes.value && 
             notes.value.length >= 10;
    });

    // Form validation
    const validateForm = async (): Promise<boolean> => {
      errors.value = {
        condition: '',
        notes: ''
      };

      if (!returnCondition.value) {
        errors.value.condition = t('equipment.return.conditionRequired');
      }

      if (!notes.value) {
        errors.value.notes = t('equipment.return.notesRequired');
      } else if (notes.value.length < 10) {
        errors.value.notes = t('equipment.return.notesMinLength');
      }

      return !errors.value.condition && !errors.value.notes;
    };

    // Form submission
    const submitReturn = async () => {
      if (!await validateForm()) {
        return;
      }

      try {
        const success = await returnEquipment(props.assignment.id, {
          returnCondition: returnCondition.value,
          notes: notes.value
        });

        if (success) {
          showSuccess(t('equipment.return.success'));
          emit('return-submitted', true);
          resetForm();
        } else {
          throw new Error(t('equipment.return.genericError'));
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : t('equipment.return.genericError');
        showError(errorMessage);
        emit('return-error', errorMessage);
      }
    };

    // Form reset
    const resetForm = () => {
      returnCondition.value = '';
      notes.value = '';
      errors.value = {
        condition: '',
        notes: ''
      };
      returnForm.value?.reset();
    };

    // Cancel handler
    const cancelReturn = () => {
      resetForm();
      emit('return-cancelled');
    };

    return {
      // Template refs
      returnForm,
      
      // State
      returnCondition,
      notes,
      errors,
      isProcessing,
      
      // Computed
      isValid,
      conditionOptions,
      
      // Methods
      submitReturn,
      cancelReturn,
      
      // i18n
      t
    };
  }
});
</script>

<style lang="scss" scoped>
.return-form {
  max-width: 600px;
  margin: 0 auto;
  padding: 1.5rem;

  .equipment-summary {
    background-color: var(--q-grey-2);
    border-radius: 4px;
    padding: 1rem;
  }

  // Ensure proper spacing between form elements
  .q-mb-md {
    margin-bottom: 1rem;
  }

  // Enhance focus visibility for accessibility
  :deep(.q-field__native:focus),
  :deep(.q-field__control:focus) {
    outline: 2px solid var(--q-primary);
    outline-offset: 2px;
  }
}
</style>