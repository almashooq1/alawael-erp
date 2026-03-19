<template>
  <aside class="sidebar" :class="{ collapsed }">
    <div class="sidebar-header">
      <h2 class="menu-title">القائمة الرئيسية</h2>
      <button
        class="btn-toggle-sidebar"
        @click="toggleSidebar"
        :aria-expanded="!collapsed"
        aria-label="تبديل القائمة"
      >
        {{ collapsed ? '→' : '←' }}
      </button>
    </div>

    <nav class="sidebar-nav">
      <div class="nav-section">
        <p v-if="!collapsed" class="nav-label">عام</p>

        <router-link
          to="/dashboard"
          class="nav-item"
          :class="{ active: $route.path === '/dashboard' }"
          title="لوحة التحكم"
        >
          <span class="nav-icon">📊</span>
          <span v-if="!collapsed" class="nav-text">لوحة التحكم</span>
        </router-link>

        <router-link
          to="/search"
          class="nav-item"
          :class="{ active: $route.path === '/search' }"
          title="البحث المتقدم"
        >
          <span class="nav-icon">🔍</span>
          <span v-if="!collapsed" class="nav-text">بحث متقدم</span>
        </router-link>
      </div>

      <div class="nav-section">
        <p v-if="!collapsed" class="nav-label">إدارة</p>

        <!-- الطلاب -->
        <div class="nav-item-group">
          <button
            class="nav-item nav-item-with-submenu"
            @click="toggleSubmenu('students')"
            :aria-expanded="expandedMenus.students"
            aria-label="إدارة الطلاب"
          >
            <span class="nav-icon">👥</span>
            <span v-if="!collapsed" class="nav-text">الطلاب</span>
            <span v-if="!collapsed" class="nav-arrow">▼</span>
          </button>

          <transition name="slide">
            <div v-if="expandedMenus.students && !collapsed" class="submenu">
              <router-link
                to="/students"
                class="submenu-item"
                @click="trackMenuItem('students-list')"
              >
                قائمة الطلاب
              </router-link>
              <router-link
                to="/students/new"
                class="submenu-item"
                @click="trackMenuItem('students-new')"
              >
                طالب جديد
              </router-link>
              <router-link
                to="/students/import"
                class="submenu-item"
                @click="trackMenuItem('students-import')"
              >
                استيراد
              </router-link>
            </div>
          </transition>
        </div>

        <!-- البرامج -->
        <div class="nav-item-group">
          <button
            class="nav-item nav-item-with-submenu"
            @click="toggleSubmenu('programs')"
            :aria-expanded="expandedMenus.programs"
            aria-label="إدارة البرامج"
          >
            <span class="nav-icon">📚</span>
            <span v-if="!collapsed" class="nav-text">البرامج</span>
            <span v-if="!collapsed" class="nav-arrow">▼</span>
          </button>

          <transition name="slide">
            <div v-if="expandedMenus.programs && !collapsed" class="submenu">
              <router-link
                to="/programs"
                class="submenu-item"
                @click="trackMenuItem('programs-list')"
              >
                قائمة البرامج
              </router-link>
              <router-link
                to="/programs/new"
                class="submenu-item"
                @click="trackMenuItem('programs-new')"
              >
                برنامج جديد
              </router-link>
              <router-link
                to="/programs/templates"
                class="submenu-item"
                @click="trackMenuItem('programs-templates')"
              >
                القوالب
              </router-link>
            </div>
          </transition>
        </div>

        <!-- الخطط -->
        <div class="nav-item-group">
          <button
            class="nav-item nav-item-with-submenu"
            @click="toggleSubmenu('plans')"
            :aria-expanded="expandedMenus.plans"
            aria-label="إدارة الخطط"
          >
            <span class="nav-icon">📋</span>
            <span v-if="!collapsed" class="nav-text">الخطط</span>
            <span v-if="!collapsed" class="nav-arrow">▼</span>
          </button>

          <transition name="slide">
            <div v-if="expandedMenus.plans && !collapsed" class="submenu">
              <router-link
                to="/plans"
                class="submenu-item"
                @click="trackMenuItem('plans-list')"
              >
                قائمة الخطط
              </router-link>
              <router-link
                to="/plans/new"
                class="submenu-item"
                @click="trackMenuItem('plans-new')"
              >
                خطة جديدة
              </router-link>
            </div>
          </transition>
        </div>

        <!-- الجلسات -->
        <div class="nav-item-group">
          <button
            class="nav-item nav-item-with-submenu"
            @click="toggleSubmenu('sessions')"
            :aria-expanded="expandedMenus.sessions"
            aria-label="إدارة الجلسات"
          >
            <span class="nav-icon">⏰</span>
            <span v-if="!collapsed" class="nav-text">الجلسات</span>
            <span v-if="!collapsed" class="nav-arrow">▼</span>
          </button>

          <transition name="slide">
            <div v-if="expandedMenus.sessions && !collapsed" class="submenu">
              <router-link
                to="/sessions"
                class="submenu-item"
                @click="trackMenuItem('sessions-list')"
              >
                جدول الجلسات
              </router-link>
              <router-link
                to="/sessions/new"
                class="submenu-item"
                @click="trackMenuItem('sessions-new')"
              >
                جلسة جديدة
              </router-link>
              <router-link
                to="/sessions/calendar"
                class="submenu-item"
                @click="trackMenuItem('sessions-calendar')"
              >
                التقويم
              </router-link>
            </div>
          </transition>
        </div>
      </div>

      <div class="nav-section">
        <p v-if="!collapsed" class="nav-label">تقارير</p>

        <router-link
          to="/reports/progress"
          class="nav-item"
          :class="{ active: $route.path === '/reports/progress' }"
          title="تقارير التقدم"
        >
          <span class="nav-icon">📈</span>
          <span v-if="!collapsed" class="nav-text">التقدم</span>
        </router-link>

        <router-link
          to="/reports/performance"
          class="nav-item"
          :class="{ active: $route.path === '/reports/performance' }"
          title="تقارير الأداء"
        >
          <span class="nav-icon">⭐</span>
          <span v-if="!collapsed" class="nav-text">الأداء</span>
        </router-link>

        <router-link
          to="/reports/attendance"
          class="nav-item"
          :class="{ active: $route.path === '/reports/attendance' }"
          title="تقارير الحضور"
        >
          <span class="nav-icon">✅</span>
          <span v-if="!collapsed" class="nav-text">الحضور</span>
        </router-link>

        <router-link
          to="/reports/financial"
          class="nav-item"
          :class="{ active: $route.path === '/reports/financial' }"
          title="التقارير المالية"
        >
          <span class="nav-icon">💰</span>
          <span v-if="!collapsed" class="nav-text">مالي</span>
        </router-link>
      </div>

      <div class="nav-section">
        <p v-if="!collapsed" class="nav-label">النظام</p>

        <router-link
          to="/settings"
          class="nav-item"
          :class="{ active: $route.path === '/settings' }"
          title="الإعدادات"
        >
          <span class="nav-icon">⚙️</span>
          <span v-if="!collapsed" class="nav-text">الإعدادات</span>
        </router-link>

        <router-link
          to="/users"
          class="nav-item"
          :class="{ active: $route.path === '/users' }"
          title="المستخدمون"
        >
          <span class="nav-icon">👨‍💼</span>
          <span v-if="!collapsed" class="nav-text">المستخدمون</span>
        </router-link>

        <router-link
          to="/audit"
          class="nav-item"
          :class="{ active: $route.path === '/audit' }"
          title="سجل الأنشطة"
        >
          <span class="nav-icon">📝</span>
          <span v-if="!collapsed" class="nav-text">الأنشطة</span>
        </router-link>
      </div>
    </nav>

    <div v-if="!collapsed" class="sidebar-footer">
      <div class="system-info">
        <p class="info-label">الإصدار</p>
        <p class="info-value">{{ version }}</p>
      </div>
      <p class="footer-text">© 2025 نظام الأوائل</p>
    </div>
  </aside>
