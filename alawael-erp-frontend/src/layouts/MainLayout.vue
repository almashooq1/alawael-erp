<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Sidebar -->
    <aside
      :class="[
        'fixed right-0 top-0 h-full bg-white shadow-lg transition-transform duration-300 z-50',
        sidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0',
        'w-64'
      ]"
    >
      <!-- Logo -->
      <div class="p-6 border-b">
        <h1 class="text-2xl font-bold text-primary-600">الأوائل</h1>
        <p class="text-xs text-gray-500">نظام إدارة الموارد</p>
      </div>

      <!-- Navigation -->
      <nav class="p-4 space-y-2">
        <router-link
          v-for="item in menuItems"
          :key="item.name"
          :to="item.to"
          class="flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-primary-50 hover:text-primary-600 transition-colors"
          active-class="bg-primary-100 text-primary-600 font-medium"
        >
          <span class="text-xl ml-3">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </router-link>
      </nav>

      <!-- Logout -->
      <div class="absolute bottom-0 left-0 right-0 p-4 border-t">
        <button
          @click="handleLogout"
          class="w-full flex items-center px-4 py-3 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
        >
          <span class="text-xl ml-3">🚪</span>
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="md:mr-64">
      <!-- Top Bar -->
      <header class="bg-white shadow-sm sticky top-0 z-40">
        <div class="flex items-center justify-between px-6 py-4">
          <!-- Mobile Menu Button -->
          <button
            @click="sidebarOpen = !sidebarOpen"
            class="md:hidden text-gray-600 hover:text-gray-900"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </button>

          <!-- Search Bar -->
          <div class="flex-1 max-w-xl mx-4">
            <div class="relative">
              <input
                type="search"
                placeholder="بحث..."
                class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <span class="absolute left-3 top-2.5 text-gray-400">🔍</span>
            </div>
          </div>

          <!-- User Menu -->
          <div class="relative">
            <button
              @click="userMenuOpen = !userMenuOpen"
              class="flex items-center space-x-3 space-x-reverse"
            >
              <div class="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold">
                {{ authStore.user?.fullName?.charAt(0) || 'A' }}
              </div>
              <div class="hidden md:block text-right">
                <p class="text-sm font-medium text-gray-700">{{ authStore.user?.fullName || 'مستخدم' }}</p>
                <p class="text-xs text-gray-500">{{ authStore.user?.role || 'user' }}</p>
              </div>
            </button>

            <!-- User Dropdown -->
            <div
              v-show="userMenuOpen"
              class="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50"
            >
              <router-link to="/profile" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                الملف الشخصي
              </router-link>
              <router-link to="/settings" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                الإعدادات
              </router-link>
              <hr class="my-2">
              <button
                @click="handleLogout"
                class="block w-full text-right px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- Page Content -->
      <main class="p-6">
        <router-view />
      </main>
    </div>

    <!-- Mobile Overlay -->
    <div
      v-if="sidebarOpen"
      @click="sidebarOpen = false"
      class="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
    ></div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const sidebarOpen = ref(false)
const userMenuOpen = ref(false)

const menuItems = computed(() => {
  const items = [
    { name: 'dashboard', to: '/', label: 'لوحة التحكم', icon: '📊' },
    { name: 'profile', to: '/profile', label: 'الملف الشخصي', icon: '👤' },
    { name: 'notifications', to: '/notifications', label: 'الإشعارات', icon: '🔔' },
  ]

  if (authStore.user?.role === 'admin') {
    items.push(
      { name: 'users', to: '/users', label: 'المستخدمون', icon: '👥' },
      { name: 'employees', to: '/employees', label: 'الموظفون', icon: '👔' },
      { name: 'leaves', to: '/leaves', label: 'الإجازات', icon: '🏖️' },
      { name: 'attendance', to: '/attendance', label: 'الحضور', icon: '📋' },
      { name: 'reports', to: '/reports', label: 'التقارير', icon: '📈' },
      { name: 'finance', to: '/finance', label: 'المالية', icon: '💰' }
    )
  }

  items.push(
    { name: 'settings', to: '/settings', label: 'الإعدادات', icon: '⚙️' }
  )

  return items
})

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}
</script>
