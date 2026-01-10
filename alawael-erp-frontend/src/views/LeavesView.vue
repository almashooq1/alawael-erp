<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">طلبات الإجازات</h1>
        <p class="text-gray-600 mt-2">إدارة طلبات الإجازات الموظفين</p>
      </div>
      <button @click="openCreateModal" class="btn btn-primary">
        ➕ طلب إجازة جديدة
      </button>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="card">
        <p class="text-gray-600 text-sm">الطلبات المعلقة</p>
        <p class="text-3xl font-bold text-yellow-600 mt-2">{{ pendingCount }}</p>
      </div>
      <div class="card">
        <p class="text-gray-600 text-sm">الموافقة عليها</p>
        <p class="text-3xl font-bold text-green-600 mt-2">{{ approvedCount }}</p>
      </div>
      <div class="card">
        <p class="text-gray-600 text-sm">المرفوضة</p>
        <p class="text-3xl font-bold text-red-600 mt-2">{{ rejectedCount }}</p>
      </div>
      <div class="card">
        <p class="text-gray-600 text-sm">الإجمالي</p>
        <p class="text-3xl font-bold text-blue-600 mt-2">{{ leaves.length }}</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="card mb-6">
      <div class="flex flex-col md:flex-row gap-4">
        <select v-model="statusFilter" class="input flex-1" @change="filterLeaves">
          <option value="">جميع الحالات</option>
          <option value="pending">معلق</option>
          <option value="approved">موافق</option>
          <option value="rejected">مرفوض</option>
        </select>
        <select v-model="leaveTypeFilter" class="input flex-1" @change="filterLeaves">
          <option value="">جميع أنواع الإجازات</option>
          <option value="sick">مرض</option>
          <option value="vacation">إجازة سنوية</option>
          <option value="emergency">طارئة</option>
          <option value="maternity">الأمومة</option>
          <option value="unpaid">بدون راتب</option>
        </select>
        <button @click="fetchLeaves" class="btn btn-secondary md:w-32">🔄 تحديث</button>
      </div>
    </div>

    <!-- Leaves Table -->
    <div class="card overflow-hidden">
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>

      <div v-else-if="filteredLeaves.length === 0" class="text-center py-12">
        <p class="text-gray-500 text-lg">لا توجد طلبات إجازات</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="table">
          <thead>
            <tr>
              <th>الموظف</th>
              <th>نوع الإجازة</th>
              <th>من</th>
              <th>إلى</th>
              <th>الأيام</th>
              <th>السبب</th>
              <th>الحالة</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="leave in filteredLeaves" :key="leave._id">
              <td>{{ getEmployeeName(leave.employeeId) }}</td>
              <td>{{ getLeaveTypeLabel(leave.leaveType) }}</td>
              <td>{{ formatDate(leave.startDate) }}</td>
              <td>{{ formatDate(leave.endDate) }}</td>
              <td>{{ calculateDays(leave.startDate, leave.endDate) }}</td>
              <td>{{ leave.reason || '-' }}</td>
              <td>
                <span
                  :class="[
                    'badge',
                    leave.status === 'pending' ? 'badge-warning' :
                    leave.status === 'approved' ? 'badge-success' : 'badge-danger'
                  ]"
                >
                  {{ getStatusLabel(leave.status) }}
                </span>
              </td>
              <td v-if="authStore.user?.role === 'admin'">
                <div class="flex gap-2">
                  <button
                    v-if="leave.status === 'pending'"
                    @click="approveLeave(leave)"
                    class="text-green-600 hover:text-green-800"
                    title="الموافقة"
                  >
                    ✓
                  </button>
                  <button
                    v-if="leave.status === 'pending'"
                    @click="rejectLeave(leave)"
                    class="text-red-600 hover:text-red-800"
                    title="الرفض"
                  >
                    ✗
                  </button>
                  <button
                    v-if="leave.status === 'pending'"
                    @click="deleteLeave(leave)"
                    class="text-red-600 hover:text-red-800"
                    title="حذف"
                  >
                    🗑️
                  </button>
                </div>
              </td>
              <td v-else>
                <button
                  v-if="leave.status === 'pending'"
                  @click="deleteLeave(leave)"
                  class="text-red-600 hover:text-red-800"
                  title="حذف"
                >
                  🗑️
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="closeModal"
    >
      <div class="bg-white rounded-lg max-w-md w-full p-6">
        <h2 class="text-2xl font-bold mb-6">طلب إجازة جديدة</h2>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">نوع الإجازة</label>
            <select v-model="formData.leaveType" required class="input">
              <option value="">اختر النوع</option>
              <option value="sick">مرض</option>
              <option value="vacation">إجازة سنوية</option>
              <option value="emergency">طارئة</option>
              <option value="maternity">الأمومة</option>
              <option value="unpaid">بدون راتب</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">من</label>
            <input v-model="formData.startDate" type="date" required class="input" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">إلى</label>
            <input v-model="formData.endDate" type="date" required class="input" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">السبب</label>
            <textarea v-model="formData.reason" class="input h-20" placeholder="اكتب السبب..."></textarea>
          </div>

          <div class="flex gap-3 pt-4">
            <button type="submit" :disabled="submitting" class="btn btn-primary flex-1">
              {{ submitting ? 'جاري الإرسال...' : 'إرسال الطلب' }}
            </button>
            <button type="button" @click="closeModal" class="btn btn-secondary flex-1">
              إلغاء
            </button>
          </div>
        </form>
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

