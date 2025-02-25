<template>
  <q-form
    ref="formRef"
    @submit.prevent="handleSubmit"
    class="contact-form q-gutter-md"
    aria-labelledby="contact-form-title"
  >
    <h2 id="contact-form-title" class="text-h6 q-mb-md">
      {{ contact ? t('customer.contact.edit') : t('customer.contact.create') }}
    </h2>

    <!-- Personal Information Section -->
    <div class="row q-col-gutter-md">
      <div class="col-12 col-md-6">
        <q-input
          v-model="formData.firstName"
          :label="t('customer.contact.firstName')"
          :rules="[(val) => validateRequired(val) || t('validation.required')]"
          :error="!!errors.firstName"
          :error-message="errors.firstName"
          @blur="validateField('firstName')"
          maxlength="50"
          outlined
          dense
          required
          aria-required="true"
        />
      </div>
      <div class="col-12 col-md-6">
        <q-input
          v-model="formData.lastName"
          :label="t('customer.contact.lastName')"
          :rules="[(val) => validateRequired(val) || t('validation.required')]"
          :error="!!errors.lastName"
          :error-message="errors.lastName"
          @blur="validateField('lastName')"
          maxlength="50"
          outlined
          dense
          required
          aria-required="true"
        />
      </div>
    </div>

    <!-- Contact Information Section -->
    <div class="row q-col-gutter-md">
      <div class="col-12 col-md-6">
        <q-input
          v-model="formData.email"
          :label="t('customer.contact.email')"
          :rules="[
            (val) => validateRequired(val) || t('validation.required'),
            (val) => validateEmail(val) || t('validation.email')
          ]"
          :error="!!errors.email"
          :error-message="errors.email"
          @blur="validateField('email')"
          type="email"
          maxlength="254"
          outlined
          dense
          required
          aria-required="true"
        />
      </div>
      <div class="col-12 col-md-6">
        <q-input
          v-model="formData.phoneNumber"
          :label="t('customer.contact.phoneNumber')"
          :rules="[
            (val) => validateRequired(val) || t('validation.required'),
            (val) => validatePhoneNumber(val) || t('validation.phoneNumber')
          ]"
          :error="!!errors.phoneNumber"
          :error-message="errors.phoneNumber"
          @blur="validateField('phoneNumber')"
          mask="(###) ###-####"
          outlined
          dense
          required
          aria-required="true"
        />
      </div>
    </div>

    <!-- Professional Information Section -->
    <div class="row q-col-gutter-md">
      <div class="col-12 col-md-6">
        <q-input
          v-model="formData.title"
          :label="t('customer.contact.title')"
          :rules="[(val) => validateRequired(val) || t('validation.required')]"
          :error="!!errors.title"
          :error-message="errors.title"
          @blur="validateField('title')"
          maxlength="100"
          outlined
          dense
          required
          aria-required="true"
        />
      </div>
      <div class="col-12 col-md-6">
        <q-toggle
          v-model="formData.isPrimary"
          :label="t('customer.contact.isPrimary')"
          aria-label="Set as primary contact"
        />
      </div>
    </div>

    <!-- Form Actions -->
    <div class="row justify-end q-gutter-sm">
      <q-btn
        :label="t('common.cancel')"
        flat
        color="grey"
        @click="handleCancel"
        :disable="loading"
      />
      <q-btn
        :label="t('common.save')"
        type="submit"
        color="primary"
        :loading="loading"
      />
    </div>
  </q-form>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import { useQuasar } from '@quasar/vue'; // v2.x
import { useI18n } from 'vue-i18n'; // v9.x
import sanitizeHtml from 'sanitize-html'; // v2.x
import type { IContact } from '../../models/customer.model';
import { createContact } from '../../api/customer.api';
import { validateEmail, validatePhoneNumber, validateRequired } from '../../utils/validation.util';

export default defineComponent({
  name: 'ContactForm',

  props: {
    customerId: {
      type: Number,
      required: true
    },
    contact: {
      type: Object as () => IContact,
      default: null
    }
  },

  emits: ['submit', 'cancel', 'validation-error'],

  setup(props, { emit }) {
    const $q = useQuasar();
    const { t } = useI18n();
    const formRef = ref(null);
    const loading = ref(false);
    const errors = ref<Record<string, string>>({});

    // Form data with secure defaults
    const formData = ref({
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      title: '',
      isPrimary: false
    });

    // Initialize form with sanitized data
    const initializeForm = () => {
      if (props.contact) {
        formData.value = {
          firstName: sanitizeHtml(props.contact.firstName, { allowedTags: [] }),
          lastName: sanitizeHtml(props.contact.lastName, { allowedTags: [] }),
          email: sanitizeHtml(props.contact.email, { allowedTags: [] }),
          phoneNumber: sanitizeHtml(props.contact.phoneNumber, { allowedTags: [] }),
          title: sanitizeHtml(props.contact.title, { allowedTags: [] }),
          isPrimary: props.contact.isPrimary
        };
      }
    };

    // Validate individual field
    const validateField = (field: string) => {
      const value = formData.value[field as keyof typeof formData.value];
      
      switch (field) {
        case 'email':
          if (!validateEmail(value)) {
            errors.value[field] = t('validation.email');
            return false;
          }
          break;
        case 'phoneNumber':
          if (!validatePhoneNumber(value)) {
            errors.value[field] = t('validation.phoneNumber');
            return false;
          }
          break;
        default:
          if (!validateRequired(value)) {
            errors.value[field] = t('validation.required');
            return false;
          }
      }
      
      delete errors.value[field];
      return true;
    };

    // Validate entire form
    const validateForm = (): boolean => {
      const fields = ['firstName', 'lastName', 'email', 'phoneNumber', 'title'];
      const validations = fields.map(field => validateField(field));
      return validations.every(Boolean);
    };

    // Handle form submission
    const handleSubmit = async () => {
      try {
        if (!validateForm()) {
          emit('validation-error', errors.value);
          return;
        }

        loading.value = true;

        // Sanitize form data before submission
        const sanitizedData = {
          customerId: props.customerId,
          firstName: sanitizeHtml(formData.value.firstName, { allowedTags: [] }),
          lastName: sanitizeHtml(formData.value.lastName, { allowedTags: [] }),
          email: sanitizeHtml(formData.value.email, { allowedTags: [] }),
          phoneNumber: sanitizeHtml(formData.value.phoneNumber, { allowedTags: [] }),
          title: sanitizeHtml(formData.value.title, { allowedTags: [] }),
          isPrimary: formData.value.isPrimary
        };

        const response = await createContact(props.customerId, sanitizedData);
        
        $q.notify({
          type: 'positive',
          message: t('customer.contact.createSuccess')
        });

        emit('submit', response);
      } catch (error) {
        console.error('Contact creation failed:', error);
        $q.notify({
          type: 'negative',
          message: t('customer.contact.createError')
        });
      } finally {
        loading.value = false;
      }
    };

    const handleCancel = () => {
      emit('cancel');
    };

    onMounted(() => {
      initializeForm();
    });

    return {
      formRef,
      formData,
      loading,
      errors,
      validateField,
      handleSubmit,
      handleCancel,
      validateRequired,
      validateEmail,
      validatePhoneNumber,
      t
    };
  }
});
</script>

<style lang="scss" scoped>
.contact-form {
  max-width: 800px;
  margin: 0 auto;
  padding: 1.5rem;
}
</style>