import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import { useToast } from 'vue-toastification'

const toast = useToast()

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const accessToken = ref(localStorage.getItem('accessToken') || null)
  const refreshToken = ref(localStorage.getItem('refreshToken') || null)
  const loading = ref(false)

  const isAuthenticated = computed(() => !!accessToken.value)

  const setTokens = (access, refresh) => {
    accessToken.value = access
    refreshToken.value = refresh
    localStorage.setItem('accessToken', access)
    if (refresh) {
      localStorage.setItem('refreshToken', refresh)
    }
  }

  const clearTokens = () => {
    accessToken.value = null
    refreshToken.value = null
    user.value = null
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  }

  const login = async (email, password) => {
    try {
      loading.value = true
      const response = await api.post('/auth/login', { email, password })
      
      setTokens(response.data.data.accessToken, response.data.data.refreshToken)
      user.value = response.data.data.user
      
      toast.success('تم تسجيل الدخول بنجاح')
      return true
    } catch (error) {
      toast.error(error.response?.data?.message || 'فشل تسجيل الدخول')
      return false
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      clearTokens()
      toast.info('تم تسجيل الخروج')
    }
  }

  const fetchProfile = async () => {
    try {
      const response = await api.get('/users/me')
      user.value = response.data.data
    } catch (error) {
      if (error.response?.status === 401) {
        clearTokens()
      }
    }
  }

  const checkAuth = async () => {
    if (accessToken.value) {
      await fetchProfile()
    }
  }

  const updateProfile = async (data) => {
    try {
      loading.value = true
      const response = await api.put('/users/me', data)
      user.value = response.data.data
      toast.success('تم تحديث الملف الشخصي')
      return true
    } catch (error) {
      toast.error(error.response?.data?.message || 'فشل تحديث الملف الشخصي')
      return false
    } finally {
      loading.value = false
    }
  }

  const changePassword = async (currentPassword, newPassword) => {
    try {
      loading.value = true
      await api.put('/users/me/password', { currentPassword, newPassword })
      toast.success('تم تغيير كلمة المرور بنجاح')
      return true
    } catch (error) {
      toast.error(error.response?.data?.message || 'فشل تغيير كلمة المرور')
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    accessToken,
    loading,
    isAuthenticated,
    login,
    logout,
    fetchProfile,
    checkAuth,
    updateProfile,
    changePassword,
    setTokens
  }
})
