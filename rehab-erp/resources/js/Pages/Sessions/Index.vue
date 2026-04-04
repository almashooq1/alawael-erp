<template>
  <AppLayout title="الجلسات">
    <template #header>
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold text-slate-900 dark:text-white">إدارة الجلسات</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">إجمالي {{ sessions.total }} جلسة</p>
        </div>
        <Link href="/sessions/create"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          جلسة جديدة
        </Link>
      </div>
    </template>

    <!-- إحصاءات -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div v-for="stat in quickStats" :key="stat.label"
        class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <p class="text-xs text-slate-500 dark:text-slate-400">{{ stat.label }}</p>
        <p class="text-2xl font-bold mt-1" :class="stat.color">{{ stat.value }}</p>
        <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{{ stat.sub }}</p>
      </div>
    </div>

    <!-- التقويم + الجدول -->
    <div class="grid grid-cols-1 xl:grid-cols-4 gap-6">

      <!-- جدول الجلسات -->
      <div class="xl:col-span-3">
        <DataTable
          title="قائمة الجلسات"
          :columns="columns"
          :rows="sessions.data"
          row-key="id"
          searchable
          paginated
          :per-page="15"
        >
          <template #actions>
            <div class="flex items-center gap-2">
              <input v-model="dateFilter" type="date" @change="applyFilter"
                class="text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800
                       text-slate-700 dark:text-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              <select v-model="statusFilter" @change="applyFilter"
                class="text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800
                       text-slate-700 dark:text-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">كل الحالات</option>
                <option value="scheduled">مجدولة</option>
                <option value="completed">مكتملة</option>
                <option value="cancelled">ملغاة</option>
                <option value="no_show">لم يحضر</option>
              </select>
            </div>
          </template>

          <template #cell-patient="{ row }">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300
                          flex items-center justify-center text-xs font-semibold shrink-0">
                {{ row.patient?.name?.charAt(0) || '؟' }}
              </div>
              <div>
                <p class="text-sm font-medium text-slate-900 dark:text-white">{{ row.patient?.name }}</p>
                <p class="text-xs text-slate-400">#{{ row.patient?.patient_number }}</p>
              </div>
            </div>
          </template>

          <template #cell-therapist="{ row }">
            <span class="text-sm text-slate-700 dark:text-slate-300">{{ row.therapist?.name || '—' }}</span>
          </template>

          <template #cell-session_date="{ row }">
            <div>
              <p class="text-sm text-slate-700 dark:text-slate-300">{{ formatDate(row.session_date) }}</p>
              <p class="text-xs text-slate-400">{{ row.session_time }}</p>
            </div>
          </template>

          <template #cell-duration="{ row }">
            <span class="text-sm text-slate-700 dark:text-slate-300">{{ row.duration }} دقيقة</span>
          </template>

          <template #cell-status="{ row }">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
              :class="statusClass(row.status)">
              {{ statusLabel(row.status) }}
            </span>
          </template>

          <template #cell-cost="{ row }">
            <span class="text-sm font-medium text-slate-900 dark:text-white">
              {{ row.cost ? row.cost.toLocaleString('ar-SA') + ' ﷼' : '—' }}
            </span>
          </template>

          <template #row-actions="{ row }">
            <div class="flex items-center gap-1">
              <Link :href="`/sessions/${row.id}`"
                class="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
              </Link>
              <button v-if="row.status === 'scheduled'" @click="completeSession(row)"
                class="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                title="إتمام الجلسة">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
              </button>
              <button v-if="row.status === 'scheduled'" @click="cancelSession(row)"
                class="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="إلغاء الجلسة">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </template>
        </DataTable>
      </div>

      <!-- الشريط الجانبي -->
      <div class="space-y-4">
        <!-- جلسات اليوم -->
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            جلسات اليوم
            <span class="mr-auto bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full">
              {{ todaySessions.length }}
            </span>
          </h3>
          <div v-if="todaySessions.length" class="space-y-2">
            <div v-for="s in todaySessions" :key="s.id"
              class="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <div class="text-center shrink-0">
                <p class="text-xs font-bold text-blue-600 dark:text-blue-400">{{ s.session_time }}</p>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-medium text-slate-900 dark:text-white truncate">{{ s.patient?.name }}</p>
                <p class="text-xs text-slate-500 dark:text-slate-400">{{ s.duration }} دقيقة</p>
              </div>
              <span class="shrink-0 w-2 h-2 rounded-full"
                :class="s.status === 'completed' ? 'bg-green-400' : s.status === 'cancelled' ? 'bg-red-400' : 'bg-blue-400'">
              </span>
            </div>
          </div>
          <div v-else class="text-center py-6">
            <p class="text-sm text-slate-400">لا توجد جلسات اليوم</p>
          </div>
        </div>

        <!-- ملخص الأسبوع -->
        <div class="bg-gradient-to-br from-blue-600 to-teal-500 rounded-xl p-5 text-white">
          <h3 class="text-sm font-semibold mb-4 opacity-90">ملخص هذا الأسبوع</h3>
          <div class="space-y-3">
            <div v-for="item in weekSummary" :key="item.label" class="flex items-center justify-between">
              <span class="text-xs opacity-80">{{ item.label }}</span>
              <span class="text-sm font-bold">{{ item.value }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { router, Link } from '@inertiajs/vue3'
import AppLayout from '@/Layouts/AppLayout.vue'
import DataTable from '@/Components/DataTable.vue'

const props = defineProps({
  sessions:    { type: Object, required: true },
  todaySessions: { type: Array, default: () => [] },
  stats:       { type: Object, default: () => ({}) },
  filters:     { type: Object, default: () => ({}) },
})

const statusFilter = ref(props.filters.status || '')
const dateFilter   = ref(props.filters.date   || '')

const columns = [
  { key: 'patient',      label: 'المريض',      sortable: true },
  { key: 'therapist',    label: 'المعالج',      sortable: true },
  { key: 'session_date', label: 'التاريخ',      sortable: true, width: '130px' },
  { key: 'duration',     label: 'المدة',        width: '90px', align: 'center' },
  { key: 'type',         label: 'النوع',        width: '110px' },
  { key: 'status',       label: 'الحالة',       sortable: true, width: '110px' },
  { key: 'cost',         label: 'التكلفة',      sortable: true, width: '100px', align: 'center' },
]

const quickStats = computed(() => [
  { label: 'إجمالي الجلسات', value: props.stats.total || 0,     color: 'text-slate-900 dark:text-white', sub: 'جلسة مسجلة' },
  { label: 'مكتملة',         value: props.stats.completed || 0,  color: 'text-green-600 dark:text-green-400', sub: 'هذا الشهر' },
  { label: 'مجدولة',         value: props.stats.scheduled || 0,  color: 'text-blue-600 dark:text-blue-400', sub: 'قادمة' },
  { label: 'الإيرادات',      value: (props.stats.revenue || 0).toLocaleString('ar-SA') + ' ﷼', color: 'text-teal-600 dark:text-teal-400', sub: 'هذا الشهر' },
])

const weekSummary = computed(() => [
  { label: 'جلسات منجزة',  value: props.stats.week_completed || 0 },
  { label: 'جلسات ملغاة',  value: props.stats.week_cancelled || 0 },
  { label: 'معدل الحضور',   value: (props.stats.attendance_rate || 0) + '%' },
  { label: 'إيرادات الأسبوع', value: (props.stats.week_revenue || 0).toLocaleString('ar-SA') + ' ﷼' },
])

function statusClass(status) {
  return {
    scheduled:  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    completed:  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    cancelled:  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    no_show:    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  }[status] || 'bg-slate-100 text-slate-600'
}

function statusLabel(status) {
  return { scheduled: 'مجدولة', completed: 'مكتملة', cancelled: 'ملغاة', no_show: 'لم يحضر' }[status] || status
}

function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })
}

function applyFilter() {
  router.get('/sessions', { status: statusFilter.value, date: dateFilter.value },
    { preserveState: true, replace: true })
}

function completeSession(session) {
  router.patch(`/sessions/${session.id}/complete`, {}, { preserveState: false })
}

function cancelSession(session) {
  if (confirm('هل تريد إلغاء هذه الجلسة؟')) {
    router.patch(`/sessions/${session.id}/cancel`, {}, { preserveState: false })
  }
}
</script>
