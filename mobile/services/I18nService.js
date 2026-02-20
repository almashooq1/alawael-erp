/**
 * Phase 34: i18n (Internationalization) Setup
 * Multi-language support for global applications
 * Arabic, English, and extensible language support
 */

import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';

// Translation catalogs
const translations = {
  ar: {
    // Common
    common: {
      ok: 'حسناً',
      cancel: 'إلغاء',
      save: 'حفظ',
      delete: 'حذف',
      edit: 'تعديل',
      loading: 'جاري التحميل...',
      error: 'خطأ',
      success: 'نجح',
      warning: 'تحذير',
      info: 'معلومة',
      close: 'إغلاق',
      back: 'رجوع',
      next: 'التالي',
      previous: 'السابق',
      home: 'الرئيسية',
      settings: 'الإعدادات',
      logout: 'تسجيل خروج',
      yes: 'نعم',
      no: 'لا',
    },

    // Authentication
    auth: {
      login: 'تسجيل الدخول',
      register: 'إنشاء حساب',
      forgotPassword: 'هل نسيت كلمة المرور؟',
      resetPassword: 'استعادة كلمة المرور',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      confirmPassword: 'تأكيد كلمة المرور',
      oldPassword: 'كلمة المرور القديمة',
      newPassword: 'كلمة المرور الجديدة',
      signIn: 'دخول',
      signUp: 'إنشاء حساب',
      rememberMe: 'تذكرني',
      noAccount: 'ليس لديك حساب؟',
      haveAccount: 'هل لديك حساب بالفعل؟',
      invalidEmail: 'بريد إلكتروني غير صحيح',
      passwordTooShort: 'كلمة المرور قصيرة جداً',
      passwordMismatch: 'كلمات المرور غير متطابقة',
    },

    // Dashboard
    dashboard: {
      title: 'لوحة التحكم',
      welcome: 'أهلاً بك',
      todayStats: 'إحصائيات اليوم',
      thisWeek: 'هذا الأسبوع',
      thisMonth: 'هذا الشهر',
      recentTrips: 'الرحلات الأخيرة',
      performance: 'الأداء',
      score: 'النقاط',
      violations: 'الانتهاكات',
      distance: 'المسافة',
      duration: 'المدة',
      speed: 'السرعة',
      averageSpeed: 'متوسط السرعة',
      maxSpeed: 'أقصى سرعة',
      tracking: 'التتبع',
      enabled: 'مفعل',
      disabled: 'معطل',
      startTracking: 'بدء التتبع',
      stopTracking: 'إيقاف التتبع',
    },

    // GPS & Tracking
    gps: {
      location: 'الموقع',
      latitude: 'خط العرض',
      longitude: 'خط الطول',
      accuracy: 'الدقة',
      altitude: 'الارتفاع',
      speed: 'السرعة',
      heading: 'الاتجاه',
      satellite: 'الأقمار الصناعية',
      gpsSignal: 'إشارة GPS',
      signalStrength: 'قوة الإشارة',
      routes: 'المسارات',
      route: 'المسار',
      startPoint: 'نقطة البداية',
      endPoint: 'نقطة النهاية',
      distance: 'المسافة',
      time: 'الوقت',
      speed: 'السرعة',
    },

    // Notifications
    notifications: {
      title: 'الإشعارات',
      unread: 'غير مقروءة',
      all: 'جميع الإشعارات',
      none: 'لا توجد إشعارات',
      speeding: 'تجاوز السرعة',
      harshBraking: 'كبح حاد',
      seatbelt: 'حزام الأمان',
      distraction: 'تشتيت الانتباه',
      violation: 'انتهاك',
      alert: 'تنبيه',
      warning: 'تحذير',
      maintenance: 'الصيانة',
      performance: 'التقرير',
      markAsRead: 'وضع علامة كمقروء',
      markAsUnread: 'وضع علامة كغير مقروء',
      delete: 'حذف',
    },

    // Violations & Safety
    safety: {
      violations: 'الانتهاكات',
      speeding: 'تجاوز السرعة',
      harshBraking: 'كبح حاد',
      harshAccel: 'تسارع حاد',
      seatbelt: 'حزام الأمان',
      distraction: 'تشتيت الانتباه',
      cornering: 'الانعطاف',
      safetyScore: 'درجة السلامة',
      riskLevel: 'مستوى الخطر',
      low: 'منخفض',
      medium: 'متوسط',
      high: 'عالي',
      critical: 'حرج',
      excellent: 'ممتاز',
      good: 'جيد',
      average: 'متوسط',
      poor: 'ضعيف',
    },

    // Profile
    profile: {
      title: 'الملف الشخصي',
      personal: 'المعلومات الشخصية',
      name: 'الاسم',
      email: 'البريد الإلكتروني',
      phone: 'رقم الهاتف',
      jobTitle: 'المسمى الوظيفي',
      department: 'القسم',
      hireDate: 'تاريخ التوظيف',
      license: 'معلومات الرخصة',
      licenseNumber: 'رقم الرخصة',
      licenseClass: 'فئة الرخصة',
      expiryDate: 'تاريخ انتهاء الصلاحية',
      categories: 'الفئات',
      statistics: 'الإحصائيات',
      rating: 'التقييم',
      trips: 'عدد الرحلات',
      totalDistance: 'إجمالي المسافة',
      totalHours: 'إجمالي الساعات',
      camera: 'الكاميرا',
      gallery: 'المعرض',
      changePhoto: 'تغيير الصورة',
    },

    // Settings
    settings: {
      title: 'الإعدادات',
      general: 'عام',
      language: 'اللغة',
      theme: 'المظهر',
      notifications: 'الإشعارات',
      privacy: 'الخصوصية',
      security: 'الأمان',
      account: 'الحساب',
      gps: 'تحديد الموقع',
      enableGPS: 'تفعيل تحديد الموقع',
      highAccuracy: 'دقة عالية',
      batteryMode: 'وضع البطارية',
      updateInterval: 'فترة التحديث',
      autoUpload: 'الرفع التلقائي',
      pushNotifications: 'إشعارات الدفع',
      emailNotifications: 'إشعارات البريد',
      smsNotifications: 'إشعارات الرسائل',
      changePassword: 'تغيير كلمة المرور',
      twoFactor: 'التحقق الثنائي',
      deleteAccount: 'حذف الحساب',
      logout: 'تسجيل الخروج',
      aboutApp: 'حول التطبيق',
      version: 'الإصدار',
      legalInfo: 'المعلومات القانونية',
      privacyPolicy: 'سياسة الخصوصية',
      termsOfService: 'شروط الخدمة',
    },

    // Analytics
    analytics: {
      overview: 'نظرة عامة',
      dashboard: 'لوحة التحليلات',
      reports: 'التقارير',
      performance: 'الأداء',
      safety: 'السلامة',
      efficiency: 'الكفاءة',
      trends: 'الاتجاهات',
      comparison: 'المقارنة',
      daily: 'يومي',
      weekly: 'أسبوعي',
      monthly: 'شهري',
      yearly: 'سنوي',
      export: 'تصدير',
      pdf: 'PDF',
      csv: 'CSV',
      email: 'بريد إلكتروني',
    },

    // Errors & Messages
    errors: {
      networkError: 'خطأ في الاتصال',
      tryAgain: 'حاول مرة أخرى',
      unexpectedError: 'حدث خطأ غير متوقع',
      invalidEmail: 'البريد الإلكتروني غير صحيح',
      passwordTooShort: 'كلمة المرور قصيرة جداً',
      passwordMismatch: 'كلمات المرور غير متطابقة',
      fieldRequired: 'هذا الحقل مطلوب',
      loginFailed: 'فشل تسجيل الدخول',
      registrationFailed: 'فشل التسجيل',
      updateFailed: 'فشل التحديث',
      deleteFailed: 'فشل الحذف',
      noInternet: 'لا يوجد اتصال بالإنترنت',
      serverError: 'خطأ في الخادم',
      unauthorized: 'غير مصرح',
      notFound: 'غير موجود',
    },
  },

  en: {
    // Common
    common: {
      ok: 'OK',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      warning: 'Warning',
      info: 'Info',
      close: 'Close',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      home: 'Home',
      settings: 'Settings',
      logout: 'Logout',
      yes: 'Yes',
      no: 'No',
    },

    // Authentication
    auth: {
      login: 'Login',
      register: 'Register',
      forgotPassword: 'Forgot password?',
      resetPassword: 'Reset Password',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      oldPassword: 'Old Password',
      newPassword: 'New Password',
      signIn: 'Sign In',
      signUp: 'Sign Up',
      rememberMe: 'Remember me',
      noAccount: "Don't have an account?",
      haveAccount: 'Already have an account?',
      invalidEmail: 'Invalid email',
      passwordTooShort: 'Password is too short',
      passwordMismatch: 'Passwords do not match',
    },

    // Dashboard
    dashboard: {
      title: 'Dashboard',
      welcome: 'Welcome',
      todayStats: "Today's Statistics",
      thisWeek: 'This Week',
      thisMonth: 'This Month',
      recentTrips: 'Recent Trips',
      performance: 'Performance',
      score: 'Score',
      violations: 'Violations',
      distance: 'Distance',
      duration: 'Duration',
      speed: 'Speed',
      averageSpeed: 'Average Speed',
      maxSpeed: 'Max Speed',
      tracking: 'Tracking',
      enabled: 'Enabled',
      disabled: 'Disabled',
      startTracking: 'Start Tracking',
      stopTracking: 'Stop Tracking',
    },

    // GPS & Tracking
    gps: {
      location: 'Location',
      latitude: 'Latitude',
      longitude: 'Longitude',
      accuracy: 'Accuracy',
      altitude: 'Altitude',
      speed: 'Speed',
      heading: 'Heading',
      satellite: 'Satellites',
      gpsSignal: 'GPS Signal',
      signalStrength: 'Signal Strength',
      routes: 'Routes',
      route: 'Route',
      startPoint: 'Start Point',
      endPoint: 'End Point',
      distance: 'Distance',
      time: 'Time',
    },

    // Notifications
    notifications: {
      title: 'Notifications',
      unread: 'Unread',
      all: 'All Notifications',
      none: 'No Notifications',
      speeding: 'Speeding',
      harshBraking: 'Harsh Braking',
      seatbelt: 'Seatbelt',
      distraction: 'Distraction',
      violation: 'Violation',
      alert: 'Alert',
      warning: 'Warning',
      maintenance: 'Maintenance',
      performance: 'Report',
      markAsRead: 'Mark as Read',
      markAsUnread: 'Mark as Unread',
      delete: 'Delete',
    },

    // Violations & Safety
    safety: {
      violations: 'Violations',
      speeding: 'Speeding',
      harshBraking: 'Harsh Braking',
      harshAccel: 'Harsh Acceleration',
      seatbelt: 'Seatbelt',
      distraction: 'Distraction',
      cornering: 'Cornering',
      safetyScore: 'Safety Score',
      riskLevel: 'Risk Level',
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      critical: 'Critical',
      excellent: 'Excellent',
      good: 'Good',
      average: 'Average',
      poor: 'Poor',
    },

    // Profile
    profile: {
      title: 'Profile',
      personal: 'Personal Information',
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      jobTitle: 'Job Title',
      department: 'Department',
      hireDate: 'Hire Date',
      license: 'License Information',
      licenseNumber: 'License Number',
      licenseClass: 'License Class',
      expiryDate: 'Expiry Date',
      categories: 'Categories',
      statistics: 'Statistics',
      rating: 'Rating',
      trips: 'Trips',
      totalDistance: 'Total Distance',
      totalHours: 'Total Hours',
      camera: 'Camera',
      gallery: 'Gallery',
      changePhoto: 'Change Photo',
    },

    // Settings
    settings: {
      title: 'Settings',
      general: 'General',
      language: 'Language',
      theme: 'Theme',
      notifications: 'Notifications',
      privacy: 'Privacy',
      security: 'Security',
      account: 'Account',
      gps: 'Location',
      enableGPS: 'Enable Location Tracking',
      highAccuracy: 'High Accuracy',
      batteryMode: 'Battery Mode',
      updateInterval: 'Update Interval',
      autoUpload: 'Auto Upload',
      pushNotifications: 'Push Notifications',
      emailNotifications: 'Email Notifications',
      smsNotifications: 'SMS Notifications',
      changePassword: 'Change Password',
      twoFactor: 'Two-Factor Authentication',
      deleteAccount: 'Delete Account',
      logout: 'Logout',
      aboutApp: 'About App',
      version: 'Version',
      legalInfo: 'Legal Information',
      privacyPolicy: 'Privacy Policy',
      termsOfService: 'Terms of Service',
    },

    // Analytics
    analytics: {
      overview: 'Overview',
      dashboard: 'Analytics Dashboard',
      reports: 'Reports',
      performance: 'Performance',
      safety: 'Safety',
      efficiency: 'Efficiency',
      trends: 'Trends',
      comparison: 'Comparison',
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      yearly: 'Yearly',
      export: 'Export',
      pdf: 'PDF',
      csv: 'CSV',
      email: 'Email',
    },

    // Errors & Messages
    errors: {
      networkError: 'Network error',
      tryAgain: 'Try again',
      unexpectedError: 'An unexpected error occurred',
      invalidEmail: 'Invalid email address',
      passwordTooShort: 'Password is too short',
      passwordMismatch: 'Passwords do not match',
      fieldRequired: 'This field is required',
      loginFailed: 'Login failed',
      registrationFailed: 'Registration failed',
      updateFailed: 'Update failed',
      deleteFailed: 'Delete failed',
      noInternet: 'No internet connection',
      serverError: 'Server error',
      unauthorized: 'Unauthorized',
      notFound: 'Not found',
    },
  },
};

