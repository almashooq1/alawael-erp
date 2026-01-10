<template>
  <div>
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900">الإعدادات</h1>
      <p class="text-gray-600 mt-2">إدارة إعدادات النظام</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Settings Menu -->
      <div class="card">
        <nav class="space-y-2">
          <button
            v-for="item in settingsMenu"
            :key="item.id"
            @click="activeSection = item.id"
            :class="[
              'w-full text-right px-4 py-3 rounded-lg transition-colors flex items-center',
              activeSection === item.id
                ? 'bg-primary-100 text-primary-600 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            ]"
          >
            <span class="text-xl ml-3">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
          </button>
        </nav>
      </div>

      <!-- Settings Content -->
      <div class="lg:col-span-2 space-y-6">
        <!-- General Settings -->
        <div v-show="activeSection === 'general'" class="card">
          <h3 class="text-xl font-bold mb-6">الإعدادات العامة</h3>
          <div class="space-y-6">
            <div>
              <label class="flex items-center justify-between cursor-pointer">
                <span class="text-gray-700">
                  <strong>الإشعارات</strong>
                  <p class="text-sm text-gray-500">تفعيل الإشعارات على سطح المكتب</p>
                </span>
                <input
                  v-model="settings.notifications"
                  type="checkbox"
                  class="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                />
              </label>
            </div>

            <div>
              <label class="flex items-center justify-between cursor-pointer">
                <span class="text-gray-700">
                  <strong>الوضع الداكن</strong>
                  <p class="text-sm text-gray-500">تفعيل الوضع الليلي</p>
                </span>
                <input
                  v-model="settings.darkMode"
                  type="checkbox"
                  class="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                />
              </label>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                اللغة
              </label>
              <select v-model="settings.language" class="input">
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </select>
            </div>

            <button @click="saveSettings" class="btn btn-primary w-full">
              💾 حفظ الإعدادات
            </button>
          </div>
        </div>

        <!-- System Info -->
        <div v-show="activeSection === 'system'" class="card">
          <h3 class="text-xl font-bold mb-6">معلومات النظام</h3>
          <div class="space-y-4">
            <div class="flex justify-between py-3 border-b">
              <span class="text-gray-600">اسم النظام</span>
              <span class="font-medium">AlAwael ERP</span>
            </div>
            <div class="flex justify-between py-3 border-b">
              <span class="text-gray-600">الإصدار</span>
              <span class="font-medium">1.0.0</span>
            </div>
            <div class="flex justify-between py-3 border-b">
              <span class="text-gray-600">حالة الخادم</span>
              <span class="badge badge-success">✓ متصل</span>
            </div>
            <div class="flex justify-between py-3 border-b">
              <span class="text-gray-600">قاعدة البيانات</span>
              <span class="badge badge-success">✓ نشط</span>
            </div>
            <div class="flex justify-between py-3 border-b">
              <span class="text-gray-600">آخر تحديث</span>
              <span class="font-medium">{{ formatDate(new Date()) }}</span>
            </div>
          </div>
        </div>

        <!-- API Settings -->
        <div v-show="activeSection === 'api'" class="card">
          <h3 class="text-xl font-bold mb-6">إعدادات API</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                عنوان API
              </label>
              <input
                type="text"
                value="http://localhost:3001/api"
                disabled
                class="input bg-gray-100 cursor-not-allowed"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                مفتاح API
              </label>
              <div class="flex gap-2">
                <input
                  :type="showApiKey ? 'text' : 'password'"
                  :value="apiKey"
                  disabled
                  class="input bg-gray-100 cursor-not-allowed flex-1"
                />
                <button
                  @click="showApiKey = !showApiKey"
                  class="btn btn-secondary"
                >
                  {{ showApiKey ? '🙈' : '👁️' }}
                </button>
              </div>
            </div>

            <div class="bg-blue-50 p-4 rounded-lg">
              <p class="text-sm text-blue-800">
                <strong>ملاحظة:</strong> لتغيير إعدادات API، يرجى التواصل مع مدير النظام.
              </p>
            </div>
          </div>
        </div>

        <!-- About -->
        <div v-show="activeSection === 'about'" class="card">
          <h3 class="text-xl font-bold mb-6">حول النظام</h3>
          <div class="space-y-4">
            <div class="text-center py-8">
              <div class="text-6xl mb-4">🏢</div>
              <h2 class="text-3xl font-bold text-primary-600 mb-2">AlAwael ERP</h2>
              <p class="text-gray-600 mb-6">نظام إدارة الموارد المتكامل</p>
              <div class="inline-block bg-primary-100 text-primary-600 px-4 py-2 rounded-full font-medium">
                الإصدار 1.0.0
              </div>
            </div>

            <div class="border-t pt-6 space-y-3">
              <p class="text-gray-700 leading-relaxed">
                <strong>AlAwael ERP</strong> هو نظام إدارة موارد شامل مصمم لتبسيط
                العمليات التجارية وتحسين الإنتاجية.
              </p>
              <div class="bg-gray-50 p-4 rounded-lg space-y-2">
                <p class="text-sm text-gray-600"><strong>المطور:</strong> فريق الأوائل</p>
                <p class="text-sm text-gray-600"><strong>التقنيات:</strong> Vue 3, Node.js, Express, MongoDB</p>
                <p class="text-sm text-gray-600"><strong>الترخيص:</strong> MIT License</p>
              </div>
            </div>

            <div class="border-t pt-6 text-center">
              <p class="text-sm text-gray-500">
                © 2026 AlAwael. جميع الحقوق محفوظة.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useToast } from 'vue-toastification'

const toast = useToast()

const activeSection = ref('general')
const showApiKey = ref(false)
const apiKey = ref('********************************')

const settingsMenu = [
  { id: 'general', label: 'الإعدادات العامة', icon: '⚙️' },
  { id: 'system', label: 'معلومات النظام', icon: '💻' },
  { id: 'api', label: 'إعدادات API', icon: '🔌' },
  { id: 'about', label: 'حول النظام', icon: 'ℹ️' }
]

const settings = ref({
  notifications: true,
  darkMode: false,
  language: 'ar'
})

const saveSettings = () => {
  // Save to localStorage
  localStorage.setItem('app-settings', JSON.stringify(settings.value))
  toast.success('تم حفظ الإعدادات بنجاح')
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Load settings from localStorage
const loadSettings = () => {
  const saved = localStorage.getItem('app-settings')
  if (saved) {
    settings.value = JSON.parse(saved)
  }
}

loadSettings()
</script>
