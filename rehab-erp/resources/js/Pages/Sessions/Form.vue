<template>
  <AppLayout :title="isEdit ? 'تعديل جلسة' : 'جلسة جديدة'">
    <template #header>
      <div class="flex items-center gap-3">
        <Link href="/sessions" class="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </Link>
        <div>
          <h1 class="text-xl font-bold text-slate-900 dark:text-white">
            {{ isEdit ? 'تعديل بيانات الجلسة' : 'إضافة جلسة جديدة' }}
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {{ isEdit ? `جلسة #${session?.session_number}` : 'تسجيل جلسة علاجية جديدة' }}
          </p>
        </div>
      </div>
    </template>

    <form @submit.prevent="submit" class="max-w-3xl">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- النموذج الرئيسي -->
        <div class="lg:col-span-2 space-y-5">

          <!-- بيانات الجلسة -->
          <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <h2 class="section-title mb-5">بيانات الجلسة</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <!-- المريض -->
              <div class="sm:col-span-2">
                <label class="label">المريض *</label>
                <select v-model="form.patient_id" class="input"
                  :class="{ 'border-red-500': errors.patient_id }">
                  <option value="">اختر المريض...</option>
                  <option v-for="p in patients" :key="p.id" :value="p.id">
                    {{ p.name }} — #{{ p.patient_number }}
                  </option>
                </select>
                <p v-if="errors.patient_id" class="mt-1 text-xs text-red-500">{{ errors.patient_id }}</p>
              </div>

              <!-- التاريخ -->
              <div>
                <label class="label">تاريخ الجلسة *</label>
                <input v-model="form.session_date" type="date" class="input"
                  :class="{ 'border-red-500': errors.session_date }"/>
                <p v-if="errors.session_date" class="mt-1 text-xs text-red-500">{{ errors.session_date }}</p>
              </div>

              <!-- الوقت -->
              <div>
                <label class="label">وقت الجلسة *</label>
                <input v-model="form.session_time" type="time" class="input"
                  :class="{ 'border-red-500': errors.session_time }"/>
                <p v-if="errors.session_time" class="mt-1 text-xs text-red-500">{{ errors.session_time }}</p>
              </div>

              <!-- المدة -->
              <div>
                <label class="label">مدة الجلسة (دقيقة)</label>
                <select v-model.number="form.duration" class="input">
                  <option :value="30">30 دقيقة</option>
                  <option :value="45">45 دقيقة</option>
                  <option :value="60">60 دقيقة</option>
                  <option :value="90">90 دقيقة</option>
                  <option :value="120">120 دقيقة</option>
                </select>
              </div>

              <!-- نوع الجلسة -->
              <div>
                <label class="label">نوع الجلسة</label>
                <select v-model="form.type" class="input">
                  <option value="individual">فردية</option>
                  <option value="group">جماعية</option>
                  <option value="evaluation">تقييمية</option>
                </select>
              </div>

              <!-- الحالة -->
              <div>
                <label class="label">الحالة</label>
                <select v-model="form.status" class="input">
                  <option value="scheduled">مجدولة</option>
                  <option value="completed">مكتملة</option>
                  <option value="cancelled">ملغاة</option>
                  <option value="no_show">لم يحضر</option>
                </select>
              </div>

              <!-- المعالج -->
              <div>
                <label class="label">المعالج</label>
                <select v-model="form.therapist_id" class="input">
                  <option value="">غير محدد</option>
                  <option v-for="t in therapists" :key="t.id" :value="t.id">{{ t.name }}</option>
                </select>
              </div>
            </div>
          </div>

          <!-- التكلفة والدفع -->
          <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <h2 class="section-title mb-5">التكلفة والدفع</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="label">تكلفة الجلسة (ريال)</label>
                <input v-model.number="form.cost" type="number" min="0" step="0.01" placeholder="0.00" class="input"/>
              </div>
              <div class="flex items-end pb-0.5">
                <label class="flex items-center gap-3 cursor-pointer select-none p-3 rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors w-full">
                  <input v-model="form.paid" type="checkbox"
                    class="w-4 h-4 rounded text-green-500 border-slate-300 focus:ring-green-400"/>
                  <div>
                    <p class="text-sm font-medium text-slate-700 dark:text-slate-200">تم الدفع</p>
                    <p class="text-xs text-slate-400">الجلسة مدفوعة بالكامل</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <!-- الملاحظات -->
          <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <h2 class="section-title mb-5">الملاحظات</h2>
            <div class="space-y-4">
              <div>
                <label class="label">ملاحظات الجلسة</label>
                <textarea v-model="form.notes" rows="3" placeholder="ملاحظات عامة عن الجلسة..." class="input resize-none"></textarea>
              </div>
              <div>
                <label class="label">ملاحظات التقدم</label>
                <textarea v-model="form.progress_notes" rows="3" placeholder="تقدم المريض خلال الجلسة..." class="input resize-none"></textarea>
              </div>
            </div>
          </div>
        </div>

        <!-- الشريط الجانبي -->
        <div class="space-y-4">

          <!-- معاينة الجلسة -->
          <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">ملخص الجلسة</h3>
            <div class="space-y-3">
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-500 dark:text-slate-400">النوع</span>
                <span class="font-medium text-slate-700 dark:text-slate-200">{{ typeLabel(form.type) }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-500 dark:text-slate-400">المدة</span>
                <span class="font-medium text-slate-700 dark:text-slate-200">{{ form.duration }} دقيقة</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-500 dark:text-slate-400">الحالة</span>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  :class="statusClass(form.status)">
                  {{ statusLabel(form.status) }}
                </span>
              </div>
              <div v-if="form.cost" class="flex items-center justify-between text-sm">
                <span class="text-slate-500 dark:text-slate-400">التكلفة</span>
                <span class="font-semibold text-teal-600 dark:text-teal-400">{{ form.cost.toLocaleString('ar-SA') }} ﷼</span>
              </div>
            </div>
          </div>

          <!-- أزرار الحفظ -->
          <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <button type="submit" :disabled="processing"
              class="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg
                     transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
                     disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              <svg v-if="processing" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              {{ processing ? 'جارٍ الحفظ...' : (isEdit ? 'حفظ التعديلات' : 'إضافة الجلسة') }}
            </button>
            <Link href="/sessions"
              class="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600
                     text-slate-700 dark:text-slate-200 font-medium text-sm rounded-lg transition-colors
                     flex items-center justify-center">
              إلغاء
            </Link>
          </div>
        </div>
      </div>
    </form>
  </AppLayout>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { router, Link } from '@inertiajs/vue3'
import AppLayout from '@/Layouts/AppLayout.vue'

const props = defineProps({
  session:    { type: Object, default: null },
  patients:   { type: Array,  default: () => [] },
  therapists: { type: Array,  default: () => [] },
  errors:     { type: Object, default: () => ({}) },
  defaultPatientId: { type: [Number, String], default: null },
})

const isEdit     = computed(() => !!props.session?.id)
const processing = ref(false)

const form = reactive({
  patient_id:     props.session?.patient_id     || props.defaultPatientId || '',
  therapist_id:   props.session?.therapist_id   || '',
  session_date:   props.session?.session_date   || new Date().toISOString().split('T')[0],
  session_time:   props.session?.session_time   || '09:00',
  duration:       props.session?.duration       || 60,
  type:           props.session?.type           || 'individual',
  status:         props.session?.status         || 'scheduled',
  cost:           props.session?.cost           || '',
  paid:           props.session?.paid           || false,
  notes:          props.session?.notes          || '',
  progress_notes: props.session?.progress_notes || '',
})

function typeLabel(t)   { return { individual: 'فردية', group: 'جماعية', evaluation: 'تقييمية' }[t] || t }
function statusLabel(s) { return { scheduled: 'مجدولة', completed: 'مكتملة', cancelled: 'ملغاة', no_show: 'لم يحضر' }[s] || s }
function statusClass(s) {
  return {
    scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    no_show:   'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  }[s] || ''
}

function submit() {
  processing.value = true
  if (isEdit.value) {
    router.put(`/sessions/${props.session.id}`, form, { onFinish: () => { processing.value = false } })
  } else {
    router.post('/sessions', form, { onFinish: () => { processing.value = false } })
  }
}
</script>
