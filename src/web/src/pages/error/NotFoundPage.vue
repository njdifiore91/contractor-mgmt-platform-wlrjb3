<template>
  <q-page class="not-found-page" role="main">
    <div class="error-container">
      <h1 class="error-title">404</h1>
      <p class="error-message">Page Not Found</p>
      <p class="error-description">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <q-btn
        color="primary"
        label="Go Back Home"
        @click="goHome"
        class="mt-8"
        icon="home"
      />
    </div>
  </q-page>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useRouter } from 'vue-router';

export default defineComponent({
  name: 'NotFoundPage',

  setup() {
    const router = useRouter();

    const goHome = () => {
      router.push('/');
    };

    return {
      goHome
    };
  }
});
</script>

<style lang="scss" scoped>
.not-found-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary);
  @apply p-4 md:p-8;

  .error-container {
    text-align: center;
    background: white;
    @apply p-6 md:p-8 rounded-lg shadow-lg max-w-md w-full mx-auto;

    .error-title {
      @apply text-6xl md:text-8xl font-bold mb-4;
      color: var(--primary);
    }

    .error-message {
      @apply text-xl md:text-2xl font-semibold mb-2;
    }

    .error-description {
      @apply text-gray-600 text-sm md:text-base;
    }
  }
}
</style> 