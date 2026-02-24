<template>
  <header class="navbar">
    <!-- اليمين: الشعار والعنوان -->
    <div class="navbar-brand">
      <img src="/logo.svg" alt="Alawael" class="logo" />
      <h1 class="brand-name">نظام الأوائل</h1>
    </div>

    <!-- الوسط: البحث -->
    <div class="navbar-search">
      <div class="search-wrapper">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="ابحث عن طالب أو برنامج..."
          class="search-input"
          @keyup.enter="performSearch"
          aria-label="حقل البحث"
        />
        <button
          class="search-button"
          @click="performSearch"
          title="بحث"
          aria-label="زر البحث"
        >
          🔍
        </button>
      </div>
    </div>

    <!-- اليسار: الإجراءات -->
    <div class="navbar-actions">
      <!-- الإشعارات -->
      <div class="notification-wrapper">
        <button
          class="btn-icon"
          @click="toggleNotifications"
          title="الإشعارات"
          aria-label="الإشعارات"
          :aria-pressed="notificationsOpen"
        >
          🔔
          <span v-if="notificationCount > 0" class="notification-badge">
            {{ notificationCount }}
          </span>
        </button>
        <div v-if="notificationsOpen" class="notifications-panel">
          <div class="notifications-header">
            <h3>الإشعارات</h3>
            <button
              class="btn-close"
              @click="closeNotifications"
              aria-label="إغلاق الإشعارات"
            >
              ✕
            </button>
          </div>
          <div class="notifications-list">
            <div
              v-for="notification in notifications"
              :key="notification.id"
              class="notification-item"
              :class="`notification-${notification.type}`"
            >
              <div class="notification-content">
                <p class="notification-title">{{ notification.title }}</p>
                <p class="notification-message">{{ notification.message }}</p>
                <p class="notification-time">{{ formatTime(notification.time) }}</p>
              </div>
              <button
                class="btn-dismiss"
                @click="dismissNotification(notification.id)"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>
          </div>
          <button class="btn-view-all">عرض جميع الإشعارات</button>
        </div>
      </div>

      <!-- قائمة المستخدم -->
      <div class="user-menu-wrapper">
        <button
          class="btn-user"
          @click="toggleUserMenu"
          :aria-expanded="userMenuOpen"
          aria-label="قائمة المستخدم"
        >
          <span class="user-avatar">{{ userInitials }}</span>
          <span class="user-name">{{ userName }}</span>
          <span class="dropdown-icon" :class="{ open: userMenuOpen }">▼</span>
        </button>

        <div v-if="userMenuOpen" class="user-dropdown">
          <router-link
            to="/profile"
            class="dropdown-item"
            @click="userMenuOpen = false"
          >
            👤 الملف الشخصي
          </router-link>
          <router-link
            to="/settings"
            class="dropdown-item"
            @click="userMenuOpen = false"
          >
            ⚙️ الإعدادات
          </router-link>
          <button class="dropdown-item theme-toggle" @click="toggleTheme">
            {{ isDarkMode ? '☀️' : '🌙' }} {{ isDarkMode ? 'الوضع الفاتح' : 'الوضع الليلي' }}
          </button>
          <hr class="dropdown-divider" />
          <button class="dropdown-item logout" @click="handleLogout">
            🚪 تسجيل خروج
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script>
export default {
  name: 'Navbar',
  data() {
    return {
      searchQuery: '',
      notificationsOpen: false,
      userMenuOpen: false,
      isDarkMode: false,
      notificationCount: 3,
      userName: 'محمد أحمد',
      userInitials: 'م',
      notifications: [
        {
          id: 1,
          type: 'success',
          title: 'تم حفظ البيانات',
          message: 'تم حفظ بيانات الطالب بنجاح',
          time: new Date(Date.now() - 5 * 60000),
        },
        {
          id: 2,
          type: 'warning',
          title: 'جلسة قريبة',
          message: 'جلسة مع أحمد محمود في 2 ساعة',
          time: new Date(Date.now() - 30 * 60000),
        },
        {
          id: 3,
          type: 'info',
          title: 'تقرير جديد',
          message: 'تم إضافة تقرير تقدم جديد',
          time: new Date(Date.now() - 2 * 60 * 60000),
        },
      ],
    }
  },
  methods: {
    performSearch() {
      if (this.searchQuery.trim()) {
        this.$router.push({
          name: 'search',
          query: { q: this.searchQuery },
        })
        this.searchQuery = ''
      }
    },
    toggleNotifications() {
      this.notificationsOpen = !this.notificationsOpen
      if (this.notificationsOpen) {
        this.userMenuOpen = false
      }
    },
    closeNotifications() {
      this.notificationsOpen = false
    },
    dismissNotification(id) {
      const index = this.notifications.findIndex(n => n.id === id)
      if (index > -1) {
        this.notifications.splice(index, 1)
        this.notificationCount = Math.max(0, this.notificationCount - 1)
      }
    },
    toggleUserMenu() {
      this.userMenuOpen = !this.userMenuOpen
      if (this.userMenuOpen) {
        this.notificationsOpen = false
      }
    },
    toggleTheme() {
      this.isDarkMode = !this.isDarkMode
      document.documentElement.classList.toggle('dark', this.isDarkMode)
      localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light')
      this.userMenuOpen = false
    },
    handleLogout() {
      this.$router.push('/login')
    },
    formatTime(date) {
      const now = new Date()
      const diff = now - date
      const minutes = Math.floor(diff / 60000)
      const hours = Math.floor(diff / 3600000)

      if (minutes < 1) return 'الآن'
      if (minutes < 60) return `${minutes}د`
      if (hours < 24) return `${hours}س`
      return `${Math.floor(hours / 24)}ي`
    },
  },
  mounted() {
    // تحميل الثيم المحفوظ
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark') {
      this.isDarkMode = true
      document.documentElement.classList.add('dark')
    }

    // إغلاق القوائم عند الضغط خارجها
    document.addEventListener('click', (e) => {
      if (!this.$el.contains(e.target)) {
        this.notificationsOpen = false
        this.userMenuOpen = false
      }
    })
  },
}
</script>

