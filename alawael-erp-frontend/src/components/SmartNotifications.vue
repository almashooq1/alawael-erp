<template>
  <div class="notifications-container">
    <!-- Header -->
    <div class="header">
      <h1>🔔 نظام الإشعارات الذكية</h1>
      <p>إدارة وإرسال الإشعارات متعددة القنوات</p>
    </div>

    <!-- Notification Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">📬</div>
        <div class="stat-info">
          <div class="label">الإشعارات الجديدة</div>
          <div class="value">{{ stats.new }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-info">
          <div class="label">المرسلة</div>
          <div class="value">{{ stats.sent }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-info">
          <div class="label">المستقبلون</div>
          <div class="value">{{ stats.recipients }}</div>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="actions">
      <button @click="openSendDialog" class="btn-primary">
        ✉️ إرسال إشعار فوري
      </button>
      <button @click="openScheduleDialog" class="btn-primary">
        ⏰ جدولة إشعار
      </button>
      <button @click="openPreferencesDialog" class="btn-secondary">
        ⚙️ التفضيلات
      </button>
    </div>

    <!-- Notifications List -->
    <div class="notifications-section">
      <h2>الإشعارات الحديثة</h2>

      <div v-if="loading" class="loading">جاري التحميل...</div>

      <div v-else class="notifications-list">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          class="notification-item"
          :class="`notification-${notification.type}`"
        >
          <div class="notification-icon">{{ getIcon(notification.type) }}</div>

          <div class="notification-content">
            <h3>{{ notification.title }}</h3>
            <p>{{ notification.message }}</p>
            <div class="notification-meta">
              <span class="delivery-status">{{ notification.delivery_status }}</span>
              <span class="time">{{ formatTime(notification.created_at) }}</span>
            </div>
          </div>

          <div class="notification-actions">
            <button @click="markAsRead(notification.id)" class="action-btn">✓</button>
            <button @click="deleteNotification(notification.id)" class="action-btn">🗑️</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Send Notification Dialog -->
    <div v-if="showSendDialog" class="dialog-overlay" @click="closeSendDialog">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <h2>إرسال إشعار فوري</h2>
          <button @click="closeSendDialog" class="close-btn">✕</button>
        </div>

        <form @submit.prevent="sendNotification" class="form">
          <div class="form-group">
            <label>نوع الإشعار:</label>
            <select v-model="sendForm.type" required>
              <option value="">اختر نوعاً</option>
              <option value="alert">تنبيه ⚠️</option>
              <option value="info">معلومة ℹ️</option>
              <option value="success">نجاح ✅</option>
              <option value="error">خطأ ❌</option>
            </select>
          </div>

          <div class="form-group">
            <label>العنوان:</label>
            <input v-model="sendForm.title" type="text" required />
          </div>

          <div class="form-group">
            <label>الرسالة:</label>
            <textarea v-model="sendForm.message" rows="4" required></textarea>
          </div>

          <div class="form-group">
            <label>القنوات:</label>
            <div class="channels">
              <label class="checkbox">
                <input v-model="sendForm.channels" type="checkbox" value="email" />
                البريد الإلكتروني
              </label>
              <label class="checkbox">
                <input v-model="sendForm.channels" type="checkbox" value="push" />
                إشعار فوري
              </label>
              <label class="checkbox">
                <input v-model="sendForm.channels" type="checkbox" value="sms" />
                رسالة نصية
              </label>
              <label class="checkbox">
                <input v-model="sendForm.channels" type="checkbox" value="in_app" />
                داخل التطبيق
              </label>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" @click="closeSendDialog" class="btn-secondary">إلغاء</button>
            <button type="submit" class="btn-primary">إرسال</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Schedule Dialog -->
    <div v-if="showScheduleDialog" class="dialog-overlay" @click="closeScheduleDialog">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <h2>جدولة إشعار</h2>
          <button @click="closeScheduleDialog" class="close-btn">✕</button>
        </div>

        <form @submit.prevent="scheduleNotification" class="form">
          <div class="form-group">
            <label>الوقت المطلوب:</label>
            <input v-model="scheduleForm.send_time" type="datetime-local" required />
          </div>

          <div class="form-group">
            <label>التكرار (اختياري):</label>
            <select v-model="scheduleForm.frequency">
              <option value="">بدون تكرار</option>
              <option value="daily">يومياً</option>
              <option value="weekly">أسبوعياً</option>
              <option value="monthly">شهرياً</option>
            </select>
          </div>

          <div class="form-actions">
            <button type="button" @click="closeScheduleDialog" class="btn-secondary">إلغاء</button>
            <button type="submit" class="btn-primary">جدولة</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Preferences Dialog -->
    <div v-if="showPreferencesDialog" class="dialog-overlay" @click="closePreferencesDialog">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <h2>تفضيلات الإشعارات</h2>
          <button @click="closePreferencesDialog" class="close-btn">✕</button>
        </div>

        <form @submit.prevent="savePreferences" class="form">
          <div class="form-group">
            <h3>تفعيل القنوات:</h3>
            <label class="checkbox">
              <input v-model="preferencesForm.email_enabled" type="checkbox" />
              البريد الإلكتروني
            </label>
            <label class="checkbox">
              <input v-model="preferencesForm.sms_enabled" type="checkbox" />
              رسائل نصية
            </label>
            <label class="checkbox">
              <input v-model="preferencesForm.push_enabled" type="checkbox" />
              إشعارات فورية
            </label>
          </div>

          <div class="form-group">
            <h3>ساعات الهدوء:</h3>
            <div class="time-inputs">
              <div>
                <label>من الساعة:</label>
                <input v-model="preferencesForm.quiet_start" type="time" />
              </div>
              <div>
                <label>إلى الساعة:</label>
                <input v-model="preferencesForm.quiet_end" type="time" />
              </div>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" @click="closePreferencesDialog" class="btn-secondary">إلغاء</button>
            <button type="submit" class="btn-primary">حفظ</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'

export default {
  name: 'SmartNotifications',
  setup() {
    const notifications = ref([])
    const loading = ref(false)
    const showSendDialog = ref(false)
    const showScheduleDialog = ref(false)
    const showPreferencesDialog = ref(false)

    const stats = ref({
      new: 0,
      sent: 0,
      recipients: 0
    })

    const sendForm = ref({
      type: '',
      title: '',
      message: '',
      channels: []
    })

    const scheduleForm = ref({
      send_time: '',
      frequency: ''
    })

    const preferencesForm = ref({
      email_enabled: true,
      sms_enabled: true,
      push_enabled: true,
      quiet_start: '22:00',
      quiet_end: '08:00'
    })

    const fetchNotifications = async () => {
      loading.value = true
      try {
        const response = await fetch('/api/notifications/list')
        const data = await response.json()
        notifications.value = data.notifications || []

        // Update stats
        stats.value.new = notifications.value.filter(n => !n.read).length
        stats.value.sent = notifications.value.length
      } catch (error) {
        console.error('خطأ في جلب الإشعارات:', error)
      } finally {
        loading.value = false
      }
    }

    const openSendDialog = () => {
      sendForm.value = {
        type: '',
        title: '',
        message: '',
        channels: []
      }
      showSendDialog.value = true
    }

    const closeSendDialog = () => {
      showSendDialog.value = false
    }

    const sendNotification = async () => {
      try {
        const response = await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sendForm.value)
        })

        if (response.ok) {
          await fetchNotifications()
          closeSendDialog()
          alert('تم إرسال الإشعار بنجاح')
        }
      } catch (error) {
        console.error('خطأ في الإرسال:', error)
      }
    }

    const openScheduleDialog = () => {
      showScheduleDialog.value = true
    }

    const closeScheduleDialog = () => {
      showScheduleDialog.value = false
    }

    const scheduleNotification = async () => {
      try {
        const response = await fetch('/api/notifications/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(scheduleForm.value)
        })

        if (response.ok) {
          closeScheduleDialog()
          alert('تم جدولة الإشعار بنجاح')
        }
      } catch (error) {
        console.error('خطأ في الجدولة:', error)
      }
    }

    const openPreferencesDialog = () => {
      showPreferencesDialog.value = true
    }

    const closePreferencesDialog = () => {
      showPreferencesDialog.value = false
    }

    const savePreferences = async () => {
      try {
        const response = await fetch('/api/notifications/preferences/user_id', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email_enabled: preferencesForm.value.email_enabled,
            sms_enabled: preferencesForm.value.sms_enabled,
            push_enabled: preferencesForm.value.push_enabled,
            quiet_hours: {
              start: preferencesForm.value.quiet_start,
              end: preferencesForm.value.quiet_end
            }
          })
        })

        if (response.ok) {
          closePreferencesDialog()
          alert('تم حفظ التفضيلات بنجاح')
        }
      } catch (error) {
        console.error('خطأ في الحفظ:', error)
      }
    }

    const markAsRead = async (notificationId) => {
      // Mark as read logic
    }

    const deleteNotification = async (notificationId) => {
      if (!confirm('هل تريد حذف هذا الإشعار؟')) return
      // Delete logic
    }

    const getIcon = (type) => {
      const icons = {
        alert: '⚠️',
        info: 'ℹ️',
        success: '✅',
        error: '❌',
        warning: '⚠️'
      }
      return icons[type] || '🔔'
    }

    const formatTime = (dateString) => {
      const date = new Date(dateString)
      return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
    }

    onMounted(fetchNotifications)

    return {
      notifications,
      loading,
      stats,
      showSendDialog,
      showScheduleDialog,
      showPreferencesDialog,
      sendForm,
      scheduleForm,
      preferencesForm,
      openSendDialog,
      closeSendDialog,
      sendNotification,
      openScheduleDialog,
      closeScheduleDialog,
      scheduleNotification,
      openPreferencesDialog,
      closePreferencesDialog,
      savePreferences,
      markAsRead,
      deleteNotification,
      getIcon,
      formatTime
    }
  }
}
</script>

