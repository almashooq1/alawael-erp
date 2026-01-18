# 🛠️ دليل التنفيذ العملي للواجهة العربية

**نظام ERP مركز تأهيل والطلاب الموهوبين - دليل المطور والمصمم**

---

## 📌 ملخص سريع

هذا الدليل يجمع كل ما تحتاجه لتنفيذ واجهة ERP احترافية بالعربية (RTL) مع:

✅ **معايير تصميم عالمية** (WCAG 2.1 AAA)  
✅ **دعم كامل للعربية** (RTL من الألف للياء)  
✅ **مكونات قابلة لإعادة الاستخدام** (Reusable Components)  
✅ **توثيق كامل وأمثلة كود** (Code Examples)  
✅ **أفضل الممارسات** (Best Practices)

---

## 🎯 الخطوات الأساسية للمشروع

### المرحلة 1️⃣: الإعداد والتكوين (1-2 يوم)

#### 1.1 إنشاء المشروع

```bash
# إنشاء مشروع Vue 3 جديد
npm create vite@latest alawael-erp-frontend -- --template vue

# الانتقال للمجلد
cd alawael-erp-frontend

# تثبيت الحزم الأساسية
npm install

# تثبيت المكتبات المطلوبة
npm install axios pinia vue-router day.js vee-validate
npm install -D tailwindcss postcss autoprefixer
npm install @headlessui/vue @heroicons/vue
npm install chart.js vue-chartjs
```

#### 1.2 تكوين Tailwind للعربية (RTL)

```bash
# تثبيت Tailwind RTL plugin
npm install -D @tailwindcss/rtl
```

**tailwind.config.js:**

```javascript
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        arab: ['"GE SS Text"', '"Cairo"', '"Noto Sans Arabic"', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        success: {
          50: '#ECFDF5',
          500: '#10B981',
          600: '#059669',
        },
        warning: {
          50: '#FFFBEB',
          500: '#F59E0B',
        },
        error: {
          50: '#FEE2E2',
          500: '#EF4444',
        },
      },
    },
  },
  plugins: [require('@tailwindcss/rtl')],
};
```

**postcss.config.js:**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

#### 1.3 تكوين Vue للعربية

**src/main.js:**

```javascript
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import './style.css';

const app = createApp(App);

// تعيين الاتجاه RTL
document.documentElement.dir = 'rtl';
document.documentElement.lang = 'ar';

app.use(createPinia());
app.use(router);
app.mount('#app');
```

**App.vue:**

```vue
<template>
  <div class="app-container" dir="rtl">
    <Navbar />
    <div class="app-main">
      <Sidebar />
      <main class="app-content">
        <router-view />
      </main>
    </div>
    <Footer />
  </div>
</template>

<script>
import Navbar from './components/Layout/Navbar.vue';
import Sidebar from './components/Layout/Sidebar.vue';
import Footer from './components/Layout/Footer.vue';

export default {
  components: { Navbar, Sidebar, Footer },
};
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f9fafb;
}

.app-main {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.app-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}
</style>
```

---

### المرحلة 2️⃣: بناء مكونات الواجهة (3-5 أيام)

#### 2.1 مكون Navbar

**src/components/Layout/Navbar.vue:**

