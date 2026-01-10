import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    if (authStore.accessToken) {
      config.headers.Authorization = `Bearer ${authStore.accessToken}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const authStore = useAuthStore()
      const refreshToken = authStore.refreshToken

      if (refreshToken) {
        try {
          // Try to refresh the token
          const response = await axios.post('/api/auth/refresh', { refreshToken })
          const newAccessToken = response.data.data.accessToken
          
          authStore.setTokens(newAccessToken, refreshToken)
          
          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
          return api(originalRequest)
        } catch (refreshError) {
          // Refresh failed, logout user
          authStore.clearTokens()
          router.push('/login')
          return Promise.reject(refreshError)
        }
      } else {
        // No refresh token, redirect to login
        authStore.clearTokens()
        router.push('/login')
      }
    }

    return Promise.reject(error)
  }
)

export default api
