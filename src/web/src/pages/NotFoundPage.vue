<template>
  <div class="not-found-page">
    <h1>404 - Page Not Found</h1>
    <p>The page you are looking for does not exist.</p>
    <router-link to="/" class="home-link">Return to Home</router-link>
  </div>
</template>

<script>
export default {
  name: 'NotFoundPage'
}
</script>

<style lang="scss" scoped>
.not-found-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 20px;
  text-align: center;

  h1 {
    margin-bottom: 20px;
  }

  .home-link {
    margin-top: 20px;
    color: var(--primary);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}
</style> 