<style scoped>
.notifications-container {
  padding: 2rem;
  direction: rtl;
}

.header {
  margin-bottom: 2rem;
}

.header h1 {
  font-size: 2rem;
  color: #333;
  margin-bottom: 0.5rem;
}

.header p {
  color: #666;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  gap: 1rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.stat-icon {
  font-size: 2rem;
}

.stat-info .label {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.stat-info .value {
  font-size: 1.5rem;
  font-weight: bold;
  color: #333;
}

.actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.btn-primary, .btn-secondary {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover {
  background-color: #0056b3;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background-color: #545b62;
}

.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.notification-item {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  gap: 1rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  border-right: 4px solid #007bff;
}

.notification-alert {
  border-right-color: #dc3545;
}

.notification-success {
  border-right-color: #28a745;
}

.notification-error {
  border-right-color: #dc3545;
}

.notification-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.notification-content {
  flex: 1;
}

.notification-content h3 {
  margin: 0 0 0.5rem 0;
  color: #333;
}

.notification-content p {
  margin: 0 0 1rem 0;
  color: #666;
}

.notification-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.85rem;
  color: #999;
}

.notification-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.action-btn {
  background: none;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  padding: 0.5rem;
}

/* Dialog Styles */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.dialog-header h2 {
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 500;
  color: #333;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.channels, .time-inputs {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.checkbox input {
  margin: 0;
  cursor: pointer;
}

.time-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #666;
}
</style>
