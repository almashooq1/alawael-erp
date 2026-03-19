<template>
  <div class="page-container">
    <div class="page-header">
      <h1>{{ pageTitle }}</h1>
      <p v-if="pageDescription" class="page-description">
        {{ pageDescription }}
      </p>
    </div>

    <div class="page-content">
      <!-- سيتم تطوير محتوى الصفحة -->
      <div class="placeholder-content">
        <p class="placeholder-text">
          هذه الصفحة قيد التطوير...
        </p>
        <router-link to="/dashboard" class="btn btn-primary">
          العودة إلى لوحة التحكم
        </router-link>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PageTemplate',
  data() {
    return {
      pageTitle: 'عنوان الصفحة',
      pageDescription: 'وصف الصفحة',
    }
  },
}
</script>

<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.page-header {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.page-header h1 {
  margin: 0;
  font-size: var(--text-2xl);
  color: var(--color-gray-800);
}

.page-description {
  margin: 0;
  font-size: var(--text-base);
  color: var(--color-gray-500);
}

.page-content {
  background: var(--color-white);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  padding: var(--spacing-xl);
}

.placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-lg);
  min-height: 300px;
}

.placeholder-text {
  margin: 0;
  font-size: var(--text-lg);
  color: var(--color-gray-500);
}

.btn {
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--color-primary-600);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  cursor: pointer;
  transition: all var(--transition-base);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn:hover {
  background: var(--color-primary-700);
  box-shadow: var(--shadow-md);
}
</style>
