<template>
  <AppLayout title="الفواتير والمالية">
    <template #header>
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold text-slate-900 dark:text-white">الفواتير والمالية</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">إدارة الفواتير والمدفوعات</p>
        </div>
        <button @click="openModal()"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          فاتورة جديدة
        </button>
      </div>
    </template>

    <!-- KPIs المالية -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div v-for="kpi in kpis" :key="kpi.label"
        class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <p class="text-xs text-slate-400 mb-1">{{ kpi.label }}</p>
        <p class="text-2xl font-bold" :class="kpi.color">{{ kpi.value }}</p>
        <p class="text-xs text-slate-400 mt-1">{{ kpi.sub }}</p>
      </div>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">

      <!-- جدول الفواتير -->
      <div class="xl:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <!-- شريط الفلتر -->
        <div class="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3 flex-wrap">
          <div class="relative flex-1 min-w-40">
            <svg class="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input v-model="search" type="text" placeholder="بحث..."
              class="w-full pr-9 pl-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"/>
          </div>
          <select v-model="filterStatus"
            class="text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">جميع الحالات</option>
            <option value="paid">مدفوعة</option>
            <option value="pending">معلقة</option>
            <option value="overdue">متأخرة</option>
            <option value="cancelled">ملغاة</option>
          </select>
        </div>

        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <th class="text-right text-xs font-medium text-slate-500 px-5 py-3">رقم الفاتورة</th>
              <th class="text-right text-xs font-medium text-slate-500 px-5 py-3">المريض</th>
              <th class="text-right text-xs font-medium text-slate-500 px-5 py-3 hidden md:table-cell">التاريخ</th>
              <th class="text-right text-xs font-medium text-slate-500 px-5 py-3">المبلغ</th>
              <th class="text-right text-xs font-medium text-slate-500 px-5 py-3">الحالة</th>
              <th class="px-5 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
            <tr v-if="filteredInvoices.length === 0">
              <td colspan="6" class="px-5 py-12 text-center text-slate-400 text-sm">
                لا توجد فواتير مطابقة
              </td>
            </tr>
            <tr v-for="inv in filteredInvoices" :key="inv.id"
              class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
              <td class="px-5 py-3.5">
                <span class="font-mono text-sm font-medium text-slate-700 dark:text-slate-300">
                  {{ inv.invoice_number }}
                </span>
              </td>
              <td class="px-5 py-3.5">
                <div class="flex items-center gap-2">
                  <div class="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    :style="{ backgroundColor: avatarColor(inv.patient_name) }">
                    {{ inv.patient_name?.charAt(0) }}
                  </div>
                  <span class="text-sm text-slate-800 dark:text-slate-200">{{ inv.patient_name }}</span>
                </div>
              </td>
              <td class="px-5 py-3.5 text-xs text-slate-500 hidden md:table-cell">
                {{ formatDate(inv.issue_date) }}
              </td>
              <td class="px-5 py-3.5">
                <span class="font-semibold text-slate-800 dark:text-slate-200">
                  {{ Number(inv.total).toLocaleString('ar-SA') }} ﷼
                </span>
                <span v-if="inv.paid_amount < inv.total"
                  class="text-xs text-amber-500 block">
                  متبقي: {{ (inv.total - inv.paid_amount).toLocaleString('ar-SA') }} ﷼
                </span>
              </td>
              <td class="px-5 py-3.5">
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                  :class="statusClass(inv.status)">
                  {{ statusLabel(inv.status) }}
                </span>
              </td>
              <td class="px-5 py-3.5">
                <div class="flex items-center gap-1 justify-end">
                  <button @click="viewInvoice(inv)"
                    class="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                  </button>
                  <button v-if="inv.status === 'pending'" @click="markPaid(inv)"
                    class="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="px-5 py-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <p class="text-xs text-slate-500">{{ filteredInvoices.length }} فاتورة</p>
          <p class="text-xs text-teal-600 font-medium">
            المجموع: {{ totalAmount.toLocaleString('ar-SA') }} ﷼
          </p>
        </div>
      </div>

      <!-- الشريط الجانبي -->
      <div class="space-y-4">

        <!-- ملخص المدفوعات -->
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-4">ملخص المدفوعات</h3>
          <div class="space-y-3">
            <div v-for="item in paymentSummary" :key="item.label">
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs text-slate-500">{{ item.label }}</span>
                <span class="text-xs font-semibold" :class="item.color">
                  {{ item.amount.toLocaleString('ar-SA') }} ﷼
                </span>
              </div>
              <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                <div class="h-1.5 rounded-full" :class="item.barColor"
                  :style="{ width: item.percent + '%' }"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- طرق الدفع -->
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-4">طرق الدفع</h3>
          <div class="space-y-2">
            <div v-for="m in paymentMethods" :key="m.label"
              class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full" :class="m.color"></span>
                <span class="text-xs text-slate-600 dark:text-slate-400">{{ m.label }}</span>
              </div>
              <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {{ m.percent }}%
              </span>
            </div>
          </div>
        </div>

        <!-- إجراءات سريعة -->
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-3">إجراءات</h3>
          <div class="space-y-2">
            <button @click="exportReport"
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 transition-colors text-right">
              <svg class="w-4 h-4 text-teal-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
              </svg>
              تصدير التقرير
            </button>
            <button @click="window.print()"
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 transition-colors text-right">
              <svg class="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
              </svg>
              طباعة الكشف
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- مودال تفاصيل الفاتورة -->
    <Teleport to="body">
      <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
        leave-active-class="transition duration-150">
        <div v-if="selectedInvoice" class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @click.self="selectedInvoice = null">
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
          <div class="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
            <!-- رأس الفاتورة -->
            <div class="p-6 border-b border-slate-100 dark:border-slate-700">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-xs text-slate-400 mb-1">رقم الفاتورة</p>
                  <p class="text-xl font-bold font-mono text-slate-900 dark:text-white">
                    {{ selectedInvoice.invoice_number }}
                  </p>
                </div>
                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                  :class="statusClass(selectedInvoice.status)">
                  {{ statusLabel(selectedInvoice.status) }}
                </span>
              </div>
            </div>
            <!-- تفاصيل -->
            <div class="p-6 space-y-4">
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-500">المريض</span>
                <span class="font-medium text-slate-800 dark:text-slate-200">{{ selectedInvoice.patient_name }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-500">تاريخ الإصدار</span>
                <span class="font-medium text-slate-800 dark:text-slate-200">{{ formatDate(selectedInvoice.issue_date) }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-500">تاريخ الاستحقاق</span>
                <span class="font-medium text-slate-800 dark:text-slate-200">{{ formatDate(selectedInvoice.due_date) }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-500">عدد الجلسات</span>
                <span class="font-medium text-slate-800 dark:text-slate-200">{{ selectedInvoice.sessions_count }} جلسة</span>
              </div>
              <hr class="border-slate-100 dark:border-slate-700"/>
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-500">المبلغ الإجمالي</span>
                <span class="font-bold text-teal-600">{{ Number(selectedInvoice.total).toLocaleString('ar-SA') }} ﷼</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-500">المبلغ المدفوع</span>
                <span class="font-medium text-green-600">{{ Number(selectedInvoice.paid_amount).toLocaleString('ar-SA') }} ﷼</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-500">المبلغ المتبقي</span>
                <span class="font-bold" :class="selectedInvoice.total > selectedInvoice.paid_amount ? 'text-red-500' : 'text-green-600'">
                  {{ (selectedInvoice.total - selectedInvoice.paid_amount).toLocaleString('ar-SA') }} ﷼
                </span>
              </div>
            </div>
            <div class="px-6 pb-6 flex gap-3">
              <button @click="printInvoice(selectedInvoice)"
                class="flex-1 py-2.5 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 transition-colors">
                طباعة الفاتورة
              </button>
              <button @click="selectedInvoice = null"
                class="px-5 py-2.5 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                إغلاق
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- مودال فاتورة جديدة -->
    <Teleport to="body">
      <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100">
        <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @click.self="showModal = false">
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
          <div class="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div class="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700">
              <h2 class="text-base font-semibold text-slate-900 dark:text-white">إنشاء فاتورة جديدة</h2>
              <button @click="showModal = false"
                class="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <form @submit.prevent="submitInvoice" class="p-6 space-y-4">
              <div>
                <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  المريض <span class="text-red-500">*</span>
                </label>
                <select v-model="invoiceForm.patient_id" required
                  class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="">-- اختر مريضاً --</option>
                  <option v-for="p in patients" :key="p.id" :value="p.id">
                    {{ p.name }} ({{ p.patient_number }})
                  </option>
                </select>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">من تاريخ</label>
                  <input v-model="invoiceForm.from_date" type="date" dir="ltr"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"/>
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">إلى تاريخ</label>
                  <input v-model="invoiceForm.to_date" type="date" dir="ltr"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"/>
                </div>
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">تاريخ الاستحقاق</label>
                <input v-model="invoiceForm.due_date" type="date" dir="ltr"
                  class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"/>
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">ملاحظات</label>
                <textarea v-model="invoiceForm.notes" rows="2"
                  class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"></textarea>
              </div>
              <div class="flex gap-3 pt-1">
                <button type="submit" :disabled="processing"
                  class="flex-1 py-2.5 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition-colors">
                  {{ processing ? 'جاري الإنشاء...' : 'إنشاء الفاتورة' }}
                </button>
                <button type="button" @click="showModal = false"
                  class="px-5 py-2.5 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

  </AppLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { router } from '@inertiajs/vue3'
import AppLayout from '@/Layouts/AppLayout.vue'

const props = defineProps({
  invoices: { type: Array,  default: () => [] },
  patients: { type: Array,  default: () => [] },
  summary:  { type: Object, default: () => ({}) },
})

const search       = ref('')
const filterStatus = ref('')
const showModal    = ref(false)
const processing   = ref(false)
const selectedInvoice = ref(null)

const invoiceForm = ref({
  patient_id: '', from_date: '', to_date: '', due_date: '', notes: '',
})

// ===================== computed =====================
const filteredInvoices = computed(() => {
  let list = props.invoices
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(i =>
      i.invoice_number?.toLowerCase().includes(q) ||
      i.patient_name?.toLowerCase().includes(q)
    )
  }
  if (filterStatus.value) {
    list = list.filter(i => i.status === filterStatus.value)
  }
  return list
})

const totalAmount = computed(() =>
  filteredInvoices.value.reduce((s, i) => s + Number(i.total || 0), 0)
)

const kpis = computed(() => {
  const total    = props.invoices.reduce((s, i) => s + Number(i.total || 0), 0)
  const paid     = props.invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total || 0), 0)
  const pending  = props.invoices.filter(i => i.status === 'pending').reduce((s, i) => s + Number(i.total || 0), 0)
  const overdue  = props.invoices.filter(i => i.status === 'overdue').length
  return [
    { label: 'إجمالي الإيرادات', value: total.toLocaleString('ar-SA') + ' ﷼', color: 'text-teal-600 dark:text-teal-400', sub: `${props.invoices.length} فاتورة` },
    { label: 'المدفوعات',       value: paid.toLocaleString('ar-SA') + ' ﷼',  color: 'text-green-600 dark:text-green-400', sub: `${props.invoices.filter(i=>i.status==='paid').length} فاتورة` },
    { label: 'معلقة',           value: pending.toLocaleString('ar-SA') + ' ﷼', color: 'text-amber-600 dark:text-amber-400', sub: `${props.invoices.filter(i=>i.status==='pending').length} فاتورة` },
    { label: 'متأخرة',          value: overdue,                                  color: 'text-red-600 dark:text-red-400', sub: 'فاتورة متأخرة' },
  ]
})

