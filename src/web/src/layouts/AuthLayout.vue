<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <div class="auth-layout">
        <div class="auth-container">
          <router-view />
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
  background: var(--primary);


  padding: 0;
  position: relative;
  overflow: hidden;


  .auth-container {
    width: 100%;
    max-width: 440px;
    position: relative;
    z-index: 1;
    padding: 0;
    overflow: hidden;
  }
}
</style>