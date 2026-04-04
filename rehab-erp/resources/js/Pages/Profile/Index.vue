<script setup>
import { ref, computed } from 'vue';
import { useForm, usePage } from '@inertiajs/vue3';
import AppLayout from '@/Layouts/AppLayout.vue';

const page = usePage();
const user = computed(() => page.props.auth?.user ?? {});

// ======================================================
// Profile Form
// ======================================================
const profileForm = useForm({
  name: user.value.name ?? '',
  email: user.value.email ?? '',
  phone: user.value.phone ?? '',
});

function saveProfile() {
  profileForm.patch('/profile', {
    preserveScroll: true,
  });
}

// ======================================================
// Password Form
// ======================================================
const passwordForm = useForm({
  current: '',
  new: '',
  confirm: '',
});

const showCurrentPassword = ref(false);
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);

function savePassword() {
  passwordForm.patch('/profile/password', {
    preserveScroll: true,
    onSuccess: () => {
      passwordForm.reset();
    },
  });
}

// ======================================================
// Activity Log (demo)
// ======================================================
const activities = [
  { id: 1, action: 'تسجيل دخول', time: 'اليوم 09:15 ص', icon: '🔐', color: 'text-green-500' },
  { id: 2, action: 'إضافة مريض جديد: محمد الغامدي', time: 'اليوم 08:42 ص', icon: '👤', color: 'text-blue-500' },
  { id: 3, action: 'إنشاء فاتورة INV-00003', time: 'أمس 03:10 م', icon: '🧾', color: 'text-purple-500' },
  { id: 4, action: 'تحديث جلسة تأهيل', time: 'أمس 11:30 ص', icon: '✏️', color: 'text-amber-500' },
  { id: 5, action: 'تغيير كلمة المرور', time: 'منذ 3 أيام', icon: '🔑', color: 'text-red-500' },
];

// ======================================================
// Role label
// ======================================================
const roleLabel = computed(() => {
  switch (user.value.role) {
    case 'admin': return 'مدير النظام';
    case 'therapist': return 'معالج طبيعي';
    case 'receptionist': return 'موظف استقبال';
    default: return user.value.role;
  }
});

const roleBadge = computed(() => {
  switch (user.value.role) {
    case 'admin': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'therapist': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    default: return 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-300';
  }
});
</script>