const paymentSummary = computed(() => {
  const total = props.invoices.reduce((s, i) => s + Number(i.total || 0), 0) || 1
  const paid  = props.invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total || 0), 0)
  const pending = props.invoices.filter(i => i.status === 'pending').reduce((s, i) => s + Number(i.total || 0), 0)
  const overdue = props.invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + Number(i.total || 0), 0)
  return [
    { label: 'مدفوع',   amount: paid,    percent: Math.round(paid/total*100),    color: 'text-green-600', barColor: 'bg-green-500' },
    { label: 'معلق',    amount: pending, percent: Math.round(pending/total*100), color: 'text-amber-600', barColor: 'bg-amber-500' },
    { label: 'متأخر',   amount: overdue, percent: Math.round(overdue/total*100), color: 'text-red-600',   barColor: 'bg-red-500' },
  ]
})

const paymentMethods = [
  { label: 'نقداً',        percent: 45, color: 'bg-teal-500' },
  { label: 'بطاقة',        percent: 35, color: 'bg-blue-500' },
  { label: 'تحويل بنكي',  percent: 15, color: 'bg-purple-500' },
  { label: 'تأمين',        percent:  5, color: 'bg-amber-500' },
]

// ===================== دوال =====================
function openModal() { showModal.value = true }

function submitInvoice() {
  processing.value = true
  router.post(route('invoices.store'), invoiceForm.value, {
    onSuccess: () => { showModal.value = false },
    onFinish:  () => { processing.value = false },
  })
}

function viewInvoice(inv) { selectedInvoice.value = inv }

function markPaid(inv) {
  router.patch(route('invoices.pay', inv.id), {}, { preserveScroll: true })
}

function printInvoice(inv) { window.print() }

function exportReport() {
  alert('سيتم تصدير التقرير كـ PDF قريباً')
}

function statusLabel(s) {
  return { paid: 'مدفوعة', pending: 'معلقة', overdue: 'متأخرة', cancelled: 'ملغاة' }[s] || s
}

function statusClass(s) {
  return {
    paid:      'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    pending:   'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    overdue:   'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    cancelled: 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400',
  }[s] || ''
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ar-SA', { year:'numeric', month:'short', day:'numeric' })
}

function avatarColor(name) {
  if (!name) return '#6b7280'
  const colors = ['#0d9488','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#06b6d4']
  let hash = 0
  for (let c of name) hash = (hash << 5) - hash + c.charCodeAt(0)
  return colors[Math.abs(hash) % colors.length]
}
</script>
