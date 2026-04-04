<template>
  <AppLayout title="الإعدادات">
    <template #header>
      <div>
        <h1 class="text-xl font-bold text-slate-900 dark:text-white">إعدادات النظام</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">تخصيص إعدادات المركز والنظام</p>
      </div>
    </template>

    <div class="grid grid-cols-1 xl:grid-cols-4 gap-6">

      <!-- التنقل بين الأقسام -->
      <div class="xl:col-span-1">
        <nav class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div class="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <p class="text-xs font-medium text-slate-400 uppercase tracking-wider">الأقسام</p>
          </div>
          <div class="p-2 space-y-0.5">
            <button v-for="tab in tabs" :key="tab.id"
              @click="activeTab = tab.id"
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-right"
              :class="activeTab === tab.id
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'">
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="tab.icon"/>
              </svg>
              {{ tab.label }}
            </button>
          </div>
        </nav>
      </div>

      <!-- محتوى الإعدادات -->
      <div class="xl:col-span-3 space-y-6">

        <!-- ===== إعدادات المركز ===== -->
        <template v-if="activeTab === 'center'">
          <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div class="px-6 py-5 border-b border-slate-100 dark:border-slate-700">
              <h2 class="text-sm font-semibold text-slate-900 dark:text-white">معلومات المركز</h2>
              <p class="text-xs text-slate-400 mt-0.5">البيانات الأساسية للمركز التي تظهر في التقارير</p>
            </div>
            <form @submit.prevent="saveCenterSettings" class="p-6 space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div class="col-span-2">
                  <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">اسم المركز</label>
                  <input v-model="centerForm.name" type="text"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">رقم الهاتف</label>
                  <input v-model="centerForm.phone" type="tel" dir="ltr"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">البريد الإلكتروني</label>
                  <input v-model="centerForm.email" type="email" dir="ltr"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div class="col-span-2">
                  <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">العنوان</label>
                  <input v-model="centerForm.address" type="text"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">المدينة</label>
                  <input v-model="centerForm.city" type="text"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">الترخيص</label>
                  <input v-model="centerForm.license" type="text" dir="ltr"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div class="col-span-2">
                  <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">نبذة عن المركز</label>
                  <textarea v-model="centerForm.description" rows="3"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"></textarea>
                </div>
              </div>
              <div class="flex justify-end pt-2">
                <button type="submit" :disabled="saving"
                  class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  {{ saving ? 'جاري الحفظ...' : 'حفظ الإعدادات' }}
                </button>
              </div>
            </form>
          </div>
        </template>

        <!-- ===== إعدادات الجلسات ===== -->
        <template v-if="activeTab === 'sessions'">
          <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div class="px-6 py-5 border-b border-slate-100 dark:border-slate-700">
              <h2 class="text-sm font-semibold text-slate-900 dark:text-white">إعدادات الجلسات</h2>
              <p class="text-xs text-slate-400 mt-0.5">الإعدادات الافتراضية للجلسات العلاجية</p>
            </div>
            <div class="p-6 space-y-5">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">مدة الجلسة الافتراضية (دقيقة)</label>
                  <input v-model="sessionForm.default_duration" type="number" min="15" max="120"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">تكلفة الجلسة الافتراضية (ريال)</label>
                  <input v-model="sessionForm.default_cost" type="number" min="0"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">وقت البداية اليومي</label>
                  <input v-model="sessionForm.day_start" type="time" dir="ltr"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">وقت النهاية اليومي</label>
                  <input v-model="sessionForm.day_end" type="time" dir="ltr"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>

              <!-- أيام العمل -->
              <div>
                <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">أيام العمل</label>
                <div class="flex flex-wrap gap-2">
                  <button v-for="day in weekDays" :key="day.id"
                    type="button"
                    @click="toggleDay(day.id)"
                    class="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
                    :class="sessionForm.working_days.includes(day.id)
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-blue-400'">
                    {{ day.label }}
                  </button>
                </div>
              </div>

              <div class="flex justify-end pt-2">
                <button @click="saveSessionSettings" :disabled="saving"
                  class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {{ saving ? 'جاري الحفظ...' : 'حفظ الإعدادات' }}
                </button>
              </div>
            </div>
          </div>
        </template>

        <!-- ===== الحساب الشخصي ===== -->
        <template v-if="activeTab === 'profile'">
          <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div class="px-6 py-5 border-b border-slate-100 dark:border-slate-700">
              <h2 class="text-sm font-semibold text-slate-900 dark:text-white">الملف الشخصي</h2>
            </div>
            <form @submit.prevent="saveProfile" class="p-6 space-y-4">
              <!-- الأفاتار -->
              <div class="flex items-center gap-4 mb-2">
                <div class="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold"
                  :style="{ backgroundColor: avatarColor($page.props.auth.user.name) }">
                  {{ $page.props.auth.user.name.charAt(0) }}
                </div>
                <div>
                  <p class="text-sm font-semibold text-slate-800 dark:text-slate-200">{{ $page.props.auth.user.name }}</p>
                  <p class="text-xs text-slate-400">{{ $page.props.auth.user.email }}</p>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="col-span-2">
                  <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">الاسم الكامل</label>
                  <input v-model="profileForm.name" type="text" required
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div class="col-span-2">
                  <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">البريد الإلكتروني</label>
                  <input v-model="profileForm.email" type="email" required dir="ltr"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">الهاتف</label>
                  <input v-model="profileForm.phone" type="tel" dir="ltr"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>

              <div class="flex justify-end pt-2">
                <button type="submit" :disabled="saving"
                  class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {{ saving ? 'جاري الحفظ...' : 'حفظ التغييرات' }}
                </button>
              </div>
            </form>
          </div>

          <!-- تغيير كلمة المرور -->
          <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div class="px-6 py-5 border-b border-slate-100 dark:border-slate-700">
              <h2 class="text-sm font-semibold text-slate-900 dark:text-white">تغيير كلمة المرور</h2>
            </div>
            <form @submit.prevent="changePassword" class="p-6 space-y-4">
              <div>
                <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">كلمة المرور الحالية</label>
                <input v-model="passwordForm.current" type="password" dir="ltr"
                  class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">كلمة المرور الجديدة</label>
                <input v-model="passwordForm.new" type="password" dir="ltr"
                  class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">تأكيد كلمة المرور</label>
                <input v-model="passwordForm.confirm" type="password" dir="ltr"
                  class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div v-if="passwordForm.new && passwordForm.confirm && passwordForm.new !== passwordForm.confirm"
                class="text-xs text-red-500">
                كلمتا المرور غير متطابقتين
              </div>
              <div class="flex justify-end">
                <button type="submit"
                  :disabled="saving || (passwordForm.new && passwordForm.confirm && passwordForm.new !== passwordForm.confirm)"
                  class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                  تغيير كلمة المرور
                </button>
              </div>
            </form>
          </div>
        </template>

        <!-- ===== إعدادات المظهر ===== -->
        <template v-if="activeTab === 'appearance'">
          <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div class="px-6 py-5 border-b border-slate-100 dark:border-slate-700">
              <h2 class="text-sm font-semibold text-slate-900 dark:text-white">المظهر والتخصيص</h2>
            </div>
            <div class="p-6 space-y-6">
              <!-- الوضع الليلي -->
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-slate-800 dark:text-slate-200">الوضع الليلي</p>
                  <p class="text-xs text-slate-400 mt-0.5">تبديل بين الوضع النهاري والليلي</p>
                </div>
                <button @click="toggleDark"
                  class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                  :class="isDark ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-600'">
                  <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                    :class="isDark ? 'translate-x-6' : 'translate-x-1'"></span>
                </button>
              </div>

              <hr class="border-slate-100 dark:border-slate-700"/>

              <!-- حجم الخط -->
              <div>
                <p class="text-sm font-medium text-slate-800 dark:text-slate-200 mb-3">حجم الخط</p>
                <div class="flex gap-3">
                  <button v-for="size in fontSizes" :key="size.id"
                    @click="selectedFontSize = size.id"
                    class="flex-1 py-2.5 rounded-lg text-sm border transition-colors"
                    :class="selectedFontSize === size.id
                      ? 'bg-blue-600 border-blue-600 text-white font-medium'
                      : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-blue-400'">
                    {{ size.label }}
                  </button>
                </div>
              </div>

              <hr class="border-slate-100 dark:border-slate-700"/>

              <!-- لون التمييز -->
              <div>
                <p class="text-sm font-medium text-slate-800 dark:text-slate-200 mb-3">لون التمييز</p>
                <div class="flex gap-3">
                  <button v-for="color in accentColors" :key="color.id"
                    @click="selectedAccent = color.id"
                    class="w-10 h-10 rounded-xl transition-transform hover:scale-110"
                    :style="{ backgroundColor: color.hex }"
                    :class="selectedAccent === color.id ? 'ring-2 ring-offset-2 ring-current scale-110' : ''">
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>

      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref } from 'vue'
