<template>
  <div>
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900">الملف الشخصي</h1>
      <p class="text-gray-600 mt-2">إدارة معلوماتك الشخصية</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Profile Card -->
      <div class="card text-center">
        <div class="w-24 h-24 bg-primary-600 rounded-full flex items-center justify-center text-white text-4xl font-bold mx-auto mb-4">
          {{ authStore.user?.fullName?.charAt(0) || 'A' }}
        </div>
        <h2 class="text-2xl font-bold text-gray-900">{{ authStore.user?.fullName }}</h2>
        <p class="text-gray-600 mt-2">{{ authStore.user?.email }}</p>
        <span :class="['badge inline-block mt-4', authStore.user?.role === 'admin' ? 'badge-success' : 'badge-info']">
          {{ authStore.user?.role === 'admin' ? 'مدير' : 'مستخدم' }}
        </span>
        <div class="mt-6 pt-6 border-t text-right space-y-2">
          <p class="text-sm text-gray-600">
            <strong>تاريخ التسجيل:</strong> {{ formatDate(authStore.user?.createdAt) }}
          </p>
          <p class="text-sm text-gray-600">
            <strong>آخر تحديث:</strong> {{ formatDate(authStore.user?.updatedAt) }}
          </p>
        </div>
      </div>

      <!-- Main Content -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Update Profile Form -->
        <div class="card">
          <h3 class="text-xl font-bold mb-6">تحديث المعلومات الشخصية</h3>
          <form @submit.prevent="handleUpdateProfile" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">الاسم الكامل</label>
              <input
                v-model="profileForm.fullName"
                type="text"
                required
                class="input"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
              <input
                v-model="profileForm.email"
                type="email"
                disabled
                class="input bg-gray-100 cursor-not-allowed"
              />
              <p class="text-xs text-gray-500 mt-1">لا يمكن تعديل البريد الإلكتروني</p>
            </div>

            <button
              type="submit"
              :disabled="authStore.loading"
              class="btn btn-primary w-full"
            >
              {{ authStore.loading ? 'جاري الحفظ...' : 'حفظ التغييرات' }}
            </button>
          </form>
        </div>

        <!-- Change Password Form -->
        <div class="card">
          <h3 class="text-xl font-bold mb-6">تغيير كلمة المرور</h3>
          <form @submit.prevent="handleChangePassword" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">كلمة المرور الحالية</label>
              <input
                v-model="passwordForm.currentPassword"
                type="password"
                required
                class="input"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">كلمة المرور الجديدة</label>
              <input
                v-model="passwordForm.newPassword"
                type="password"
                required
                minlength="8"
                class="input"
              />
              <p class="text-xs text-gray-500 mt-1">يجب أن تكون 8 أحرف على الأقل</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">تأكيد كلمة المرور</label>
              <input
                v-model="passwordForm.confirmPassword"
                type="password"
                required
                minlength="8"
                class="input"
                :class="{ 'border-red-500': passwordMismatch }"
              />
              <p v-if="passwordMismatch" class="text-xs text-red-600 mt-1">
                كلمتا المرور غير متطابقتين
              </p>
            </div>

            <button
              type="submit"
              :disabled="authStore.loading || passwordMismatch"
              class="btn btn-primary w-full"
            >
              {{ authStore.loading ? 'جاري التحديث...' : 'تغيير كلمة المرور' }}
            </button>
          </form>
        </div>

        <!-- Danger Zone -->
        <div class="card border-red-200">
          <h3 class="text-xl font-bold text-red-600 mb-4">منطقة الخطر</h3>
          <p class="text-sm text-gray-600 mb-4">
            احذر! هذه الإجراءات لا يمكن التراجع عنها
          </p>
          <button
            @click="confirmDeleteAccount"
            class="btn btn-danger"
          >
            🗑️ حذف الحساب
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Account Confirmation Modal -->
    <div
      v-if="showDeleteModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="showDeleteModal = false"
    >
      <div class="bg-white rounded-lg max-w-md w-full p-6">
        <h2 class="text-2xl font-bold text-red-600 mb-4">⚠️ تأكيد حذف الحساب</h2>
        <p class="text-gray-700 mb-4">
          هذا الإجراء <strong>لا يمكن التراجع عنه</strong>. سيتم حذف جميع بياناتك نهائياً.
        </p>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            اكتب "حذف" للتأكيد
          </label>
          <input
            v-model="deleteConfirmation"
            type="text"
            class="input"
            placeholder="حذف"
          />
        </div>
        <div class="flex gap-3">
          <button
            @click="handleDeleteAccount"
            :disabled="deleteConfirmation !== 'حذف'"
            class="btn btn-danger flex-1"
          >
            حذف الحساب نهائياً
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
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import { useToast } from 'vue-toastification'

const toast = useToast()
const router = useRouter()
const authStore = useAuthStore()

const profileForm = ref({
  fullName: '',
  email: ''
})

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const showDeleteModal = ref(false)
const deleteConfirmation = ref('')

const passwordMismatch = computed(() =>
  passwordForm.value.newPassword &&
  passwordForm.value.confirmPassword &&
  passwordForm.value.newPassword !== passwordForm.value.confirmPassword
)

const loadProfile = () => {
  if (authStore.user) {
    profileForm.value = {
      fullName: authStore.user.fullName,
      email: authStore.user.email
    }
  }
}

const handleUpdateProfile = async () => {
  const success = await authStore.updateProfile({
    fullName: profileForm.value.fullName
  })
  
  if (success) {
    loadProfile()
  }
}

const handleChangePassword = async () => {
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    toast.error('كلمتا المرور غير متطابقتين')
    return
  }

  const success = await authStore.changePassword(
    passwordForm.value.currentPassword,
    passwordForm.value.newPassword
  )

  if (success) {
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  }
}

const confirmDeleteAccount = () => {
  showDeleteModal.value = true
  deleteConfirmation.value = ''
}

const handleDeleteAccount = async () => {
  if (deleteConfirmation.value !== 'حذف') {
    toast.error('يرجى كتابة "حذف" للتأكيد')
    return
  }

  try {
    await api.delete(`/users/${authStore.user._id}`)
    toast.success('تم حذف الحساب بنجاح')
    await authStore.logout()
    router.push('/login')
  } catch (error) {
    toast.error('فشل حذف الحساب')
  }
}

const formatDate = (date) => {
  if (!date) return 'غير متوفر'
  return new Date(date).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

onMounted(() => {
  loadProfile()
})
</script>
