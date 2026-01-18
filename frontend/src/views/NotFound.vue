<template>
  <div class="not-found-page">
    <div class="not-found-container">
      <div class="not-found-content">
        <h1 class="error-code">404</h1>
        <h2 class="error-title">الصفحة غير موجودة</h2>
        <p class="error-description">
          عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها إلى مكان آخر.
        </p>

        <div class="error-suggestions">
          <p class="suggestion-title">قد تكون مهتماً بـ:</p>
          <ul class="suggestion-list">
            <li>
              <router-link to="/dashboard" class="suggestion-link">
                🏠 العودة إلى الصفحة الرئيسية
              </router-link>
            </li>
            <li>
              <router-link to="/students" class="suggestion-link">
                👥 إدارة الطلاب
              </router-link>
            </li>
            <li>
              <router-link to="/programs" class="suggestion-link">
                📚 إدارة البرامج
              </router-link>
            </li>
            <li>
              <router-link to="/sessions" class="suggestion-link">
                ⏰ جدول الجلسات
              </router-link>
            </li>
          </ul>
        </div>

        <button class="btn-back" @click="goBack">
          ← العودة للصفحة السابقة
        </button>
      </div>

      <div class="not-found-illustration">
        <svg viewBox="0 0 200 200" class="illustration">
          <circle cx="100" cy="100" r="90" fill="none" stroke="var(--color-error-200)" stroke-width="2" />
          <text x="100" y="110" text-anchor="middle" font-size="60" fill="var(--color-error-500)">
            ?
          </text>
        </svg>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'NotFound',
  methods: {
    goBack() {
      this.$router.go(-1)
    },
  },
}
</script>

<style scoped>
.not-found-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 128px);
  padding: var(--spacing-xl);
}

.not-found-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-3xl);
  max-width: 900px;
  width: 100%;
  align-items: center;
}

.not-found-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.error-code {
  margin: 0;
  font-size: 96px;
  font-weight: 900;
  color: var(--color-error-600);
  line-height: 1;
}

.error-title {
  margin: 0;
  font-size: var(--text-2xl);
  color: var(--color-gray-800);
  font-weight: 700;
}

.error-description {
  margin: 0;
  font-size: var(--text-base);
  color: var(--color-gray-600);
  line-height: 1.6;
}

.error-suggestions {
  padding: var(--spacing-lg);
  background: var(--color-gray-50);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-gray-200);
}

.suggestion-title {
  margin: 0 0 var(--spacing-md) 0;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-gray-700);
  text-transform: uppercase;
}

.suggestion-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.suggestion-link {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  color: var(--color-primary-600);
  text-decoration: none;
  font-weight: 500;
  transition: all var(--transition-base);
  padding: var(--spacing-sm) 0;
}

.suggestion-link:hover {
  color: var(--color-primary-700);
  margin-right: var(--spacing-sm);
}

.btn-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--color-primary-600);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-base);
  width: 100%;
}

.btn-back:hover {
  background: var(--color-primary-700);
  box-shadow: var(--shadow-md);
}

.not-found-illustration {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.illustration {
  width: 100%;
  max-width: 300px;
  height: auto;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-20px);
  }
}

/* الاستجابة */
@media (max-width: 768px) {
  .not-found-page {
    min-height: calc(100vh - 64px);
    padding: var(--spacing-lg);
  }

  .not-found-container {
    grid-template-columns: 1fr;
    gap: var(--spacing-xl);
  }

  .not-found-illustration {
    order: -1;
  }

  .error-code {
    font-size: 72px;
  }

  .error-title {
    font-size: var(--text-xl);
  }
}
</style>