```vue
<template>
  <header class="navbar" dir="rtl">
    <!-- اليمين: الشعار والعنوان -->
    <div class="navbar-brand">
      <img src="/logo.svg" alt="Alawael" class="logo" />
      <h1 class="brand-name">نظام الأوائل</h1>
    </div>

    <!-- الوسط: البحث -->
    <div class="navbar-search">
      <input v-model="searchQuery" type="text" placeholder="ابحث عن طالب أو برنامج..." class="search-input" />
      <span class="search-icon">🔍</span>
    </div>

    <!-- اليسار: الإجراءات والملف الشخصي -->
    <div class="navbar-actions">
      <!-- إشعارات -->
      <button class="btn-icon" @click="toggleNotifications" title="الإشعارات">
        🔔
        <span v-if="notificationCount > 0" class="notification-badge">
          {{ notificationCount }}
        </span>
      </button>

      <!-- قائمة المستخدم -->
      <div class="user-menu">
        <button class="btn-user" @click="toggleUserMenu">
          <span class="user-avatar">{{ userInitials }}</span>
          <span class="user-name">{{ userName }}</span>
          <span class="dropdown-icon">▼</span>
        </button>
        <div v-if="userMenuOpen" class="dropdown-menu">
          <router-link to="/profile" class="dropdown-item">👤 الملف الشخصي</router-link>
          <router-link to="/settings" class="dropdown-item">⚙️ الإعدادات</router-link>
          <hr class="dropdown-divider" />
          <button @click="logout" class="dropdown-item logout">🚪 تسجيل خروج</button>
        </div>
      </div>
    </div>
  </header>
</template>

<script>
export default {
  data() {
    return {
      searchQuery: '',
      notificationCount: 3,
      userMenuOpen: false,
      userName: 'محمد أحمد',
      userInitials: 'م',
    };
  },
  methods: {
    toggleNotifications() {
      // معالجة الإشعارات
    },
    toggleUserMenu() {
      this.userMenuOpen = !this.userMenuOpen;
    },
    logout() {
      // تسجيل الخروج
      this.$router.push('/login');
    },
  },
};
</script>

<style scoped>
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 64px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.navbar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 200px;
}

.logo {
  width: 40px;
  height: 40px;
}

.brand-name {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.navbar-search {
  flex: 1;
  position: relative;
  max-width: 400px;
  margin: 0 24px;
}

.search-input {
  width: 100%;
  height: 40px;
  padding: 8px 16px 8px 40px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.search-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
  color: #9ca3af;
}

.navbar-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.btn-icon {
  position: relative;
  width: 40px;
  height: 40px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: transparent;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
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
  background: #ef4444;
  color: white;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
}

.user-menu {
  position: relative;
}

.btn-user {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-user:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.user-avatar {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #2563eb;
  color: white;
  border-radius: 50%;
  font-weight: 700;
  font-size: 13px;
}

.user-name {
  font-size: 14px;
  color: #1f2937;
  font-weight: 500;
}

.dropdown-icon {
  font-size: 12px;
  color: #9ca3af;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  min-width: 200px;
  z-index: 1000;
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: 12px 16px;
  text-align: right;
  background: none;
  border: none;
  font-size: 14px;
  color: #4b5563;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
}

.dropdown-item:hover {
  background: #f9fafb;
  color: #2563eb;
}

.dropdown-item.logout:hover {
  background: #fee2e2;
  color: #ef4444;
}

.dropdown-divider {
  margin: 8px 0;
  border: none;
  border-top: 1px solid #e5e7eb;
}
</style>
```

#### 2.2 مكون Sidebar

**src/components/Layout/Sidebar.vue:**

