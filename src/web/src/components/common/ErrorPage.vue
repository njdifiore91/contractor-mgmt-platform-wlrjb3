<template>
  <q-page class="error-page flex flex-center">
    <div class="text-center">
      <h1 class="text-h3 q-mb-md">{{ title }}</h1>
      <p class="text-subtitle1 q-mb-lg">{{ message }}</p>
      <q-btn
        color="primary"
        label="Go Back"
        @click="$router.back()"
      />
      <q-btn
        color="secondary"
        label="Go Home"
        class="q-ml-sm"
        to="/"
      />
    </div>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { useRoute } from 'vue-router';

export default defineComponent({
  name: 'ErrorPage',

  setup() {
    const route = useRoute();

    const title = computed(() => {
      if (route.name === 'not-found') {
        return '404 - Page Not Found';
      }
      return 'Error';
    });

    const message = computed(() => {
      if (route.name === 'not-found') {
        return 'The page you are looking for does not exist.';
      }
      return 'Something went wrong. Please try again later.';
    });

    return {
      title,
      message
    };
  }
});
</script>

<style lang="scss" scoped>
.error-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}
</style> 