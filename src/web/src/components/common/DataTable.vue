<template>
  <div>
    <q-table
      :data="data"
      :columns="columns"
      :loading="loading"
      row-key="id"
    />
  </div>
</template>

<script>
export default {
  props: {
    data: {
      type: Array,
      required: true
    },
    columns: {
      type: Array,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    }
  }
}
</script>

<style>
.data-table {
  background: white;
}
</style>