// Initialize i18n
const i18n = new I18n(translations);
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

class I18nService {
  /**
   * Initialize i18n with device locale
   */
  static async initialize() {
    try {
      // Get device locale
      let locale = Localization.getLocales()[0]?.languageCode || 'en';

      // Map to supported languages
      if (!translations[locale]) {
        locale = locale.split('-')[0]; // Try just language code
      }
      if (!translations[locale]) {
        locale = 'en'; // Fallback to English
      }

      i18n.locale = locale;
      console.log(`✅ i18n initialized with locale: ${locale}`);
      return locale;
    } catch (error) {
      console.error('❌ Failed to initialize i18n:', error);
      i18n.locale = 'en';
      return 'en';
    }
  }

  /**
   * Get current locale
   */
  static getLocale() {
    return i18n.locale;
  }

  /**
   * Set locale
   */
  static setLocale(locale) {
    if (translations[locale]) {
      i18n.locale = locale;
      console.log(`✅ Locale changed to: ${locale}`);
      return true;
    }
    console.warn(`⚠️ Locale ${locale} not supported`);
    return false;
  }

  /**
   * Get translation
   */
  static t(path, options = {}) {
    return i18n.t(path, options);
  }

  /**
   * Get all translations for current locale
   */
  static getTranslations() {
    return translations[i18n.locale] || translations.en;
  }

