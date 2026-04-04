<template>
  <AppLayout :title="patient.name">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <Link href="/patients" class="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </Link>
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold"
              :class="patient.gender === 'male'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                : 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300'">
              {{ patient.name.charAt(0) }}
            </div>
            <div>
              <h1 class="text-xl font-bold text-slate-900 dark:text-white">{{ patient.name }}</h1>
              <p class="text-sm text-slate-500 dark:text-slate-400">#{{ patient.patient_number }}</p>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
            :class="{
              'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400': patient.status === 'active',
              'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300':    patient.status === 'inactive',
              'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400':         patient.status === 'discharged',
            }">
            {{ statusLabel(patient.status) }}
          </span>
          <Link :href="`/patients/${patient.id}/edit`"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
            تعديل
          </Link>
        </div>
      </div>
    </template>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <!-- العمود الجانبي -->
      <div class="space-y-5">

        <!-- البطاقة الشخصية -->
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div class="h-20 bg-gradient-to-r from-blue-500 to-teal-400"></div>
          <div class="px-5 pb-5">
            <div class="flex items-end gap-4 -mt-8 mb-4">
              <div class="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold border-4 border-white dark:border-slate-800 shadow-md"
                :class="patient.gender === 'male'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                  : 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300'">
                {{ patient.name.charAt(0) }}
              </div>
            </div>
            <h2 class="text-lg font-bold text-slate-900 dark:text-white">{{ patient.name }}</h2>
            <p class="text-sm text-slate-500 dark:text-slate-400">{{ patient.diagnosis }}</p>
          </div>
        </div>

        <!-- المعلومات الشخصية -->
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-4">المعلومات الشخصية</h3>
          <div class="space-y-3">
            <div v-for="info in personalInfo" :key="info.label" class="flex items-start gap-3">
              <div class="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                <svg class="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="info.icon"/>
                </svg>
              </div>
              <div>
                <p class="text-xs text-slate-400 dark:text-slate-500">{{ info.label }}</p>
                <p class="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{{ info.value || '—' }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- تقدم الجلسات -->
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-4">تقدم البرنامج العلاجي</h3>
          <div class="mb-3">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs text-slate-500">{{ completedSessions }} من {{ patient.total_sessions }} جلسة</span>
              <span class="text-xs font-semibold text-blue-600 dark:text-blue-400">{{ progressPercent }}%</span>
            </div>
            <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
              <div class="bg-blue-500 h-2 rounded-full transition-all duration-500"
                :style="{ width: progressPercent + '%' }"></div>
            </div>
          </div>
          <div class="grid grid-cols-3 gap-2 mt-4">
            <div v-for="s in sessionStats" :key="s.label"
              class="text-center p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <p class="text-lg font-bold" :class="s.color">{{ s.value }}</p>
              <p class="text-xs text-slate-400 mt-0.5">{{ s.label }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- العمود الرئيسي -->
      <div class="lg:col-span-2 space-y-5">

        <!-- التبويبات -->
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <div class="flex border-b border-slate-200 dark:border-slate-700 px-4">
            <button v-for="tab in tabs" :key="tab.id"
              @click="activeTab = tab.id"
              class="px-4 py-3.5 text-sm font-medium transition-colors border-b-2 -mb-px"
              :class="activeTab === tab.id
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'">
              {{ tab.label }}
            </button>
          </div>

          <!-- تبويب: البيانات الطبية -->
          <div v-if="activeTab === 'medical'" class="p-5">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div v-for="item in medicalInfo" :key="item.label"
                class="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                <p class="text-xs text-slate-400 dark:text-slate-500 mb-1">{{ item.label }}</p>
                <p class="text-sm font-medium text-slate-900 dark:text-white">{{ item.value || '—' }}</p>
              </div>
            </div>
            <div v-if="patient.medical_notes" class="mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <p class="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2">ملاحظات طبية</p>
              <p class="text-sm text-amber-800 dark:text-amber-300">{{ patient.medical_notes }}</p>
            </div>
          </div>

          <!-- تبويب: سجل الجلسات -->
          <div v-else-if="activeTab === 'sessions'" class="p-5">
            <div class="flex items-center justify-between mb-4">
              <p class="text-sm text-slate-500 dark:text-slate-400">آخر {{ patient.sessions?.length }} جلسة</p>
              <Link :href="`/sessions/create?patient_id=${patient.id}`"
                class="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                جلسة جديدة
              </Link>
            </div>
            <div v-if="patient.sessions?.length" class="space-y-2">
              <div v-for="session in patient.sessions" :key="session.id"
                class="flex items-center gap-4 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <div class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  :class="{
                    'bg-green-100 dark:bg-green-900/30': session.status === 'completed',
                    'bg-blue-100 dark:bg-blue-900/30':  session.status === 'scheduled',
                    'bg-red-100 dark:bg-red-900/30':    session.status === 'cancelled',
                    'bg-amber-100 dark:bg-amber-900/30': session.status === 'no_show',
                  }">
                  <svg class="w-5 h-5" :class="{
                    'text-green-600 dark:text-green-400': session.status === 'completed',
                    'text-blue-600 dark:text-blue-400':  session.status === 'scheduled',
                    'text-red-600 dark:text-red-400':    session.status === 'cancelled',
                    'text-amber-600 dark:text-amber-400': session.status === 'no_show',
                  }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                </div>
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <p class="text-sm font-medium text-slate-900 dark:text-white">
                      جلسة #{{ session.session_number }}
                    </p>
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      :class="{
                        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400': session.status === 'completed',
                        'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400':  session.status === 'scheduled',
                        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400':    session.status === 'cancelled',
                        'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400': session.status === 'no_show',
                      }">
                      {{ sessionStatusLabel(session.status) }}
                    </span>
                  </div>
                  <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {{ formatDate(session.session_date) }} — {{ session.duration }} دقيقة
                    <span v-if="session.therapist"> — {{ session.therapist.name }}</span>
                  </p>
                </div>
                <div class="text-left shrink-0">
                  <p v-if="session.cost" class="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {{ session.cost.toLocaleString('ar-SA') }} ﷼
                  </p>
                  <p class="text-xs" :class="session.paid ? 'text-green-500' : 'text-red-400'">
                    {{ session.paid ? 'مدفوعة' : 'غير مدفوعة' }}
                  </p>
                </div>
              </div>
            </div>
            <div v-else class="py-12 text-center">
              <svg class="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              <p class="text-sm text-slate-400">لا توجد جلسات مسجلة بعد</p>
            </div>
          </div>

          <!-- تبويب: معلومات التواصل -->
          <div v-else-if="activeTab === 'contact'" class="p-5">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div v-for="item in contactInfo" :key="item.label"
                class="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                <div class="w-9 h-9 rounded-lg bg-white dark:bg-slate-600 flex items-center justify-center shadow-sm shrink-0">
                  <svg class="w-4 h-4 text-slate-500 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.icon"/>
                  </svg>
                </div>
                <div>
                  <p class="text-xs text-slate-400">{{ item.label }}</p>
                  <p class="text-sm font-medium text-slate-900 dark:text-white mt-0.5">{{ item.value || '—' }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Link } from '@inertiajs/vue3'
