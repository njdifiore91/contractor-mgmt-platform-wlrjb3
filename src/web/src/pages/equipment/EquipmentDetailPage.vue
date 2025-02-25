const isInspector = computed(() => authStore.hasRole(UserRoleType.Inspector));
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
            v-if="canEditEquipment && !isInspector"
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
            :disable="equipmentStatus !== 'AVAILABLE'"
            @click="showAssignDialog = true"
          />
          <q-btn
            v-if="canEditEquipment"
            color="info"
            icon="keyboard_return"
            label="Return"
            :loading="loading"
            :disable="equipmentStatus !== 'IN_USE'"
            @click="showReturnDialog = true"
          />
          <q-btn
            v-if="canEditEquipment && !isInspector"
            color="warning"
            icon="build"
            label="Maintenance"
            :loading="loading"
            :disable="equipmentStatus === 'MAINTENANCE' || equipmentStatus === 'IN_USE'"
            @click="showMaintenanceDialog = true"
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
                      :color="getStatusColor(equipmentStatus)"
                      text-color="white"
                      size="sm"
                    >
                      {{ equipmentStatus }}
                    </q-chip>
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>

      <!-- Specifications -->
      <div class="col-12 col-md-6">
        <q-card>
          <q-card-section>
            <div class="text-h6">Specifications</div>
            <q-list v-if="equipment.specifications">
              <q-item>
                <q-item-section>
                  <q-item-label caption>Manufacturer</q-item-label>
                  <q-item-label>{{ equipment.specifications.manufacturer }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label caption>Model</q-item-label>
                  <q-item-label>{{ equipment.specifications.model }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label caption>Calibration Due</q-item-label>
                  <q-item-label>{{ formatDate(equipment.specifications.calibrationDue) }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label caption>Warranty Until</q-item-label>
                  <q-item-label>{{ formatDate(equipment.specifications.warranty) }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
            <div v-else class="text-grey-6">No specifications available</div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Maintenance History -->
      <div class="col-12">
        <q-card>
          <q-card-section>
            <div class="text-h6">Maintenance History</div>
            <q-table
              v-if="equipment?.maintenanceHistory?.length"
              :rows="equipment.maintenanceHistory || []"
              :columns="maintenanceColumns"
              row-key="id"
              flat
              bordered
            >
              <template v-slot:body-cell-type="props">
                <q-td :props="props">
                  <q-chip
                    :color="getMaintenanceTypeColor(props.value)"
                    text-color="white"
                    size="sm"
                  >
                    {{ props.value }}
                  </q-chip>
                </q-td>
              </template>
            </q-table>
            <div v-else class="text-grey-6 q-pa-md">No maintenance history available</div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Documents -->
      <div class="col-12">
        <q-card>
          <q-card-section>
            <div class="text-h6">Documents</div>
            <div class="row q-col-gutter-md q-mt-md">
              <div
                v-for="doc in equipment?.documents || []"
                :key="doc.id"
                class="col-12 col-sm-6 col-md-4"
              >
                <q-card class="document-card" flat bordered>
                  <q-card-section>
                    <div class="row items-center no-wrap">
                      <div class="col">
                        <div class="text-subtitle2">{{ doc.name }}</div>
                        <div class="text-caption text-grey">{{ doc.type }}</div>
                      </div>
                      <div class="col-auto">
                        <q-btn
                          flat
                          round
                          color="primary"
                          icon="download"
                          :href="doc.url"
                          target="_blank"
                        />
                      </div>
                    </div>
                  </q-card-section>
                </q-card>
              </div>
              <div v-if="!equipment?.documents?.length" class="col-12 text-grey-6 q-pa-md">
                No documents available
              </div>
            </div>
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
              :loading="!availableInspectors.length"
              label="Inspector"
              option-label="label"
              option-value="value"
              emit-value
              map-options
              :rules="[val => !!val || 'Inspector is required']"
            >
              <template v-slot:no-option>
                <q-item>
                  <q-item-section class="text-grey">
                    No available inspectors found
                  </q-item-section>
                </q-item>
              </template>
            </q-select>
            <q-input
              v-model="assignmentData.assignmentCondition"
              label="Current Condition"
              class="q-mt-md"
              :rules="[val => !!val || 'Condition is required']"
            />
            <q-input
              v-model="assignmentData.notes"
              label="Notes"
              type="textarea"
              class="q-mt-md"
            />
          </q-form>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn 
            flat 
            label="Cancel" 
            color="primary" 
            v-close-popup 
            :disable="loading"
          />
          <q-btn 
            label="Assign" 
            color="primary" 
            @click="handleAssignment"
            :loading="loading"
            :disable="loading || !assignmentData.inspectorId"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Maintenance Dialog -->
    <q-dialog v-model="showMaintenanceDialog" persistent>
      <q-card style="min-width: 350px">
        <q-card-section class="row items-center">
          <div class="text-h6">Send to Maintenance</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section>
          <q-form @submit="handleMaintenanceSubmit" ref="maintenanceForm">
            <q-select
              v-model="maintenanceData.type"
              :options="maintenanceTypes"
              label="Maintenance Type"
              :rules="[val => !!val || 'Maintenance type is required']"
            />
            <q-input
              v-model="maintenanceData.technician"
              label="Technician"
              class="q-mt-md"
              :rules="[val => !!val || 'Technician name is required']"
            />
            <q-input
              v-model="maintenanceData.notes"
              label="Notes"
              type="textarea"
              class="q-mt-md"
              :rules="[val => !!val || 'Notes are required']"
            />
          </q-form>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn 
            flat 
            label="Cancel" 
            color="primary" 
            v-close-popup 
            :disable="loading"
          />
          <q-btn 
            label="Send" 
            color="warning" 
            @click="handleMaintenanceSubmit"
            :loading="loading"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Return Dialog -->
    <q-dialog v-model="showReturnDialog" persistent>
      <q-card style="min-width: 350px">
        <q-card-section class="row items-center">
          <div class="text-h6">Return Equipment</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section>
          <q-form @submit="handleReturnSubmit" ref="returnForm">
            <q-select
              v-model="returnData.returnCondition"
              :options="conditionOptions"
              label="Return Condition"
              class="q-mt-md"
              :rules="[val => !!val || 'Return condition is required']"
              emit-value
              map-options
            />
            <q-input
              v-model="returnData.notes"
              label="Notes"
              type="textarea"
              class="q-mt-md"
              :rules="[val => !!val || 'Notes are required']"
            />
          </q-form>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn 
            flat 
            label="Cancel" 
            color="primary" 
            v-close-popup 
            :disable="loading"
          />
          <q-btn 
            label="Return" 
            color="info" 
            @click="handleReturnSubmit"
            :loading="loading"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onErrorCaptured, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { Equipment } from '@/models/equipment.model';
import type { EquipmentAssignment } from '@/models/equipment-types';
import { useEquipment } from '@/composables/useEquipment';
import { useAuditLog } from '@/composables/useAuditLog';
import { useInspectorStore } from '@/stores/inspector.store';
import { useEquipmentStore } from '@/stores/equipment.store';
import { useAuthStore } from '@/stores/auth.store';
import { UserRoleType } from '@/models/user.model';

export default defineComponent({
  name: 'EquipmentDetailPage',

  setup() {
    const route = useRoute();
    const router = useRouter();
    const $q = useQuasar();
    const { logAction } = useAuditLog();
    const inspectorStore = useInspectorStore();
    const equipmentStore = useEquipmentStore();
    const authStore = useAuthStore();

    // Error handling
    const handleError = (err: unknown) => {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      $q.notify({
        type: 'negative',
        message: errorMessage,
        position: 'top'
      });
      return false; // Prevent error from propagating
    };

    onErrorCaptured((err, instance, info) => {
      handleError(err);
      return false; // Prevent error from propagating
    });

    // Equipment store functionality
    const {
      loading,
      error,
      equipment,
      selectedEquipment,
      fetchEquipment,
      updateEquipment,
      assignEquipment
    } = useEquipment();

    // Computed property for current equipment
    const currentEquipment = computed(() => selectedEquipment.value || equipment.value?.[0]);

    // Computed property for equipment status
    const equipmentStatus = computed(() => currentEquipment.value?.status?.toUpperCase() || '');

    // Local state
    const showEditDialog = ref(false);
    const showAssignDialog = ref(false);
    const showMaintenanceDialog = ref(false);
    const showReturnDialog = ref(false);
    const editData = ref<Partial<Equipment>>({});
    const assignmentData = ref<Partial<EquipmentAssignment>>({});
    const loadingHistory = ref(false);
    const availableInspectors = ref<{ label: string; value: number }[]>([]);
    const maintenanceData = ref({
      type: '',
      technician: '',
      notes: ''
    });
    const returnData = ref({
      returnCondition: '',
      notes: ''
    });

    const maintenanceTypes = [
      'Regular Maintenance',
      'Calibration',
      'Repair',
      'Software Update',
      'Hardware Update',
      'Safety Check'
    ];

    // Table columns for assignment history
    const historyColumns = [
      { name: 'assignedDate', label: 'Assigned Date', field: 'assignedDate', sortable: true },
      { name: 'inspectorId', label: 'Inspector', field: 'inspectorId', sortable: true },
      { name: 'assignmentCondition', label: 'Condition', field: 'assignmentCondition' },
      { name: 'returnedDate', label: 'Returned Date', field: 'returnedDate', sortable: true },
      { name: 'status', label: 'Status', field: 'status' }
    ];

    // Table columns for maintenance history
    const maintenanceColumns = [
      { name: 'date', label: 'Date', field: 'date', sortable: true },
      { name: 'type', label: 'Type', field: 'type', sortable: true },
      { name: 'technician', label: 'Technician', field: 'technician' },
      { name: 'notes', label: 'Notes', field: 'notes' }
    ];

    // Permission computed properties
    const isInspector = computed(() => {
      return authStore.hasRole(UserRoleType.Inspector);
    });
    const canEditEquipment = computed(() => true); // TODO: Implement actual permission check
    const canAssignEquipment = computed(() => true); // TODO: Implement actual permission check

    // Utility functions
    const formatDate = (date: string | Date) => {
      return new Date(date).toLocaleDateString();
    };

    const getStatusColor = (status: string) => {
      switch (status?.toUpperCase()) {
        case 'AVAILABLE':
          return 'positive';
        case 'IN_USE':
          return 'warning';
        case 'MAINTENANCE':
          return 'orange';
        case 'RETIRED':
          return 'negative';
        default:
          return 'grey';
      }
    };

    const getMaintenanceTypeColor = (type: string) => {
      const colors: { [key: string]: string } = {
        'Regular': 'primary',
        'Repair': 'warning',
        'Software': 'info'
      };
      return colors[type] || 'grey';
    };

    // Load equipment details
    const loadEquipmentDetails = async () => {
      try {
        const equipmentId = parseInt(route.params.id as string);
        if (isNaN(equipmentId)) {
          throw new Error('Invalid equipment ID');
        }

        loading.value = true;
        await fetchEquipment(equipmentId);
        
        if (!currentEquipment.value) {
          throw new Error('Equipment not found');
        }

        // Check for edit or assign query params
        if (route.query.edit === 'true') {
          showEditDialog.value = true;
        } else if (route.query.assign === 'true') {
          showAssignDialog.value = true;
        } else if (route.query.maintenance === 'true') {
          showMaintenanceDialog.value = true;
        } else if (route.query.return === 'true') {
          showReturnDialog.value = true;
        }

        logAction('equipment:view', { equipmentId });
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load equipment';
        $q.notify({
          type: 'negative',
          message: error.value,
          position: 'top'
        });
      } finally {
        loading.value = false;
      }
    };

    // Handle dialog close
    const handleDialogClose = async () => {
      // Remove query parameters when dialogs are closed
      if (route.query.edit || route.query.assign || route.query.maintenance || route.query.return) {
        await router.replace({ 
          path: route.path,
          query: {} 
        });
      }
    };

    // Load available inspectors
    const loadAvailableInspectors = async () => {
      try {
        const response = await inspectorStore.searchInspectors(
          null,  // location
          null,  // radius
          ['AVAILABLE'],  // status
          [],    // certifications
          false  // includeUnavailable
        );
        availableInspectors.value = (response.items || []).map(inspector => ({
          label: `${inspector.firstName} ${inspector.lastName} (${inspector.badgeNumber})`,
          value: inspector.id
        }));
      } catch (err) {
        console.error('Failed to load inspectors:', err);
        $q.notify({
          type: 'warning',
          message: 'Failed to load available inspectors',
          position: 'top'
        });
      }
    };

    // Watch dialog states to initialize data
    watch(showEditDialog, async (newValue) => {
      if (newValue && currentEquipment.value) {
        // Initialize edit form with current equipment data
        editData.value = {
          model: currentEquipment.value.model,
          condition: currentEquipment.value.condition,
          notes: currentEquipment.value.notes
        };
      } else {
        await handleDialogClose();
      }
    });

    watch(showAssignDialog, async (newValue) => {
      if (newValue) {
        // Load inspectors when opening assign dialog
        await loadAvailableInspectors();
        // Initialize assignment form
        assignmentData.value = {
          assignmentCondition: currentEquipment.value?.condition || '',
          notes: ''
        };
      } else {
        await handleDialogClose();
      }
    });

    // Load assignment history
    const loadAssignmentHistory = async (equipmentId: number) => {
      try {
        loadingHistory.value = true;
        const history = await equipmentStore.getEquipmentHistory(equipmentId);
        assignmentHistory.value = history;
      } catch (err) {
        console.error('Failed to load assignment history:', err);
        // Don't show error notification for history load failure
        // as it's not critical to the main functionality
      } finally {
        loadingHistory.value = false;
      }
    };

    // Handle equipment updates
    const handleEquipmentUpdate = async () => {
      try {
        if (!currentEquipment.value?.id) return;

        await updateEquipment(currentEquipment.value.id, editData.value);
        
        logAction('equipment:update', {
          equipmentId: currentEquipment.value.id,
          changes: editData.value
        });

        showEditDialog.value = false;
        $q.notify({
          type: 'positive',
          message: 'Equipment updated successfully'
        });
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: err instanceof Error ? err.message : 'Failed to update equipment',
          position: 'top'
        });
      }
    };

    // Handle equipment assignment
    const handleAssignment = async () => {
      try {
        if (!currentEquipment.value?.id) return;

        await assignEquipment({
          equipmentId: currentEquipment.value.id,
          ...assignmentData.value
        });

        logAction('equipment:assign', {
          equipmentId: currentEquipment.value.id,
          assignmentDetails: assignmentData.value
        });

        showAssignDialog.value = false;
        $q.notify({
          type: 'positive',
          message: 'Equipment assigned successfully'
        });
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: err instanceof Error ? err.message : 'Failed to assign equipment',
          position: 'top'
        });
      }
    };

    // Handle maintenance submission
    const handleMaintenanceSubmit = async () => {
      try {
        if (!currentEquipment.value?.id) return;

        await equipmentStore.sendEquipmentToMaintenance(currentEquipment.value.id, maintenanceData.value);
        
        logAction('equipment:maintenance', {
          equipmentId: currentEquipment.value.id,
          maintenanceDetails: maintenanceData.value
        });

        showMaintenanceDialog.value = false;
        $q.notify({
          type: 'positive',
          message: 'Equipment sent to maintenance successfully'
        });
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: err instanceof Error ? err.message : 'Failed to send equipment to maintenance',
          position: 'top'
        });
      }
    };

    // Handle return submission
    const handleReturnSubmit = async () => {
      try {
        if (!currentEquipment.value?.id) return;

        await equipmentStore.processEquipmentReturn(currentEquipment.value.id, {
          returnCondition: returnData.value.returnCondition,
          notes: returnData.value.notes
        });
        
        logAction('equipment:return', {
          equipmentId: currentEquipment.value.id,
          returnDetails: returnData.value
        });

        showReturnDialog.value = false;
        $q.notify({
          type: 'positive',
          message: 'Equipment returned successfully'
        });

        // Refresh equipment details
        await loadEquipmentDetails();
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: err instanceof Error ? err.message : 'Failed to return equipment',
          position: 'top'
        });
      }
    };

    // Lifecycle hooks
    onMounted(() => {
      loadEquipmentDetails();
    });

    const conditionOptions = [
      { label: 'New', value: 'new' },
      { label: 'Good', value: 'good' },
      { label: 'Fair', value: 'fair' },
      { label: 'Poor', value: 'poor' }
    ];

    return {
      // State
      loading,
      error,
      equipment: currentEquipment,
      equipmentStatus,
      showEditDialog,
      showAssignDialog,
      showMaintenanceDialog,
      showReturnDialog,
      editData,
      assignmentData,
      maintenanceData,
      returnData,
      loadingHistory,
      historyColumns,
      maintenanceColumns,
      availableInspectors,
      maintenanceTypes,
      conditionOptions,

      // Computed
      isInspector,
      canEditEquipment,
      canAssignEquipment,

      // Methods
      loadEquipmentDetails,
      handleEquipmentUpdate,
      handleAssignment,
      handleMaintenanceSubmit,
      handleReturnSubmit,
      formatDate,
      getStatusColor,
      getMaintenanceTypeColor,
      handleDialogClose
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

  .document-card {
    transition: all 0.3s ease;
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
  }
}
</style>