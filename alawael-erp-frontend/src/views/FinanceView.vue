<template>
  <div class="p-6">
    <!-- رأس الصفحة -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">💰 الإدارة المالية</h1>
      <p class="text-gray-600">إدارة الفواتير والنفقات والميزانيات والدفعات</p>
    </div>

    <!-- ملخص مالي شامل -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      <div class="card p-4 bg-green-50">
        <p class="text-gray-600 text-sm mb-2">إجمالي الإيرادات</p>
        <p class="text-2xl font-bold text-green-600">{{ financeSummary.totalRevenue }} ريال</p>
      </div>
      <div class="card p-4 bg-red-50">
        <p class="text-gray-600 text-sm mb-2">إجمالي النفقات</p>
        <p class="text-2xl font-bold text-red-600">{{ financeSummary.totalExpenses }} ريال</p>
      </div>
      <div class="card p-4 bg-blue-50">
        <p class="text-gray-600 text-sm mb-2">الرصيد</p>
        <p class="text-2xl font-bold text-blue-600">{{ financeSummary.balance }} ريال</p>
      </div>
      <div class="card p-4 bg-purple-50">
        <p class="text-gray-600 text-sm mb-2">هامش الربح</p>
        <p class="text-2xl font-bold text-purple-600">{{ financeSummary.profitMargin }}%</p>
      </div>
      <div class="card p-4 bg-orange-50">
        <p class="text-gray-600 text-sm mb-2">الفواتير المعلقة</p>
        <p class="text-2xl font-bold text-orange-600">{{ financeSummary.pendingInvoices }}</p>
      </div>
    </div>

    <!-- القوائم -->
    <div class="mb-6 flex flex-wrap gap-2">
      <button
        @click="activeTab = 'invoices'"
        :class="activeTab === 'invoices' ? 'btn-primary' : 'btn-secondary'"
        class="btn"
      >
        📄 الفواتير
      </button>
      <button
        @click="activeTab = 'expenses'"
        :class="activeTab === 'expenses' ? 'btn-primary' : 'btn-secondary'"
        class="btn"
      >
        💸 النفقات
      </button>
      <button
        @click="activeTab = 'budgets'"
        :class="activeTab === 'budgets' ? 'btn-primary' : 'btn-secondary'"
        class="btn"
      >
        📊 الميزانيات
      </button>
      <button
        @click="activeTab = 'payments'"
        :class="activeTab === 'payments' ? 'btn-primary' : 'btn-secondary'"
        class="btn"
      >
        💳 الدفعات
      </button>
    </div>

    <!-- تبويب الفواتير -->
    <div v-if="activeTab === 'invoices'" class="space-y-6">
      <div class="card p-6">
        <h2 class="text-xl font-bold mb-4">📄 إنشاء فاتورة جديدة</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input v-model="invoiceForm.clientName" class="input" placeholder="اسم العميل" />
          <input v-model="invoiceForm.clientEmail" class="input" placeholder="البريد الإلكتروني" />
          <input v-model.number="invoiceForm.amount" class="input" placeholder="المبلغ" type="number" />
          <input v-model="invoiceForm.dueDate" class="input" placeholder="تاريخ الاستحقاق" type="date" />
        </div>
        <button @click="createInvoice" class="btn btn-primary">
          ➕ إنشاء فاتورة
        </button>
      </div>

      <div class="card p-6">
        <h2 class="text-xl font-bold mb-4">📋 قائمة الفواتير</h2>
        <div class="overflow-x-auto">
          <table class="table w-full">
            <thead>
              <tr>
                <th>رقم الفاتورة</th>
                <th>العميل</th>
                <th>المبلغ</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="invoice in invoices" :key="invoice._id">
                <td>{{ invoice.invoiceNumber }}</td>
                <td>{{ invoice.clientName }}</td>
                <td>{{ invoice.amount }} ريال</td>
                <td>
                  <span :class="getBadgeClass(invoice.status)" class="badge">
                    {{ invoice.status }}
                  </span>
                </td>
                <td>
                  <button @click="markInvoiceAsPaid(invoice._id)" class="text-blue-600 hover:underline text-sm mr-2">
                    دفع
                  </button>
                  <button @click="deleteInvoice(invoice._id)" class="text-red-600 hover:underline text-sm">
                    حذف
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- تبويب النفقات -->
    <div v-if="activeTab === 'expenses'" class="space-y-6">
      <div class="card p-6">
        <h2 class="text-xl font-bold mb-4">💸 تسجيل نفقة جديدة</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <select v-model="expenseForm.category" class="input">
            <option value="">اختر الفئة</option>
            <option value="salary">الرواتب</option>
            <option value="utilities">الخدمات</option>
            <option value="materials">المواد</option>
            <option value="supplies">التوريدات</option>
            <option value="other">أخرى</option>
          </select>
          <input v-model="expenseForm.description" class="input" placeholder="الوصف" />
          <input v-model.number="expenseForm.amount" class="input" placeholder="المبلغ" type="number" />
          <input v-model="expenseForm.vendor" class="input" placeholder="المورد" />
        </div>
        <button @click="createExpense" class="btn btn-primary">
          ➕ تسجيل نفقة
        </button>
      </div>

      <div class="card p-6">
        <h2 class="text-xl font-bold mb-4">📊 النفقات حسب الفئة</h2>
        <div class="space-y-2">
          <div v-for="(amount, category) in expenseStats.byCategory" :key="category" class="flex items-center">
            <span class="w-32">{{ category }}</span>
            <div class="flex-1 bg-gray-200 rounded-full h-6"></div>
            <span class="w-24 text-right font-semibold">{{ amount }} ريال</span>
          </div>
        </div>
      </div>
    </div>

    <!-- تبويب الميزانيات -->
    <div v-if="activeTab === 'budgets'" class="card p-6">
      <h2 class="text-xl font-bold mb-4">📊 الميزانية الحالية</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-blue-50 p-4 rounded-lg">
          <p class="text-gray-600">إجمالي الميزانية</p>
          <p class="text-2xl font-bold text-blue-600">{{ currentBudget?.totalBudget || 0 }} ريال</p>
        </div>
        <div class="bg-green-50 p-4 rounded-lg">
          <p class="text-gray-600">النفقات المنفذة</p>
          <p class="text-2xl font-bold text-green-600">{{ financeSummary.totalExpenses }} ريال</p>
        </div>
        <div class="bg-orange-50 p-4 rounded-lg">
          <p class="text-gray-600">المتبقي</p>
          <p class="text-2xl font-bold text-orange-600">
            {{ (currentBudget?.totalBudget || 0) - (financeSummary.totalExpenses || 0) }} ريال
          </p>
        </div>
      </div>
    </div>

    <!-- تبويب الدفعات -->
    <div v-if="activeTab === 'payments'" class="card p-6">
      <h2 class="text-xl font-bold mb-4">💳 سجل الدفعات</h2>
      <div class="overflow-x-auto">
        <table class="table w-full">
          <thead>
            <tr>
              <th>رقم الدفعة</th>
              <th>رقم الفاتورة</th>
              <th>المبلغ</th>
              <th>الطريقة</th>
              <th>التاريخ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="payment in payments" :key="payment._id">
              <td>{{ payment.paymentNumber }}</td>
              <td>{{ payment.invoiceId }}</td>
              <td>{{ payment.amount }} ريال</td>
              <td>{{ payment.method }}</td>
              <td>{{ new Date(payment.date).toLocaleDateString('ar-EG') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- رسالة التحميل -->
    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-600">جاري التحميل...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import api from '@/services/api'

const toast = useToast()
const activeTab = ref('invoices')
const loading = ref(false)

const financeSummary = ref({})
const invoices = ref([])
const payments = ref([])
const expenseStats = ref({ byCategory: {} })
const currentBudget = ref({})

const invoiceForm = ref({
  clientName: '',
  clientEmail: '',
  amount: null,
  dueDate: ''
})

const expenseForm = ref({
  category: '',
  description: '',
  amount: null,
  vendor: ''
})

const loadFinanceSummary = async () => {
  try {
    const response = await api.get('/finance/summary')
    financeSummary.value = response.data.data
  } catch (error) {
    console.error('خطأ في تحميل الملخص المالي:', error)
  }
}

const loadInvoices = async () => {
  try {
    const response = await api.get('/finance/invoices')
    invoices.value = response.data.data
  } catch (error) {
    toast.error('فشل في تحميل الفواتير')
  }
}

const loadExpenses = async () => {
  try {
    const response = await api.get('/finance/expenses')
    expenseStats.value = response.data.data
  } catch (error) {
    toast.error('فشل في تحميل النفقات')
  }
}

const loadPayments = async () => {
  try {
    const response = await api.get('/finance/payments')
    payments.value = response.data.data.payments || []
  } catch (error) {
    toast.error('فشل في تحميل الدفعات')
  }
}

const loadCurrentBudget = async () => {
  try {
    const response = await api.get('/finance/budgets/current')
    currentBudget.value = response.data.data
  } catch (error) {
    console.error('خطأ في تحميل الميزانية:', error)
  }
}

const createInvoice = async () => {
  try {
    if (!invoiceForm.value.clientName || !invoiceForm.value.amount) {
      toast.error('يرجى ملء جميع الحقول المطلوبة')
      return
    }

    await api.post('/finance/invoices', invoiceForm.value)
    toast.success('تم إنشاء الفاتورة بنجاح')
    
    invoiceForm.value = { clientName: '', clientEmail: '', amount: null, dueDate: '' }
    await loadInvoices()
    await loadFinanceSummary()
  } catch (error) {
    toast.error('فشل في إنشاء الفاتورة')
  }
}

const createExpense = async () => {
  try {
    if (!expenseForm.value.category || !expenseForm.value.amount) {
      toast.error('يرجى ملء جميع الحقول المطلوبة')
      return
    }

    await api.post('/finance/expenses', expenseForm.value)
    toast.success('تم تسجيل النفقة بنجاح')
    
    expenseForm.value = { category: '', description: '', amount: null, vendor: '' }
    await loadExpenses()
    await loadFinanceSummary()
  } catch (error) {
    toast.error('فشل في تسجيل النفقة')
  }
}

const markInvoiceAsPaid = async (invoiceId) => {
  try {
    await api.put(`/finance/invoices/${invoiceId}`, { status: 'paid' })
    toast.success('تم تحديث حالة الفاتورة')
    await loadInvoices()
    await loadFinanceSummary()
  } catch (error) {
    toast.error('فشل في تحديث الفاتورة')
  }
}

const deleteInvoice = async (invoiceId) => {
  try {
    await api.delete(`/finance/invoices/${invoiceId}`)
    toast.success('تم حذف الفاتورة')
    await loadInvoices()
    await loadFinanceSummary()
  } catch (error) {
    toast.error('فشل في حذف الفاتورة')
  }
}

const getBadgeClass = (status) => {
  const classes = {
    'paid': 'bg-green-100 text-green-800',
    'pending': 'bg-yellow-100 text-yellow-800',
    'overdue': 'bg-red-100 text-red-800'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}

onMounted(() => {
  loading.value = true
  Promise.all([
    loadFinanceSummary(),
    loadInvoices(),
    loadExpenses(),
    loadPayments(),
    loadCurrentBudget()
  ]).finally(() => {
    loading.value = false
  })
})
</script>