<style scoped>
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 64px;
  background: var(--color-white);
  border-bottom: 1px solid var(--color-gray-200);
  padding: 0 var(--spacing-xl);
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  box-shadow: var(--shadow-sm);
}

.navbar-brand {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  min-width: 200px;
  flex-shrink: 0;
}

.logo {
  width: 40px;
  height: 40px;
  object-fit: contain;
}

.brand-name {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--color-primary-600);
  margin: 0;
}

.navbar-search {
  flex: 1;
  max-width: 400px;
  margin: 0 var(--spacing-xl);
}

.search-wrapper {
  display: flex;
  align-items: center;
  background: var(--color-gray-50);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-base);
  padding: 0 var(--spacing-md);
  transition: all var(--transition-base);
}

.search-wrapper:focus-within {
  border-color: var(--color-primary-600);
  box-shadow: 0 0 0 3px var(--color-primary-50);
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  padding: var(--spacing-sm) 0;
  font-size: var(--text-base);
  color: var(--color-gray-800);
}

.search-input::placeholder {
  color: var(--color-gray-400);
}

.search-button {
  background: transparent;
  border: none;
  font-size: var(--text-lg);
  cursor: pointer;
  padding: var(--spacing-sm);
  transition: all var(--transition-fast);
}

.search-button:hover {
  color: var(--color-primary-600);
}

.navbar-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  flex-shrink: 0;
}

/* الإشعارات */
.notification-wrapper {
  position: relative;
}

.btn-icon {
  position: relative;
  width: 40px;
  height: 40px;
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-base);
  background: transparent;
  font-size: var(--text-lg);
  cursor: pointer;
  transition: all var(--transition-base);
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background: var(--color-gray-50);
  border-color: var(--color-gray-300);
}

.notification-badge {
  position: absolute;
  top: -4px;
  left: -4px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: var(--color-error-500);
  color: white;
  border-radius: 50%;
  font-size: var(--text-xs);
  font-weight: 700;
}

.notifications-panel {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: var(--spacing-sm);
  width: 320px;
  background: var(--color-white);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: var(--z-dropdown);
  overflow: hidden;
}

