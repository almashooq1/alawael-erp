// ===================================
// i18n Configuration - Multi-language
// ===================================

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translation resources
const resources = {
  en: {
    translation: {
      // Common
      common: {
        welcome: 'Welcome',
        loading: 'Loading...',
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        search: 'Search',
        filter: 'Filter',
        export: 'Export',
        import: 'Import',
        download: 'Download',
        upload: 'Upload',
        submit: 'Submit',
        close: 'Close',
        confirm: 'Confirm',
        back: 'Back',
        next: 'Next',
        previous: 'Previous',
        finish: 'Finish',
        yes: 'Yes',
        no: 'No',
        ok: 'OK',
        error: 'Error',
        success: 'Success',
        warning: 'Warning',
        info: 'Information',
      },

      // Navigation
      nav: {
        dashboard: 'Dashboard',
        users: 'Users',
        analytics: 'Analytics',
        reports: 'Reports',
        notifications: 'Notifications',
        roles: 'Roles & Permissions',
        integrations: 'Integrations',
        monitoring: 'Monitoring',
        performance: 'Performance',
        support: 'Support',
        predictions: 'Predictions',
        cms: 'Content Management',
        settings: 'Settings',
        profile: 'Profile',
        logout: 'Logout',
      },

      // Auth
      auth: {
        login: 'Login',
        register: 'Register',
        logout: 'Logout',
        email: 'Email',
        password: 'Password',
        confirmPassword: 'Confirm Password',
        forgotPassword: 'Forgot Password?',
        rememberMe: 'Remember Me',
        loginSuccess: 'Login successful',
        loginError: 'Login failed',
        registerSuccess: 'Registration successful',
        registerError: 'Registration failed',
      },

      // Dashboard
      dashboard: {
        title: 'Dashboard',
        overview: 'Overview',
        statistics: 'Statistics',
        recentActivity: 'Recent Activity',
        quickActions: 'Quick Actions',
        totalUsers: 'Total Users',
        activeUsers: 'Active Users',
        totalReports: 'Total Reports',
        pendingTickets: 'Pending Tickets',
      },

      // Users
      users: {
        title: 'Users',
        addUser: 'Add User',
        editUser: 'Edit User',
        deleteUser: 'Delete User',
        userList: 'User List',
        userName: 'Name',
        userEmail: 'Email',
        userRole: 'Role',
        userStatus: 'Status',
        active: 'Active',
        inactive: 'Inactive',
        suspended: 'Suspended',
      },

      // Reports
      reports: {
        title: 'Reports',
        generate: 'Generate Report',
        viewReport: 'View Report',
        downloadReport: 'Download Report',
        reportType: 'Report Type',
        dateRange: 'Date Range',
        exportPDF: 'Export as PDF',
        exportExcel: 'Export as Excel',
        exportCSV: 'Export as CSV',
      },

      // Settings
      settings: {
        title: 'Settings',
        general: 'General',
        security: 'Security',
        notifications: 'Notifications',
        appearance: 'Appearance',
        language: 'Language',
        theme: 'Theme',
        lightMode: 'Light Mode',
        darkMode: 'Dark Mode',
        systemDefault: 'System Default',
      },
    },
  },
  ar: {
    translation: {
      // Common
      common: {
        welcome: 'مرحباً',
        loading: 'جاري التحميل...',
        save: 'حفظ',
        cancel: 'إلغاء',
        delete: 'حذف',
        edit: 'تعديل',
        search: 'بحث',
        filter: 'تصفية',
        export: 'تصدير',
        import: 'استيراد',
        download: 'تحميل',
        upload: 'رفع',
        submit: 'إرسال',
        close: 'إغلاق',
        confirm: 'تأكيد',
        back: 'رجوع',
        next: 'التالي',
        previous: 'السابق',
        finish: 'إنهاء',
        yes: 'نعم',
        no: 'لا',
        ok: 'موافق',
        error: 'خطأ',
        success: 'نجح',
        warning: 'تحذير',
        info: 'معلومات',
      },

      // Navigation
      nav: {
        dashboard: 'لوحة التحكم',
        users: 'المستخدمين',
        analytics: 'التحليلات',
        reports: 'التقارير',
        notifications: 'الإشعارات',
        roles: 'الأدوار والصلاحيات',
        integrations: 'التكاملات',
        monitoring: 'المراقبة',
        performance: 'الأداء',
        support: 'الدعم الفني',
        predictions: 'التوقعات',
        cms: 'إدارة المحتوى',
        settings: 'الإعدادات',
        profile: 'الملف الشخصي',
        logout: 'تسجيل خروج',
      },

      // Auth
      auth: {
        login: 'تسجيل الدخول',
        register: 'تسجيل جديد',
        logout: 'تسجيل خروج',
        email: 'البريد الإلكتروني',
        password: 'كلمة المرور',
        confirmPassword: 'تأكيد كلمة المرور',
        forgotPassword: 'نسيت كلمة المرور؟',
        rememberMe: 'تذكرني',
        loginSuccess: 'تم تسجيل الدخول بنجاح',
        loginError: 'فشل تسجيل الدخول',
        registerSuccess: 'تم التسجيل بنجاح',
        registerError: 'فشل التسجيل',
      },

      // Dashboard
      dashboard: {
        title: 'لوحة التحكم',
        overview: 'نظرة عامة',
        statistics: 'الإحصائيات',
        recentActivity: 'النشاط الأخير',
        quickActions: 'إجراءات سريعة',
        totalUsers: 'إجمالي المستخدمين',
        activeUsers: 'المستخدمون النشطون',
        totalReports: 'إجمالي التقارير',
        pendingTickets: 'التذاكر المعلقة',
      },

      // Users
      users: {
        title: 'المستخدمين',
        addUser: 'إضافة مستخدم',
        editUser: 'تعديل مستخدم',
        deleteUser: 'حذف مستخدم',
        userList: 'قائمة المستخدمين',
        userName: 'الاسم',
        userEmail: 'البريد الإلكتروني',
        userRole: 'الدور',
        userStatus: 'الحالة',
        active: 'نشط',
        inactive: 'غير نشط',
        suspended: 'موقوف',
      },

      // Reports
      reports: {
        title: 'التقارير',
        generate: 'إنشاء تقرير',
        viewReport: 'عرض التقرير',
        downloadReport: 'تحميل التقرير',
        reportType: 'نوع التقرير',
        dateRange: 'نطاق التاريخ',
        exportPDF: 'تصدير PDF',
        exportExcel: 'تصدير Excel',
        exportCSV: 'تصدير CSV',
      },

      // Settings
      settings: {
        title: 'الإعدادات',
        general: 'عام',
        security: 'الأمان',
        notifications: 'الإشعارات',
        appearance: 'المظهر',
        language: 'اللغة',
        theme: 'السمة',
        lightMode: 'الوضع الفاتح',
        darkMode: 'الوضع الداكن',
        systemDefault: 'افتراضي النظام',
      },
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem('language') || 'en', // Default language
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // React already escapes
  },
  react: {
    useSuspense: false,
  },
});

export default i18n;
