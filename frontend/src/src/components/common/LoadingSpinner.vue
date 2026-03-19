<template>
  <div v-if="isLoading" class="loading-container" :style="{ minHeight: minHeight }">
    <div class="loading-spinner">
      <div class="spinner"></div>
      <p v-if="message" class="loading-message">{{ message }}</p>
    </div>
  </div>
  <div v-else>
    <slot />
  </div>
</template>

<script>
export default {
  name: 'LoadingSpinner',
  props: {
    isLoading: {
      type: Boolean,
      default: false,
    },
    message: {
      type: String,
      default: 'جاري التحميل...',
    },
    minHeight: {
      type: String,
      default: '200px',
    },
  },
}
</script>

<style scoped>
.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid var(--color-gray-200);
  border-top-color: var(--color-primary-600);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-message {
  margin: 0;
  color: var(--color-gray-500);
  font-size: var(--text-base);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
