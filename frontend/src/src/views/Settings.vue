<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-content">
        <h1>الإعدادات</h1>
        <p class="page-description">إدارة تفضيلات وإعدادات النظام</p>
      </div>
    </div>

    <div class="settings-container">
      <!-- التبويبات -->
      <div class="settings-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="['tab-btn', { active: activeTab === tab.id }]"
          @click="activeTab = tab.id"
        >
          {{ tab.icon }} {{ tab.label }}
        </button>
      </div>

      <!-- محتوى التبويبات -->
      <div class="settings-content">
        <!-- التفضيلات العامة -->
        <div v-if="activeTab === 'general'" class="settings-section">
          <h2>التفضيلات العامة</h2>
          <div class="setting-group">
            <label>اسم المركز</label>
            <FormInput
              v-model="settings.centerName"
              type="text"
              placeholder="أدخل اسم المركز"
            />
          </div>
          <div class="setting-group">
            <label>البريد الإلكتروني</label>
            <FormInput
              v-model="settings.email"
              type="email"
              placeholder="email@example.com"
            />
          </div>
          <div class="setting-group">
            <label>الهاتف</label>
            <FormInput
              v-model="settings.phone"
              type="tel"
              placeholder="+966 XX XXXX XXXX"
            />
          </div>
          <div class="setting-group">
            <label>العنوان</label>
            <FormInput
              v-model="settings.address"
              type="text"
              placeholder="أدخل العنوان الكامل"
            />
          </div>
        </div>

        <!-- الإعدادات الأمنية -->
        <div v-if="activeTab === 'security'" class="settings-section">
          <h2>الإعدادات الأمنية</h2>
          <div class="setting-group">
            <label>كلمة المرور الحالية</label>
            <FormInput
              type="password"
              placeholder="أدخل كلمة المرور الحالية"
            />
          </div>
          <div class="setting-group">
            <label>كلمة المرور الجديدة</label>
            <FormInput
              type="password"
              placeholder="أدخل كلمة المرور الجديدة"
            />
          </div>
          <div class="setting-group">
            <label>تأكيد كلمة المرور</label>
            <FormInput
              type="password"
              placeholder="أدخل كلمة المرور مرة أخرى"
            />
          </div>
          <div class="setting-group">
            <label>
              <input v-model="settings.twoFactorAuth" type="checkbox" />
              تفعيل المصادقة الثنائية
            </label>
          </div>
        </div>

        <!-- إعدادات الإشعارات -->
        <div v-if="activeTab === 'notifications'" class="settings-section">
          <h2>إعدادات الإشعارات</h2>
          <div class="setting-group">
            <label>
              <input
                v-model="settings.emailNotifications"
                type="checkbox"
              />
              إشعارات البريد الإلكتروني
            </label>
          </div>
          <div class="setting-group">
            <label>
              <input
                v-model="settings.smsNotifications"
                type="checkbox"
              />
              إشعارات الرسائل النصية
            </label>
          </div>
          <div class="setting-group">
            <label>
              <input
                v-model="settings.pushNotifications"
                type="checkbox"
              />
              إشعارات الويب
            </label>
          </div>
          <div class="setting-group">
            <label>تكرار الإشعارات</label>
            <FormSelect
              v-model="settings.notificationFrequency"
              :options="[
                { value: 'immediate', label: 'فوري' },
                { value: 'daily', label: 'يومي' },
                { value: 'weekly', label: 'أسبوعي' },
              ]"
            />
          </div>
        </div>

        <!-- الظهور والمظهر -->
        <div v-if="activeTab === 'appearance'" class="settings-section">
          <h2>الظهور والمظهر</h2>
          <div class="setting-group">
            <label>المظهر</label>
            <FormSelect
              v-model="settings.theme"
              :options="[
                { value: 'light', label: 'فاتح' },
                { value: 'dark', label: 'غامق' },
                { value: 'auto', label: 'تلقائي' },
              ]"
            />
          </div>
          <div class="setting-group">
            <label>اللغة</label>
            <FormSelect
              v-model="settings.language"
              :options="[
                { value: 'ar', label: 'العربية' },
                { value: 'en', label: 'English' },
              ]"
            />
          </div>
          <div class="setting-group">
            <label>حجم الخط</label>
            <FormSelect
              v-model="settings.fontSize"
              :options="[
                { value: 'small', label: 'صغير' },
                { value: 'medium', label: 'عادي' },
                { value: 'large', label: 'كبير' },
              ]"
            />
          </div>
        </div>

        <!-- المعلومات والنسخة -->
        <div v-if="activeTab === 'about'" class="settings-section">
          <h2>المعلومات والنسخة</h2>
          <div class="info-group">
            <div class="info-item">
              <label>إصدار التطبيق</label>
              <p>v2.0.0</p>
            </div>
            <div class="info-item">
              <label>آخر تحديث</label>
              <p>16 يناير 2026</p>
            </div>
            <div class="info-item">
              <label>حقوق الطبع</label>
              <p>© 2026 معهد الاوائل للتدريب</p>
            </div>
          </div>
        </div>
      </div>

      <!-- أزرار الحفظ -->
      <div class="settings-actions">
        <button class="btn btn-primary" @click="saveSettings">
          💾 حفظ التغييرات
        </button>
        <button class="btn btn-secondary" @click="resetSettings">
          ↺ إعادة تعيين
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import FormInput from '../components/Form/FormInput.vue'
import FormSelect from '../components/Form/FormSelect.vue'