</template>

<script>
export default {
  name: 'Sidebar',
  data() {
    return {
      collapsed: false,
      expandedMenus: {
        students: false,
        programs: false,
        plans: false,
        sessions: false,
      },
      version: '1.0.0',
    }
  },
  methods: {
    toggleSidebar() {
      this.collapsed = !this.collapsed
      localStorage.setItem('sidebarCollapsed', this.collapsed)
    },
    toggleSubmenu(menu) {
      this.expandedMenus[menu] = !this.expandedMenus[menu]
      localStorage.setItem(`menu-${menu}`, this.expandedMenus[menu])
    },
    trackMenuItem(item) {
      // تتبع عنصر القائمة (يمكن إرساله لخادم التحليلات)
      console.log('Navigated to:', item)
    },
  },
  mounted() {
    // تحميل حالة الشريط الجانبي المحفوظة
    const savedCollapsed = localStorage.getItem('sidebarCollapsed') === 'true'
    if (savedCollapsed) {
      this.collapsed = true
    }

    // تحميل حالة القوائم المحفوظة
    Object.keys(this.expandedMenus).forEach((menu) => {
      const saved = localStorage.getItem(`menu-${menu}`)
      if (saved !== null) {
        this.expandedMenus[menu] = saved === 'true'
      }
    })

    // إغلاق القوائس المنسدلة على الأجهزة الصغيرة
    if (window.innerWidth < 768) {
      this.collapsed = true
    }
  },
}
</script>

