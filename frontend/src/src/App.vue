<template>
  <div id="app" class="app-layout">
    <Navbar />
    <div class="app-container">
      <Sidebar />
      <main class="app-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" :key="$route.path" />
          </transition>
        </router-view>
      </main>
    </div>
    <Footer />
  </div>
</template>

<script>
import Navbar from './components/Layout/Navbar.vue'
import Sidebar from './components/Layout/Sidebar.vue'
import Footer from './components/Layout/Footer.vue'

export default {
  name: 'App',
  components: {
    Navbar,
    Sidebar,
    Footer,
  },
  mounted() {
    // تحميل الثيم المحفوظ
    const theme = localStorage.getItem('theme') || 'light'
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    }

    // تحميل اللغة والاتجاه
    document.documentElement.dir = 'rtl'
    document.documentElement.lang = 'ar'
  },
}
</script>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--color-gray-50);
}

.app-container {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.app-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-xl);
  background: var(--color-gray-50);
}

/* الانتقالات */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--transition-base);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* شريط التمرير المخصص */
.app-content::-webkit-scrollbar {
  width: 8px;
}

.app-content::-webkit-scrollbar-track {
  background: transparent;
}

.app-content::-webkit-scrollbar-thumb {
  background: var(--color-gray-300);
  border-radius: 4px;
}

.app-content::-webkit-scrollbar-thumb:hover {
  background: var(--color-gray-400);
}

/* الاستجابة */
@media (max-width: 768px) {
  .app-content {
    padding: var(--spacing-lg);
  }
}

@media (max-width: 480px) {
  .app-content {
    padding: var(--spacing-md);
  }
}
</style>