export default {
  name: 'Settings',
  components: {
    FormInput,
    FormSelect,
  },
  data() {
    return {
      activeTab: 'general',
      tabs: [
        { id: 'general', icon: '⚙️', label: 'عام' },
        { id: 'security', icon: '🔒', label: 'أمان' },
        { id: 'notifications', icon: '🔔', label: 'إشعارات' },
        { id: 'appearance', icon: '🎨', label: 'مظهر' },
        { id: 'about', icon: 'ℹ️', label: 'معلومات' },
      ],
      settings: {
        centerName: 'معهد الاوائل',
        email: 'info@alawael.com',
        phone: '+966 XX XXXX XXXX',
        address: 'الرياض، السعودية',
        twoFactorAuth: false,
        emailNotifications: true,
        smsNotifications: true,
        pushNotifications: true,
        notificationFrequency: 'daily',
        theme: 'light',
        language: 'ar',
        fontSize: 'medium',
      },
    }
  },
  methods: {
    saveSettings() {
      // حفظ الإعدادات
      localStorage.setItem('appSettings', JSON.stringify(this.settings))
      alert('تم حفظ الإعدادات بنجاح')
    },
    resetSettings() {
      if (confirm('هل تريد إعادة تعيين جميع الإعدادات؟')) {
        // إعادة تعيين الإعدادات الافتراضية
        alert('تم إعادة تعيين الإعدادات')
      }
    },
  },
  mounted() {
    // تحميل الإعدادات من localStorage
    const saved = localStorage.getItem('appSettings')
    if (saved) {
      this.settings = JSON.parse(saved)
    }
  },
}
</script>

<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2xl);
}

.page-header h1 {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: var(--text-2xl);
  color: var(--color-gray-800);
}

.page-description {
  margin: 0;
  font-size: var(--text-base);
  color: var(--color-gray-500);
}

.settings-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  background: var(--color-white);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.settings-tabs {
  display: flex;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--color-gray-200);
  overflow-x: auto;
}

.tab-btn {
  padding: var(--spacing-md) var(--spacing-lg);
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: var(--text-base);
  color: var(--color-gray-600);
  border-bottom: 2px solid transparent;
  transition: all var(--transition-base);
  white-space: nowrap;
}

.tab-btn:hover {
  color: var(--color-primary-600);
}

.tab-btn.active {
  color: var(--color-primary-600);
  border-bottom-color: var(--color-primary-600);
}

.settings-content {
  padding: var(--spacing-2xl);
}

.settings-section h2 {
  margin: 0 0 var(--spacing-lg) 0;
  font-size: var(--text-lg);
  color: var(--color-gray-800);
  border-bottom: 2px solid var(--color-primary-100);
  padding-bottom: var(--spacing-md);
}

.setting-group {
  margin-bottom: var(--spacing-lg);
}

.setting-group label {
  display: block;
  margin-bottom: var(--spacing-md);
  font-weight: 600;
  color: var(--color-gray-700);
}

.setting-group input[type="checkbox"] {
  margin-left: var(--spacing-md);
  cursor: pointer;
}

.info-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
}

.info-item {
  padding: var(--spacing-lg);
  background: var(--color-gray-50);
  border-radius: var(--radius-md);
}

.info-item label {
  display: block;
  margin-bottom: var(--spacing-md);
  font-weight: 600;
  color: var(--color-gray-700);
}

.info-item p {
  margin: 0;
  color: var(--color-gray-600);
}

.settings-actions {
  display: flex;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  border-top: 1px solid var(--color-gray-200);
  background: var(--color-gray-50);
}

.btn {
  padding: var(--spacing-md) var(--spacing-lg);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--text-base);
  font-weight: 500;
  transition: all var(--transition-base);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
}

.btn-primary {
  background: var(--color-primary-600);
  color: white;
  flex: 1;
}

.btn-primary:hover {
  background: var(--color-primary-700);
  box-shadow: var(--shadow-md);
}

.btn-secondary {
  background: var(--color-gray-300);
  color: var(--color-gray-800);
  flex: 1;
}

.btn-secondary:hover {
  background: var(--color-gray-400);
}

@media (max-width: 768px) {
  .settings-tabs {
    flex-wrap: wrap;
  }

  .settings-content {
    padding: var(--spacing-lg);
  }

  .settings-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }

  .info-group {
    grid-template-columns: 1fr;
  }
}
</style>