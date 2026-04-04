<template>
  <AppLayout :title="`جلسة ${session.id}`">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <Link :href="route('sessions.index')"
            class="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </Link>
          <div>
            <h1 class="text-xl font-bold text-slate-900 dark:text-white">تفاصيل الجلسة #{{ session.id }}</h1>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {{ session.patient?.name }} — {{ formatDate(session.session_date) }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <!-- أزرار الإجراءات حسب الحالة -->
          <template v-if="session.status === 'scheduled'">
            <button @click="completeSession"
              :disabled="processing"
              class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              إتمام الجلسة
            </button>
            <button @click="cancelSession"
              :disabled="processing"
              class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              إلغاء
            </button>
          </template>
          <Link :href="route('sessions.edit', session.id)"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
            </svg>
            تعديل
          </Link>
        </div>
      </div>
    </template>

    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">

      <!-- المعلومات الرئيسية -->
      <div class="xl:col-span-2 space-y-6">

        <!-- بطاقة تفاصيل الجلسة -->
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div class="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h2 class="text-sm font-semibold text-slate-900 dark:text-white">تفاصيل الجلسة</h2>
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
              :class="statusClass(session.status)">
              <span class="w-1.5 h-1.5 rounded-full"
                :class="statusDot(session.status)"></span>
              {{ statusLabel(session.status) }}
            </span>
          </div>
          <div class="p-5 grid grid-cols-2 gap-4">
            <div>
              <p class="text-xs text-slate-400 mb-1">تاريخ الجلسة</p>
              <p class="text-sm font-medium text-slate-800 dark:text-slate-200">{{ formatDate(session.session_date) }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-400 mb-1">وقت البدء</p>
              <p class="text-sm font-medium text-slate-800 dark:text-slate-200">{{ session.session_time || '—' }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-400 mb-1">المدة</p>
              <p class="text-sm font-medium text-slate-800 dark:text-slate-200">{{ session.duration }} دقيقة</p>
            </div>
            <div>
              <p class="text-xs text-slate-400 mb-1">نوع الجلسة</p>
              <p class="text-sm font-medium text-slate-800 dark:text-slate-200">{{ typeLabel(session.type) }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-400 mb-1">التكلفة</p>
              <p class="text-sm font-semibold text-teal-600 dark:text-teal-400">
                {{ Number(session.cost || 0).toLocaleString('ar-SA') }} ﷼
              </p>
            </div>
            <div>
              <p class="text-xs text-slate-400 mb-1">حالة الدفع</p>
              <span class="inline-flex items-center gap-1 text-xs font-medium"
                :class="session.paid ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    :d="session.paid ? 'M5 13l4 4L19 7' : 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'"/>
                </svg>
                {{ session.paid ? 'مدفوعة' : 'غير مدفوعة' }}
              </span>
            </div>
          </div>
        </div>

        <!-- ملاحظات الجلسة -->
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div class="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <h2 class="text-sm font-semibold text-slate-900 dark:text-white">ملاحظات الجلسة</h2>
          </div>
          <div class="p-5">
            <p v-if="session.notes" class="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {{ session.notes }}
            </p>
            <p v-else class="text-sm text-slate-400 italic">لا توجد ملاحظات لهذه الجلسة</p>
          </div>
        </div>

        <!-- خطة العلاج -->
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div class="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <h2 class="text-sm font-semibold text-slate-900 dark:text-white">خطة العلاج</h2>
          </div>
          <div class="p-5">
            <p v-if="session.treatment_plan" class="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {{ session.treatment_plan }}
            </p>
            <p v-else class="text-sm text-slate-400 italic">لم تُسجَّل خطة علاج لهذه الجلسة</p>
          </div>
        </div>

      </div>

      <!-- الشريط الجانبي -->
      <div class="space-y-5">

        <!-- معلومات المريض -->
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div class="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <h2 class="text-sm font-semibold text-slate-900 dark:text-white">المريض</h2>
          </div>
          <div class="p-5">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-12 h-12 rounded-xl flex items-center justify-center text-white text-base font-bold shrink-0"
                :class="session.patient?.gender === 'male' ? 'bg-blue-500' : 'bg-pink-500'">
                {{ session.patient?.name?.charAt(0) || '؟' }}
              </div>
              <div>
                <p class="text-sm font-semibold text-slate-900 dark:text-white">{{ session.patient?.name }}</p>
                <p class="text-xs text-slate-400">{{ session.patient?.patient_number }}</p>
              </div>
            </div>
            <div class="space-y-2 text-xs">
              <div class="flex items-center justify-between">
                <span class="text-slate-400">التشخيص</span>
                <span class="text-slate-700 dark:text-slate-300">{{ session.patient?.diagnosis || '—' }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-400">العمر</span>
                <span class="text-slate-700 dark:text-slate-300">{{ session.patient?.age }} سنة</span>
              </div>
            </div>
            <Link :href="route('patients.show', session.patient_id)"
              class="mt-4 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              عرض ملف المريض
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
            </Link>
          </div>
        </div>

        <!-- معلومات المعالج -->
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div class="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <h2 class="text-sm font-semibold text-slate-900 dark:text-white">المعالج</h2>
          </div>
          <div class="p-5">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm shrink-0">
                {{ session.therapist?.name?.charAt(0) || 'م' }}
              </div>
              <div>
                <p class="text-sm font-medium text-slate-800 dark:text-slate-200">{{ session.therapist?.name || 'غير محدد' }}</p>
                <p class="text-xs text-slate-400">{{ session.therapist?.email || '' }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- إجراءات سريعة -->
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div class="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <h2 class="text-sm font-semibold text-slate-900 dark:text-white">إجراءات</h2>
          </div>
          <div class="p-3 space-y-1">
            <button @click="printSession"
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-right">
              <svg class="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
              </svg>
              طباعة ملخص الجلسة
            </button>
            <button @click="$inertia.delete(route('sessions.destroy', session.id), { onBefore: () => confirm('حذف هذه الجلسة؟') })"
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-right">
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
              حذف الجلسة
            </button>
          </div>
        </div>

      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref } from 'vue'
import { Link, router } from '@inertiajs/vue3'
import AppLayout from '@/Layouts/AppLayout.vue'

const props = defineProps({
  session: { type: Object, required: true },
})

const processing = ref(false)

function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('ar-SA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

function statusLabel(s) {
  const map = { scheduled: 'مجدولة', completed: 'مكتملة', cancelled: 'ملغاة', no_show: 'غياب' }
  return map[s] || s
}

function statusClass(s) {
  const map = {
    scheduled: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    completed:  'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    cancelled:  'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    no_show:    'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  }
  return map[s] || ''
}

function statusDot(s) {
  const map = {
    scheduled: 'bg-blue-500',
    completed:  'bg-green-500',
    cancelled:  'bg-red-500',
    no_show:    'bg-amber-500',
  }
  return map[s] || 'bg-slate-400'
}

function typeLabel(t) {
  const map = {
    individual: 'فردية', group: 'جماعية',
    assessment: 'تقييمية', followup: 'متابعة',
  }
  return map[t] || t
}

function completeSession() {
  processing.value = true
  router.patch(route('sessions.complete', props.session.id), {}, {
    onFinish: () => { processing.value = false },
  })
}

function cancelSession() {
  if (!confirm('هل تريد إلغاء هذه الجلسة؟')) return
  processing.value = true
  router.patch(route('sessions.cancel', props.session.id), {}, {
    onFinish: () => { processing.value = false },
  })
}

function printSession() {
  window.print()
}
</script>