```vue
<template>
  <aside class="sidebar" dir="rtl">
    <nav class="nav-list">
      <!-- مجموعة الرئيسية -->
      <div class="nav-group">
        <h3 class="nav-group-title">الرئيسية</h3>
        <router-link v-for="item in mainItems" :key="item.path" :to="item.path" :class="['nav-item', { active: isActive(item.path) }]">
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-text">{{ item.label }}</span>
        </router-link>
      </div>

      <!-- مجموعة الإدارة -->
      <div class="nav-group">
        <h3 class="nav-group-title">الإدارة</h3>
        <router-link v-for="item in adminItems" :key="item.path" :to="item.path" :class="['nav-item', { active: isActive(item.path) }]">
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-text">{{ item.label }}</span>
        </router-link>
      </div>

      <!-- مجموعة التقارير -->
      <div class="nav-group">
        <h3 class="nav-group-title">التقارير</h3>
        <router-link v-for="item in reportsItems" :key="item.path" :to="item.path" :class="['nav-item', { active: isActive(item.path) }]">
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-text">{{ item.label }}</span>
        </router-link>
      </div>
    </nav>

    <!-- تذييل القائمة -->
    <div class="sidebar-footer">
      <button class="nav-item">
        <span class="nav-icon">?</span>
        <span class="nav-text">مساعدة</span>
      </button>
      <button class="nav-item" @click="toggleDarkMode">
        <span class="nav-icon">{{ isDarkMode ? '☀️' : '🌙' }}</span>
        <span class="nav-text">{{ isDarkMode ? 'الوضع الفاتح' : 'الوضع الليلي' }}</span>
      </button>
    </div>
  </aside>
</template>

<script>
export default {
  data() {
    return {
      isDarkMode: false,
      mainItems: [{ path: '/dashboard', label: 'لوحة التحكم', icon: '📊' }],
      adminItems: [
        { path: '/students', label: 'الطلاب', icon: '👥' },
        { path: '/programs', label: 'البرامج', icon: '📚' },
        { path: '/plans', label: 'الخطط الفردية', icon: '📝' },
        { path: '/sessions', label: 'الجلسات', icon: '📅' },
      ],
      reportsItems: [
        { path: '/reports/progress', label: 'تقارير التقدم', icon: '📈' },
        { path: '/reports/analytics', label: 'التحليلات', icon: '📉' },
        { path: '/reports/performance', label: 'التقييمات', icon: '⭐' },
      ],
    };
  },
  methods: {
    isActive(path) {
      return this.$route.path === path;
    },
    toggleDarkMode() {
      this.isDarkMode = !this.isDarkMode;
      document.documentElement.classList.toggle('dark', this.isDarkMode);
    },
  },
};
</script>

<style scoped>
.sidebar {
  width: 280px;
  height: 100vh;
  background: #ffffff;
  border-left: 1px solid #e5e7eb;
  padding: 24px 0;
  position: sticky;
  top: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.nav-list {
  flex: 1;
}

.nav-group {
  margin-bottom: 24px;
}

.nav-group-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: #9ca3af;
  padding: 8px 16px;
  margin: 0 0 8px 0;
  letter-spacing: 0.5px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  color: #4b5563;
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  border-right: 3px solid transparent;
  font-family: inherit;
}

.nav-item:hover {
  background: #f3f4f6;
  color: #2563eb;
}

.nav-item.active {
  background: #eff6ff;
  color: #2563eb;
  border-right-color: #2563eb;
}

.nav-icon {
  font-size: 18px;
  width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-text {
  font-size: 14px;
  font-weight: 500;
  flex: 1;
}

.sidebar-footer {
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
```

---

### المرحلة 3️⃣: بناء الصفحات (5-7 أيام)

#### 3.1 صفحة لوحة التحكم

**src/views/Dashboard.vue:**

```vue
<template>
  <div class="dashboard-page" dir="rtl">
    <div class="page-header">
      <h1>لوحة التحكم</h1>
      <p class="page-subtitle">مرحبًا بك في نظام الأوائل</p>
    </div>

    <!-- كروت الإحصائيات -->
    <div class="stats-grid">
      <StatCard label="إجمالي الطلاب" :value="totalStudents" icon="👥" :change="12" changeText="مقارنة بالشهر الماضي" :isPositive="true" />
      <StatCard label="البرامج النشطة" :value="activePrograms" icon="📚" :change="3" changeText="برامج جديدة" :isPositive="true" />
      <StatCard label="الجلسات المجدولة" :value="scheduledSessions" icon="📅" :change="5" changeText="هذا الأسبوع" :isPositive="true" />
      <StatCard label="معدل الإكمال" :value="`${completionRate}%`" icon="⭐" :change="2" changeText="تحسن" :isPositive="true" />
    </div>

    <!-- الرسم البياني والقوائم -->
    <div class="content-grid">
      <div class="chart-section">
        <ActivityChart />
      </div>
      <div class="list-section">
        <NewStudentsList />
      </div>
    </div>

    <!-- إجراءات سريعة -->
    <div class="quick-actions">
      <h3>الإجراءات السريعة</h3>
      <div class="actions-buttons">
        <button class="btn btn-primary"><span>+</span> إضافة طالب جديد</button>
        <button class="btn btn-secondary"><span>+</span> برنامج جديد</button>
        <button class="btn btn-secondary">📋 إنشاء تقرير</button>
      </div>
    </div>
  </div>
</template>

<script>
import StatCard from '../components/Dashboard/StatCard.vue';
import ActivityChart from '../components/Dashboard/ActivityChart.vue';
import NewStudentsList from '../components/Dashboard/NewStudentsList.vue';

export default {
  components: {
    StatCard,
    ActivityChart,
    NewStudentsList,
  },
  data() {
    return {
      totalStudents: 245,
      activePrograms: 12,
      scheduledSessions: 18,
      completionRate: 78,
    };
  },
};
</script>

<style scoped>
.dashboard-page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 32px;
}

.page-header h1 {
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.page-subtitle {
  font-size: 16px;
  color: #6b7280;
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.content-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  margin-bottom: 32px;
}

@media (max-width: 768px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}

.chart-section,
.list-section {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 24px;
}

.quick-actions {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 24px;
}

.quick-actions h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
}

.actions-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.actions-buttons .btn {
  min-width: auto;
}
</style>
```

