<template>
  <q-page class="customer-detail-page q-pa-md">
    <!-- Header Section -->
    <div class="row items-center justify-between q-mb-md">
      <div class="col-12 col-md-8">
        <div class="text-h5 q-mb-sm">
          {{ selectedCustomer?.name }}
          <q-badge
            :color="getStatusColor(selectedCustomer?.status)"
            class="q-ml-sm"
          >
            {{ selectedCustomer?.status }}
          </q-badge>
        </div>
        <div class="text-caption">
          Last modified: {{ formatDate(selectedCustomer?.modifiedAt) }}
        </div>
      </div>
      <div class="col-12 col-md-4 text-right">
        <q-btn-group>
          <q-btn
            v-if="hasPermission('customer:edit')"
            icon="edit"
            label="Edit"
            color="primary"
            @click="handleEdit"
          />
          <q-btn
            v-if="hasPermission('customer:export')"
            icon="download"
            label="Export"
            color="secondary"
            @click="handleExport"
          />
        </q-btn-group>
      </div>
    </div>

    <!-- Main Content -->
    <q-card class="customer-detail-card">
      <q-tabs
        v-model="activeTab"
        class="text-primary"
        @update:model-value="handleTabChange"
      >
        <q-tab name="details" icon="info" label="Details" />
        <q-tab name="contracts" icon="description" label="Contracts" />
        <q-tab name="contacts" icon="people" label="Contacts" />
        <q-tab name="equipment" icon="build" label="Equipment" />
        <q-tab name="history" icon="history" label="History" />
      </q-tabs>

      <q-separator />

      <q-tab-panels v-model="activeTab" animated>
        <!-- Details Tab -->
        <q-tab-panel name="details">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-list>
                <q-item>
                  <q-item-section>
                    <q-item-label caption>Customer Code</q-item-label>
                    <q-item-label>{{ selectedCustomer?.code }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section>
                    <q-item-label caption>Industry</q-item-label>
                    <q-item-label>{{ selectedCustomer?.industry }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section>
                    <q-item-label caption>Region</q-item-label>
                    <q-item-label>{{ selectedCustomer?.region }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
            <div class="col-12 col-md-6">
              <q-list>
                <q-item>
                  <q-item-section>
                    <q-item-label caption>Address</q-item-label>
                    <q-item-label>
                      {{ selectedCustomer?.address }}<br />
                      {{ selectedCustomer?.city }}, {{ selectedCustomer?.state }} {{ selectedCustomer?.postalCode }}<br />
                      {{ selectedCustomer?.country }}
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
          </div>
        </q-tab-panel>

        <!-- Contracts Tab -->
        <q-tab-panel name="contracts">
          <div class="q-mb-md">
            <q-btn
              v-if="hasPermission('contract:create')"
              color="primary"
              icon="add"
              label="New Contract"
              @click="handleNewContract"
            />
          </div>
          <q-table
            :rows="selectedCustomer?.contracts || []"
            :columns="contractColumns"
            row-key="id"
            :loading="loading"
          >
            <template #body-cell-actions="props">
              <q-td :props="props">
                <q-btn-group flat>
                  <q-btn
                    v-if="hasPermission('contract:view')"
                    icon="visibility"
                    flat
                    round
                    dense
                    @click="handleViewContract(props.row)"
                  />
                  <q-btn
                    v-if="hasPermission('contract:edit')"
                    icon="edit"
                    flat
                    round
                    dense
                    @click="handleEditContract(props.row)"
                  />
                </q-btn-group>
              </q-td>
            </template>
          </q-table>
        </q-tab-panel>

        <!-- Contacts Tab -->
        <q-tab-panel name="contacts">
          <div class="q-mb-md">
            <q-btn
              v-if="hasPermission('contact:create')"
              color="primary"
              icon="add"
              label="New Contact"
              @click="handleNewContact"
            />
          </div>
          <q-table
            :rows="selectedCustomer?.contacts || []"
            :columns="contactColumns"
            row-key="id"
            :loading="loading"
          >
            <template #body-cell-actions="props">
              <q-td :props="props">
                <q-btn-group flat>
                  <q-btn
                    v-if="hasPermission('contact:edit')"
                    icon="edit"
                    flat
                    round
                    dense
                    @click="handleEditContact(props.row)"
                  />
                  <q-btn
                    icon="phone"
                    flat
                    round
                    dense
                    @click="handleCallContact(props.row)"
                  />
                  <q-btn
                    icon="email"
                    flat
                    round
                    dense
                    @click="handleEmailContact(props.row)"
                  />
                </q-btn-group>
              </q-td>
            </template>
          </q-table>
        </q-tab-panel>

        <!-- Equipment Tab -->
        <q-tab-panel name="equipment">
          <equipment-assignments
            :customer-id="customerId"
            @update="handleEquipmentUpdate"
          />
        </q-tab-panel>

        <!-- History Tab -->
        <q-tab-panel name="history">
          <audit-log-table
            :entity-type="'customer'"
            :entity-id="customerId"
          />
        </q-tab-panel>
      </q-tab-panels>
    </q-card>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useCustomer } from '@/composables/useCustomer';
import { useAuditLog } from '@/composables/useAuditLog';
import { useSecurityValidation } from '@/composables/useSecurityValidation';
import type { ICustomer, IContact, IContract } from '@/models/customer.model';
import { formatDate } from '@/utils/date.util';

export default defineComponent({
  name: 'CustomerDetailPage',

  setup() {
    // Composables
    const route = useRoute();
    const router = useRouter();
    const $q = useQuasar();
    const { selectedCustomer, fetchCustomerById, fetchCustomerContacts, fetchCustomerContracts } = useCustomer();
    const { logAccess, logAction } = useAuditLog();
    const { validateAccess, hasPermission } = useSecurityValidation();

    // Reactive state
    const customerId = ref<number>(parseInt(route.params.id as string));
    const activeTab = ref<string>('details');
    const loading = ref<boolean>(false);

    // Table configurations
    const contractColumns = [
      { name: 'contractNumber', label: 'Contract #', field: 'contractNumber', sortable: true },
      { name: 'startDate', label: 'Start Date', field: 'startDate', format: formatDate, sortable: true },
      { name: 'endDate', label: 'End Date', field: 'endDate', format: formatDate, sortable: true },
      { name: 'value', label: 'Value', field: 'value', format: (val: number) => `$${val.toLocaleString()}`, sortable: true },
      { name: 'status', label: 'Status', field: 'status', sortable: true },
      { name: 'actions', label: 'Actions', field: 'actions', align: 'right' }
    ];

    const contactColumns = [
      { name: 'firstName', label: 'First Name', field: 'firstName', sortable: true },
      { name: 'lastName', label: 'Last Name', field: 'lastName', sortable: true },
      { name: 'title', label: 'Title', field: 'title', sortable: true },
      { name: 'email', label: 'Email', field: 'email', sortable: true },
      { name: 'phoneNumber', label: 'Phone', field: 'phoneNumber', sortable: true },
      { name: 'actions', label: 'Actions', field: 'actions', align: 'right' }
    ];

    // Methods
    const loadCustomerData = async () => {
      try {
        loading.value = true;
        await validateAccess('customer:view', customerId.value);
        await fetchCustomerById(customerId.value);
        await Promise.all([
          fetchCustomerContacts(customerId.value),
          fetchCustomerContracts(customerId.value)
        ]);
        logAccess('customer:view', customerId.value);
      } catch (error) {
        $q.notify({
          type: 'negative',
          message: 'Error loading customer data'
        });
        console.error('Error loading customer data:', error);
      } finally {
        loading.value = false;
      }
    };

    const handleTabChange = async (tab: string) => {
      try {
        await validateAccess(`customer:${tab}`, customerId.value);
        activeTab.value = tab;
        logAccess(`customer:${tab}`, customerId.value);
      } catch (error) {
        $q.notify({
          type: 'negative',
          message: 'Access denied'
        });
      }
    };

    const getStatusColor = (status?: string): string => {
      const colors: Record<string, string> = {
        'Active': 'positive',
        'Inactive': 'negative',
        'Pending': 'warning',
        'Suspended': 'orange'
      };
      return colors[status || ''] || 'grey';
    };

    // Lifecycle hooks
    onMounted(async () => {
      await loadCustomerData();
    });

    watch(() => route.params.id, async (newId) => {
      if (newId) {
        customerId.value = parseInt(newId as string);
        await loadCustomerData();
      }
    });

    return {
      // State
      customerId,
      selectedCustomer,
      activeTab,
      loading,
      contractColumns,
      contactColumns,

      // Methods
      handleTabChange,
      getStatusColor,
      formatDate,
      hasPermission,

      // Event handlers
      handleEdit: () => logAction('customer:edit', customerId.value),
      handleExport: () => logAction('customer:export', customerId.value),
      handleNewContract: () => logAction('contract:create', customerId.value),
      handleNewContact: () => logAction('contact:create', customerId.value),
      handleViewContract: (contract: IContract) => logAction('contract:view', contract.id),
      handleEditContract: (contract: IContract) => logAction('contract:edit', contract.id),
      handleEditContact: (contact: IContact) => logAction('contact:edit', contact.id),
      handleCallContact: (contact: IContact) => logAction('contact:call', contact.id),
      handleEmailContact: (contact: IContact) => logAction('contact:email', contact.id),
      handleEquipmentUpdate: () => loadCustomerData()
    };
  }
});
</script>

<style lang="scss">
.customer-detail-page {
  .customer-detail-card {
    min-height: calc(100vh - 200px);
  }

  .q-table {
    .q-btn-group {
      .q-btn {
        margin: 0 2px;
      }
    }
  }
}
</style>