<template>
  <div class="customer-create-page q-pa-md">
    <div class="text-h5 q-mb-md">{{ t('customer.create.title') }}</div>
    
    <QCard class="customer-form">
      <QCardSection>
        <QForm @submit="handleSubmit" class="q-gutter-md">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <QInput
                v-model="formData.name"
                :label="t('customer.fields.name')"
                :rules="[val => !!val || t('validation.required')]"
                outlined
                dense
                lazy-rules
              />
            </div>
            <div class="col-12 col-md-6">
              <QInput
                v-model="formData.code"
                :label="t('customer.fields.code')"
                :rules="[val => !!val || t('validation.required')]"
                outlined
                dense
                lazy-rules
              />
            </div>
            <div class="col-12 col-md-6">
              <QSelect
                v-model="formData.region"
                :options="regionOptions"
                :label="t('customer.fields.region')"
                :rules="[val => !!val || t('validation.required')]"
                outlined
                dense
                emit-value
                map-options
                lazy-rules
              />
            </div>
            <div class="col-12 col-md-6">
              <QSelect
                v-model="formData.status"
                :options="statusOptions"
                :label="t('customer.fields.status')"
                :rules="[val => !!val || t('validation.required')]"
                outlined
                dense
                emit-value
                map-options
                lazy-rules
              />
            </div>
            <div class="col-12">
              <QInput
                v-model="formData.address"
                type="textarea"
                :label="t('customer.fields.address')"
                :rules="[val => !!val || t('validation.required')]"
                outlined
                dense
                lazy-rules
                autogrow
              />
            </div>
          </div>

          <div class="row q-col-gutter-md q-mt-md">
            <div class="col-12 col-md-6">
              <QInput
                v-model="formData.contactPerson"
                :label="t('customer.fields.contactPerson')"
                :rules="[val => !!val || t('validation.required')]"
                outlined
                dense
                lazy-rules
              />
            </div>
            <div class="col-12 col-md-6">
              <QInput
                v-model="formData.email"
                type="email"
                :label="t('customer.fields.email')"
                :rules="[
                  val => !!val || t('validation.required'),
                  val => /^[^@]+@[^@]+\.[^@]+$/.test(val) || t('validation.email')
                ]"
                outlined
                dense
                lazy-rules
              />
            </div>
            <div class="col-12 col-md-6">
              <QInput
                v-model="formData.phone"
                :label="t('customer.fields.phone')"
                :rules="[val => !!val || t('validation.required')]"
                outlined
                dense
                lazy-rules
              />
            </div>
          </div>

          <div class="row q-mt-lg">
            <div class="col-12 flex justify-end q-gutter-sm">
              <QBtn
                :label="t('common.cancel')"
                color="grey"
                flat
                :to="{ name: 'customer-list' }"
              />
              <QBtn
                :label="t('common.save')"
                type="submit"
                color="primary"
                :loading="loading"
              />
            </div>
          </div>
        </QForm>
      </QCardSection>
    </QCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useQuasar } from 'quasar';
import { CustomerStatus } from '@/models/customer.model';
import { useCustomerStore } from '@/stores/customer.store';

const router = useRouter();
const { t } = useI18n();
const $q = useQuasar();
const customerStore = useCustomerStore();

const loading = ref(false);

const formData = ref({
  name: '',
  code: '',
  region: '',
  status: CustomerStatus.Active,
  address: '',
  contactPerson: '',
  email: '',
  phone: ''
});

const regionOptions = computed(() => [
  { label: t('customer.regions.north'), value: 'North' },
  { label: t('customer.regions.south'), value: 'South' },
  { label: t('customer.regions.east'), value: 'East' },
  { label: t('customer.regions.west'), value: 'West' }
]);

const statusOptions = computed(() => [
  { label: t('customer.status.active'), value: CustomerStatus.Active },
  { label: t('customer.status.inactive'), value: CustomerStatus.Inactive },
  { label: t('customer.status.pending'), value: CustomerStatus.Pending }
]);

const handleSubmit = async () => {
  try {
    loading.value = true;
    await customerStore.createCustomer(formData.value);
    
    $q.notify({
      type: 'positive',
      message: t('customer.create.success')
    });
    
    router.push({ name: 'customer-list' });
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: t('customer.create.error')
    });
  } finally {
    loading.value = false;
  }
};
</script>

<style lang="scss" scoped>
.customer-create-page {
  max-width: 1200px;
  margin: 0 auto;

  .customer-form {
    border-radius: 8px;
    box-shadow: 0 1px 5px rgba(0, 0, 0, 0.1);
  }
}
</style> 