---

## 📋 قائمة التحقق النهائية

قبل تسليم المشروع، تأكد من:

### التصميم والواجهة:

- [ ] جميع النصوص من اليمين لليسار (RTL)
- [ ] الأيقونات الاتجاهية معكوسة صحيحاً
- [ ] الخطوط العربية تُحمل بشكل صحيح
- [ ] الألوان آمنة للوصول (تباين ≥ 4.5:1)
- [ ] التصميم متجاوب على (Desktop, Tablet, Mobile)

### الأداء والتوافقية:

- [ ] سرعة التحميل < 3 ثوان (Core Web Vitals)
- [ ] يعمل على جميع المتصفحات الحديثة (Chrome, Firefox, Safari, Edge)
- [ ] التطبيق يعمل بدون JavaScript (Progressive Enhancement)
- [ ] الصور محسّنة ومضغوطة

### الوصول والشمول:

- [ ] ARIA labels موجودة للعناصر المعقدة
- [ ] التنقل بلوحة المفاتيح يعمل كاملاً
- [ ] قارئ الشاشة يتعرف على المحتوى
- [ ] حجم الخط قابل للتكبير

### الأمان:

- [ ] جميع الأسرار (API Keys) محفوظة في متغيرات البيئة
- [ ] لا توجد بيانات حساسة في الكود
- [ ] HTTPS مستخدم لجميع الاتصالات
- [ ] CORS مُعد بشكل صحيح

### التوثيق:

- [ ] توثيق جميع المكونات (Components)
- [ ] شرح كيفية الاستخدام (Usage Examples)
- [ ] قائمة بالمكتبات المستخدمة (Dependencies)
- [ ] تعليمات التثبيت والتشغيل (Setup Instructions)

---

## 📞 تواصل مع الفريق

عند تسليم المشروع للمصمم أو فريق التطوير:

### للمصمم:

```
"أحتاج تصميم واجهة ERP عربية احترافية بالمواصفات التالية:

✓ دعم كامل RTL (من اليمين لليسار)
✓ خطوط عربية احترافية (Cairo, GE SS, Noto Sans Arabic)
✓ معايير WCAG 2.1 AAA للوصول
✓ ألوان آمنة (تباين ≥ 4.5:1)
✓ تصميم متجاوب (Responsive)
✓ مكونات قابلة لإعادة الاستخدام

الملفات المرفقة:
- 🎨_ARABIC_UI_DESIGN_GUIDELINES.md
- 🎨_DETAILED_SCREEN_SPECIFICATIONS.md
- 🛠️_IMPLEMENTATION_GUIDE.md"
```

### لفريق التطوير:

```
"أحتاج تطوير واجهة ERP بالمواصفات التالية:

✓ Vue 3 + Vite
✓ Tailwind CSS + RTL Support
✓ Pinia لإدارة الحالة
✓ API Integration (Axios)
✓ Authentication & Authorization
✓ Unit Tests & E2E Tests
✓ CI/CD Pipeline

الملفات المرفقة:
- 🎨_DETAILED_SCREEN_SPECIFICATIONS.md
- 🛠️_IMPLEMENTATION_GUIDE.md
- جميع أمثلة الكود الموجودة"
```

---

**النسخة:** 1.0  
**الحالة:** ✅ جاهز للتنفيذ  
**آخر تحديث:** يناير 2026  
**المؤلف:** فريق تطوير نظام الأوائل ERP
