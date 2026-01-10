<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">إدارة الموظفين</h1>
        <p class="text-gray-600 mt-2">عرض وإدارة بيانات الموظفين</p>
      </div>
      <button @click="openCreateModal" class="btn btn-primary">
        ➕ إضافة موظف
      </button>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="card">
        <p class="text-gray-600 text-sm">إجمالي الموظفين</p>
        <p class="text-3xl font-bold text-primary-600 mt-2">{{ stats.total }}</p>
      </div>
      <div class="card">
        <p class="text-gray-600 text-sm">الموظفون النشطون</p>
        <p class="text-3xl font-bold text-green-600 mt-2">{{ stats.active }}</p>
      </div>
      <div class="card">
        <p class="text-gray-600 text-sm">غير النشطين</p>
        <p class="text-3xl font-bold text-red-600 mt-2">{{ stats.inactive }}</p>
      </div>
      <div class="card">
        <p class="text-gray-600 text-sm">متوسط الراتب</p>
        <p class="text-3xl font-bold text-blue-600 mt-2">{{ averageSalary }}</p>
      </div>
    </div>

    <!-- Search & Filters -->
    <div class="card mb-6">
      <div class="flex flex-col md:flex-row gap-4">
        <div class="flex-1">
          <input
            v-model="search"
            type="search"
            placeholder="بحث بالاسم أو البريد..."
            class="input"
            @input="handleSearch"
          />
        </div>
        <select v-model="departmentFilter" class="input md:w-40" @change="fetchEmployees">
          <option value="">جميع الأقسام</option>
          <option value="hr">الموارد البشرية</option>
          <option value="finance">المالية</option>
          <option value="operations">العمليات</option>
          <option value="it">تكنولوجيا المعلومات</option>
          <option value="marketing">التسويق</option>
        </select>
        <select v-model="statusFilter" class="input md:w-40" @change="fetchEmployees">
          <option value="">جميع الحالات</option>
          <option value="active">نشط</option>
          <option value="inactive">غير نشط</option>
          <option value="on_leave">في إجازة</option>
        </select>
        <button @click="fetchEmployees" class="btn btn-secondary md:w-32">
          🔄 تحديث
        </button>
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
              <th>الاسم</th>
              <th>البريد الإلكتروني</th>
              <th>القسم</th>
              <th>المنصب</th>
              <th>الهاتف</th>
              <th>الحالة</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="employee in paginatedEmployees" :key="employee._id">
              <td>
                <div class="flex items-center">
                  <div class="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold ml-3">
                    {{ employee.fullName?.charAt(0) || '?' }}
                  </div>
                  <span class="font-medium">{{ employee.fullName }}</span>
                </div>
              </td>
              <td class="text-sm">{{ employee.email }}</td>
              <td>
                <span class="badge badge-info">{{ getDepartmentLabel(employee.department) }}</span>
              </td>
              <td>{{ employee.position }}</td>
              <td class="text-sm">{{ employee.phone || '-' }}</td>
              <td>
                <span
                  :class="[
                    'badge',
                    employee.status === 'active' ? 'badge-success' : 'badge-warning'
                  ]"
                >
                  {{ getStatusLabel(employee.status) }}
                </span>
              </td>
              <td>
                <div class="flex gap-2">
                  <button
                    @click="openEditModal(employee)"
                    class="text-blue-600 hover:text-blue-800"
                    title="تعديل"
                  >
                    ✏️
                  </button>
                  <button
                    @click="confirmDelete(employee)"
                    class="text-red-600 hover:text-red-800"
                    title="حذف"
                  >
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-between px-6 py-4 border-t">
        <button
          @click="currentPage--"
          :disabled="currentPage === 1"
          class="btn btn-secondary"
        >
          السابق
        </button>
        <span>صفحة {{ currentPage }} من {{ totalPages }}</span>
        <button
          @click="currentPage++"
          :disabled="currentPage === totalPages"
          class="btn btn-secondary"
        >
          التالي
        </button>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="closeModal"
    >
      <div class="bg-white rounded-lg max-w-2xl w-full p-6 max-h-96 overflow-y-auto">
        <h2 class="text-2xl font-bold mb-6">
          {{ editingEmployee ? 'تعديل موظف' : 'إضافة موظف جديد' }}
        </h2>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">الاسم الكامل</label>
              <input v-model="formData.fullName" type="text" required class="input" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
              <input v-model="formData.email" type="email" required class="input" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">الهاتف</label>
              <input v-model="formData.phone" type="tel" class="input" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">رقم الهوية</label>
              <input v-model="formData.nationalId" type="text" class="input" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">القسم</label>
              <select v-model="formData.department" required class="input">
                <option value="">اختر القسم</option>
                <option value="hr">الموارد البشرية</option>
                <option value="finance">المالية</option>
                <option value="operations">العمليات</option>
                <option value="it">تكنولوجيا المعلومات</option>
                <option value="marketing">التسويق</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">المنصب</label>
              <input v-model="formData.position" type="text" required class="input" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">الراتب</label>
              <input v-model.number="formData.salary" type="number" class="input" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">الحالة</label>
              <select v-model="formData.status" class="input">
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
                <option value="on_leave">في إجازة</option>
              </select>
            </div>
          </div>

          <div class="flex gap-3 pt-4">
            <button type="submit" :disabled="submitting" class="btn btn-primary flex-1">
              {{ submitting ? 'جاري الحفظ...' : 'حفظ' }}
            </button>
            <button type="button" @click="closeModal" class="btn btn-secondary flex-1">
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Modal -->
    <div
      v-if="showDeleteModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="showDeleteModal = false"
    >
      <div class="bg-white rounded-lg max-w-md w-full p-6">
        <h2 class="text-2xl font-bold text-red-600 mb-4">تأكيد الحذف</h2>
        <p class="text-gray-700 mb-6">
          هل أنت متأكد من حذف الموظف <strong>{{ employeeToDelete?.fullName }}</strong>؟
        </p>
        <div class="flex gap-3">
          <button
            @click="handleDelete"
            :disabled="submitting"
            class="btn btn-danger flex-1"
          >
            {{ submitting ? 'جاري الحذف...' : 'حذف' }}
          </button>
          <button
            @click="showDeleteModal = false"
            class="btn btn-secondary flex-1"
          >
            إلغاء
          </button>
        </div>
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
const search = ref('')
const departmentFilter = ref('')
const statusFilter = ref('')
const currentPage = ref(1)
const pageSize = 10
const stats = ref({ total: 0, active: 0, inactive: 0 })

