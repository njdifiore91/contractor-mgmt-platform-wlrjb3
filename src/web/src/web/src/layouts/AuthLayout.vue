<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <div class="auth-layout">
        <div class="auth-container">
          <div class="auth-logo">
            <h1>Contractor Management Platform</h1>
          </div>
          <div class="auth-content">
            <router-view />
          </div>
        </div>
      </div>
    </q-page-container>
  </q-layout>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'AuthLayout'
});
</script>

<style lang="scss">
.auth-layout {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--primary) 0%, hsl(var(--primary-h) var(--primary-s) calc(var(--primary-l) - 15%)) 100%);
  padding: 2rem;

  .auth-container {
    width: 100%;
    max-width: 440px;
    background: white;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    overflow: hidden;

    .auth-logo {
      text-align: center;
      padding: 2rem 2rem 1rem;
      background: rgba(0, 0, 0, 0.02);
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);

      h1 {
        color: var(--primary);
        font-size: 1.75rem;
        font-weight: 600;
        margin: 0;
        line-height: 1.2;
      }
    }

    .auth-content {
      padding: 2rem;
    }
  }
}
</style> 