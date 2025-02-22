<template>
  <div class="inspector-detail-page" role="main" aria-label="Inspector Details">
    <!-- Loading state -->
    <div v-if="loading" class="flex justify-center items-center q-pa-lg">
      <QSpinner size="3em" color="primary" />
      <span class="q-ml-sm">Loading inspector details...</span>
    </div>

    <!-- Error state -->
    <div v-else-if="error" role="alert" class="text-negative q-pa-md">
      {{ error }}
    </div>

    <!-- Content -->
    <template v-else-if="selectedInspector">
      <!-- Header card -->
      <QCard class="q-mb-md">
        <QCardSection>
          <div class="row items-center justify-between">
            <div class="text-h6">
              {{ selectedInspector.firstName }} {{ selectedInspector.lastName }}
              <QChip
                :color="statusColor"
                text-color="white"
                class="q-ml-sm"
                :aria-label="`Status: ${selectedInspector.status}`"
              >
                {{ selectedInspector.status }}
              </QChip>
            </div>
            <div class="row q-gutter-sm">
              <QBtn
                v-if="canBeMobilized"
                color="primary"
                label="Mobilize"
                icon="send"
                :loading="mobilizing"
                @click="handleMobilization"
                :aria-label="`Mobilize ${selectedInspector.firstName} ${selectedInspector.lastName}`"
              />
              <QBtn
                color="secondary"
                flat
                icon="edit"
                label="Edit"
                @click="$router.push(`/inspectors/${selectedInspector.id}/edit`)"
                aria-label="Edit inspector details"
              />
            </div>
          </div>
        </QCardSection>
      </QCard>

      <!-- Main content tabs -->
      <QCard>
        <QTabs
          v-model="activeTab"
          class="text-grey"
          active-color="primary"
          indicator-color="primary"
          align="justify"
          narrow-indicator
          role="tablist"
        >
          <QTab name="details" icon="person" label="Details" role="tab" />
          <QTab name="certifications" icon="verified" label="Certifications" role="tab" />
          <QTab name="drugTests" icon="science" label="Drug Tests" role="tab" />
          <QTab name="equipment" icon="inventory" label="Equipment" role="tab" />
        </QTabs>

        <QSeparator />

        <QTabPanels v-model="activeTab" animated role="tabpanel">
          <!-- Details Panel -->
          <QTabPanel name="details">
            <div class="row q-col-gutter-md q-pa-md">
              <div class="col-12 col-md-6">
                <QList>
                  <QItem>
                    <QItemSection>
                      <QItemLabel caption>Badge Number</QItemLabel>
                      <QItemLabel>{{ selectedInspector.badgeNumber }}</QItemLabel>
                    </QItemSection>
                  </QItem>
                  <QItem>
                    <QItemSection>
                      <QItemLabel caption>Last Mobilized</QItemLabel>
                      <QItemLabel>
                        {{ selectedInspector.lastMobilizedDate ? new Date(selectedInspector.lastMobilizedDate).toLocaleDateString() : 'Never' }}
                      </QItemLabel>
                    </QItemSection>
                  </QItem>
                </QList>
              </div>
            </div>
          </QTabPanel>

          <!-- Certifications Panel -->
          <QTabPanel name="certifications">
            <div class="q-pa-md">
              <div class="text-h6 q-mb-md">Active Certifications</div>
              <QList separator>
                <QItem v-for="cert in selectedInspector.certifications" :key="cert.id">
                  <QItemSection>
                    <QItemLabel>{{ cert.name }}</QItemLabel>
                    <QItemLabel caption>
                      {{ cert.certificationNumber }} - Expires: {{ new Date(cert.expiryDate).toLocaleDateString() }}
                    </QItemLabel>
                  </QItemSection>
                  <QItemSection side>
                    <QChip
                      :color="new Date(cert.expiryDate) > new Date() ? 'positive' : 'negative'"
                      text-color="white"
                    >
                      {{ new Date(cert.expiryDate) > new Date() ? 'Valid' : 'Expired' }}
                    </QChip>
                  </QItemSection>
                </QItem>
              </QList>
            </div>
          </QTabPanel>

          <!-- Drug Tests Panel -->
          <QTabPanel name="drugTests">
            <div class="q-pa-md">
              <DrugTestForm
                :inspector-id="selectedInspector.id"
                @submitted="handleDrugTestSubmitted"
                class="q-mb-lg"
              />
              
              <div class="text-h6 q-mb-md">Drug Test History</div>
              <QTable
                :rows="selectedInspector.drugTests"
                :columns="drugTestColumns"
                row-key="id"
                :pagination="{ rowsPerPage: 10 }"
                aria-label="Drug test history table"
              />
            </div>
          </QTabPanel>

          <!-- Equipment Panel -->
          <QTabPanel name="equipment">
            <div class="q-pa-md">
              <div class="text-h6 q-mb-md">Equipment Summary</div>
              <div class="row q-col-gutter-md">
                <div class="col-12 col-md-4" v-for="(count, type) in equipmentSummary" :key="type">
                  <QCard class="bg-grey-2">
                    <QCardSection>
                      <div class="text-subtitle2">{{ type }}</div>
                      <div class="text-h5">{{ count }}</div>
                    </QCardSection>
                  </QCard>
                </div>
              </div>
            </div>
          </QTabPanel>
        </QTabPanels>
      </QCard>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useInspector } from '../../composables/useInspector';
