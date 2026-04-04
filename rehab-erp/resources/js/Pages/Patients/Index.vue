<template>
  <AppLayout title="المرضى">
    <template #header>
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold text-slate-900 dark:text-white">إدارة المرضى</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">إجمالي {{ patients.total }} مريض مسجل</p>
        </div>
        <div class="flex items-center gap-3">
          <button @click="exportData" class="btn btn-secondary">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            تصدير
          </button>
          <Link href="/patients/create"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            إضافة مريض
          </Link>
        </div>
      </div>
    </template>

    <!-- إحصاءات سريعة -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div v-for="stat in quickStats" :key="stat.label"
        class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs text-slate-500 dark:text-slate-400">{{ stat.label }}</p>
            <p class="text-2xl font-bold text-slate-900 dark:text-white mt-1">{{ stat.value }}</p>
          </div>
          <div class="w-10 h-10 rounded-xl flex items-center justify-center" :class="stat.iconBg">
            <svg class="w-5 h-5" :class="stat.iconColor" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="stat.icon"/>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- جدول المرضى -->
    <DataTable
      title="قائمة المرضى"
      :columns="columns"
      :rows="patients.data"
      row-key="id"
      searchable
      selectable
      paginated
      :per-page="15"
      @row-click="viewPatient"
    >
      <template #actions>
        <div class="flex items-center gap-2">
          <select v-model="statusFilter" @change="filterPatients"
            class="text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800
                   text-slate-700 dark:text-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
            <option value="discharged">مخرج</option>
          </select>
          <select v-model="genderFilter" @change="filterPatients"
            class="text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800
                   text-slate-700 dark:text-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">كل الجنس</option>
            <option value="male">ذكر</option>
            <option value="female">أنثى</option>
          </select>
        </div>
      </template>

      <template #cell-name="{ row }">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
            :class="row.gender === 'male'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
              : 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300'">
            {{ row.name ? row.name.charAt(0) : '؟' }}
          </div>
          <div>
            <p class="font-medium text-slate-900 dark:text-white text-sm">{{ row.name }}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400">#{{ row.patient_number }}</p>
          </div>
        </div>
      </template>

      <template #cell-gender="{ row }">
        <span class="text-sm" :class="row.gender === 'male' ? 'text-blue-600 dark:text-blue-400' : 'text-pink-600 dark:text-pink-400'">
          {{ row.gender === 'male' ? '♂ ذكر' : '♀ أنثى' }}
        </span>
      </template>

      <template #cell-status="{ row }">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
          :class="{
            'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400': row.status === 'active',
            'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300': row.status === 'inactive',
            'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400': row.status === 'discharged',
          }">
          {{ statusLabel(row.status) }}
        </span>
      </template>

      <template #cell-sessions_count="{ row }">
        <div class="flex items-center gap-2">
          <div class="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
            <div class="bg-blue-500 h-1.5 rounded-full"
              :style="{ width: Math.min((row.sessions_count / 20) * 100, 100) + '%' }"></div>
          </div>
          <span class="text-sm text-slate-700 dark:text-slate-300">{{ row.sessions_count }}</span>
        </div>
      </template>

      <template #row-actions="{ row }">
        <div class="flex items-center gap-1">
          <Link :href="`/patients/${row.id}`"
            class="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            title="عرض">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
          </Link>
          <Link :href="`/patients/${row.id}/edit`"
            class="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
            title="تعديل">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </Link>
          <button @click.stop="confirmDelete(row)"
            class="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="حذف">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </template>
    </DataTable>

    <!-- مودال تأكيد الحذف -->
    <Teleport to="body">
      <div v-if="deleteModal.show"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in">
          <div class="flex items-center gap-4 mb-4">
            <div class="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
              <svg class="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <div>
              <h3 class="font-semibold text-slate-900 dark:text-white">تأكيد الحذف</h3>
              <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                هل أنت متأكد من حذف المريض <strong>{{ deleteModal.patient?.name }}</strong>؟
              </p>
            </div>
          </div>
          <p class="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg p-3 mb-5">
            ⚠️ سيتم حذف جميع الجلسات والبيانات المرتبطة بهذا المريض بشكل نهائي.
          </p>
          <div class="flex items-center justify-end gap-3">
            <button @click="deleteModal.show = false"
              class="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 transition-colors">
              إلغاء
            </button>
            <button @click="deletePatient"
              class="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors">
              نعم، احذف
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </AppLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { router, Link } from '@inertiajs/vue3'
import AppLayout from '@/Layouts/AppLayout.vue'
import DataTable from '@/Components/DataTable.vue'

const props = defineProps({
  patients: { type: Object, required: true },
  stats:    { type: Object, default: () => ({ total: 0, active: 0, new_this_week: 0, avg_age: 0 }) },
  filters:  { type: Object, default: () => ({}) },
})

const statusFilter = ref(props.filters.status || '')
const genderFilter = ref(props.filters.gender || '')

const deleteModal = ref({ show: false, patient: null })

const columns = [
  { key: 'name',           label: 'المريض',       sortable: true },
  { key: 'age',            label: 'العمر',         sortable: true, width: '80px', align: 'center' },
  { key: 'gender',         label: 'الجنس',         sortable: true, width: '90px' },
  { key: 'phone',          label: 'الهاتف',        width: '130px' },
  { key: 'diagnosis',      label: 'التشخيص',      sortable: true },
  { key: 'sessions_count', label: 'الجلسات',       sortable: true, width: '130px' },
  { key: 'status',         label: 'الحالة',        sortable: true, width: '100px' },
  { key: 'created_at',     label: 'تاريخ التسجيل', sortable: true, width: '130px' },
]

const quickStats = computed(() => [
  {
    label: 'إجمالي المرضى', value: props.stats.total,
    iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z'
  },
  {
    label: 'نشطون', value: props.stats.active,
    iconBg: 'bg-green-100 dark:bg-green-900/30', iconColor: 'text-green-600 dark:text-green-400',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
  },
  {
    label: 'جدد هذا الأسبوع', value: props.stats.new_this_week,
    iconBg: 'bg-teal-100 dark:bg-teal-900/30', iconColor: 'text-teal-600 dark:text-teal-400',
    icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z'
  },
  {
    label: 'متوسط العمر', value: props.stats.avg_age,
    iconBg: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600 dark:text-purple-400',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
  },
])

function statusLabel(status) {
  return { active: 'نشط', inactive: 'غير نشط', discharged: 'مخرج' }[status] || status
}

function viewPatient(row) {
  router.visit(`/patients/${row.id}`)
}

function filterPatients() {
  router.get('/patients', {
    status: statusFilter.value,
    gender: genderFilter.value,
  }, { preserveState: true, replace: true })
}

function confirmDelete(patient) {
  deleteModal.value = { show: true, patient }
}

function deletePatient() {
  router.delete(`/patients/${deleteModal.value.patient.id}`, {
    onSuccess: () => { deleteModal.value.show = false }
  })
}

function exportData() {
  window.location.href = '/patients/export'
}
</script>
