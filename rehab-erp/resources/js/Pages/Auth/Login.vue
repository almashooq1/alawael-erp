<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
    <!-- خلفية زخرفية -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
      <div class="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl"></div>
    </div>

    <div class="relative w-full max-w-md">
      <!-- الشعار -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-teal-400 rounded-2xl shadow-xl mb-4">
          <svg class="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-white">Rehab ERP</h1>
        <p class="text-slate-400 text-sm mt-1">نظام إدارة مراكز التأهيل</p>
      </div>

      <!-- بطاقة تسجيل الدخول -->
      <div class="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
        <h2 class="text-xl font-semibold text-white mb-6">تسجيل الدخول</h2>

        <form @submit.prevent="submit" class="space-y-5">
          <!-- البريد الإلكتروني -->
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">البريد الإلكتروني</label>
            <div class="relative">
              <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"/>
                </svg>
              </div>
              <input
                v-model="form.email"
                type="email"
                placeholder="example@rehab.com"
                autocomplete="email"
                class="w-full pr-10 pl-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white
                       placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400
                       focus:border-transparent transition-all"
                :class="{ 'border-red-400': errors.email }"
              />
            </div>
            <p v-if="errors.email" class="mt-1.5 text-xs text-red-400">{{ errors.email }}</p>
          </div>

          <!-- كلمة المرور -->
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">كلمة المرور</label>
            <div class="relative">
              <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
              </div>
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="••••••••"
                autocomplete="current-password"
                class="w-full pr-10 pl-10 py-3 rounded-xl bg-white/10 border border-white/20 text-white
                       placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400
                       focus:border-transparent transition-all"
                :class="{ 'border-red-400': errors.password }"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <svg v-if="!showPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                </svg>
              </button>
            </div>
            <p v-if="errors.password" class="mt-1.5 text-xs text-red-400">{{ errors.password }}</p>
          </div>

          <!-- تذكرني -->
          <div class="flex items-center justify-between">
            <label class="flex items-center gap-2 cursor-pointer">
              <input v-model="form.remember" type="checkbox"
                class="w-4 h-4 rounded border-white/30 bg-white/10 text-blue-500 focus:ring-blue-400"/>
              <span class="text-sm text-slate-300">تذكرني</span>
            </label>
            <a href="#" class="text-sm text-blue-400 hover:text-blue-300 transition-colors">نسيت كلمة المرور؟</a>
          </div>

          <!-- خطأ عام -->
          <div v-if="errors.general"
            class="flex items-center gap-2 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
            <svg class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"/>
            </svg>
            {{ errors.general }}
          </div>

          <!-- زر تسجيل الدخول -->
          <button
            type="submit"
            :disabled="processing"
            class="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400
                   text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25
                   focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-transparent
                   disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg v-if="processing" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <span>{{ processing ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول' }}</span>
          </button>
        </form>
      </div>

      <!-- Footer -->
      <p class="text-center text-slate-500 text-xs mt-6">
        © {{ new Date().getFullYear() }} Rehab ERP — جميع الحقوق محفوظة
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { router } from '@inertiajs/vue3'

const props = defineProps({
  errors: { type: Object, default: () => ({}) }
})

const form = reactive({
  email: '',
  password: '',
  remember: false
})

const showPassword = ref(false)
const processing = ref(false)

function submit() {
  processing.value = true
  router.post('/login', form, {
    onFinish: () => { processing.value = false }
  })
}
</script>
