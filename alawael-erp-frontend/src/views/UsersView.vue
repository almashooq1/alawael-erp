<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">إدارة المستخدمين</h1>
        <p class="text-gray-600 mt-2">عرض وإدارة جميع المستخدمين</p>
      </div>
      <button @click="openCreateModal" class="btn btn-primary">
        ➕ إضافة مستخدم
      </button>
    </div>

    <!-- Search & Filters -->
    <div class="card mb-6">
      <div class="flex flex-col md:flex-row gap-4">
        <div class="flex-1">
          <input
            v-model="search"
            type="search"
            placeholder="بحث بالاسم أو البريد الإلكتروني..."
            class="input"
            @input="handleSearch"
          />
        </div>
        <select v-model="roleFilter" class="input md:w-48" @change="fetchUsers">
          <option value="">جميع الأدوار</option>
          <option value="admin">مدير</option>
          <option value="user">مستخدم</option>
        </select>
        <button @click="fetchUsers" class="btn btn-secondary md:w-32">
          🔄 تحديث
        </button>
      </div>
    </div>

    <!-- Users Table -->
    <div class="card overflow-hidden">
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>

      <div v-else-if="filteredUsers.length === 0" class="text-center py-12">
        <p class="text-gray-500 text-lg">لا يوجد مستخدمون</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="table">
          <thead>
            <tr>
              <th>الاسم الكامل</th>
              <th>البريد الإلكتروني</th>
              <th>الدور</th>
              <th>الحالة</th>
              <th>تاريخ الإنشاء</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in paginatedUsers" :key="user._id">
              <td>
                <div class="flex items-center">
                  <div class="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold ml-3">
                    {{ user.fullName?.charAt(0) || '?' }}
                  </div>
                  <span class="font-medium">{{ user.fullName }}</span>
                </div>
              </td>
              <td>{{ user.email }}</td>
              <td>
                <span :class="['badge', user.role === 'admin' ? 'badge-success' : 'badge-info']">
                  {{ user.role === 'admin' ? 'مدير' : 'مستخدم' }}
                </span>
              </td>
              <td>
                <span class="badge badge-success">نشط</span>
              </td>
              <td>{{ formatDate(user.createdAt) }}</td>
              <td>
                <div class="flex gap-2">
                  <button
                    @click="openEditModal(user)"
                    class="text-blue-600 hover:text-blue-800 transition-colors"
                    title="تعديل"
                  >
                    ✏️
                  </button>
                  <button
                    @click="confirmDelete(user)"
                    class="text-red-600 hover:text-red-800 transition-colors"
                    :disabled="user._id === authStore.user?._id"
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
        <div class="text-sm text-gray-600">
          عرض {{ startIndex + 1 }} - {{ endIndex }} من {{ filteredUsers.length }}
        </div>
        <div class="flex gap-2">
          <button
            @click="currentPage--"
            :disabled="currentPage === 1"
            class="btn btn-secondary"
          >
            السابق
          </button>
          <span class="px-4 py-2 text-sm">
            صفحة {{ currentPage }} من {{ totalPages }}
          </span>
          <button
            @click="currentPage++"
            :disabled="currentPage === totalPages"
            class="btn btn-secondary"
          >
            التالي
          </button>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="closeModal"
    >
      <div class="bg-white rounded-lg max-w-md w-full p-6">
        <h2 class="text-2xl font-bold mb-6">
          {{ editingUser ? 'تعديل مستخدم' : 'إضافة مستخدم جديد' }}
        </h2>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">الاسم الكامل</label>
            <input v-model="formData.fullName" type="text" required class="input" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
            <input
              v-model="formData.email"
              type="email"
              required
              class="input"
              :disabled="editingUser"
            />
          </div>

          <div v-if="!editingUser">
            <label class="block text-sm font-medium text-gray-700 mb-2">كلمة المرور</label>
            <input v-model="formData.password" type="password" required class="input" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">الدور</label>
            <select v-model="formData.role" class="input">
              <option value="user">مستخدم</option>
              <option value="admin">مدير</option>
            </select>
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

    <!-- Delete Confirmation Modal -->
    <div
      v-if="showDeleteModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="showDeleteModal = false"
    >
      <div class="bg-white rounded-lg max-w-md w-full p-6">
        <h2 class="text-2xl font-bold text-red-600 mb-4">تأكيد الحذف</h2>
        <p class="text-gray-700 mb-6">
          هل أنت متأكد من حذف المستخدم <strong>{{ userToDelete?.fullName }}</strong>؟
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

const users = ref([])
const loading = ref(false)
const search = ref('')
const roleFilter = ref('')
const currentPage = ref(1)
const pageSize = 10

const showModal = ref(false)
const showDeleteModal = ref(false)
const editingUser = ref(null)
const userToDelete = ref(null)
const submitting = ref(false)

const formData = ref({
  fullName: '',
  email: '',
  password: '',
  role: 'user'
})

// Computed
const filteredUsers = computed(() => {
  let filtered = users.value

  if (search.value) {
    const searchLower = search.value.toLowerCase()
    filtered = filtered.filter(u =>
      u.fullName?.toLowerCase().includes(searchLower) ||
      u.email?.toLowerCase().includes(searchLower)
    )
  }

  if (roleFilter.value) {
    filtered = filtered.filter(u => u.role === roleFilter.value)
  }

  return filtered
})

const totalPages = computed(() => Math.ceil(filteredUsers.value.length / pageSize))
const startIndex = computed(() => (currentPage.value - 1) * pageSize)
const endIndex = computed(() => Math.min(startIndex.value + pageSize, filteredUsers.value.length))
const paginatedUsers = computed(() =>
  filteredUsers.value.slice(startIndex.value, endIndex.value)
)

// Methods
const fetchUsers = async () => {
  loading.value = true
  try {
    const response = await api.get('/users')
    users.value = response.data.data
  } catch (error) {
    toast.error('فشل تحميل المستخدمين')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
}

const openCreateModal = () => {
  editingUser.value = null
  formData.value = { fullName: '', email: '', password: '', role: 'user' }
  showModal.value = true
}

const openEditModal = (user) => {
  editingUser.value = user
  formData.value = {
    fullName: user.fullName,
    email: user.email,
    role: user.role
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingUser.value = null
}

const handleSubmit = async () => {
  submitting.value = true
  try {
    if (editingUser.value) {
      await api.put(`/users/${editingUser.value._id}`, {
        fullName: formData.value.fullName,
        role: formData.value.role
      })
      toast.success('تم تحديث المستخدم بنجاح')
    } else {
      await api.post('/users', formData.value)
      toast.success('تم إضافة المستخدم بنجاح')
    }
    await fetchUsers()
    closeModal()
  } catch (error) {
    toast.error(error.response?.data?.message || 'حدث خطأ')
  } finally {
    submitting.value = false
  }
}

const confirmDelete = (user) => {
  userToDelete.value = user
  showDeleteModal.value = true
}

const handleDelete = async () => {
  submitting.value = true
  try {
    await api.delete(`/users/${userToDelete.value._id}`)
    toast.success('تم حذف المستخدم بنجاح')
    await fetchUsers()
    showDeleteModal.value = false
  } catch (error) {
    toast.error(error.response?.data?.message || 'فشل حذف المستخدم')
  } finally {
    submitting.value = false
  }
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

onMounted(() => {
  fetchUsers()
})
</script>
