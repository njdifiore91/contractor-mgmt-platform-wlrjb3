<template>
  <div class="data-table">
    <q-table
      v-bind="$attrs"
      :rows="data"
      :columns="columns"
      :loading="loading"
      :row-key="rowKey"
      :virtual-scroll="virtualScroll"
      @row-click="$emit('row-click', $event)"
    >
      <template v-for="(_, slot) in $slots" v-slot:[slot]="scope">
        <slot :name="slot" v-bind="scope"/>
      </template>
    </q-table>
  </div>
</template>

<script setup lang="ts">
import { QTable } from 'quasar';

interface Column {
  name: string;
  label: string;
  field: string | ((row: any) => any);
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  format?: (val: any) => string;
}

interface Props {
  data: any[];
  columns: Column[];
  loading?: boolean;
  virtualScroll?: boolean;
  rowKey?: string;
}

// Define props with defaults
const props = withDefaults(defineProps<Props>(), {
  loading: false,
  virtualScroll: false,
  rowKey: 'id'
});

// Define emits
defineEmits<{
  (e: 'row-click', event: Event, row: any): void;
}>();
</script>

<style lang="scss" scoped>
.data-table {
  :deep(.q-table) {
    background: white;
    border-radius: 4px;
  }
  
  :deep(.q-table__card) {
    box-shadow: none;
  }
}
</style>