<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 px-4">
    <div class="max-w-md w-full">
      <!-- Logo and Title -->
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-white mb-2">نظام الأوائل</h1>
        <p class="text-primary-100">AlAwael ERP System</p>
      </div>

      <!-- Login Card -->
      <div class="card">
        <h2 class="text-2xl font-bold text-center mb-6">تسجيل الدخول</h2>
        
        <form @submit.prevent="handleLogin" class="space-y-4">
          <!-- Email -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              البريد الإلكتروني
            </label>
            <input
              v-model="email"
              type="email"
              required
              class="input"
              placeholder="admin@alawael.com"
            />
          </div>

          <!-- Password -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              كلمة المرور
            </label>
            <input
              v-model="password"
              type="password"
              required
              class="input"
              placeholder="••••••••"
            />
          </div>

          <!-- Remember Me -->
          <div class="flex items-center">
            <input
              id="remember"
              v-model="remember"
              type="checkbox"
              class="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label for="remember" class="mr-2 text-sm text-gray-700">
              تذكرني
            </label>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="authStore.loading"
            class="btn btn-primary w-full"
          >
            <span v-if="!authStore.loading">دخول</span>
            <span v-else class="flex items-center justify-center">
              <svg class="animate-spin h-5 w-5 ml-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              جاري الدخول...
            </span>
          </button>
        </form>

        <!-- Demo Credentials -->
        <div class="mt-6 p-4 bg-blue-50 rounded-lg">
          <p class="text-xs text-blue-800 font-medium mb-2">بيانات تجريبية:</p>
          <p class="text-xs text-blue-600">📧 admin@alawael.com</p>
          <p class="text-xs text-blue-600">🔑 Admin@123456</p>
        </div>
      </div>

      <!-- Footer -->
      <p class="text-center text-white text-sm mt-6">
        © 2026 AlAwael ERP. جميع الحقوق محفوظة.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('admin@alawael.com')
const password = ref('Admin@123456')
const remember = ref(true)

const handleLogin = async () => {
  const success = await authStore.login(email.value, password.value)
  if (success) {
    router.push('/')
  }
}
</script>