const leaves = ref([])
const employees = ref([])
const loading = ref(false)
const submitting = ref(false)
const showModal = ref(false)

const statusFilter = ref('')
const leaveTypeFilter = ref('')

const formData = ref({
  employeeId: '',
  leaveType: '',
  startDate: '',
  endDate: '',
  reason: ''
})

const filteredLeaves = computed(() => {
  let filtered = leaves.value

  if (statusFilter.value) {
    filtered = filtered.filter(l => l.status === statusFilter.value)
  }

  if (leaveTypeFilter.value) {
    filtered = filtered.filter(l => l.leaveType === leaveTypeFilter.value)
  }

  return filtered
})

const pendingCount = computed(() => leaves.value.filter(l => l.status === 'pending').length)
const approvedCount = computed(() => leaves.value.filter(l => l.status === 'approved').length)
const rejectedCount = computed(() => leaves.value.filter(l => l.status === 'rejected').length)

const fetchLeaves = async () => {
  loading.value = true
  try {
    const response = await api.get('/hr/leaves')
    leaves.value = response.data.data

    const empResponse = await api.get('/employees')
    employees.value = empResponse.data.data
  } catch (error) {
    toast.error('فشل تحميل الطلبات')
  } finally {
    loading.value = false
  }
}

const filterLeaves = () => {
  // التصفية تتم من خلال computed property
}

const openCreateModal = () => {
  formData.value = {
    employeeId: authStore.user?._id || '',
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: ''
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}

const handleSubmit = async () => {
  submitting.value = true
  try {
    await api.post('/hr/leaves', {
      ...formData.value,
      employeeId: authStore.user?._id
    })
    toast.success('تم إرسال الطلب بنجاح')
    await fetchLeaves()
    closeModal()
  } catch (error) {
    toast.error('فشل إرسال الطلب')
  } finally {
    submitting.value = false
  }
}

const approveLeave = async (leave) => {
  try {
    await api.patch(`/hr/leaves/${leave._id}/status`, { status: 'approved' })
    toast.success('تمت الموافقة على الإجازة')
    await fetchLeaves()
  } catch (error) {
    toast.error('فشل الموافقة على الإجازة')
  }
}

const rejectLeave = async (leave) => {
  try {
    await api.patch(`/hr/leaves/${leave._id}/status`, { status: 'rejected' })
    toast.success('تم رفض الإجازة')
    await fetchLeaves()
  } catch (error) {
    toast.error('فشل رفض الإجازة')
  }
}

const deleteLeave = async (leave) => {
  if (!confirm('هل أنت متأكد من حذف الطلب؟')) return

  try {
    await api.delete(`/hr/leaves/${leave._id}`)
    toast.success('تم حذف الطلب')
    await fetchLeaves()
  } catch (error) {
    toast.error('فشل حذف الطلب')
  }
}

const getEmployeeName = (employeeId) => {
  const employee = employees.value.find(e => e._id === employeeId)
  return employee?.fullName || 'موظف'
}

const getLeaveTypeLabel = (type) => {
  const labels = {
    sick: 'مرض',
    vacation: 'إجازة سنوية',
    emergency: 'طارئة',
    maternity: 'أمومة',
    unpaid: 'بدون راتب'
  }
  return labels[type] || type
}

const getStatusLabel = (status) => {
  const labels = {
    pending: 'معلق',
    approved: 'موافق عليه',
    rejected: 'مرفوض'
  }
  return labels[status] || status
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const calculateDays = (start, end) => {
  const s = new Date(start)
  const e = new Date(end)
  const days = Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1
  return days
}

onMounted(() => {
  fetchLeaves()
})
</script>
