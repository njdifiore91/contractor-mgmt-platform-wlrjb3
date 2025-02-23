<template>
  <q-page class="equipment-detail-page" role="main">
    <!-- Page Header -->
    <div class="row q-pa-md items-center justify-between">
      <div class="col-auto">
        <q-breadcrumbs>
          <q-breadcrumbs-el label="Equipment" to="/equipment" />
          <q-breadcrumbs-el :label="equipment?.serialNumber || 'Loading...'" />
        </q-breadcrumbs>
        <h1 class="text-h4 q-mt-sm">Equipment Details</h1>
      </div>
      <div class="col-auto">
        <q-btn-group>
          <q-btn
            v-if="canEditEquipment"
            color="primary"
            icon="edit"
            label="Edit"
            :loading="loading"
            @click="showEditDialog = true"
          />
          <q-btn
            v-if="canAssignEquipment"
            color="secondary"
            icon="person_add"
            label="Assign"
            :loading="loading"
            :disable="!equipment?.isAvailable"
            @click="showAssignDialog = true"
          />
        </q-btn-group>
      </div>
    </div>

    <!-- Loading State -->
    <q-inner-loading :showing="loading">
      <q-spinner-dots size="50px" color="primary" />
    </q-inner-loading>

    <!-- Error State -->
    <div v-if="error" class="q-pa-md">
      <q-banner class="bg-negative text-white" rounded>
        {{ error }}
        <template v-slot:action>
          <q-btn flat color="white" label="Retry" @click="loadEquipmentDetails" />
        </template>
      </q-banner>
    </div>

    <!-- Equipment Details -->
    <div v-if="equipment && !loading" class="row q-pa-md q-col-gutter-md">
      <!-- Basic Information -->
      <div class="col-12 col-md-6">
        <q-card>
          <q-card-section>
            <div class="text-h6">Basic Information</div>
            <q-list>
              <q-item>
                <q-item-section>
                  <q-item-label caption>Serial Number</q-item-label>
                  <q-item-label>{{ equipment.serialNumber }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label caption>Model</q-item-label>
                  <q-item-label>{{ equipment.model }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label caption>Type</q-item-label>
                  <q-item-label>{{ equipment.type }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label caption>Status</q-item-label>
                  <q-item-label>
                    <q-chip
                      :color="equipment.isAvailable ? 'positive' : 'warning'"
                      text-color="white"
                      size="sm"
                    >
                      {{ equipment.isAvailable ? 'Available' : 'Assigned' }}
                    </q-chip>
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>

      <!-- Maintenance Information -->
      <div class="col-12 col-md-6">
        <q-card>
          <q-card-section>
            <div class="text-h6">Maintenance Information</div>
            <q-list>
              <q-item>
                <q-item-section>
                  <q-item-label caption>Condition</q-item-label>
                  <q-item-label>{{ equipment.condition }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label caption>Purchase Date</q-item-label>
                  <q-item-label>{{ formatDate(equipment.purchaseDate) }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label caption>Last Maintenance</q-item-label>
                  <q-item-label>
                    {{ equipment.lastMaintenanceDate ? formatDate(equipment.lastMaintenanceDate) : 'Never' }}
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>

      <!-- Assignment History -->
      <div class="col-12">
        <q-card>
          <q-card-section>
            <div class="text-h6">Assignment History</div>
            <q-table
              :rows="assignmentHistory"
              :columns="historyColumns"
              row-key="id"
              :loading="loadingHistory"
              :pagination="{ rowsPerPage: 10 }"
            >
              <template v-slot:body-cell-status="props">
                <q-td :props="props">
                  <q-chip
                    :color="props.row.returnedDate ? 'grey' : 'primary'"
                    text-color="white"
                    size="sm"
                  >
                    {{ props.row.returnedDate ? 'Returned' : 'Active' }}
                  </q-chip>
                </q-td>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Edit Dialog -->
    <q-dialog v-model="showEditDialog" persistent>
      <q-card style="min-width: 350px">
        <q-card-section class="row items-center">
          <div class="text-h6">Edit Equipment</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section>
          <q-form @submit="handleEquipmentUpdate" ref="editForm">
            <q-input
              v-model="editData.model"
              label="Model"
              :rules="[val => !!val || 'Model is required']"
            />
            <q-input
              v-model="editData.condition"
              label="Condition"
              :rules="[val => !!val || 'Condition is required']"
            />
            <q-input
              v-model="editData.notes"
              label="Notes"
              type="textarea"
            />
          </q-form>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" v-close-popup />
          <q-btn label="Save" color="primary" @click="handleEquipmentUpdate" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Assignment Dialog -->
    <q-dialog v-model="showAssignDialog" persistent>
      <q-card style="min-width: 350px">
        <q-card-section class="row items-center">
          <div class="text-h6">Assign Equipment</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section>
          <q-form @submit="handleAssignment" ref="assignForm">
            <q-select
              v-model="assignmentData.inspectorId"
              :options="availableInspectors"
              label="Inspector"
              :rules="[val => !!val || 'Inspector is required']"
            />
            <q-input
              v-model="assignmentData.assignmentCondition"
              label="Current Condition"
              :rules="[val => !!val || 'Condition is required']"
            />
            <q-input
              v-model="assignmentData.notes"
              label="Notes"
              type="textarea"
            />
          </q-form>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" v-close-popup />
          <q-btn label="Assign" color="primary" @click="handleAssignment" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useErrorBoundary } from '@vueuse/core';
import { Equipment, EquipmentAssignment } from '../../models/equipment.model';
import { useEquipment } from '../../composables/useEquipment';
import { useAuditLog } from '@/composables/useAuditLog';

export default defineComponent({
  name: 'EquipmentDetailPage',

  setup() {
    // Initialize composables and utilities
    const route = useRoute();
    const router = useRouter();
    const $q = useQuasar();
    const { logAction } = useAuditLog();
    const { handleError } = useErrorBoundary();

    // Equipment store functionality
    const {
      loading,
      error,
      equipment,
      assignmentHistory,
      fetchEquipment,
      updateEquipment,
      assignEquipment
    } = useEquipment();

    // Local state
    const showEditDialog = ref(false);
    const showAssignDialog = ref(false);
    const editData = ref<Partial<Equipment>>({});
    const assignmentData = ref<Partial<EquipmentAssignment>>({});
    const loadingHistory = ref(false);

    // Table columns for assignment history
    const historyColumns = [
      { name: 'assignedDate', label: 'Assigned Date', field: 'assignedDate', sortable: true },
      { name: 'inspectorId', label: 'Inspector', field: 'inspectorId', sortable: true },
      { name: 'assignmentCondition', label: 'Condition', field: 'assignmentCondition' },
      { name: 'returnedDate', label: 'Returned Date', field: 'returnedDate', sortable: true },
      { name: 'status', label: 'Status', field: 'status' }
    ];

    // Permission computed properties
    const canEditEquipment = computed(() => true); // TODO: Implement actual permission check
    const canAssignEquipment = computed(() => true); // TODO: Implement actual permission check

    // Load equipment details
    const loadEquipmentDetails = async () => {
      try {
        const equipmentId = parseInt(route.params.id as string);
        if (isNaN(equipmentId)) {
          throw new Error('Invalid equipment ID');
        }

        await fetchEquipment(equipmentId);
        await loadAssignmentHistory(equipmentId);
        
        logAction('equipment:view', { equipmentId });
      } catch (err) {
        handleError(err);
      }
    };

    // Handle equipment updates
    const handleEquipmentUpdate = async () => {
      try {
        if (!equipment.value?.id) return;

        await updateEquipment(equipment.value.id, editData.value);
        
        logAction('equipment:update', {
          equipmentId: equipment.value.id,
          changes: editData.value
        });

        showEditDialog.value = false;
        $q.notify({
          type: 'positive',
          message: 'Equipment updated successfully'
        });
      } catch (err) {
        handleError(err);
      }
    };

    // Handle equipment assignment
    const handleAssignment = async () => {
      try {
        if (!equipment.value?.id) return;

        await assignEquipment({
          equipmentId: equipment.value.id,
          ...assignmentData.value
        });

        logAction('equipment:assign', {
          equipmentId: equipment.value.id,
          assignmentDetails: assignmentData.value
        });

        showAssignDialog.value = false;
        $q.notify({
          type: 'positive',
          message: 'Equipment assigned successfully'
        });
      } catch (err) {
        handleError(err);
      }
    };

    // Date formatter utility
    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString();
    };

    // Lifecycle hooks
    onMounted(() => {
      loadEquipmentDetails();
    });

    return {
      // State
      loading,
      error,
      equipment,
      assignmentHistory,
      showEditDialog,
      showAssignDialog,
      editData,
      assignmentData,
      loadingHistory,
      historyColumns,

      // Computed
      canEditEquipment,
      canAssignEquipment,

      // Methods
      loadEquipmentDetails,
      handleEquipmentUpdate,
      handleAssignment,
      formatDate
    };
  }
});
</script>

<style lang="scss">
.equipment-detail-page {
  .q-table__container {
    border-radius: 4px;
    box-shadow: none;
  }

  .q-card {
    border-radius: 8px;
  }
}
</style>