<template>
  <AppLayout title="الملف الشخصي">
    <template #header>
      <div>
        <h2 class="section-title text-xl">الملف الشخصي</h2>
        <p class="section-subtitle">إدارة معلوماتك الشخصية وكلمة المرور</p>
      </div>
    </template>

    <div class="max-w-5xl mx-auto space-y-6">

      <!-- ====================================================
           Profile Card - Info Overview
           ==================================================== -->
      <div class="card">
        <div class="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-6">
          <!-- Avatar -->
          <div class="relative flex-shrink-0">
            <div
              class="w-24 h-24 rounded-2xl bg-gradient-to-br from-brand-400 to-primary-600
                     flex items-center justify-center text-white text-3xl font-bold shadow-lg"
            >
              {{ (user.name ?? 'م').charAt(0) }}
            </div>
            <span class="absolute -bottom-2 -left-2 w-6 h-6 bg-green-400 border-2 border-white dark:border-surface-800 rounded-full" title="متصل" />
          </div>

          <!-- User Info -->
          <div class="flex-1 text-center sm:text-right">
            <div class="flex flex-col sm:flex-row items-center sm:items-start gap-3">
              <div>
                <h3 class="text-xl font-bold text-surface-900 dark:text-white">{{ user.name }}</h3>
                <p class="text-sm text-surface-500 dark:text-surface-400">{{ user.email }}</p>
                <p v-if="user.phone" class="text-sm text-surface-500 dark:text-surface-400 mt-0.5">{{ user.phone }}</p>
              </div>
              <span :class="['mr-auto px-3 py-1 rounded-full text-xs font-semibold', roleBadge]">
                {{ roleLabel }}
              </span>
            </div>
            <!-- Stats mini -->
            <div class="flex flex-wrap gap-4 mt-4 justify-center sm:justify-start">
              <div class="text-center">
                <p class="text-lg font-bold text-surface-900 dark:text-white">—</p>
                <p class="text-xxs text-surface-500">جلسة هذا الشهر</p>
              </div>
              <div class="text-center">
                <p class="text-lg font-bold text-surface-900 dark:text-white">—</p>
                <p class="text-xxs text-surface-500">فاتورة منشأة</p>
              </div>
              <div class="text-center">
                <p class="text-lg font-bold text-surface-900 dark:text-white">—</p>
                <p class="text-xxs text-surface-500">يوماً منذ الانضمام</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- ====================================================
             Left: Forms Column
             ==================================================== -->
        <div class="lg:col-span-2 space-y-6">

          <!-- Update Profile -->
          <div class="card">
            <div class="card-header border-b border-surface-200 dark:border-surface-700 pb-4 mb-6">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h3 class="font-semibold text-surface-900 dark:text-white text-sm">المعلومات الشخصية</h3>
                  <p class="text-xs text-surface-500">تحديث الاسم والبريد ورقم الجوال</p>
                </div>
              </div>
            </div>

            <form @submit.prevent="saveProfile" class="space-y-4">
              <!-- Name -->
              <div>
                <label class="label">الاسم الكامل <span class="text-danger">*</span></label>
                <input
                  v-model="profileForm.name"
                  type="text"
                  class="input"
                  :class="{ 'border-danger': profileForm.errors.name }"
                  placeholder="أدخل الاسم الكامل"
                  required
                >
                <p v-if="profileForm.errors.name" class="text-xs text-danger mt-1">{{ profileForm.errors.name }}</p>
              </div>

              <!-- Email -->
              <div>
                <label class="label">البريد الإلكتروني <span class="text-danger">*</span></label>
                <input
                  v-model="profileForm.email"
                  type="email"
                  class="input"
                  :class="{ 'border-danger': profileForm.errors.email }"
                  placeholder="example@rehab.com"
                  required
                >
                <p v-if="profileForm.errors.email" class="text-xs text-danger mt-1">{{ profileForm.errors.email }}</p>
              </div>

              <!-- Phone -->
              <div>
                <label class="label">رقم الجوال</label>
                <input
                  v-model="profileForm.phone"
                  type="tel"
                  class="input"
                  placeholder="05xxxxxxxx"
                >
              </div>

              <div class="flex justify-end pt-2">
                <button
                  type="submit"
                  class="btn-primary"
                  :disabled="profileForm.processing"
                >
                  <span v-if="profileForm.processing" class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block ml-2" />
                  حفظ التغييرات
                </button>
              </div>
            </form>
          </div>

          <!-- Change Password -->
          <div class="card">
            <div class="card-header border-b border-surface-200 dark:border-surface-700 pb-4 mb-6">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
                <div>
                  <h3 class="font-semibold text-surface-900 dark:text-white text-sm">تغيير كلمة المرور</h3>
                  <p class="text-xs text-surface-500">تأكد من استخدام كلمة مرور قوية</p>
                </div>
              </div>
            </div>

            <form @submit.prevent="savePassword" class="space-y-4">
              <!-- Current Password -->
              <div>
                <label class="label">كلمة المرور الحالية <span class="text-danger">*</span></label>
                <div class="relative">
                  <input
                    v-model="passwordForm.current"
                    :type="showCurrentPassword ? 'text' : 'password'"
                    class="input pl-10"
                    :class="{ 'border-danger': passwordForm.errors.current }"
                    placeholder="••••••••"
                    required
                  >
                  <button
                    type="button"
                    class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                    @click="showCurrentPassword = !showCurrentPassword"
                  >
                    <svg v-if="showCurrentPassword" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                </div>
                <p v-if="passwordForm.errors.current" class="text-xs text-danger mt-1">{{ passwordForm.errors.current }}</p>
              </div>

              <!-- New Password -->
              <div>
                <label class="label">كلمة المرور الجديدة <span class="text-danger">*</span></label>
                <div class="relative">
                  <input
                    v-model="passwordForm.new"
                    :type="showNewPassword ? 'text' : 'password'"
                    class="input pl-10"
                    :class="{ 'border-danger': passwordForm.errors.new }"
                    placeholder="8 أحرف على الأقل"
                    required
                  >
                  <button type="button" class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600" @click="showNewPassword = !showNewPassword">
                    <svg v-if="showNewPassword" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </button>
                </div>
                <p v-if="passwordForm.errors.new" class="text-xs text-danger mt-1">{{ passwordForm.errors.new }}</p>
              </div>

              <!-- Confirm Password -->
              <div>
                <label class="label">تأكيد كلمة المرور <span class="text-danger">*</span></label>
                <div class="relative">
                  <input
                    v-model="passwordForm.confirm"
                    :type="showConfirmPassword ? 'text' : 'password'"
                    class="input pl-10"
                    :class="{ 'border-danger': passwordForm.errors.confirm }"
                    placeholder="أعد كتابة كلمة المرور"
                    required
                  >
                  <button type="button" class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600" @click="showConfirmPassword = !showConfirmPassword">
                    <svg v-if="showConfirmPassword" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </button>
                </div>
                <p v-if="passwordForm.errors.confirm" class="text-xs text-danger mt-1">{{ passwordForm.errors.confirm }}</p>
              </div>

              <!-- Strength hints -->
              <ul class="text-xs text-surface-500 dark:text-surface-400 space-y-1 bg-surface-50 dark:bg-surface-700/30 rounded-lg p-3">
                <li :class="passwordForm.new.length >= 8 ? 'text-green-600 dark:text-green-400' : ''">
                  {{ passwordForm.new.length >= 8 ? '✓' : '○' }} 8 أحرف على الأقل
                </li>
                <li :class="/[A-Z]/.test(passwordForm.new) ? 'text-green-600 dark:text-green-400' : ''">
                  {{ /[A-Z]/.test(passwordForm.new) ? '✓' : '○' }} حرف كبير على الأقل
                </li>
                <li :class="/[0-9]/.test(passwordForm.new) ? 'text-green-600 dark:text-green-400' : ''">
                  {{ /[0-9]/.test(passwordForm.new) ? '✓' : '○' }} رقم على الأقل
                </li>
              </ul>

              <div class="flex justify-end pt-2">
                <button
                  type="submit"
                  class="btn-warning"
                  :disabled="passwordForm.processing"
                >
                  <span v-if="passwordForm.processing" class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block ml-2" />
                  تغيير كلمة المرور
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- ====================================================
             Right: Activity & Security
             ==================================================== -->
        <div class="space-y-6">

          <!-- Account Status -->
          <div class="card p-5">
            <h3 class="font-semibold text-sm text-surface-900 dark:text-white mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              حالة الحساب
            </h3>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-xs text-surface-600 dark:text-surface-400">الحالة</span>
                <span class="badge-success text-xxs">نشط</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-surface-600 dark:text-surface-400">الدور الوظيفي</span>
                <span class="text-xs font-medium text-surface-800 dark:text-surface-200">{{ roleLabel }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-surface-600 dark:text-surface-400">المصادقة الثنائية</span>
                <span class="badge-warning text-xxs">غير مفعّلة</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-surface-600 dark:text-surface-400">آخر تسجيل دخول</span>
                <span class="text-xs text-surface-500">{{ user.last_login ? new Date(user.last_login).toLocaleDateString('ar-SA') : 'الآن' }}</span>
              </div>
            </div>
          </div>

          <!-- Activity Log -->
          <div class="card p-5">
            <h3 class="font-semibold text-sm text-surface-900 dark:text-white mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-surface-500" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              سجل النشاط
            </h3>
            <div class="space-y-3">
              <div
                v-for="activity in activities"
                :key="activity.id"
                class="flex items-start gap-3"
              >
                <span class="text-base mt-0.5">{{ activity.icon }}</span>
                <div class="flex-1 min-w-0">
                  <p class="text-xs text-surface-700 dark:text-surface-300 truncate">{{ activity.action }}</p>
                  <p class="text-xxs text-surface-400 mt-0.5">{{ activity.time }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Danger Zone -->
          <div class="card p-5 border border-red-200 dark:border-red-900/40">
            <h3 class="font-semibold text-sm text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              منطقة الخطر
            </h3>
            <p class="text-xs text-surface-500 mb-3">هذه الإجراءات لا يمكن التراجع عنها</p>
            <button
              class="w-full py-2 px-3 text-xs text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700
                     rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              حذف الحساب
            </button>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
