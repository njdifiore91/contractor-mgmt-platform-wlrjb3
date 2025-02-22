<template>
  <q-dialog v-model="dialogVisible" persistent>
    <q-card class="assignment-form" style="min-width: 400px">
      <q-card-section class="row items-center">
        <div class="text-h6">Assign Equipment</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup aria-label="Close dialog" />
      </q-card-section>

      <q-form @submit="handleSubmit" class="q-gutter-md">
        <q-card-section>
          <!-- Inspector Selection -->
          <q-select
            v-model="selectedInspectorId"
            :options="availableInspectors"
            option-value="id"
            option-label="label"
            label="Select Inspector *"
            :rules="[val => !!val || 'Inspector selection is required']"
            :error="!!validationErrors.inspector"
            :error-message="validationErrors.inspector"
            emit-value
            map-options
            outlined
            class="q-mb-md"
            aria-label="Select Inspector"
            role="combobox"
          />

          <!-- Assignment Period -->
          <div class="row q-col-gutter-md">
            <div class="col-12 col-sm-6">
              <q-input
                v-model="startDate"
                label="Start Date *"
                mask="date"
                :rules="[
                  val => !!val || 'Start date is required',
                  val => isValidStartDate(val) || 'Start date must be today or later'
                ]"
                :error="!!validationErrors.startDate"
                :error-message="validationErrors.startDate"
                outlined
              >
                <template v-slot:append>
                  <q-icon name="event" class="cursor-pointer">
                    <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                      <q-date v-model="startDate" mask="YYYY-MM-DD" :options="startDateOptions">
                        <div class="row items-center justify-end">
                          <q-btn v-close-popup label="Close" color="primary" flat />
                        </div>
                      </q-date>
                    </q-popup-proxy>
                  </q-icon>
                </template>
              </q-input>
            </div>

            <div class="col-12 col-sm-6">
              <q-input
                v-model="endDate"
                label="End Date *"
                mask="date"
                :rules="[
                  val => !!val || 'End date is required',
                  val => isValidEndDate(val) || 'End date must be after start date'
                ]"
                :error="!!validationErrors.endDate"
                :error-message="validationErrors.endDate"
                outlined
              >
                <template v-slot:append>
                  <q-icon name="event" class="cursor-pointer">
                    <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                      <q-date v-model="endDate" mask="YYYY-MM-DD" :options="endDateOptions">
                        <div class="row items-center justify-end">
                          <q-btn v-close-popup label="Close" color="primary" flat />
                        </div>
                      </q-date>
                    </q-popup-proxy>
                  </q-icon>
                </template>
              </q-input>
            </div>
          </div>

          <!-- Equipment Condition -->
          <q-input
            v-model="condition"
            label="Current Condition *"
            type="textarea"
            :rules="[val => !!val || 'Equipment condition is required']"
            :error="!!validationErrors.condition"
            :error-message="validationErrors.condition"
            outlined
            autogrow
            class="q-mb-md"
            aria-label="Equipment Condition"
          />

          <!-- Additional Notes -->
          <q-input
            v-model="notes"
            label="Assignment Notes"
            type="textarea"
            outlined
            autogrow
            class="q-mb-md"
            aria-label="Assignment Notes"
          />
        </q-card-section>

        <q-card-actions align="right" class="text-primary">
          <q-btn
            label="Cancel"
            color="grey"
            flat
            class="q-mr-sm"
            v-close-popup
            :disable="loading"
            aria-label="Cancel Assignment"
          />
          <q-btn
            label="Assign Equipment"
            type="submit"
            color="primary"
            :loading="loading"
            aria-label="Submit Assignment"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { ref, computed, defineComponent, defineProps, defineEmits, watch } from 'vue'; // v3.x
import { useQuasar } from '@quasar/app'; // v2.x
import { date } from '@quasar/app'; // v2.x
import { Equipment, EquipmentAssignment } from '../../models/equipment.model';
import { Inspector, InspectorStatus } from '../../models/inspector.model';
import { useEquipment } from '../../composables/useEquipment';

