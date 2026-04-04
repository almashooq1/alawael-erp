<script setup>
import { ref, computed } from 'vue'
import AppLayout from '@/Layouts/AppLayout.vue'

const props = defineProps({
  stats:                 { type: Object, default: () => ({}) },
  monthlySessionsChart:  { type: Array,  default: () => [] },
  monthlyRevenueChart:   { type: Array,  default: () => [] },
  sessionTypeBreakdown:  { type: Array,  default: () => [] },
  patientStatusBreakdown:{ type: Array,  default: () => [] },
  patientGenderBreakdown:{ type: Array,  default: () => [] },
  therapistPerformance:  { type: Array,  default: () => [] },
  recentTransactions:    { type: Array,  default: () => [] },
})

const activeTab = ref('overview')

// ========== KPIs ==========
const kpis = computed(() => [
  {
    label: 'إجمالي المرضى',
    value: props.stats.total_patients ?? 0,
    sub: `${props.stats.active_patients ?? 0} نشط`,
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    valueColor: 'text-slate-900 dark:text-white',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  },
  {
    label: 'إجمالي الجلسات',
    value: props.stats.total_sessions ?? 0,
    sub: `${props.stats.completed_sessions ?? 0} مكتملة`,
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    iconColor: 'text-green-600 dark:text-green-400',
    valueColor: 'text-green-600 dark:text-green-400',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    label: 'إيرادات الشهر',
    value: Number(props.stats.revenue_month ?? 0).toLocaleString('ar-SA') + ' ﷼',
    sub: `إجمالي: ${Number(props.stats.revenue_total ?? 0).toLocaleString('ar-SA')} ﷼`,
    iconBg: 'bg-teal-100 dark:bg-teal-900/30',
    iconColor: 'text-teal-600 dark:text-teal-400',
    valueColor: 'text-teal-600 dark:text-teal-400',
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    label: 'الفواتير المعلقة',
    value: props.stats.pending_invoices ?? 0,
    sub: `معدل حضور ${props.stats.attendance_rate ?? 0}%`,
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    valueColor: 'text-amber-600 dark:text-amber-400',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  },
])

// ========== مخطط الجلسات الشهري ==========
const sessionsMax = computed(() =>
  Math.max(...props.monthlySessionsChart.map(m => m.count), 1)
)

// ========== مخطط الإيرادات الشهري ==========
const revenueMax = computed(() =>
  Math.max(...props.monthlyRevenueChart.map(m => m.revenue), 1)
)

// ========== توزيع أنواع الجلسات ==========
const sessionTypeColors = ['bg-blue-500', 'bg-teal-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500']

// ========== توزيع حالات المرضى ==========
const statusColors = {
  active:    { bg: 'bg-green-500',  label: 'نشط' },
  inactive:  { bg: 'bg-slate-400',  label: 'غير نشط' },
  completed: { bg: 'bg-blue-500',   label: 'مكتمل' },
  suspended: { bg: 'bg-amber-500',  label: 'معلق' },
}

// ========== توزيع الجنس ==========
const genderData = computed(() => {
  const male   = props.patientGenderBreakdown.find(g => g.gender === 'male')?.count ?? 0
  const female = props.patientGenderBreakdown.find(g => g.gender === 'female')?.count ?? 0
  const total  = male + female || 1
  return {
    male,
    female,
    malePercent:   Math.round((male / total) * 100),
    femalePercent: Math.round((female / total) * 100),
  }
})

// ========== حالة الفاتورة ==========
function invoiceStatusClass(status) {
  return {
    paid:      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    pending:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    overdue:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
  }[status] ?? 'bg-slate-100 text-slate-500'
}

function invoiceStatusLabel(status) {
  return { paid: 'مدفوع', pending: 'معلق', overdue: 'متأخر', cancelled: 'ملغي' }[status] ?? status
}

function printReport() { window.print() }
</script>

