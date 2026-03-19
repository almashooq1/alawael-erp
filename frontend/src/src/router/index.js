import { createRouter, createWebHistory } from 'vue-router';

// Layout Components
const App = () => import('../App.vue');

// Pages
const Dashboard = () => import('../views/Dashboard.vue');
const NotFound = () => import('../views/NotFound.vue');

// Pages Under Development (will be implemented later)
const Students = () => import('../views/Students.vue');
const Programs = () => import('../views/Programs.vue');
const Plans = () => import('../views/Plans.vue');
const Sessions = () => import('../views/Sessions.vue');
const Settings = () => import('../views/Settings.vue');
const Reports = () => import('../views/Reports.vue');

const routes = [
  {
    path: '/',
    component: App,
    children: [
      {
        path: '',
        redirect: '/dashboard',
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: Dashboard,
        meta: {
          title: 'لوحة التحكم | نظام الأوائل',
          icon: '📊',
        },
      },

      // الطلاب
      {
        path: 'students',
        name: 'students',
        component: Students,
        meta: {
          title: 'إدارة الطلاب | نظام الأوائل',
          icon: '👥',
        },
      },
      {
        path: 'students/new',
        name: 'student-new',
        component: () => import('../views/StudentForm.vue'),
        meta: {
          title: 'إضافة طالب جديد | نظام الأوائل',
        },
      },
      {
        path: 'students/:id',
        name: 'student-edit',
        component: () => import('../views/StudentForm.vue'),
        meta: {
          title: 'تعديل بيانات الطالب | نظام الأوائل',
        },
      },

      // البرامج
      {
        path: 'programs',
        name: 'programs',
        component: Programs,
        meta: {
          title: 'إدارة البرامج | نظام الأوائل',
          icon: '📚',
        },
      },
      {
        path: 'programs/new',
        name: 'program-new',
        component: () => import('../views/ProgramForm.vue'),
        meta: {
          title: 'إضافة برنامج جديد | نظام الأوائل',
        },
      },
      {
        path: 'programs/:id',
        name: 'program-edit',
        component: () => import('../views/ProgramForm.vue'),
        meta: {
          title: 'تعديل البرنامج | نظام الأوائل',
        },
      },

      // الخطط
      {
        path: 'plans',
        name: 'plans',
        component: Plans,
        meta: {
          title: 'إدارة الخطط | نظام الأوائل',
          icon: '📋',
        },
      },
      {
        path: 'plans/new',
        name: 'plan-new',
        component: () => import('../views/PlanForm.vue'),
        meta: {
          title: 'إضافة خطة تدريب جديدة | نظام الأوائل',
        },
      },
      {
        path: 'plans/:id',
        name: 'plan-edit',
        component: () => import('../views/PlanForm.vue'),
        meta: {
          title: 'تعديل الخطة | نظام الأوائل',
        },
      },

      // الجلسات
      {
        path: 'sessions',
        name: 'sessions',
        component: Sessions,
        meta: {
          title: 'جدول الجلسات | نظام الأوائل',
          icon: '⏰',
        },
      },
      {
        path: 'sessions/new',
        name: 'session-new',
        component: () => import('../views/SessionForm.vue'),
        meta: {
          title: 'إضافة جلسة جديدة | نظام الأوائل',
        },
      },
      {
        path: 'sessions/:id',
        name: 'session-edit',
        component: () => import('../views/SessionForm.vue'),
        meta: {
          title: 'تعديل الجلسة | نظام الأوائل',
        },
      },
      {
        path: 'sessions/calendar',
        name: 'sessions-calendar',
        component: () => import('../views/SessionsCalendar.vue'),
        meta: {
          title: 'التقويم | نظام الأوائل',
        },
      },

      // التقارير
      {
        path: 'reports',
        name: 'reports',
        component: Reports,
        meta: {
          title: 'التقارير | نظام الأوائل',
          icon: '📈',
        },
      },
      {
        path: 'reports/progress',
        name: 'reports-progress',
        component: () => import('../views/ReportsProgress.vue'),
        meta: {
          title: 'تقارير التقدم | نظام الأوائل',
        },
      },
      {
        path: 'reports/performance',
        name: 'reports-performance',
        component: () => import('../views/ReportsPerformance.vue'),
        meta: {
          title: 'تقارير الأداء | نظام الأوائل',
        },
      },
      {
        path: 'reports/attendance',
        name: 'reports-attendance',
        component: () => import('../views/ReportsAttendance.vue'),
        meta: {
          title: 'تقارير الحضور | نظام الأوائل',
        },
      },
      {
        path: 'reports/financial',
        name: 'reports-financial',
        component: () => import('../views/ReportsFinancial.vue'),
        meta: {
          title: 'التقارير المالية | نظام الأوائل',
        },
      },

      // الإعدادات
      {
        path: 'settings',
        name: 'settings',
        component: Settings,
        meta: {
          title: 'الإعدادات | نظام الأوائل',
          icon: '⚙️',
        },
      },

      // صفحات أخرى
      {
        path: 'search',
        name: 'search',
        component: () => import('../views/Search.vue'),
        meta: {
          title: 'بحث متقدم | نظام الأوائل',
        },
      },
      {
        path: 'audit',
        name: 'audit',
        component: () => import('../views/AuditLog.vue'),
        meta: {
          title: 'سجل الأنشطة | نظام الأوائل',
        },
      },
      {
        path: 'users',
        name: 'users',
        component: () => import('../views/UserManagement.vue'),
        meta: {
          title: 'إدارة المستخدمين | نظام الأوائل',
        },
      },

      // صفحة الخطأ
      {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: NotFound,
        meta: {
          title: 'الصفحة غير موجودة | نظام الأوائل',
        },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    return { top: 0 };
  },
});

// معالج الملاحة لتحديث عنوان الصفحة
router.afterEach(to => {
  document.title = to.meta.title || 'نظام الأوائل';
});

export default router;