export default defineComponent({
  name: 'AssignmentForm',

  props: {
    modelValue: {
      type: Boolean,
      required: true
    },
    equipmentId: {
      type: Number,
      required: true
    }
  },

  emits: ['update:modelValue', 'assigned'],

  setup(props, { emit }) {
    const $q = useQuasar();
    const { assignEquipment, availableEquipment } = useEquipment();

    // Form state
    const dialogVisible = computed({
      get: () => props.modelValue,
      set: (value) => emit('update:modelValue', value)
    });
    const selectedInspectorId = ref<number | null>(null);
    const startDate = ref('');
    const endDate = ref('');
    const condition = ref('');
    const notes = ref('');
    const loading = ref(false);
    const validationErrors = ref({
      inspector: '',
      startDate: '',
      endDate: '',
      condition: ''
    });

    // Date validation helpers
    const today = date.formatDate(new Date(), 'YYYY-MM-DD');
    const startDateOptions = (date: string) => date >= today;
    const endDateOptions = (date: string) => date > startDate.value;

    const isValidStartDate = (val: string) => {
      return val >= today;
    };

    const isValidEndDate = (val: string) => {
      return val > startDate.value;
    };

    // Form validation
    const validateForm = (): boolean => {
      validationErrors.value = {
        inspector: '',
        startDate: '',
        endDate: '',
        condition: ''
      };

      let isValid = true;

      if (!selectedInspectorId.value) {
        validationErrors.value.inspector = 'Inspector selection is required';
        isValid = false;
      }

      if (!startDate.value) {
        validationErrors.value.startDate = 'Start date is required';
        isValid = false;
      } else if (!isValidStartDate(startDate.value)) {
        validationErrors.value.startDate = 'Start date must be today or later';
        isValid = false;
      }

      if (!endDate.value) {
        validationErrors.value.endDate = 'End date is required';
        isValid = false;
      } else if (!isValidEndDate(endDate.value)) {
        validationErrors.value.endDate = 'End date must be after start date';
        isValid = false;
      }

      if (!condition.value.trim()) {
        validationErrors.value.condition = 'Equipment condition is required';
        isValid = false;
      }

      return isValid;
    };

    // Form submission
    const handleSubmit = async () => {
      if (!validateForm()) {
        return;
      }

      loading.value = true;

      try {
        const assignment: Omit<EquipmentAssignment, 'id'> = {
          equipmentId: props.equipmentId,
          inspectorId: selectedInspectorId.value!,
          assignedDate: new Date(startDate.value),
          returnedDate: new Date(endDate.value),
          assignmentCondition: condition.value,
          returnCondition: null,
          notes: notes.value,
          isActive: true
        };

        await assignEquipment(assignment);
        emit('assigned');
        dialogVisible.value = false;
        resetForm();

        $q.notify({
          type: 'positive',
          message: 'Equipment assigned successfully'
        });
      } catch (error) {
        $q.notify({
          type: 'negative',
          message: 'Failed to assign equipment'
        });
      } finally {
        loading.value = false;
      }
    };

    // Form reset
    const resetForm = () => {
      selectedInspectorId.value = null;
      startDate.value = '';
      endDate.value = '';
      condition.value = '';
      notes.value = '';
      validationErrors.value = {
        inspector: '',
        startDate: '',
        endDate: '',
        condition: ''
      };
    };

    // Reset form when dialog closes
    watch(dialogVisible, (newValue) => {
      if (!newValue) {
        resetForm();
      }
    });

    return {
      dialogVisible,
      selectedInspectorId,
      startDate,
      endDate,
      condition,
      notes,
      loading,
      validationErrors,
      startDateOptions,
      endDateOptions,
      isValidStartDate,
      isValidEndDate,
      handleSubmit,
      resetForm
    };
  }
});
</script>

<style lang="scss" scoped>
.assignment-form {
  max-width: 600px;
  width: 100%;
}

// Ensure proper spacing in form sections
.q-card-section {
  padding: 20px;
}

// Enhance form field visibility
.q-field {
  margin-bottom: 16px;
}

// Improve accessibility focus indicators
:deep(.q-field__control:focus-within) {
  outline: 2px solid $primary;
  outline-offset: 2px;
}
</style>