<template>
  <AppLayout title="التقارير">
    <template #header>
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="text-xl font-bold text-slate-900 dark:text-white">التقارير والإحصاءات</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">تقارير شاملة عن أداء المركز</p>
        </div>
        <div class="flex items-center gap-2">
          <button @click="printReport"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                   bg-slate-800 text-white hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
            </svg>
            طباعة
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 mt-4 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit">
        <button v-for="tab in [
          { key: 'overview',     label: 'نظرة عامة' },
          { key: 'sessions',     label: 'الجلسات' },
          { key: 'revenue',      label: 'الإيرادات' },
          { key: 'therapists',   label: 'المعالجون' },
        ]" :key="tab.key"
          @click="activeTab = tab.key"
          :class="[
            'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
            activeTab === tab.key
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
          ]">
          {{ tab.label }}
        </button>
      </div>
    </template>

    <!-- ===== KPIs ===== -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div v-for="kpi in kpis" :key="kpi.label"
        class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <p class="text-xs text-slate-500 dark:text-slate-400 truncate">{{ kpi.label }}</p>
            <p class="text-2xl font-bold mt-1 truncate" :class="kpi.valueColor">{{ kpi.value }}</p>
            <p class="text-xs text-slate-400 mt-1 truncate">{{ kpi.sub }}</p>
          </div>
          <div class="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" :class="kpi.iconBg">
            <svg class="w-5 h-5" :class="kpi.iconColor" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="kpi.icon"/>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== نظرة عامة ===== -->
    <div v-if="activeTab === 'overview'" class="space-y-6">
      <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">

        <!-- توزيع أنواع الجلسات -->
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-4">أنواع الجلسات</h3>
          <div class="space-y-3">
            <template v-if="sessionTypeBreakdown.length">
              <div v-for="(item, i) in sessionTypeBreakdown" :key="item.type">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-sm text-slate-700 dark:text-slate-300 truncate">{{ item.type || 'غير محدد' }}</span>
                  <span class="text-sm font-semibold text-slate-900 dark:text-white ml-2">{{ item.count }}</span>
                </div>
                <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                  <div class="h-2 rounded-full transition-all duration-700"
                    :class="sessionTypeColors[i % sessionTypeColors.length]"
                    :style="{ width: item.percent + '%' }"/>
                </div>
              </div>
            </template>
            <p v-else class="text-sm text-slate-400 text-center py-4">لا توجد بيانات</p>
          </div>
        </div>

        <!-- توزيع حالات المرضى -->
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-4">حالات المرضى</h3>
          <div class="space-y-3">
            <template v-if="patientStatusBreakdown.length">
              <div v-for="item in patientStatusBreakdown" :key="item.status"
                class="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <div class="flex items-center gap-2">
                  <div class="w-2.5 h-2.5 rounded-full"
                    :class="statusColors[item.status]?.bg ?? 'bg-slate-400'"/>
                  <span class="text-sm text-slate-700 dark:text-slate-300">
                    {{ statusColors[item.status]?.label ?? item.status }}
                  </span>
                </div>
                <div class="text-left">
                  <span class="text-sm font-bold text-slate-900 dark:text-white">{{ item.count }}</span>
                  <span class="text-xs text-slate-400 mr-1">({{ item.percent }}%)</span>
                </div>
              </div>
            </template>
            <p v-else class="text-sm text-slate-400 text-center py-4">لا توجد بيانات</p>
          </div>
        </div>

        <!-- توزيع الجنس -->
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-4">توزيع الجنس</h3>
          <div class="flex items-center justify-center gap-8 mb-6">
            <div class="text-center">
              <div class="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-2">
                <span class="text-2xl font-bold text-blue-600 dark:text-blue-400">♂</span>
              </div>
              <p class="text-xl font-bold text-slate-900 dark:text-white">{{ genderData.male }}</p>
              <p class="text-xs text-slate-400">ذكور</p>
            </div>
            <div class="text-center">
              <div class="w-16 h-16 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center mx-auto mb-2">
                <span class="text-2xl font-bold text-pink-600 dark:text-pink-400">♀</span>
              </div>
              <p class="text-xl font-bold text-slate-900 dark:text-white">{{ genderData.female }}</p>
              <p class="text-xs text-slate-400">إناث</p>
            </div>
          </div>
          <div class="w-full h-3 rounded-full overflow-hidden bg-pink-200 dark:bg-pink-900/40">
            <div class="h-full bg-blue-500 rounded-full transition-all duration-700"
              :style="{ width: genderData.malePercent + '%' }"/>
          </div>
          <div class="flex justify-between mt-1.5">
            <span class="text-xs text-blue-600 font-medium">{{ genderData.malePercent }}% ذكور</span>
            <span class="text-xs text-pink-600 font-medium">{{ genderData.femalePercent }}% إناث</span>
          </div>
        </div>
      </div>

      <!-- آخر المعاملات -->
      <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-4">آخر المعاملات المالية</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-slate-100 dark:border-slate-700">
                <th class="text-right py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400">رقم الفاتورة</th>
                <th class="text-right py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400">المريض</th>
                <th class="text-right py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400">المبلغ</th>
                <th class="text-right py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400">الحالة</th>
                <th class="text-right py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400">التاريخ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
              <tr v-for="tx in recentTransactions" :key="tx.id"
                class="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <td class="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">{{ tx.invoice_number }}</td>
                <td class="py-2.5 px-3 text-slate-700 dark:text-slate-200">{{ tx.patient_name ?? '—' }}</td>
                <td class="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                  {{ Number(tx.total).toLocaleString('ar-SA') }} ﷼
                </td>
                <td class="py-2.5 px-3">
                  <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium"
                    :class="invoiceStatusClass(tx.status)">
                    {{ invoiceStatusLabel(tx.status) }}
                  </span>
                </td>
                <td class="py-2.5 px-3 text-slate-500 dark:text-slate-400">{{ tx.date }}</td>
              </tr>
              <tr v-if="!recentTransactions.length">
                <td colspan="5" class="py-6 text-center text-slate-400">لا توجد معاملات</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ===== تبويب الجلسات ===== -->
    <div v-if="activeTab === 'sessions'" class="space-y-6">
      <!-- مخطط الجلسات الشهري -->
      <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-6">الجلسات الشهرية (آخر 12 شهر)</h3>
        <div v-if="monthlySessionsChart.length" class="space-y-2">
          <div v-for="m in monthlySessionsChart" :key="m.month"
            class="flex items-center gap-3">
            <span class="text-xs text-slate-500 dark:text-slate-400 w-16 shrink-0 text-left">{{ m.month }}</span>
            <div class="flex-1">
              <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-5 relative overflow-hidden">
                <div class="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-700 flex items-center"
                  :style="{ width: ((m.count / sessionsMax) * 100) + '%' }">
                </div>
              </div>
            </div>
            <span class="text-sm font-semibold text-slate-700 dark:text-slate-200 w-10 text-left shrink-0">{{ m.count }}</span>
          </div>
        </div>
        <p v-else class="text-center text-slate-400 py-8">لا توجد بيانات</p>
      </div>

      <!-- توزيع أنواع الجلسات -->
      <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-4">توزيع أنواع الجلسات</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="(item, i) in sessionTypeBreakdown" :key="item.type"
            class="p-4 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold"
              :class="sessionTypeColors[i % sessionTypeColors.length]">
              {{ item.count }}
            </div>
            <div>
              <p class="text-sm font-medium text-slate-700 dark:text-slate-200">{{ item.type || 'غير محدد' }}</p>
              <p class="text-xs text-slate-400">{{ item.percent }}% من الإجمالي</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== تبويب الإيرادات ===== -->
    <div v-if="activeTab === 'revenue'" class="space-y-6">
      <!-- مخطط الإيرادات الشهري -->
      <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-6">الإيرادات الشهرية (آخر 12 شهر)</h3>
        <div v-if="monthlyRevenueChart.length" class="space-y-2.5">
          <div v-for="m in monthlyRevenueChart" :key="m.month"
            class="flex items-center gap-3">
            <span class="text-xs text-slate-500 w-16 shrink-0 text-left">{{ m.month }}</span>
            <div class="flex-1">
              <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-5 overflow-hidden">
                <div class="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full transition-all duration-700"
                  :style="{ width: ((m.revenue / revenueMax) * 100) + '%' }"/>
              </div>
            </div>
            <span class="text-sm font-semibold text-slate-700 dark:text-slate-200 w-28 text-left shrink-0">
              {{ Number(m.revenue).toLocaleString('ar-SA') }} ﷼
            </span>
          </div>
        </div>
        <p v-else class="text-center text-slate-400 py-8">لا توجد بيانات</p>
      </div>

      <!-- ملخص مالي -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-teal-50 dark:bg-teal-900/20 rounded-xl border border-teal-100 dark:border-teal-800 p-5 text-center">
          <p class="text-xs text-teal-600 dark:text-teal-400 mb-1">إجمالي الإيرادات</p>
          <p class="text-2xl font-bold text-teal-700 dark:text-teal-300">
            {{ Number(stats.revenue_total ?? 0).toLocaleString('ar-SA') }} ﷼
          </p>
        </div>
        <div class="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 p-5 text-center">
          <p class="text-xs text-blue-600 dark:text-blue-400 mb-1">إيرادات الشهر الحالي</p>
          <p class="text-2xl font-bold text-blue-700 dark:text-blue-300">
            {{ Number(stats.revenue_month ?? 0).toLocaleString('ar-SA') }} ﷼
          </p>
        </div>
        <div class="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800 p-5 text-center">
          <p class="text-xs text-amber-600 dark:text-amber-400 mb-1">فواتير معلقة</p>
          <p class="text-2xl font-bold text-amber-700 dark:text-amber-300">
            {{ stats.pending_invoices ?? 0 }}
          </p>
        </div>
      </div>

      <!-- جدول آخر المعاملات -->
      <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-4">آخر المعاملات</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-slate-100 dark:border-slate-700">
                <th class="text-right py-2 px-3 text-xs font-medium text-slate-500">رقم الفاتورة</th>
                <th class="text-right py-2 px-3 text-xs font-medium text-slate-500">المريض</th>
                <th class="text-right py-2 px-3 text-xs font-medium text-slate-500">المبلغ</th>
                <th class="text-right py-2 px-3 text-xs font-medium text-slate-500">الحالة</th>
                <th class="text-right py-2 px-3 text-xs font-medium text-slate-500">التاريخ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
              <tr v-for="tx in recentTransactions" :key="tx.id"
                class="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <td class="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">{{ tx.invoice_number }}</td>
                <td class="py-2.5 px-3 text-slate-700 dark:text-slate-200">{{ tx.patient_name ?? '—' }}</td>
                <td class="py-2.5 px-3 font-semibold">{{ Number(tx.total).toLocaleString('ar-SA') }} ﷼</td>
                <td class="py-2.5 px-3">
                  <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium"
                    :class="invoiceStatusClass(tx.status)">
                    {{ invoiceStatusLabel(tx.status) }}
                  </span>
                </td>
                <td class="py-2.5 px-3 text-slate-500">{{ tx.date }}</td>
              </tr>
              <tr v-if="!recentTransactions.length">
                <td colspan="5" class="py-6 text-center text-slate-400">لا توجد معاملات</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ===== تبويب المعالجون ===== -->
    <div v-if="activeTab === 'therapists'" class="space-y-6">
      <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-4">أداء المعالجين</h3>
        <div v-if="therapistPerformance.length" class="divide-y divide-slate-100 dark:divide-slate-700">
          <div v-for="(t, index) in therapistPerformance" :key="t.id"
            class="flex items-center gap-4 py-4">
            <!-- الترتيب -->
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              :class="index === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                     : index === 1 ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                     : index === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                     : 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400'">
              {{ index + 1 }}
            </div>
            <!-- الصورة الرمزية -->
            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500
                        flex items-center justify-center text-white font-bold text-sm shrink-0">
              {{ (t.name || '?').charAt(0) }}
            </div>
            <!-- البيانات -->
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-slate-900 dark:text-white truncate">{{ t.name }}</p>
              <p class="text-xs text-slate-400">{{ t.role ?? 'معالج' }}</p>
            </div>
            <!-- إحصاءات -->
            <div class="flex items-center gap-6 shrink-0 text-center">
              <div>
                <p class="text-lg font-bold text-slate-900 dark:text-white">{{ t.sessions_count ?? 0 }}</p>
                <p class="text-xs text-slate-400">إجمالي</p>
              </div>
              <div>
                <p class="text-lg font-bold text-green-600 dark:text-green-400">{{ t.completed_count ?? 0 }}</p>
                <p class="text-xs text-slate-400">مكتمل</p>
              </div>
              <div>
                <p class="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {{ t.sessions_count > 0 ? Math.round((t.completed_count / t.sessions_count) * 100) : 0 }}%
                </p>
                <p class="text-xs text-slate-400">معدل</p>
              </div>
            </div>
            <!-- شريط الأداء -->
            <div class="w-24 hidden lg:block">
              <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                <div class="h-1.5 bg-blue-500 rounded-full"
                  :style="{ width: (t.sessions_count > 0 ? Math.round((t.completed_count / t.sessions_count) * 100) : 0) + '%' }"/>
              </div>
            </div>
          </div>
        </div>
        <p v-else class="text-center text-slate-400 py-8">لا يوجد معالجون</p>
      </div>
    </div>

  </AppLayout>
</template>