const showModal = ref(false)
const showDeleteModal = ref(false)
const editingEmployee = ref(null)
const employeeToDelete = ref(null)
const submitting = ref(false)

const formData = ref({
  fullName: '',
  email: '',
  phone: '',
  nationalId: '',
  department: '',
  position: '',
  salary: 0,
  status: 'active'
})

// Computed
const filteredEmployees = computed(() => {
  let filtered = employees.value

  if (search.value) {
    const searchLower = search.value.toLowerCase()
    filtered = filtered.filter(e =>
      e.fullName?.toLowerCase().includes(searchLower) ||
      e.email?.toLowerCase().includes(searchLower)
    )
  }

  if (departmentFilter.value) {
    filtered = filtered.filter(e => e.department === departmentFilter.value)
  }

  if (statusFilter.value) {
    filtered = filtered.filter(e => e.status === statusFilter.value)
  }

  return filtered
})

const totalPages = computed(() => Math.ceil(filteredEmployees.value.length / pageSize))
const paginatedEmployees = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredEmployees.value.slice(start, start + pageSize)
})

const averageSalary = computed(() => {
  if (employees.value.length === 0) return '0'
  const total = employees.value.reduce((sum, e) => sum + (e.salary || 0), 0)
  return (total / employees.value.length).toLocaleString('ar-EG')
})

// Methods
const fetchEmployees = async () => {
  loading.value = true
  try {
    const response = await api.get('/employees')
    employees.value = response.data.data

    // Get stats
    const statsResponse = await api.get('/employees/analytics/summary')
    stats.value = statsResponse.data.data
  } catch (error) {
    toast.error('فشل تحميل الموظفين')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
}

const openCreateModal = () => {
  editingEmployee.value = null
  formData.value = {
    fullName: '',
    email: '',
    phone: '',
    nationalId: '',
    department: '',
    position: '',
    salary: 0,
    status: 'active'
  }
  showModal.value = true
}

const openEditModal = (employee) => {
  editingEmployee.value = employee
  formData.value = { ...employee }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingEmployee.value = null
}

const handleSubmit = async () => {
  submitting.value = true
  try {
    if (editingEmployee.value) {
      await api.put(`/employees/${editingEmployee.value._id}`, formData.value)
      toast.success('تم تحديث الموظف بنجاح')
    } else {
      await api.post('/employees', formData.value)
      toast.success('تم إضافة الموظف بنجاح')
    }
    await fetchEmployees()
    closeModal()
  } catch (error) {
    toast.error(error.response?.data?.message || 'حدث خطأ')
  } finally {
    submitting.value = false
  }
}

const confirmDelete = (employee) => {
  employeeToDelete.value = employee
  showDeleteModal.value = true
}

const handleDelete = async () => {
  submitting.value = true
  try {
    await api.delete(`/employees/${employeeToDelete.value._id}`)
    toast.success('تم حذف الموظف بنجاح')
    await fetchEmployees()
    showDeleteModal.value = false
  } catch (error) {
    toast.error('فشل حذف الموظف')
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

const getStatusLabel = (status) => {
  const labels = {
    active: 'نشط',
    inactive: 'غير نشط',
    on_leave: 'في إجازة'
  }
  return labels[status] || status
}

onMounted(() => {
  fetchEmployees()
})
</script>
