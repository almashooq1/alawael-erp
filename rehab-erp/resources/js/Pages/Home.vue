<script setup>
import { computed } from 'vue';
import { Link } from '@inertiajs/vue3';
import AppLayout from '@/Layouts/AppLayout.vue';
import StatCard from '@/Components/StatCard.vue';

const props = defineProps({
  appName: String,
  stats: Object,
  weeklyChart: Array,
  revenueChart: Array,
  recentPatients: Array,
  todaySessions: Array,
  recentInvoices: Array,
});

// ======================================================
// Icons
// ======================================================
const icons = {
  patients: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>`,
  sessions: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
  revenue: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
  pending: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>`,
  staff: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>`,
  today: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>`,
};

// ======================================================
// Stats Cards Config
// ======================================================
const statCards = computed(() => [
  {
    title: 'إجمالي المرضى',
    value: props.stats?.total_patients ?? 0,
    subtitle: 'مريض',
    color: 'brand',
    icon: icons.patients,
    href: '/patients',
  },
  {
    title: 'جلسات اليوم',
    value: props.stats?.sessions_today ?? 0,
    subtitle: 'جلسة',
    color: 'primary',
    icon: icons.today,
    href: '/sessions',
  },
  {
    title: 'إيرادات الشهر',
    value: Number(props.stats?.revenue_month ?? 0).toLocaleString('ar-SA'),
    subtitle: 'ر.س',
    color: 'success',
    icon: icons.revenue,
    href: '/invoices',
  },
  {
    title: 'فواتير معلقة',
    value: props.stats?.pending_invoices ?? 0,
    subtitle: 'فاتورة',
    color: 'warning',
    icon: icons.pending,
    href: '/invoices',
  },
  {
    title: 'أعضاء الفريق',
    value: props.stats?.active_staff ?? 0,
    subtitle: 'موظف',
    color: 'purple',
    icon: icons.staff,
    href: '/users',
  },
  {
    title: 'جلسات الشهر',
    value: props.stats?.sessions_month ?? 0,
    subtitle: 'جلسة',
    color: 'info',
    icon: icons.sessions,
    href: '/sessions',
  },
]);

// ======================================================
// Bar Chart - Weekly Sessions
// ======================================================
const maxSessions = computed(() => {
  const max = Math.max(...(props.weeklyChart ?? []).map((d) => d.sessions), 1);
  return max;
});

function barHeight(count) {
  return count === 0 ? 4 : Math.max(8, (count / maxSessions.value) * 100);
}

// ======================================================
// Status helpers
// ======================================================
const patientStatusBadge = {
  active: 'badge-success',
  inactive: 'badge-surface',
  discharged: 'badge-info',
};

const patientStatusLabel = {
  active: 'نشط',
  inactive: 'غير نشط',
  discharged: 'مُخرَّج',
};

const sessionStatusBadge = {
  scheduled: 'badge-primary',
  in_progress: 'badge-info',
  completed: 'badge-success',
  cancelled: 'badge-danger',
  no_show: 'badge-warning',
};

const sessionStatusLabel = {
  scheduled: 'مجدولة',
  in_progress: 'جارية',
  completed: 'مكتملة',
  cancelled: 'ملغاة',
  no_show: 'غياب',
};

const invoiceStatusBadge = {
  pending: 'badge-warning',
  paid: 'badge-success',
  cancelled: 'badge-surface',
  overdue: 'badge-danger',
};

const invoiceStatusLabel = {
  pending: 'معلقة',
  paid: 'مدفوعة',
  cancelled: 'ملغاة',
  overdue: 'متأخرة',
};
</script>

