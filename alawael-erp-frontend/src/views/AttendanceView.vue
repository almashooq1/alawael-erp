<template>
  <div>
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900">تسجيل الحضور والغياب</h1>
      <p class="text-gray-600 mt-2">سجل حضور الموظفين</p>
    </div>

    <!-- Date Selector -->
    <div class="card mb-6">
      <div class="flex gap-4">
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-700 mb-2">التاريخ</label>
          <input v-model="selectedDate" type="date" class="input" />
        </div>
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-700 mb-2">القسم</label>
          <select v-model="selectedDepartment" class="input">
            <option value="">جميع الأقسام</option>
            <option value="hr">الموارد البشرية</option>
            <option value="finance">المالية</option>
            <option value="operations">العمليات</option>
            <option value="it">تكنولوجيا المعلومات</option>
            <option value="marketing">التسويق</option>
          </select>
        </div>
        <div class="flex items-end">
          <button @click="fetchAttendance" class="btn btn-primary">
            🔍 بحث
          </button>
        </div>
      </div>
    </div>

    <!-- Summary -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="card">
        <p class="text-gray-600 text-sm">الحاضرون</p>
        <p class="text-3xl font-bold text-green-600 mt-2">{{ presentCount }}</p>
      </div>
      <div class="card">
        <p class="text-gray-600 text-sm">الغائبون</p>
        <p class="text-3xl font-bold text-red-600 mt-2">{{ absentCount }}</p>
      </div>
      <div class="card">
        <p class="text-gray-600 text-sm">المتأخرون</p>
        <p class="text-3xl font-bold text-yellow-600 mt-2">{{ lateCount }}</p>
      </div>
      <div class="card">
        <p class="text-gray-600 text-sm">نصف يوم</p>
        <p class="text-3xl font-bold text-blue-600 mt-2">{{ halfDayCount }}</p>
      </div>
    </div>

    <!-- Employees Table -->
    <div class="card overflow-hidden">
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>

      <div v-else-if="filteredEmployees.length === 0" class="text-center py-12">
        <p class="text-gray-500 text-lg">لا يوجد موظفون</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="table">
          <thead>
            <tr>
              <th>الموظف</th>
              <th>القسم</th>
              <th>المنصب</th>
              <th>وقت الدخول</th>
              <th>وقت الخروج</th>
              <th>الحالة</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="employee in filteredEmployees" :key="employee._id">
              <td>{{ employee.fullName }}</td>
              <td>{{ getDepartmentLabel(employee.department) }}</td>
              <td>{{ employee.position }}</td>
              <td>
                <input
                  v-model="attendanceData[employee._id]?.checkIn"
                  type="time"
                  class="input w-24"
                />
              </td>
              <td>
                <input
                  v-model="attendanceData[employee._id]?.checkOut"
                  type="time"
                  class="input w-24"
                />
              </td>
              <td>
                <select v-model="attendanceData[employee._id].status" class="input">
                  <option value="present">حاضر</option>
                  <option value="absent">غائب</option>
                  <option value="late">متأخر</option>
                  <option value="half_day">نصف يوم</option>
                </select>
              </td>
              <td>
                <button
                  @click="saveAttendance(employee._id)"
                  class="text-blue-600 hover:text-blue-800"
                  title="حفظ"
                >
                  💾
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Save All Button -->
      <div v-if="filteredEmployees.length > 0" class="px-6 py-4 border-t">
        <button @click="saveAllAttendance" :disabled="submitting" class="btn btn-primary">
          {{ submitting ? 'جاري الحفظ...' : '💾 حفظ الكل' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import { useToast } from 'vue-toastification'

const toast = useToast()
const authStore = useAuthStore()

const employees = ref([])
const loading = ref(false)
const submitting = ref(false)
const selectedDate = ref(new Date().toISOString().split('T')[0])
const selectedDepartment = ref('')
const attendanceData = ref({})

const filteredEmployees = computed(() => {
  let filtered = employees.value

  if (selectedDepartment.value) {
    filtered = filtered.filter(e => e.department === selectedDepartment.value)
  }

  return filtered
})

const presentCount = computed(() => {
  return Object.values(attendanceData.value).filter(a => a.status === 'present').length
})

const absentCount = computed(() => {
  return Object.values(attendanceData.value).filter(a => a.status === 'absent').length
})

const lateCount = computed(() => {
  return Object.values(attendanceData.value).filter(a => a.status === 'late').length
})

const halfDayCount = computed(() => {
  return Object.values(attendanceData.value).filter(a => a.status === 'half_day').length
})

const fetchAttendance = async () => {
  loading.value = true
  try {
    const empResponse = await api.get('/employees')
    employees.value = empResponse.data.data

    // Initialize attendance data
    attendanceData.value = {}
    employees.value.forEach(emp => {
      attendanceData.value[emp._id] = {
        employeeId: emp._id,
        date: selectedDate.value,
        status: 'present',
        checkIn: '',
        checkOut: ''
      }
    })
  } catch (error) {
    toast.error('فشل تحميل البيانات')
  } finally {
    loading.value = false
  }
}

const saveAttendance = async (employeeId) => {
  try {
    const data = attendanceData.value[employeeId]
    await api.post('/hr/attendance', data)
    toast.success('تم حفظ الحضور')
  } catch (error) {
    toast.error('فشل حفظ الحضور')
  }
}

const saveAllAttendance = async () => {
  submitting.value = true
  try {
    for (const empId of Object.keys(attendanceData.value)) {
      const data = attendanceData.value[empId]
      if (data.status) {
        await api.post('/hr/attendance', data)
      }
    }
    toast.success('تم حفظ جميع البيانات')
    await fetchAttendance()
  } catch (error) {
    toast.error('فشل حفظ البيانات')
  } finally {
    submitting.value = false
  }
}

const getDepartmentLabel = (dept) => {
  const labels = {
    hr: 'الموارد البشرية',
    finance: 'المالية',
    operations: 'العمليات',
    it: 'تكنولوجيا المعلومات',
    marketing: 'التسويق'
  }
  return labels[dept] || dept
}

onMounted(() => {
  fetchAttendance()
})
</script>
