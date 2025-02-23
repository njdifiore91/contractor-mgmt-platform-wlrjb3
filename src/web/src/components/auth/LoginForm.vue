<template>
  <div class="login-form-wrapper">
    <h1 class="text-h4 text-weight-bold text-primary text-center q-mb-sm">Contractor Management Platform</h1>
    <p class="text-subtitle1 text-grey-7 text-center q-mb-lg">Sign in to your account</p>

    <form @submit.prevent="handleSubmit">
      <login-form-input
        v-model="email"
        type="email"
        label="Email"
      />

      <login-form-input
        v-model="password"
        type="password"
        label="Password"
      />

      <div class="row items-center justify-between q-my-md">
        <q-checkbox
          v-model="formData.rememberMe"
          label="Remember me"
          color="primary"
        />
        <q-btn
          flat
          color="primary"
          label="Forgot Password?"
          class="text-caption"
          to="/auth/forgot-password"
        />
      </div>

      <q-banner
        v-if="error"
        class="bg-negative text-white q-mb-md"
        dense
        rounded
      >
        {{ error }}
      </q-banner>

      <button
        type="submit"
        color="primary"
        class="full-width sign-in-btn"
        :loading="loading"
        size="large"
        unelevated
      >
        <span class="text-white text-weight-medium">Sign In</span>
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
import LoginFormInput from './LoginFormInput.vue';

const router = useRouter();
const { login } = useAuth();
const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');
const formData = reactive({
  rememberMe: false
});

async function handleSubmit(e: Event) {
  e.preventDefault();
  loading.value = true;
  error.value = '';

  try {
    const res = await login({ email: email.value, password: password.value });
    console.log(res);

  } catch (err) {
    error.value = 'Authentication failed';
  } finally {
    loading.value = false;
  }
}
</script>

<style lang="scss" scoped>
@use 'sass:color';

$primary-color: #1976D2; // Define a SASS variable for the primary color

.login-form-wrapper {
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem;
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);

  form {
    .sign-in-btn {
      height: 48px;
      font-size: 1rem;
      border-radius: 8px;
      background: $primary-color;
      color: white;
      transition: all 0.3s ease;
      padding: 0 1.5rem;

      &:hover {
        background: color.scale($primary-color, $lightness: -10%);
      }

      &:active {
        background: color.scale($primary-color, $lightness: -20%);
      }
    }
  }
}
</style>