import DrugTestForm from '../../components/inspectors/DrugTestForm.vue';
import { Inspector } from '../../models/inspector.model';

export default defineComponent({
  name: 'InspectorDetailPage',

  components: {
    DrugTestForm
  },

  setup() {
    const route = useRoute();
    const router = useRouter();
    const { selectedInspector, mobilizeInspector, createDrugTest } = useInspector();
    
    const loading = ref(false);
    const error = ref<string | null>(null);
    const activeTab = ref('details');
    const mobilizing = ref(false);

    // Computed properties
    const statusColor = computed(() => {
      if (!selectedInspector.value) return '';
      switch (selectedInspector.value.status) {
        case 'AVAILABLE': return 'positive';
        case 'MOBILIZED': return 'primary';
        case 'SUSPENDED': return 'negative';
        default: return 'grey';
      }
    });

    const canBeMobilized = computed(() => {
      if (!selectedInspector.value) return false;
      return (
        selectedInspector.value.status === 'AVAILABLE' &&
        selectedInspector.value.certifications.some(cert => new Date(cert.expiryDate) > new Date()) &&
        selectedInspector.value.drugTests.some(test => 
          new Date(test.testDate) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        )
      );
    });

    const equipmentSummary = computed(() => {
      if (!selectedInspector.value) return {};
      const summary: Record<string, number> = {};
      selectedInspector.value.equipmentAssignments.forEach(assignment => {
        const type = assignment.equipment.type;
        summary[type] = (summary[type] || 0) + 1;
      });
      return summary;
    });

    const drugTestColumns = [
      {
        name: 'testDate',
        label: 'Date',
        field: 'testDate',
        format: (val: string) => new Date(val).toLocaleDateString(),
        sortable: true
      },
      {
        name: 'testType',
        label: 'Type',
        field: 'testType',
        sortable: true
      },
      {
        name: 'result',
        label: 'Result',
        field: 'result',
        sortable: true
      },
      {
        name: 'administeredBy',
        label: 'Administrator',
        field: 'administeredBy'
      }
    ];

    // Methods
    const loadInspectorDetails = async () => {
      try {
        loading.value = true;
        error.value = null;
        const inspectorId = parseInt(route.params.id as string);
        if (isNaN(inspectorId)) {
          throw new Error('Invalid inspector ID');
        }
        await useInspector().selectInspector({ id: inspectorId } as Inspector);
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load inspector details';
      } finally {
        loading.value = false;
      }
    };

    const handleMobilization = async () => {
      try {
        mobilizing.value = true;
        if (!selectedInspector.value) return;
        await mobilizeInspector(selectedInspector.value.id);
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to mobilize inspector';
      } finally {
        mobilizing.value = false;
      }
    };

    const handleDrugTestSubmitted = () => {
      loadInspectorDetails();
    };

    onMounted(loadInspectorDetails);

    return {
      selectedInspector,
      loading,
      error,
      activeTab,
      mobilizing,
      statusColor,
      canBeMobilized,
      equipmentSummary,
      drugTestColumns,
      handleMobilization,
      handleDrugTestSubmitted
    };
  }
});
</script>

<style lang="scss">
.inspector-detail-page {
  .q-card {
    border-radius: 8px;
  }

  // Enhanced focus indicators for accessibility
  .q-tab:focus-visible,
  .q-btn:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }

  // High contrast status indicators
  .status-chip {
    font-weight: 500;
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
  }
}
</style>