<template>
  <AppLayout title="لوحة التحكم">
    <template #header>
      <div class="flex items-center justify-between">
        <div>
          <h2 class="section-title text-xl">لوحة التحكم</h2>
          <p class="section-subtitle">
            مرحباً 👋 —
            {{ new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <Link href="/patients/create" class="btn-primary btn-sm">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            مريض جديد
          </Link>
        </div>
      </div>
    </template>

    <div class="space-y-6">

      <!-- ====================================================
           Stats Grid
           ==================================================== -->
      <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <Link
          v-for="card in statCards"
          :key="card.title"
          :href="card.href"
          class="block"
        >
          <div
            class="card p-4 hover:shadow-md transition-shadow cursor-pointer group"
          >
            <div class="flex items-start justify-between mb-3">
              <div :class="[
                'w-10 h-10 rounded-xl flex items-center justify-center',
                card.color === 'brand' ? 'bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400' :
                card.color === 'primary' ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400' :
                card.color === 'success' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                card.color === 'warning' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                card.color === 'purple' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' :
                'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400'
              ]" v-html="card.icon" />
            </div>
            <p class="text-2xl font-bold text-surface-900 dark:text-white">{{ card.value }}</p>
            <p class="text-xs text-surface-500 dark:text-surface-400 mt-0.5">{{ card.title }}</p>
          </div>
        </Link>
      </div>

      <!-- ====================================================
           Charts Row
           ==================================================== -->
      <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">

        <!-- Weekly Sessions Chart -->
        <div class="card p-5 lg:col-span-3">
          <div class="flex items-center justify-between mb-5">
            <div>
              <h3 class="font-semibold text-surface-900 dark:text-white text-sm">جلسات آخر 7 أيام</h3>
              <p class="text-xs text-surface-500">{{ stats?.sessions_month ?? 0 }} جلسة هذا الشهر</p>
            </div>
            <Link href="/sessions" class="text-xs text-primary-600 dark:text-primary-400 hover:underline">
              عرض الكل
            </Link>
          </div>

          <!-- Bar Chart -->
          <div class="flex items-end justify-between gap-2 h-32 px-1">
            <div
              v-for="day in weeklyChart"
              :key="day.date"
              class="flex-1 flex flex-col items-center gap-1.5"
            >
              <!-- Bars container -->
              <div class="w-full flex items-end justify-center gap-0.5 h-24">
                <!-- Total sessions bar -->
                <div class="flex-1 flex flex-col justify-end">
                  <div
                    :style="{ height: barHeight(day.sessions) + '%' }"
                    class="w-full rounded-t-sm bg-primary-200 dark:bg-primary-900/60 min-h-1 transition-all duration-500"
                    :title="`${day.sessions} جلسة`"
                  />
                </div>
                <!-- Completed bar -->
                <div class="flex-1 flex flex-col justify-end">
                  <div
                    :style="{ height: barHeight(day.completed) + '%' }"
                    class="w-full rounded-t-sm bg-primary-500 dark:bg-primary-500 min-h-0.5 transition-all duration-500"
                    :title="`${day.completed} مكتملة`"
                  />
                </div>
              </div>
              <!-- Label -->
              <span class="text-xxs text-surface-500 dark:text-surface-400 text-center leading-tight">
                {{ day.label }}
              </span>
            </div>
          </div>

          <!-- Legend -->
          <div class="flex items-center gap-4 mt-3 pt-3 border-t border-surface-100 dark:border-surface-700/50">
            <div class="flex items-center gap-1.5">
              <div class="w-3 h-2 rounded-sm bg-primary-200 dark:bg-primary-900/60" />
              <span class="text-xxs text-surface-500">إجمالي الجلسات</span>
            </div>
            <div class="flex items-center gap-1.5">
              <div class="w-3 h-2 rounded-sm bg-primary-500" />
              <span class="text-xxs text-surface-500">مكتملة</span>
            </div>
          </div>
        </div>

        <!-- Revenue Chart (6 months) -->
        <div class="card p-5 lg:col-span-2">
          <div class="flex items-center justify-between mb-5">
            <div>
              <h3 class="font-semibold text-surface-900 dark:text-white text-sm">الإيرادات (6 أشهر)</h3>
              <p class="text-xs text-surface-500">
                {{ Number(stats?.revenue_month ?? 0).toLocaleString('ar-SA') }} ر.س هذا الشهر
              </p>
            </div>
            <Link href="/invoices" class="text-xs text-primary-600 dark:text-primary-400 hover:underline">
              الفواتير
            </Link>
          </div>

          <div class="space-y-2.5">
            <div
              v-for="(month, i) in revenueChart"
              :key="i"
              class="flex items-center gap-3"
            >
              <span class="text-xxs text-surface-500 w-14 text-left flex-shrink-0">{{ month.label }}</span>
              <div class="flex-1 bg-surface-100 dark:bg-surface-700/50 rounded-full h-1.5 overflow-hidden">
                <div
                  :style="{
                    width: revenueChart.length
                      ? (month.revenue / Math.max(...revenueChart.map(m => m.revenue), 1) * 100) + '%'
                      : '0%'
                  }"
                  class="h-full bg-emerald-500 rounded-full transition-all duration-700"
                />
              </div>
              <span class="text-xxs font-medium text-surface-700 dark:text-surface-300 w-16 text-right flex-shrink-0">
                {{ Number(month.revenue).toLocaleString('ar-SA') }}
              </span>
            </div>
          </div>

          <div class="mt-4 pt-3 border-t border-surface-100 dark:border-surface-700/50 flex items-center justify-between">
            <span class="text-xxs text-surface-500">إجمالي الفواتير المنشأة هذا الشهر</span>
            <span class="text-sm font-bold text-surface-900 dark:text-white">
              {{ revenueChart?.[revenueChart.length - 1]?.invoices ?? 0 }}
            </span>
          </div>
        </div>
      </div>

      <!-- ====================================================
           Tables Row
           ==================================================== -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <!-- Recent Patients -->
        <div class="card">
          <div class="flex items-center justify-between p-5 border-b border-surface-200 dark:border-surface-700">
            <h3 class="font-semibold text-surface-900 dark:text-white text-sm">آخر المرضى المسجّلين</h3>
            <Link href="/patients" class="text-xs text-primary-600 dark:text-primary-400 hover:underline">
              عرض الكل
            </Link>
          </div>
          <div class="divide-y divide-surface-100 dark:divide-surface-700/50">
            <div
              v-if="!recentPatients?.length"
              class="px-5 py-8 text-center text-sm text-surface-500"
            >
              لا يوجد مرضى بعد
            </div>
            <div
              v-for="patient in recentPatients"
              :key="patient.id"
              class="flex items-center gap-3 px-5 py-3 hover:bg-surface-50 dark:hover:bg-surface-700/20 transition-colors"
            >
              <div class="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-primary-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {{ patient.name.charAt(0) }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-surface-800 dark:text-surface-200 truncate">{{ patient.name }}</p>
                <p class="text-xs text-surface-500 truncate">{{ patient.patient_number }} — {{ patient.diagnosis ?? 'غير محدد' }}</p>
              </div>
              <span :class="['text-xxs px-2 py-0.5 rounded-full font-medium', patientStatusBadge[patient.status] ?? 'badge-surface']">
                {{ patientStatusLabel[patient.status] ?? patient.status }}
              </span>
            </div>
          </div>
          <div class="p-4 border-t border-surface-100 dark:border-surface-700/50">
            <Link href="/patients/create" class="btn-ghost btn-sm w-full justify-center text-primary-600 dark:text-primary-400">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              إضافة مريض جديد
            </Link>
          </div>
        </div>

        <!-- Today's Sessions -->
        <div class="card">
          <div class="flex items-center justify-between p-5 border-b border-surface-200 dark:border-surface-700">
            <h3 class="font-semibold text-surface-900 dark:text-white text-sm">جلسات اليوم</h3>
            <Link href="/sessions" class="text-xs text-primary-600 dark:text-primary-400 hover:underline">
              عرض الكل
            </Link>
          </div>
          <div class="divide-y divide-surface-100 dark:divide-surface-700/50">
            <div
              v-if="!todaySessions?.length"
              class="px-5 py-8 text-center text-sm text-surface-500"
            >
              لا توجد جلسات اليوم
            </div>
            <div
              v-for="session in todaySessions"
              :key="session.id"
              class="flex items-center gap-3 px-5 py-3 hover:bg-surface-50 dark:hover:bg-surface-700/20 transition-colors"
            >
              <div class="flex-shrink-0 text-center w-12">
                <p class="text-sm font-bold text-surface-900 dark:text-white">{{ session.session_time?.slice(0, 5) ?? '—' }}</p>
                <p class="text-xxs text-surface-500">{{ session.duration_minutes ?? 45 }}د</p>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-surface-800 dark:text-surface-200 truncate">
                  {{ session.patient?.name ?? '—' }}
                </p>
                <p class="text-xs text-surface-500">{{ session.type ?? 'علاج' }}</p>
              </div>
              <span :class="['text-xxs px-2 py-0.5 rounded-full font-medium', sessionStatusBadge[session.status] ?? 'badge-surface']">
                {{ sessionStatusLabel[session.status] ?? session.status }}
              </span>
            </div>
          </div>
          <div class="p-4 border-t border-surface-100 dark:border-surface-700/50">
            <Link href="/sessions/create" class="btn-ghost btn-sm w-full justify-center text-primary-600 dark:text-primary-400">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              إضافة جلسة جديدة
            </Link>
          </div>
        </div>
      </div>

      <!-- ====================================================
           Recent Invoices
           ==================================================== -->
      <div class="card">
        <div class="flex items-center justify-between p-5 border-b border-surface-200 dark:border-surface-700">
          <h3 class="font-semibold text-surface-900 dark:text-white text-sm">آخر الفواتير</h3>
          <Link href="/invoices" class="text-xs text-primary-600 dark:text-primary-400 hover:underline">
            عرض الكل
          </Link>
        </div>
        <div v-if="!recentInvoices?.length" class="px-5 py-8 text-center text-sm text-surface-500">
          لا توجد فواتير بعد
        </div>
        <div v-else class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>رقم الفاتورة</th>
                <th>المريض</th>
                <th>المبلغ</th>
                <th>الحالة</th>
                <th>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="inv in recentInvoices"
                :key="inv.id"
                class="hover:bg-surface-50 dark:hover:bg-surface-700/20 transition-colors"
              >
                <td class="font-mono text-sm font-medium text-primary-600 dark:text-primary-400">
                  {{ inv.invoice_number }}
                </td>
                <td class="text-sm text-surface-800 dark:text-surface-200">
                  {{ inv.patient?.name ?? '—' }}
                </td>
                <td class="text-sm font-semibold text-surface-900 dark:text-white">
                  {{ Number(inv.total).toLocaleString('ar-SA') }} ر.س
                </td>
                <td>
                  <span :class="['text-xxs px-2 py-0.5 rounded-full font-medium', invoiceStatusBadge[inv.status] ?? 'badge-surface']">
                    {{ invoiceStatusLabel[inv.status] ?? inv.status }}
                  </span>
                </td>
                <td class="text-xs text-surface-500">
                  {{ new Date(inv.created_at).toLocaleDateString('ar-SA') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </AppLayout>
</template>