import AppLayout from '@/Layouts/AppLayout.vue'

const props = defineProps({
  patient: { type: Object, required: true },
})

const activeTab = ref('sessions')

const tabs = [
  { id: 'sessions', label: 'الجلسات' },
  { id: 'medical',  label: 'البيانات الطبية' },
  { id: 'contact',  label: 'بيانات التواصل' },
]

const completedSessions = computed(() =>
  props.patient.sessions?.filter(s => s.status === 'completed').length ?? 0
)

const progressPercent = computed(() => {
  if (!props.patient.total_sessions) return 0
  return Math.min(Math.round((completedSessions.value / props.patient.total_sessions) * 100), 100)
})

const sessionStats = computed(() => [
  {
    label: 'مكتملة',
    value: props.patient.sessions?.filter(s => s.status === 'completed').length ?? 0,
    color: 'text-green-600 dark:text-green-400',
  },
  {
    label: 'مجدولة',
    value: props.patient.sessions?.filter(s => s.status === 'scheduled').length ?? 0,
    color: 'text-blue-600 dark:text-blue-400',
  },
  {
    label: 'ملغاة',
    value: props.patient.sessions?.filter(s => s.status === 'cancelled').length ?? 0,
    color: 'text-red-500 dark:text-red-400',
  },
])

const personalInfo = computed(() => [
  { label: 'العمر',          value: props.patient.age + ' سنة',  icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { label: 'الجنس',          value: props.patient.gender === 'male' ? 'ذكر' : 'أنثى', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { label: 'الجنسية',        value: props.patient.nationality,   icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064' },
  { label: 'رقم الهوية',     value: props.patient.national_id,   icon: 'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0' },
  { label: 'تاريخ الميلاد',  value: formatDate(props.patient.birth_date), icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { label: 'تاريخ التسجيل',  value: formatDate(props.patient.created_at), icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
])

const medicalInfo = computed(() => [
  { label: 'التشخيص',          value: props.patient.diagnosis },
  { label: 'الطبيب المعالج',   value: props.patient.doctor_name },
  { label: 'تاريخ البدء',      value: formatDate(props.patient.start_date) },
  { label: 'إجمالي الجلسات',   value: props.patient.total_sessions + ' جلسة' },
])

const contactInfo = computed(() => [
  { label: 'رقم الهاتف',      value: props.patient.phone,         icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' },
  { label: 'هاتف بديل',       value: props.patient.phone2,        icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' },
  { label: 'البريد الإلكتروني', value: props.patient.email,       icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { label: 'ولي الأمر',        value: props.patient.guardian_name, icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { label: 'العنوان',          value: props.patient.address,       icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z' },
])

function statusLabel(s) {
  return { active: 'نشط', inactive: 'غير نشط', discharged: 'مخرج' }[s] || s
}

function sessionStatusLabel(s) {
  return { scheduled: 'مجدولة', completed: 'مكتملة', cancelled: 'ملغاة', no_show: 'لم يحضر' }[s] || s
}

function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })
}
</script>
