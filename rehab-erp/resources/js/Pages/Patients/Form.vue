<template>
  <AppLayout :title="isEdit ? 'تعديل مريض' : 'إضافة مريض'">
    <template #header>
      <div class="flex items-center gap-3">
        <Link href="/patients" class="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </Link>
        <div>
          <h1 class="text-xl font-bold text-slate-900 dark:text-white">
            {{ isEdit ? 'تعديل بيانات المريض' : 'إضافة مريض جديد' }}
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {{ isEdit ? patient.name : 'تسجيل مريض جديد في النظام' }}
          </p>
        </div>
      </div>
    </template>

    <form @submit.prevent="submit" class="max-w-4xl">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- العمود الرئيسي -->
        <div class="lg:col-span-2 space-y-6">

          <!-- البيانات الشخصية -->
          <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <h2 class="section-title mb-5">١. البيانات الشخصية</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="sm:col-span-2">
                <label class="label">الاسم الكامل *</label>
                <input v-model="form.name" type="text" placeholder="أدخل الاسم الكامل" class="input"
                  :class="{ 'border-red-500 focus:ring-red-500': errors.name }"/>
                <p v-if="errors.name" class="mt-1 text-xs text-red-500">{{ errors.name }}</p>
              </div>
              <div>
                <label class="label">تاريخ الميلاد *</label>
                <input v-model="form.birth_date" type="date" class="input"
                  :class="{ 'border-red-500': errors.birth_date }"/>
                <p v-if="errors.birth_date" class="mt-1 text-xs text-red-500">{{ errors.birth_date }}</p>
              </div>
              <div>
                <label class="label">الجنس *</label>
                <div class="flex gap-3">
                  <label v-for="g in [{ value:'male', label:'ذكر', icon:'♂' },{ value:'female', label:'أنثى', icon:'♀' }]"
                    :key="g.value"
                    class="flex-1 flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all"
                    :class="form.gender === g.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                      : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'">
                    <input type="radio" v-model="form.gender" :value="g.value" class="sr-only"/>
                    <span>{{ g.icon }}</span>
                    <span class="text-sm font-medium text-slate-700 dark:text-slate-200">{{ g.label }}</span>
                  </label>
                </div>
                <p v-if="errors.gender" class="mt-1 text-xs text-red-500">{{ errors.gender }}</p>
              </div>
              <div>
                <label class="label">رقم الهوية</label>
                <input v-model="form.national_id" type="text" placeholder="1234567890" class="input"/>
              </div>
              <div>
                <label class="label">الجنسية</label>
                <input v-model="form.nationality" type="text" placeholder="سعودي" class="input"/>
              </div>
            </div>
          </div>

          <!-- بيانات التواصل -->
          <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <h2 class="section-title mb-5">٢. بيانات التواصل</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="label">رقم الهاتف *</label>
                <input v-model="form.phone" type="tel" placeholder="05xxxxxxxx" class="input"
                  :class="{ 'border-red-500': errors.phone }"/>
                <p v-if="errors.phone" class="mt-1 text-xs text-red-500">{{ errors.phone }}</p>
              </div>
              <div>
                <label class="label">هاتف بديل</label>
                <input v-model="form.phone2" type="tel" placeholder="05xxxxxxxx" class="input"/>
              </div>
              <div>
                <label class="label">البريد الإلكتروني</label>
                <input v-model="form.email" type="email" placeholder="example@email.com" class="input"/>
              </div>
              <div>
                <label class="label">اسم ولي الأمر</label>
                <input v-model="form.guardian_name" type="text" placeholder="اسم ولي الأمر" class="input"/>
              </div>
              <div class="sm:col-span-2">
                <label class="label">العنوان</label>
                <input v-model="form.address" type="text" placeholder="المدينة، الحي، الشارع" class="input"/>
              </div>
            </div>
          </div>

          <!-- البيانات الطبية -->
          <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <h2 class="section-title mb-5">٣. البيانات الطبية</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="sm:col-span-2">
                <label class="label">التشخيص الرئيسي *</label>
                <input v-model="form.diagnosis" type="text" placeholder="أدخل التشخيص" class="input"
                  :class="{ 'border-red-500': errors.diagnosis }"/>
                <p v-if="errors.diagnosis" class="mt-1 text-xs text-red-500">{{ errors.diagnosis }}</p>
              </div>
              <div>
                <label class="label">الطبيب المعالج</label>
                <input v-model="form.doctor_name" type="text" placeholder="اسم الطبيب" class="input"/>
              </div>
              <div>
                <label class="label">تاريخ البدء</label>
                <input v-model="form.start_date" type="date" class="input"/>
              </div>
              <div>
                <label class="label">عدد الجلسات المقررة</label>
                <input v-model.number="form.total_sessions" type="number" min="1" placeholder="20" class="input"/>
              </div>
              <div>
                <label class="label">الحالة</label>
                <select v-model="form.status" class="input">
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                  <option value="discharged">مخرج</option>
                </select>
              </div>
              <div class="sm:col-span-2">
                <label class="label">ملاحظات طبية</label>
                <textarea v-model="form.medical_notes" rows="3"
                  placeholder="أضف أي ملاحظات طبية هنا..."
                  class="input resize-none"></textarea>
              </div>
            </div>
          </div>
        </div>

        <!-- الشريط الجانبي -->
        <div class="space-y-4">
          <!-- صورة المريض -->
          <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">صورة المريض</h3>
            <div class="flex flex-col items-center gap-3">
              <div class="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-teal-400 flex items-center justify-center text-3xl font-bold text-white">
                {{ form.name ? form.name.charAt(0) : '؟' }}
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 text-center">سيتم دعم رفع الصور قريباً</p>
            </div>
          </div>

          <!-- معلومات سريعة -->
          <div class="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
            <h3 class="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              معلومات
            </h3>
            <ul class="text-xs text-blue-700 dark:text-blue-300 space-y-1.5">
              <li>• سيتم إنشاء رقم مريض تلقائياً</li>
              <li>• الحقول المطلوبة مشار إليها بـ *</li>
              <li>• يمكن تعديل البيانات لاحقاً</li>
            </ul>
          </div>

          <!-- أزرار الحفظ -->
          <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <button type="submit" :disabled="processing"
              class="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg
                     transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                     disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              <svg v-if="processing" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              {{ processing ? 'جارٍ الحفظ...' : (isEdit ? 'حفظ التعديلات' : 'إضافة المريض') }}
            </button>
            <Link href="/patients"
              class="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600
                     text-slate-700 dark:text-slate-200 font-medium text-sm rounded-lg transition-colors
                     flex items-center justify-center gap-2">
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
  patient: { type: Object, default: null },
  errors:  { type: Object, default: () => ({}) },
})

const isEdit = computed(() => !!props.patient?.id)
const processing = ref(false)

const form = reactive({
  name:           props.patient?.name           || '',
  birth_date:     props.patient?.birth_date     || '',
  gender:         props.patient?.gender         || 'male',
  national_id:    props.patient?.national_id    || '',
  nationality:    props.patient?.nationality    || 'سعودي',
  phone:          props.patient?.phone          || '',
  phone2:         props.patient?.phone2         || '',
  email:          props.patient?.email          || '',
  guardian_name:  props.patient?.guardian_name  || '',
  address:        props.patient?.address        || '',
  diagnosis:      props.patient?.diagnosis      || '',
  doctor_name:    props.patient?.doctor_name    || '',
  start_date:     props.patient?.start_date     || '',
  total_sessions: props.patient?.total_sessions || 20,
  status:         props.patient?.status         || 'active',
  medical_notes:  props.patient?.medical_notes  || '',
})

function submit() {
  processing.value = true
  if (isEdit.value) {
    router.put(`/patients/${props.patient.id}`, form, {
      onFinish: () => { processing.value = false }
    })
  } else {
    router.post('/patients', form, {
      onFinish: () => { processing.value = false }
    })
  }
}
</script>