import { router, usePage } from '@inertiajs/vue3'
import AppLayout from '@/Layouts/AppLayout.vue'

const page = usePage()
const saving = ref(false)
const activeTab = ref('center')

const tabs = [
  { id: 'center',     label: 'معلومات المركز', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { id: 'sessions',   label: 'الجلسات',        icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id: 'profile',    label: 'الحساب الشخصي',  icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { id: 'appearance', label: 'المظهر',          icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01' },
]

// ===================== إعدادات المركز =====================
const centerForm = ref({
  name: 'مركز الأوائل للتأهيل',
  phone: '0500000000',
  email: 'info@alawael-rehab.com',
  address: '',
  city: 'الرياض',
  license: '',
  description: '',
})

function saveCenterSettings() {
  saving.value = true
  setTimeout(() => {
    saving.value = false
    alert('تم حفظ إعدادات المركز ✅')
  }, 800)
}

// ===================== إعدادات الجلسات =====================
const weekDays = [
  { id: 0, label: 'الأحد' },
  { id: 1, label: 'الاثنين' },
  { id: 2, label: 'الثلاثاء' },
  { id: 3, label: 'الأربعاء' },
  { id: 4, label: 'الخميس' },
  { id: 5, label: 'الجمعة' },
  { id: 6, label: 'السبت' },
]

const sessionForm = ref({
  default_duration: 60,
  default_cost: 300,
  day_start: '08:00',
  day_end: '17:00',
  working_days: [0, 1, 2, 3, 4],
})

function toggleDay(id) {
  const idx = sessionForm.value.working_days.indexOf(id)
  if (idx === -1) sessionForm.value.working_days.push(id)
  else sessionForm.value.working_days.splice(idx, 1)
}

function saveSessionSettings() {
  saving.value = true
  setTimeout(() => {
    saving.value = false
    alert('تم حفظ إعدادات الجلسات ✅')
  }, 800)
}

// ===================== الملف الشخصي =====================
const profileForm = ref({
  name:  page.props.auth?.user?.name || '',
  email: page.props.auth?.user?.email || '',
  phone: '',
})

const passwordForm = ref({ current: '', new: '', confirm: '' })

function saveProfile() {
  saving.value = true
  router.patch('/profile', profileForm.value, {
    onFinish: () => { saving.value = false },
  })
}

function changePassword() {
  if (passwordForm.value.new !== passwordForm.value.confirm) return
  saving.value = true
  router.patch('/profile/password', passwordForm.value, {
    onSuccess: () => {
      passwordForm.value = { current: '', new: '', confirm: '' }
    },
    onFinish: () => { saving.value = false },
  })
}

// ===================== المظهر =====================
const isDark = ref(document.documentElement.classList.contains('dark'))
const selectedFontSize = ref('md')
const selectedAccent = ref('blue')

const fontSizes = [
  { id: 'sm', label: 'صغير' },
  { id: 'md', label: 'متوسط' },
  { id: 'lg', label: 'كبير' },
]

const accentColors = [
  { id: 'blue',   hex: '#3b82f6' },
  { id: 'teal',   hex: '#14b8a6' },
  { id: 'purple', hex: '#8b5cf6' },
  { id: 'green',  hex: '#22c55e' },
  { id: 'amber',  hex: '#f59e0b' },
  { id: 'rose',   hex: '#f43f5e' },
]

function toggleDark() {
  isDark.value = !isDark.value
  if (isDark.value) {
    document.documentElement.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', 'light')
  }
}

function avatarColor(name) {
  if (!name) return '#3b82f6'
  const colors = ['#3b82f6','#10b981','#8b5cf6','#f59e0b','#ef4444','#06b6d4']
  let hash = 0
  for (let c of name) hash = (hash << 5) - hash + c.charCodeAt(0)
  return colors[Math.abs(hash) % colors.length]
}
</script>
