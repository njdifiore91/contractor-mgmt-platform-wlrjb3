<template>
  <div class="audit-logs-page">
    <div class="header-section q-mb-lg">
      <h1 class="text-h4">Audit Logs</h1>
      <div class="row q-col-gutter-md q-mt-md">
        <div class="col-12 col-md-4">
          <q-input
            v-model="filters.search"
            dense
            outlined
            label="Search"
            @update:model-value="handleSearch"
          >
            <template #append>
              <q-icon name="search" />
            </template>
          </q-input>
        </div>
        <div class="col-12 col-md-3">
          <q-select
            v-model="filters.entityType"
            :options="entityTypes"
            dense
            outlined
            label="Entity Type"
            clearable
            @update:model-value="handleFilterChange"
          />
        </div>
        <div class="col-12 col-md-3">
          <q-select
            v-model="filters.action"
            :options="actionTypes"
            dense
            outlined
            label="Action"
            clearable
            @update:model-value="handleFilterChange"
          />
        </div>
        <div class="col-12 col-md-2">
          <q-btn color="primary" icon="file_download" label="Export" @click="handleExport" />
        </div>
      </div>
    </div>

    <q-card>
      <q-tabs
        v-model="activeTab"
        class="text-grey"
        active-color="primary"
        indicator-color="primary"
        align="justify"
        narrow-indicator
      >
        <q-tab name="logs" icon="list" label="Audit Logs" />
        <q-tab name="statistics" icon="analytics" label="Statistics" />
      </q-tabs>

      <q-separator />

      <q-tab-panels v-model="activeTab" animated>
        <!-- Logs Table Panel -->
        <q-tab-panel name="logs">
          <q-table
            :rows="filteredLogs"
            :columns="columns"
            :loading="isLoading"
            row-key="id"
            :pagination="pagination"
            @update:pagination="handlePaginationUpdate"
          >
            <template #body-cell-timestamp="props">
              <q-td :props="props">
                {{ formatDate(props.value) }}
              </q-td>
            </template>

            <template #body-cell-action="props">
              <q-td :props="props">
                <q-chip :color="getActionColor(props.value)" text-color="white" dense>
                  {{ props.value }}
                </q-chip>
              </q-td>
            </template>

            <template #body-cell-details="props">
              <q-td :props="props">
                <q-btn flat round dense icon="info" @click="showDetails(props.row)">
                  <q-tooltip>View Details</q-tooltip>
                </q-btn>
              </q-td>
            </template>
          </q-table>
        </q-tab-panel>

        <!-- Statistics Panel -->
        <q-tab-panel name="statistics">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-card>
                <q-card-section>
                  <div class="text-h6">Actions by Type</div>
                  <canvas ref="actionChart"></canvas>
                </q-card-section>
              </q-card>
            </div>
            <div class="col-12 col-md-6">
              <q-card>
                <q-card-section>
                  <div class="text-h6">Activity Over Time</div>
                  <canvas ref="timelineChart"></canvas>
                </q-card-section>
              </q-card>
            </div>
            <div class="col-12">
              <q-card>
                <q-card-section>
                  <div class="text-h6">Entity Type Distribution</div>
                  <canvas ref="entityChart"></canvas>
                </q-card-section>
              </q-card>
            </div>
          </div>
        </q-tab-panel>
      </q-tab-panels>
    </q-card>

    <!-- Details Dialog -->
    <q-dialog v-model="showDetailsDialog">
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">Audit Log Details</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <pre class="audit-details">{{ selectedLogDetails }}</pre>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Close" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, computed, watch, onUnmounted } from 'vue';
  import { useAuditLog } from '@/composables/useAuditLog';
  import { formatDate } from '@/utils/date.util';
  import { Chart } from 'chart.js/auto';
  import type { ChartConfiguration } from 'chart.js';
  import { useQuasar } from 'quasar';

  const $q = useQuasar();
  const { logs, total, isLoading, error, fetchLogs, statistics } = useAuditLog();

  // State
  const activeTab = ref('logs');
  const showDetailsDialog = ref(false);
  const selectedLogDetails = ref<string | null>(null);
  const actionChart = ref<HTMLCanvasElement | null>(null);
  const timelineChart = ref<HTMLCanvasElement | null>(null);
  const entityChart = ref<HTMLCanvasElement | null>(null);
  let charts: Chart[] = [];

  const filters = ref({
    search: '',
    entityType: null as string | null,
    action: null as string | null,
    startDate: null as string | null,
    endDate: null as string | null,
  });

  const pagination = ref({
    page: 1,
    rowsPerPage: 20,
    sortBy: 'performedAt',
    descending: true,
    rowsNumber: 0,
  });

  // Table configuration
  const columns = [
    {
      name: 'performedAt',
      required: true,
      label: 'Timestamp',
      align: 'left' as const,
      field: 'performedAt',
      sortable: true,
      format: (val: string) => formatDate(val),
    },
    {
      name: 'entityType',
      required: true,
      label: 'Entity Type',
      align: 'left' as const,
      field: 'entityType',
      sortable: true,
    },
    {
      name: 'action',
      required: true,
      label: 'Action',
      align: 'left' as const,
      field: 'action',
      sortable: true,
    },
    {
      name: 'performedBy',
      required: true,
      label: 'User',
      align: 'left' as const,
      field: 'performedBy',
      sortable: true,
    },
    {
      name: 'status',
      required: true,
      label: 'Status',
      align: 'left' as const,
      field: 'status',
      sortable: true,
    },
    {
      name: 'details',
      required: true,
      label: 'Details',
      align: 'center' as const,
      field: 'details',
    },
  ];

  // Computed properties
  const filteredLogs = computed(() => {
    let filtered = [...logs.value];

    if (filters.value.search) {
      const searchTerm = filters.value.search.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.entityType.toLowerCase().includes(searchTerm) ||
          log.action.toLowerCase().includes(searchTerm) ||
          log.performedBy.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.value.entityType) {
      filtered = filtered.filter((log) => log.entityType === filters.value.entityType);
    }

    if (filters.value.action) {
      filtered = filtered.filter((log) => log.action === filters.value.action);
    }

    return filtered;
  });

  const entityTypes = ['USER', 'ROLE', 'PERMISSION', 'EQUIPMENT', 'SYSTEM'];

  const actionTypes = ['create', 'update', 'delete', 'view', 'export', 'login'];

  // Methods
  const handleSearch = async () => {
    await fetchLogs(filters.value, {
      page: pagination.value.page,
      rowsPerPage: pagination.value.rowsPerPage,
    });
  };

  const handleFilterChange = async () => {
    pagination.value.page = 1;
    await handleSearch();
  };

  const handlePaginationUpdate = async (newPagination: any) => {
    pagination.value = newPagination;
    await handleSearch();
  };

  const handleExport = () => {
    $q.notify({
      type: 'warning',
      message: 'Export functionality coming soon',
      position: 'top',
    });
  };

  const showDetails = (row: any) => {
    selectedLogDetails.value = JSON.stringify(row.details, null, 2);
    showDetailsDialog.value = true;
  };

  const getActionColor = (action: string): string => {
    const colors: Record<string, string> = {
      create: 'positive',
      update: 'warning',
      delete: 'negative',
      view: 'info',
      export: 'purple',
      login: 'primary',
    };
    return colors[action] || 'grey';
  };

  // Chart rendering functions
  const renderActionChart = () => {
    if (!actionChart.value || !statistics.value) return;

    const { actionDistribution } = statistics.value;
    const data = {
      labels: Object.keys(actionDistribution),
      datasets: [
        {
          data: Object.values(actionDistribution),
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
        },
      ],
    };

    const config: ChartConfiguration = {
      type: 'pie',
      data,
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
          },
          title: {
            display: true,
            text: 'Actions Distribution',
          },
        },
      },
    };

    charts.push(new Chart(actionChart.value, config));
  };

  const renderTimelineChart = () => {
    if (!timelineChart.value || !statistics.value) return;

    const { timeline } = statistics.value;
    const data = {
      labels: Object.keys(timeline),
      datasets: [
        {
          label: 'Activity',
          data: Object.values(timeline),
          fill: false,
          borderColor: '#36A2EB',
          tension: 0.1,
        },
      ],
    };

    const config: ChartConfiguration = {
      type: 'line',
      data,
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
          },
          title: {
            display: true,
            text: 'Activity Timeline',
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    };

    charts.push(new Chart(timelineChart.value, config));
  };

  const renderEntityChart = () => {
    if (!entityChart.value || !statistics.value) return;

    const { entityDistribution } = statistics.value;
    const data = {
      labels: Object.keys(entityDistribution),
      datasets: [
        {
          data: Object.values(entityDistribution),
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
        },
      ],
    };

    const config: ChartConfiguration = {
      type: 'doughnut',
      data,
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
          },
          title: {
            display: true,
            text: 'Entity Type Distribution',
          },
        },
      },
    };

    charts.push(new Chart(entityChart.value, config));
  };

  // Update chart rendering when tab changes or data updates
  watch(
    () => activeTab.value,
    async (newTab) => {
      if (newTab === 'statistics') {
        // Clear existing charts
        charts.forEach((chart) => chart.destroy());
        charts = [];

        // Render new charts
        renderActionChart();
        renderTimelineChart();
        renderEntityChart();
      }
    }
  );

  watch(
    () => statistics.value,
    () => {
      if (activeTab.value === 'statistics') {
        // Clear existing charts
        charts.forEach((chart) => chart.destroy());
        charts = [];

        // Render new charts
        renderActionChart();
        renderTimelineChart();
        renderEntityChart();
      }
    },
    { deep: true }
  );

  // Watch for filter changes
  watch(
    () => [filters.value.search, filters.value.entityType, filters.value.action],
    () => {
      handleFilterChange();
    },
    { deep: true }
  );

  // Clean up charts when component is unmounted
  onUnmounted(() => {
    charts.forEach((chart) => chart.destroy());
    charts = [];
  });

  onMounted(async () => {
    try {
      await handleSearch();
      if (activeTab.value === 'statistics') {
        renderActionChart();
        renderTimelineChart();
        renderEntityChart();
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      $q.notify({
        type: 'negative',
        message: 'Failed to load initial data',
        position: 'top',
      });
    }
  });
</script>

<style lang="scss" scoped>
  .audit-logs-page {
    padding: 20px;

    .header-section {
      h1 {
        margin: 0;
      }
    }

    .audit-details {
      white-space: pre-wrap;
      word-wrap: break-word;
      background: #f5f5f5;
      padding: 10px;
      border-radius: 4px;
      font-family: monospace;
    }

    canvas {
      width: 100% !important;
      height: 300px !important;
    }
  }
</style>
