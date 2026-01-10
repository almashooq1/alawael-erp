<template>
  <div class="p-6">
    <!-- رأس الصفحة -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">🔔 الإشعارات والتنبيهات</h1>
      <p class="text-gray-600">إدارة الإخطارات والتنبيهات والتفضيلات</p>
    </div>

    <!-- الإحصائيات -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div class="card p-4 bg-blue-50">
        <p class="text-gray-600 text-sm mb-2">إجمالي الإشعارات</p>
        <p class="text-3xl font-bold text-blue-600">{{ totalNotifications }}</p>
      </div>
      <div class="card p-4 bg-orange-50">
        <p class="text-gray-600 text-sm mb-2">غير مقروءة</p>
        <p class="text-3xl font-bold text-orange-600">{{ unreadCount }}</p>
      </div>
      <div class="card p-4 bg-green-50">
        <p class="text-gray-600 text-sm mb-2">مقروءة</p>
        <p class="text-3xl font-bold text-green-600">{{ totalNotifications - unreadCount }}</p>
      </div>
    </div>

    <!-- الخيارات -->
    <div class="mb-6 flex flex-wrap gap-2">
      <button
        @click="activeTab = 'notifications'"
        :class="activeTab === 'notifications' ? 'btn-primary' : 'btn-secondary'"
        class="btn"
      >
        📬 الإشعارات
      </button>
      <button
        @click="activeTab = 'preferences'"
        :class="activeTab === 'preferences' ? 'btn-primary' : 'btn-secondary'"
        class="btn"
      >
        ⚙️ التفضيلات
      </button>
      <button
        @click="activeTab = 'send'"
        :class="activeTab === 'send' ? 'btn-primary' : 'btn-secondary'"
        class="btn"
      >
        ✉️ إرسال إشعار
      </button>
    </div>

    <!-- تبويب الإشعارات -->
    <div v-if="activeTab === 'notifications'" class="space-y-4">
      <div v-if="notifications.length === 0" class="card p-8 text-center">
        <p class="text-gray-600 text-lg">لا توجد إشعارات</p>
      </div>

      <div
        v-for="notification in notifications"
        :key="notification._id"
        class="card p-4 border-l-4"
        :class="notification.status === 'unread' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <h3 class="font-semibold text-gray-900">{{ notification.title }}</h3>
            <p class="text-gray-600 text-sm mt-1">{{ notification.message }}</p>
            <div class="flex items-center gap-2 mt-2">
              <span :class="getNotificationTypeClass(notification.type)" class="badge text-xs">
                {{ notification.type }}
              </span>
              <span class="text-gray-500 text-xs">
                {{ new Date(notification.createdAt).toLocaleDateString('ar-EG') }}
              </span>
            </div>
          </div>
          <button
            v-if="notification.status === 'unread'"
            @click="markAsRead(notification._id)"
            class="ml-4 text-blue-600 hover:underline text-sm whitespace-nowrap"
          >
            اقرأ
          </button>
        </div>
      </div>
    </div>

    <!-- تبويب التفضيلات -->
    <div v-if="activeTab === 'preferences'" class="card p-6">
      <h2 class="text-xl font-bold mb-6">⚙️ تفضيلات الإشعارات</h2>

      <div class="space-y-4">
        <div class="flex items-center justify-between pb-4 border-b">
          <div>
            <p class="font-semibold">تفعيل إشعارات البريد الإلكتروني</p>
            <p class="text-gray-600 text-sm">استقبال الإخطارات عبر البريد الإلكتروني</p>
          </div>
          <input
            v-model="preferences.emailNotifications"
            type="checkbox"
            class="w-6 h-6 rounded border-gray-300"
          />
        </div>

        <div class="flex items-center justify-between pb-4 border-b">
          <div>
            <p class="font-semibold">تفعيل إشعارات الرسائل النصية</p>
            <p class="text-gray-600 text-sm">استقبال الإخطارات عبر SMS</p>
          </div>
          <input
            v-model="preferences.smsNotifications"
            type="checkbox"
            class="w-6 h-6 rounded border-gray-300"
          />
        </div>

        <div class="flex items-center justify-between pb-4 border-b">
          <div>
            <p class="font-semibold">إشعارات حالة الإجازات</p>
            <p class="text-gray-600 text-sm">تنبيهات بتحديثات طلبات الإجازات</p>
          </div>
          <input
            v-model="preferences.leaveUpdates"
            type="checkbox"
            class="w-6 h-6 rounded border-gray-300"
          />
        </div>

        <div class="flex items-center justify-between pb-4 border-b">
          <div>
            <p class="font-semibold">تذكيرات الحضور</p>
            <p class="text-gray-600 text-sm">تذكيرات يومية لتسجيل الحضور</p>
          </div>
          <input
            v-model="preferences.attendanceReminders"
            type="checkbox"
            class="w-6 h-6 rounded border-gray-300"
          />
        </div>

        <div class="flex items-center justify-between pb-4 border-b">
          <div>
            <p class="font-semibold">إخطارات الموظفين الجدد</p>
            <p class="text-gray-600 text-sm">الإشعار عند إضافة موظفين جدد</p>
          </div>
          <input
            v-model="preferences.newHireAlerts"
            type="checkbox"
            class="w-6 h-6 rounded border-gray-300"
          />
        </div>

        <div class="flex items-center justify-between">
          <div>
            <p class="font-semibold">إخطارات الموافقات المالية</p>
            <p class="text-gray-600 text-sm">الإشعار بطلبات الموافقة على النفقات</p>
          </div>
          <input
            v-model="preferences.expenseApprovals"
            type="checkbox"
            class="w-6 h-6 rounded border-gray-300"
          />
        </div>
      </div>

      <button @click="savePreferences" class="btn btn-primary mt-6">
        💾 حفظ التفضيلات
      </button>
    </div>

    <!-- تبويب الإرسال -->
    <div v-if="activeTab === 'send'" class="card p-6">
      <h2 class="text-xl font-bold mb-6">✉️ إرسال إخطار جديد</h2>

      <div class="space-y-4 mb-6">
        <div>
          <label class="block text-sm font-semibold mb-2">نوع الإخطار</label>
          <select v-model="notificationForm.type" class="input w-full">
            <option value="info">ℹ️ معلومة</option>
            <option value="success">✅ نجاح</option>
            <option value="warning">⚠️ تحذير</option>
            <option value="error">❌ خطأ</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-semibold mb-2">الموضوع</label>
          <input v-model="notificationForm.title" class="input w-full" placeholder="موضوع الإخطار" />
        </div>

        <div>
          <label class="block text-sm font-semibold mb-2">الرسالة</label>
          <textarea v-model="notificationForm.message" class="input w-full h-32" placeholder="محتوى الإخطار"></textarea>
        </div>

        <div>
          <label class="block text-sm font-semibold mb-2">طريقة الإرسال</label>
          <div class="flex items-center gap-4">
            <label class="flex items-center gap-2">
              <input v-model="notificationForm.channels" type="checkbox" value="in-app" />
              <span>داخل التطبيق</span>
            </label>
            <label class="flex items-center gap-2">
              <input v-model="notificationForm.channels" type="checkbox" value="email" />
              <span>البريد الإلكتروني</span>
            </label>
            <label class="flex items-center gap-2">
              <input v-model="notificationForm.channels" type="checkbox" value="sms" />
              <span>الرسائل النصية</span>
            </label>
          </div>
        </div>
      </div>

      <button @click="sendNotification" class="btn btn-primary">
        📤 إرسال الإخطار
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
const activeTab = ref('notifications')
const loading = ref(false)

