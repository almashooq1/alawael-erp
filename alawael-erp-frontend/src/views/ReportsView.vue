<template>
  <div class="p-6">
    <!-- رأس الصفحة -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">📊 التقارير والإحصائيات</h1>
      <p class="text-gray-600">عرض شامل للبيانات والإحصائيات</p>
    </div>

    <!-- الخيارات -->
    <div class="mb-6 flex flex-wrap gap-2">
      <button
        @click="selectedReport = 'employees'"
        :class="selectedReport === 'employees' ? 'btn-primary' : 'btn-secondary'"
        class="btn"
      >
        👥 الموظفين
      </button>
      <button
        @click="selectedReport = 'attendance'"
        :class="selectedReport === 'attendance' ? 'btn-primary' : 'btn-secondary'"
        class="btn"
      >
        📋 الحضور
      </button>
      <button
        @click="selectedReport = 'leaves'"
        :class="selectedReport === 'leaves' ? 'btn-primary' : 'btn-secondary'"
        class="btn"
      >
        🏖️ الإجازات
      </button>
      <button @click="loadDashboard" class="btn btn-info">
        📈 لوحة البيانات
      </button>
    </div>

    <!-- لوحة البيانات -->
    <div v-if="selectedReport === 'dashboard'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div class="card p-4 bg-blue-50">
        <p class="text-gray-600 text-sm mb-2">إجمالي الموظفين</p>
        <p class="text-3xl font-bold text-blue-600">{{ dashboard.employees?.total || 0 }}</p>
      </div>
      <div class="card p-4 bg-green-50">
        <p class="text-gray-600 text-sm mb-2">الموظفين النشطين</p>
        <p class="text-3xl font-bold text-green-600">{{ dashboard.employees?.active || 0 }}</p>
      </div>
      <div class="card p-4 bg-orange-50">
        <p class="text-gray-600 text-sm mb-2">الحاضرين اليوم</p>
        <p class="text-3xl font-bold text-orange-600">{{ dashboard.attendance?.present || 0 }}</p>
      </div>
      <div class="card p-4 bg-purple-50">
        <p class="text-gray-600 text-sm mb-2">الإجازات المعلقة</p>
        <p class="text-3xl font-bold text-purple-600">{{ dashboard.leaves?.pending || 0 }}</p>
      </div>
    </div>

    <!-- تقرير الموظفين -->
    <div v-if="selectedReport === 'employees'" class="card p-6 mb-6">
      <h2 class="text-xl font-bold mb-4">👥 ملخص الموظفين</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="bg-blue-50 p-4 rounded-lg">
          <p class="text-gray-600">الإجمالي</p>
          <p class="text-2xl font-bold text-blue-600">{{ employeeSummary.total || 0 }}</p>
        </div>
        <div class="bg-green-50 p-4 rounded-lg">
          <p class="text-gray-600">نشط</p>
          <p class="text-2xl font-bold text-green-600">{{ employeeSummary.byStatus?.active || 0 }}</p>
        </div>
        <div class="bg-red-50 p-4 rounded-lg">
          <p class="text-gray-600">غير نشط</p>
          <p class="text-2xl font-bold text-red-600">{{ employeeSummary.byStatus?.inactive || 0 }}</p>
        </div>
      </div>

      <div class="mb-6">
        <h3 class="font-semibold mb-3">توزيع الموظفين حسب القسم</h3>
        <div class="space-y-2">
          <div v-for="(count, dept) in employeeSummary.byDepartment" :key="dept" class="flex items-center">
            <span class="w-32">{{ dept }}</span>
            <div class="flex-1 bg-gray-200 rounded-full h-6 flex items-center px-2">
              <div class="bg-blue-500 h-full rounded-full" :style="{ width: (count / employeeSummary.total * 100) + '%' }"></div>
            </div>
            <span class="w-12 text-right font-semibold">{{ count }}</span>
          </div>
        </div>
      </div>

      <div>
        <button @click="exportReport('employees', 'excel')" class="btn btn-primary mr-2">
          📥 تصدير Excel
        </button>
        <button @click="exportReport('employees', 'pdf')" class="btn btn-secondary">
          📄 تصدير PDF
        </button>
      </div>
    </div>

    <!-- تقرير الحضور -->
    <div v-if="selectedReport === 'attendance'" class="card p-6 mb-6">
      <h2 class="text-xl font-bold mb-4">📋 ملخص الحضور</h2>
      
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-green-50 p-4 rounded-lg">
          <p class="text-gray-600 text-sm">حاضر</p>
          <p class="text-2xl font-bold text-green-600">{{ attendanceStats.byStatus?.present || 0 }}</p>
        </div>
        <div class="bg-red-50 p-4 rounded-lg">
          <p class="text-gray-600 text-sm">غياب</p>
          <p class="text-2xl font-bold text-red-600">{{ attendanceStats.byStatus?.absent || 0 }}</p>
        </div>
        <div class="bg-yellow-50 p-4 rounded-lg">
          <p class="text-gray-600 text-sm">متأخر</p>
          <p class="text-2xl font-bold text-yellow-600">{{ attendanceStats.byStatus?.late || 0 }}</p>
        </div>
        <div class="bg-blue-50 p-4 rounded-lg">
          <p class="text-gray-600 text-sm">إجمالي</p>
          <p class="text-2xl font-bold text-blue-600">{{ attendanceStats.total || 0 }}</p>
        </div>
      </div>

      <button @click="exportReport('attendance', 'excel')" class="btn btn-primary">
        📥 تصدير Excel
      </button>
    </div>

    <!-- تقرير الإجازات -->
    <div v-if="selectedReport === 'leaves'" class="card p-6">
      <h2 class="text-xl font-bold mb-4">🏖️ ملخص الإجازات</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="bg-yellow-50 p-4 rounded-lg">
          <p class="text-gray-600">معلقة</p>
          <p class="text-2xl font-bold text-yellow-600">{{ leaveStats.pending || 0 }}</p>
        </div>
        <div class="bg-green-50 p-4 rounded-lg">
          <p class="text-gray-600">موافق عليها</p>
          <p class="text-2xl font-bold text-green-600">{{ leaveStats.approved || 0 }}</p>
        </div>
        <div class="bg-red-50 p-4 rounded-lg">
          <p class="text-gray-600">مرفوضة</p>
          <p class="text-2xl font-bold text-red-600">{{ leaveStats.rejected || 0 }}</p>
        </div>
      </div>

      <button @click="exportReport('leaves', 'excel')" class="btn btn-primary">
        📥 تصدير Excel
      </button>
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
const selectedReport = ref('dashboard')
const loading = ref(false)

