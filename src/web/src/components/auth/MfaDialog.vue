<template>
  <q-dialog v-model="modelValue" persistent>
    <q-card class="mfa-dialog">
      <q-card-section>
        <div class="text-h6">Two-Factor Authentication</div>
        <div class="q-mt-sm">Please enter the verification code sent to your device.</div>
      </q-card-section>

      <q-card-section>
        <q-input
          v-model="code"
          type="text"
          label="Verification Code"
          :rules="[val => !!val || 'Code is required']"
          maxlength="6"
          class="q-mb-md"
          ref="codeInput"
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="primary" @click="onCancel" :disable="loading" />
        <q-btn label="Verify" color="primary" @click="onVerify" :loading="loading" :disable="loading" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from 'vue';

export default defineComponent({
  name: 'MfaDialog',

  props: {
    modelValue: {
      type: Boolean,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    }
  },

  emits: ['update:modelValue', 'verify', 'cancel'],

  setup(props, { emit }) {
    const code = ref('');
    const codeInput = ref<any>(null);

    watch(() => props.modelValue, (newVal) => {
      if (newVal) {
        setTimeout(() => codeInput.value?.focus(), 100);
      } else {
        code.value = '';
      }
    });

    const onVerify = () => {
      emit('verify', code.value);
    };

    const onCancel = () => {
      emit('cancel');
      emit('update:modelValue', false);
    };

    return {
      code,
      codeInput,
      onVerify,
      onCancel
    };
  }
});
</script>

<style lang="scss" scoped>
.mfa-dialog {
  min-width: 300px;
  max-width: 400px;
  border-radius: 8px;
}
</style> 