const notifications = ref([])
const unreadCount = ref(0)
const totalNotifications = ref(0)

const preferences = ref({
  emailNotifications: true,
  smsNotifications: false,
  pushNotifications: true,
  leaveUpdates: true,
  attendanceReminders: true,
  newHireAlerts: true,
  expenseApprovals: true
})

const notificationForm = ref({
  type: 'info',
  title: '',
  message: '',
  channels: ['in-app']
})

const loadNotifications = async () => {
  try {
    const response = await api.get('/notifications')
    notifications.value = response.data.data.notifications || []
    unreadCount.value = response.data.data.unreadCount || 0
    totalNotifications.value = response.data.data.total || 0
  } catch (error) {
    console.error('خطأ في تحميل الإشعارات:', error)
  }
}

const markAsRead = async (notificationId) => {
  try {
    await api.patch(`/notifications/${notificationId}/read`)
    await loadNotifications()
    toast.success('تم تحديث الإشعار')
  } catch (error) {
    toast.error('فشل في تحديث الإشعار')
  }
}

const savePreferences = async () => {
  try {
    await api.post('/notifications/preferences', preferences.value)
    toast.success('تم حفظ التفضيلات بنجاح')
  } catch (error) {
    toast.error('فشل في حفظ التفضيلات')
  }
}

const sendNotification = async () => {
  try {
    if (!notificationForm.value.title || !notificationForm.value.message) {
      toast.error('يرجى ملء جميع الحقول')
      return
    }

    await api.post('/notifications/push', {
      userId: 'current_user', // في الواقع من auth store
      title: notificationForm.value.title,
      message: notificationForm.value.message,
      type: notificationForm.value.type
    })

    toast.success('تم إرسال الإخطار بنجاح')
    notificationForm.value = { type: 'info', title: '', message: '', channels: ['in-app'] }
    await loadNotifications()
  } catch (error) {
    toast.error('فشل في إرسال الإخطار')
  }
}

const getNotificationTypeClass = (type) => {
  const classes = {
    'info': 'bg-blue-100 text-blue-800',
    'success': 'bg-green-100 text-green-800',
    'warning': 'bg-yellow-100 text-yellow-800',
    'error': 'bg-red-100 text-red-800'
  }
  return classes[type] || 'bg-gray-100 text-gray-800'
}

onMounted(() => {
  loading.value = true
  loadNotifications().finally(() => {
    loading.value = false
  })
})
</script>