const employeeSummary = ref({})
const attendanceStats = ref({})
const leaveStats = ref({})
const dashboard = ref({})

const loadDashboard = async () => {
  try {
    loading.value = true
    selectedReport.value = 'dashboard'
    const response = await api.get('/reports/dashboard')
    dashboard.value = response.data.data
  } catch (error) {
    toast.error('فشل في تحميل لوحة البيانات')
    console.error(error)
  } finally {
    loading.value = false
  }
}

const loadEmployeeSummary = async () => {
  try {
    const response = await api.get('/reports/employee-summary')
    employeeSummary.value = response.data.data
  } catch (error) {
    toast.error('فشل في تحميل ملخص الموظفين')
  }
}

const loadAttendanceStats = async () => {
  try {
    const response = await api.get('/reports/attendance-stats')
    attendanceStats.value = response.data.data
  } catch (error) {
    toast.error('فشل في تحميل إحصائيات الحضور')
  }
}

const loadLeaveStats = async () => {
  try {
    const response = await api.get('/reports/leave-stats')
    leaveStats.value = response.data.data
  } catch (error) {
    toast.error('فشل في تحميل إحصائيات الإجازات')
  }
}

const exportReport = async (type, format) => {
  try {
    const endpoint = format === 'excel' 
      ? `/reports/export-excel/${type}`
      : `/reports/export-pdf/${type}`
    
    const response = await api.get(endpoint, { responseType: 'blob' })
    
    // إنشاء رابط التنزيل
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `report-${type}-${Date.now()}.${format === 'excel' ? 'xlsx' : 'pdf'}`)
    document.body.appendChild(link)
    link.click()
    link.parentNode.removeChild(link)
    
    toast.success('تم تنزيل التقرير بنجاح')
  } catch (error) {
    toast.error('فشل في تنزيل التقرير')
    console.error(error)
  }
}

onMounted(() => {
  loadDashboard()
  loadEmployeeSummary()
  loadAttendanceStats()
  loadLeaveStats()
})
</script>
