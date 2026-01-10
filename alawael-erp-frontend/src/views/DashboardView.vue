<template>
  <div>
    <!-- Welcome Section -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900">مرحباً، {{ authStore.user?.fullName || 'مستخدم' }} 👋</h1>
      <p class="text-gray-600 mt-2">نظرة عامة على نشاطات اليوم</p>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="card hover:shadow-lg transition-shadow cursor-pointer"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">{{ stat.label }}</p>
            <p class="text-3xl font-bold text-gray-900 mt-2">{{ stat.value }}</p>
            <p :class="['text-sm mt-2', stat.trend > 0 ? 'text-green-600' : 'text-red-600']">
              <span>{{ stat.trend > 0 ? '↑' : '↓' }}</span>
              {{ Math.abs(stat.trend) }}% عن الأمس
            </p>
          </div>
          <div class="text-5xl">{{ stat.icon }}</div>
        </div>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- Activity Chart -->
      <div class="card">
        <h3 class="text-lg font-semibold mb-4">النشاط الأسبوعي</h3>
        <div class="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <p class="text-gray-500">سيتم عرض الرسم البياني هنا</p>
        </div>
      </div>

      <!-- Users Chart -->
      <div class="card">
        <h3 class="text-lg font-semibold mb-4">توزيع المستخدمين</h3>
        <div class="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <p class="text-gray-500">سيتم عرض الرسم البياني هنا</p>
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="card">
      <h3 class="text-lg font-semibold mb-4">آخر النشاطات</h3>
      <div class="space-y-4">
        <div
          v-for="activity in recentActivities"
          :key="activity.id"
          class="flex items-start space-x-4 space-x-reverse p-4 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <div :class="['w-10 h-10 rounded-full flex items-center justify-center text-white', activity.color]">
            {{ activity.icon }}
          </div>
          <div class="flex-1">
            <p class="text-sm font-medium text-gray-900">{{ activity.title }}</p>
            <p class="text-xs text-gray-600 mt-1">{{ activity.description }}</p>
            <p class="text-xs text-gray-400 mt-1">{{ activity.time }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
      <button
        v-for="action in quickActions"
        :key="action.label"
        @click="handleAction(action.action)"
        class="card hover:shadow-lg transition-all hover:scale-105 cursor-pointer text-center"
      >
        <div class="text-4xl mb-2">{{ action.icon }}</div>
        <p class="text-sm font-medium text-gray-900">{{ action.label }}</p>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const stats = ref([
  { label: 'إجمالي المستخدمين', value: '1', icon: '👥', trend: 100 },
  { label: 'النشاط اليوم', value: '5', icon: '📈', trend: 12 },
  { label: 'المهام المعلقة', value: '0', icon: '✓', trend: 0 },
  { label: 'الإشعارات', value: '3', icon: '🔔', trend: 8 }
])

const recentActivities = ref([
  {
    id: 1,
    icon: '✓',
    color: 'bg-green-500',
    title: 'تسجيل دخول ناجح',
    description: 'تم تسجيل الدخول بنجاح من IP: 127.0.0.1',
    time: 'منذ 5 دقائق'
  },
  {
    id: 2,
    icon: '👤',
    color: 'bg-blue-500',
    title: 'تحديث الملف الشخصي',
    description: 'تم تحديث معلومات المستخدم',
    time: 'منذ 15 دقيقة'
  },
  {
    id: 3,
    icon: '🔒',
    color: 'bg-yellow-500',
    title: 'تغيير كلمة المرور',
    description: 'تم تغيير كلمة المرور بنجاح',
    time: 'منذ ساعة'
  }
])

const quickActions = ref([
  { label: 'الملف الشخصي', icon: '👤', action: 'profile' },
  { label: 'المستخدمون', icon: '👥', action: 'users' },
  { label: 'التقارير', icon: '📊', action: 'reports' },
  { label: 'الإعدادات', icon: '⚙️', action: 'settings' }
])

const handleAction = (action) => {
  if (action === 'users' && authStore.user?.role !== 'admin') {
    return
  }
  router.push(`/${action}`)
}
</script>
