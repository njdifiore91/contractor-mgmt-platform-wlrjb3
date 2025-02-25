<template>
  <q-page class="equipment-create-page" role="main">
    <!-- Page Title -->
    <div class="row items-center q-mb-lg">
      <q-btn
        flat
        round
        icon="arrow_back"
        :to="{ name: 'equipment-list' }"
        class="q-mr-sm"
        aria-label="Back to equipment list"
      />
      <h1 class="text-h5 q-my-none">Add New Equipment</h1>
    </div>

    <!-- Equipment Form -->
    <EquipmentForm
      :loading="loading"
      @save="handleSave"
      @cancel="handleCancel"
    />

    <!-- Error Display -->
    <q-banner
      v-if="error"
      class="bg-negative text-white q-mt-md"
      rounded
      dense
      role="alert"
    >
      {{ error }}
    </q-banner>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useRouter } from 'vue-router';
import { QPage, QBtn, useQuasar } from 'quasar';
import EquipmentForm from '@/components/equipment/EquipmentForm.vue';
import { useEquipmentStore } from '@/stores/equipment.store';
import { useNotification } from '@/composables/useNotification';
import type { Equipment } from '@/models/equipment.model';

export default defineComponent({
  name: 'EquipmentCreatePage',

  components: {
    QPage,
    QBtn,
    EquipmentForm
  },

  setup() {
    const router = useRouter();
    const equipmentStore = useEquipmentStore();
    const { showSuccessNotification, showErrorNotification } = useNotification();

    const loading = ref(false);
    const error = ref<string | null>(null);

    const handleSave = async (equipmentData: Partial<Equipment>) => {
      try {
        loading.value = true;
        error.value = null;

        await equipmentStore.createNewEquipment(equipmentData);
        showSuccessNotification('Equipment created successfully');
        await router.push({ name: 'equipment-list' });
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to create equipment';
        showErrorNotification(error.value);
      } finally {
        loading.value = false;
      }
    };

    const handleCancel = async () => {
      await router.push({ name: 'equipment-list' });
    };

    return {
      loading,
      error,
      handleSave,
      handleCancel
    };
  }
});
</script>

<style lang="scss" scoped>
.equipment-create-page {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;

  @media (max-width: $breakpoint-sm) {
    padding: 1rem;
  }
}
</style> 