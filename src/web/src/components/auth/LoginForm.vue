<template>
  <form 
    class="login-form"
    @submit.prevent="handleSubmit"
    novalidate
    aria-labelledby="login-title"
  >
    <h1 id="login-title" class="text-h5 q-mb-md">Sign In</h1>

    <!-- Email Input -->
    <q-input
      v-model="email"
      type="email"
      label="Email"
      :error="!!emailError"
      :error-message="emailError"
      autocomplete="email"
      :rules="[val => !!val || 'Email is required']"
      aria-required="true"
      ref="emailInput"
      @keyup.enter="focusPassword"
      class="q-mb-md"
    >
      <template v-slot:prepend>
        <q-icon name="email" />
      </template>
    </q-input>

    <!-- Password Input -->
    <q-input
      v-model="password"
      :type="showPassword ? 'text' : 'password'"
      label="Password"
      :error="!!passwordError"
      :error-message="passwordError"
      autocomplete="current-password"
      :rules="[val => !!val || 'Password is required']"
      aria-required="true"
      ref="passwordInput"
      class="q-mb-md"
    >
      <template v-slot:prepend>
        <q-icon name="lock" />
      </template>
      <template v-slot:append>
        <q-icon
          :name="showPassword ? 'visibility_off' : 'visibility'"
          class="cursor-pointer"
          @click="showPassword = !showPassword"
          :aria-label="showPassword ? 'Hide password' : 'Show password'"
        />
      </template>
    </q-input>

    <!-- Remember Me Checkbox -->
    <q-checkbox
      v-model="rememberMe"
      label="Remember me"
      class="q-mb-md"
    />

    <!-- Error Alert -->
    <q-banner
      v-if="error"
      class="bg-negative text-white q-mb-md"
      rounded
      dense
      role="alert"
    >
      {{ error }}
    </q-banner>

    <!-- Submit Button -->
    <q-btn
      type="submit"
      color="primary"
      :loading="isLoading"
      :disable="isLoading"
      class="full-width"
      aria-label="Sign in"
    >
      <span v-if="!isLoading">Sign In</span>
      <template v-slot:loading>
        <loading-spinner size="small" color="white" />
      </template>
    </q-btn>

    <!-- MFA Dialog -->
    <q-dialog v-model="showMfaDialog" persistent>
      <q-card class="mfa-dialog">
        <q-card-section>
          <h2 class="text-h6">Two-Factor Authentication</h2>
          <p class="q-mt-sm">Please enter the verification code sent to your device.</p>
        </q-card-section>

        <q-card-section>
          <q-input
            v-model="mfaCode"
            type="text"
            label="Verification Code"
            :rules="[val => !!val || 'Code is required']"
            maxlength="6"
            class="q-mb-md"
            ref="mfaInput"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            flat
            label="Cancel"
            color="primary"
            @click="cancelMfa"
            :disable="isLoading"
          />
          <q-btn
            label="Verify"
            color="primary"
            @click="verifyMfa"
            :loading="isLoading"
            :disable="isLoading"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </form>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue'; // ^3.3.0
import { useQuasar } from '@quasar/quasar-ui-qinput'; // ^2.0.0
import { useRouter } from 'vue-router'; // ^4.0.0
import { useAuth } from '../../composables/useAuth';
import LoadingSpinner from '../common/LoadingSpinner.vue';

export default defineComponent({
  name: 'LoginForm',

  components: {
    LoadingSpinner
  },

  setup() {
    const $q = useQuasar();
    const router = useRouter();
    const { login, isLoading, error, initiateMFA, getDeviceFingerprint } = useAuth();

    // Form refs
    const emailInput = ref<any>(null);
    const passwordInput = ref<any>(null);
    const mfaInput = ref<any>(null);

    // Form state
    const email = ref('');
    const password = ref('');
    const rememberMe = ref(false);
    const showPassword = ref(false);
    const emailError = ref('');
    const passwordError = ref('');
    const mfaCode = ref('');
    const showMfaDialog = ref(false);
    const deviceFingerprint = ref('');

    onMounted(() => {
      emailInput.value?.focus();
      initializeDeviceFingerprint();
    });

    const initializeDeviceFingerprint = async () => {
      try {
        deviceFingerprint.value = await getDeviceFingerprint();
      } catch (err) {
        console.error('Failed to generate device fingerprint:', err);
      }
    };

    const validateForm = (): boolean => {
      let isValid = true;
      emailError.value = '';
      passwordError.value = '';

      // Email validation
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!email.value) {
        emailError.value = 'Email is required';
        isValid = false;
      } else if (!emailRegex.test(email.value)) {
        emailError.value = 'Please enter a valid email address';
        isValid = false;
      }

      // Password validation
      if (!password.value) {
        passwordError.value = 'Password is required';
        isValid = false;
      }

      return isValid;
    };

    const handleSubmit = async () => {
      if (!validateForm()) {
        $q.notify({
          type: 'negative',
          message: 'Please correct the form errors',
          position: 'top'
        });
        return;
      }

      try {
        const response = await login({
          email: email.value,
          password: password.value,
          rememberMe: rememberMe.value,
          deviceFingerprint: deviceFingerprint.value
        });

        if (response?.requiresMfa) {
          showMfaDialog.value = true;
          setTimeout(() => mfaInput.value?.focus(), 100);
        } else {
          router.push('/dashboard');
        }
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: error.value || 'Authentication failed',
          position: 'top'
        });
      }
    };

    const verifyMfa = async () => {
      if (!mfaCode.value) {
        $q.notify({
          type: 'negative',
          message: 'Please enter the verification code',
          position: 'top'
        });
        return;
      }

      try {
        await initiateMFA(mfaCode.value);
        showMfaDialog.value = false;
        router.push('/dashboard');
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: error.value || 'MFA verification failed',
          position: 'top'
        });
      }
    };

    const cancelMfa = () => {
      showMfaDialog.value = false;
      mfaCode.value = '';
    };

    const focusPassword = () => {
      passwordInput.value?.focus();
    };

    return {
      // Refs
      email,
      password,
      rememberMe,
      showPassword,
      emailError,
      passwordError,
      mfaCode,
      showMfaDialog,
      emailInput,
      passwordInput,
      mfaInput,
      
      // State
      isLoading,
      error,

      // Methods
      handleSubmit,
      verifyMfa,
      cancelMfa,
      focusPassword
    };
  }
});
</script>

<style lang="scss" scoped>
.login-form {
  max-width: 400px;
  margin: 0 auto;
  padding: map-get(responsive-spacing(padding, $space-base), md);

  @media (min-width: $breakpoint-sm) {
    padding: map-get(responsive-spacing(padding, $space-base), lg);
  }

  .mfa-dialog {
    min-width: 300px;
    border-radius: $border-radius-lg;
  }

  :deep(.q-field) {
    &--error {
      animation: shake 0.2s ease-in-out 0s 2;
    }
  }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}
</style>