  /**
   * Get supported languages
   */
  static getSupportedLanguages() {
    return [
      { code: 'ar', name: 'العربية', nativeName: 'العربية' },
      { code: 'en', name: 'English', nativeName: 'English' },
    ];
  }

  /**
   * Pluralize text
   */
  static pluralize(key, count) {
    const singular = this.t(key + '.singular', { defaultValue: '' });
    const plural = this.t(key + '.plural', { defaultValue: '' });

    return count === 1 ? singular : plural;
  }

  /**
   * Format date based on locale
   */
  static formatDate(date, format = 'short') {
    const dateObj = new Date(date);
    if (i18n.locale === 'ar') {
      return dateObj.toLocaleDateString('ar-SA');
    }
    return dateObj.toLocaleDateString('en-US');
  }

  /**
   * Format number based on locale
   */
  static formatNumber(number) {
    if (i18n.locale === 'ar') {
      return Number(number).toLocaleString('ar-SA');
    }
    return Number(number).toLocaleString('en-US');
  }

  /**
   * Get text direction (RTL for Arabic)
   */
  static getTextDirection() {
    return i18n.locale === 'ar' ? 'rtl' : 'ltr';
  }

  /**
   * Get alignment (right-aligned for RTL)
   */
  static getAlignment() {
    return i18n.locale === 'ar' ? 'right' : 'left';
  }

  /**
   * Add custom translations
   */
  static addTranslations(locale, keys) {
    if (!translations[locale]) {
      translations[locale] = {};
    }
    Object.assign(translations[locale], keys);
    i18n.translations = translations;
    console.log(`✅ Translations added for ${locale}`);
  }
}

export default I18nService;