<style scoped>
.sidebar {
  width: 280px;
  height: 100vh;
  background: var(--color-white);
  border-left: 1px solid var(--color-gray-200);
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  transition: width var(--transition-base);
  overflow-y: auto;
  padding: 0;
  margin: 0;
}

.sidebar.collapsed {
  width: 80px;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--color-gray-200);
  flex-shrink: 0;
}

.menu-title {
  margin: 0;
  font-size: var(--text-lg);
  color: var(--color-gray-800);
  font-weight: 700;
}

.btn-toggle-sidebar {
  background: transparent;
  border: none;
  font-size: var(--text-lg);
  cursor: pointer;
  padding: var(--spacing-sm);
  color: var(--color-gray-500);
  transition: all var(--transition-base);
}

.btn-toggle-sidebar:hover {
  color: var(--color-primary-600);
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-md) 0;
}

.nav-section {
  padding: 0;
  margin-bottom: var(--spacing-lg);
}

.nav-label {
  padding: 0 var(--spacing-lg);
  margin: 0 0 var(--spacing-sm) 0;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-gray-400);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.nav-item,
.nav-item-with-submenu {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-lg);
  background: transparent;
  border: none;
  color: var(--color-gray-600);
  font-size: var(--text-base);
  cursor: pointer;
  transition: all var(--transition-base);
  text-decoration: none;
  text-align: right;
}

.nav-item:hover,
.nav-item-with-submenu:hover {
  background: var(--color-gray-50);
  color: var(--color-primary-600);
}

.nav-item.active {
  background: var(--color-primary-50);
  color: var(--color-primary-600);
  border-right: 3px solid var(--color-primary-600);
}

.nav-item-with-submenu {
  justify-content: space-between;
}

.nav-icon {
  font-size: var(--text-lg);
  flex-shrink: 0;
  min-width: 24px;
  text-align: center;
}

.nav-text {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-arrow {
  font-size: var(--text-xs);
  color: var(--color-gray-400);
  transition: transform var(--transition-base);
}

.nav-item-with-submenu[aria-expanded='true'] .nav-arrow {
  transform: rotate(180deg);
}

.nav-item-group {
  position: relative;
}

.submenu {
  background: var(--color-gray-50);
}

.submenu-item {
  display: block;
  padding: var(--spacing-sm) var(--spacing-lg) var(--spacing-sm) calc(var(--spacing-lg) + 32px);
  color: var(--color-gray-600);
  font-size: var(--text-sm);
  text-decoration: none;
  transition: all var(--transition-base);
  text-align: right;
  border: none;
  background: transparent;
  cursor: pointer;
  width: 100%;
}

.submenu-item:hover {
  background: var(--color-gray-100);
  color: var(--color-primary-600);
}

.submenu-item.router-link-active {
  color: var(--color-primary-600);
  font-weight: 600;
}

.sidebar-footer {
  padding: var(--spacing-lg);
  border-top: 1px solid var(--color-gray-200);
  flex-shrink: 0;
  background: var(--color-gray-50);
}

.system-info {
  margin-bottom: var(--spacing-md);
}

.info-label {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-gray-400);
  text-transform: uppercase;
}

.info-value {
  margin: var(--spacing-xs) 0 0 0;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-gray-800);
}

.footer-text {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-gray-400);
  text-align: center;
}

/* الانتقالات */
.slide-enter-active,
.slide-leave-active {
  transition: all var(--transition-base);
  overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
  max-height: 0;
  opacity: 0;
}

.slide-enter-to,
.slide-leave-from {
  max-height: 500px;
  opacity: 1;
}

/* الاستجابة */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: 64px;
    right: 0;
    height: calc(100vh - 64px);
    z-index: var(--z-modal) - 1;
    transform: translateX(100%);
    transition: transform var(--transition-base);
  }

  .sidebar.open {
    transform: translateX(0);
    box-shadow: var(--shadow-lg);
  }

  .sidebar.collapsed {
    width: 280px;
  }

  .sidebar-footer {
    display: none;
  }
}

/* شريط التمرير المخصص */
.sidebar::-webkit-scrollbar {
  width: 6px;
}

.sidebar::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar::-webkit-scrollbar-thumb {
  background: var(--color-gray-300);
  border-radius: 3px;
}

.sidebar::-webkit-scrollbar-thumb:hover {
  background: var(--color-gray-400);
}
</style>