.notifications-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--color-gray-200);
}

.notifications-header h3 {
  margin: 0;
  font-size: var(--text-lg);
}

.btn-close {
  background: transparent;
  border: none;
  font-size: var(--text-lg);
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-gray-500);
}

.btn-close:hover {
  color: var(--color-gray-800);
}

.notifications-list {
  max-height: 400px;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--color-gray-100);
  transition: all var(--transition-base);
}

.notification-item:hover {
  background: var(--color-gray-50);
}

.notification-item.notification-success {
  border-right: 3px solid var(--color-success-500);
}

.notification-item.notification-warning {
  border-right: 3px solid var(--color-warning-500);
}

.notification-item.notification-error {
  border-right: 3px solid var(--color-error-500);
}

.notification-content {
  flex: 1;
}

.notification-title {
  font-weight: 600;
  color: var(--color-gray-800);
  margin: 0 0 var(--spacing-xs) 0;
}

.notification-message {
  font-size: var(--text-sm);
  color: var(--color-gray-600);
  margin: 0;
}

.notification-time {
  font-size: var(--text-xs);
  color: var(--color-gray-400);
  margin-top: var(--spacing-xs);
  margin-bottom: 0;
}

.btn-dismiss {
  background: transparent;
  border: none;
  color: var(--color-gray-400);
  cursor: pointer;
  padding: 0;
  font-size: var(--text-sm);
}

.btn-dismiss:hover {
  color: var(--color-gray-600);
}

.btn-view-all {
  display: block;
  width: 100%;
  padding: var(--spacing-md);
  background: var(--color-gray-50);
  border: none;
  border-top: 1px solid var(--color-gray-200);
  color: var(--color-primary-600);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-base);
}

.btn-view-all:hover {
  background: var(--color-gray-100);
}

/* قائمة المستخدم */
.user-menu-wrapper {
  position: relative;
}

.btn-user {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-gray-50);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-base);
  cursor: pointer;
  transition: all var(--transition-base);
}

.btn-user:hover {
  background: var(--color-gray-100);
  border-color: var(--color-gray-300);
}

.user-avatar {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary-600);
  color: white;
  border-radius: 50%;
  font-weight: 700;
  font-size: var(--text-sm);
}

.user-name {
  font-size: var(--text-base);
  color: var(--color-gray-800);
  font-weight: 500;
}

.dropdown-icon {
  font-size: var(--text-xs);
  color: var(--color-gray-400);
  transition: all var(--transition-base);
}

.dropdown-icon.open {
  transform: rotate(180deg);
}

.user-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: var(--spacing-sm);
  background: var(--color-white);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: var(--z-dropdown);
  min-width: 200px;
  overflow: hidden;
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: var(--spacing-md) var(--spacing-lg);
  text-align: right;
  background: none;
  border: none;
  font-size: var(--text-base);
  color: var(--color-gray-600);
  cursor: pointer;
  text-decoration: none;
  transition: all var(--transition-base);
}

.dropdown-item:hover {
  background: var(--color-gray-50);
  color: var(--color-primary-600);
}

.dropdown-item.logout:hover {
  background: var(--color-error-50);
  color: var(--color-error-500);
}

.dropdown-divider {
  margin: var(--spacing-sm) 0;
  border: none;
  border-top: 1px solid var(--color-gray-200);
}

/* الاستجابة */
@media (max-width: 768px) {
  .navbar {
    flex-wrap: wrap;
    height: auto;
    padding: var(--spacing-md) var(--spacing-lg);
    gap: var(--spacing-lg);
  }

  .navbar-brand {
    min-width: auto;
  }

  .brand-name {
    display: none;
  }

  .navbar-search {
    max-width: 100%;
    margin: 0;
    order: 3;
    flex-basis: 100%;
  }

  .navbar-actions {
    gap: var(--spacing-md);
  }
}

@media (max-width: 480px) {
  .navbar {
    padding: var(--spacing-sm) var(--spacing-md);
  }

  .search-input::placeholder {
    font-size: var(--text-sm);
  }

  .notifications-panel,
  .user-dropdown {
    width: calc(100vw - 32px);
  }
}
</style>
