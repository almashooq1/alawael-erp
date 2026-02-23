/**
 * Localization Service - خدمة التعدد اللغوي
 * Enterprise i18n for Alawael ERP
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Localization Configuration
 */
const i18nConfig = {
  // Default locale
  defaultLocale: 'ar',
  
  // Current locale
  currentLocale: 'ar',
  
  // Supported locales
  supportedLocales: ['ar', 'en'],
  
  // Fallback locale
  fallbackLocale: 'ar',
  
  // Locale files path
  localesPath: process.env.LOCALES_PATH || './locales',
  
  // Direction
  rtlLocales: ['ar', 'he', 'fa', 'ur'],
  
  // Date formats
  dateFormats: {
    ar: {
      short: 'DD/MM/YYYY',
      medium: 'DD MMM YYYY',
      long: 'DD MMMM YYYY',
      full: 'dddd, DD MMMM YYYY',
    },
    en: {
      short: 'MM/DD/YYYY',
      medium: 'MMM DD, YYYY',
      long: 'MMMM DD, YYYY',
      full: 'dddd, MMMM DD, YYYY',
    },
  },
  
  // Number formats
  numberFormats: {
    ar: {
      decimal: '٫',
      thousand: '٬',
      currency: 'ر.س',
      currencyPosition: 'suffix',
    },
    en: {
      decimal: '.',
      thousand: ',',
      currency: 'SAR',
      currencyPosition: 'suffix',
    },
  },
};

/**
 * Translations storage
 */
const translations = {
  ar: {},
  en: {},
};

/**
 * Localization Service Class
 */
class LocalizationService {
  constructor() {
    this.locale = i18nConfig.defaultLocale;
    this.translations = {};
    this.loaded = false;
  }
  
  /**
   * Initialize localization service
   */
  async initialize() {
    await this.loadTranslations();
    console.log(`✅ Localization service initialized (${this.locale})`);
  }
  
  /**
   * Load translations from files
   */
  async loadTranslations() {
    for (const locale of i18nConfig.supportedLocales) {
      try {
        const localePath = path.join(i18nConfig.localesPath, locale);
        const files = await fs.readdir(localePath).catch(() => []);
        
        this.translations[locale] = {};
        
        for (const file of files) {
          if (file.endsWith('.json')) {
            const content = await fs.readFile(path.join(localePath, file), 'utf-8');
            const namespace = file.replace('.json', '');
            this.translations[locale][namespace] = JSON.parse(content);
          }
        }
      } catch (error) {
        console.warn(`⚠️ Failed to load translations for ${locale}`);
        this.translations[locale] = {};
      }
    }
    
    this.loaded = true;
  }
  
  /**
   * Set current locale
   */
  setLocale(locale) {
    if (i18nConfig.supportedLocales.includes(locale)) {
      this.locale = locale;
      return true;
    }
    return false;
  }
  
  /**
   * Get current locale
   */
  getLocale() {
    return this.locale;
  }
  
  /**
   * Translate a key
   */
  t(key, options = {}) {
    const { locale = this.locale, defaultValue, interpolations = {} } = options;
    
    // Split key by dot notation
    const parts = key.split('.');
    let value = this.translations[locale];
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        // Try fallback locale
        if (locale !== i18nConfig.fallbackLocale) {
          return this.t(key, { ...options, locale: i18nConfig.fallbackLocale });
        }
        return defaultValue || key;
      }
    }
    
    if (typeof value !== 'string') {
      return defaultValue || key;
    }
    
    // Apply interpolations
    return this.interpolate(value, interpolations);
  }
  
  /**
   * Interpolate values into string
   */
  interpolate(str, values) {
    return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return values[key] !== undefined ? values[key] : match;
    });
  }
  
  /**
   * Pluralize
   */
  plural(key, count, options = {}) {
    const { locale = this.locale } = options;
    
    // Get plural form
    const pluralKey = this.getPluralKey(count, locale);
    const fullKey = `${key}.${pluralKey}`;
    
    return this.t(fullKey, { ...options, interpolations: { count, ...options.interpolations } });
  }
  
  /**
   * Get plural key based on count
   */
  getPluralKey(count, locale) {
    if (locale === 'ar') {
      // Arabic plural rules
      if (count === 0) return 'zero';
      if (count === 1) return 'one';
      if (count === 2) return 'two';
      if (count >= 3 && count <= 10) return 'few';
      return 'many';
    } else {
      // English plural rules
      if (count === 0) return 'zero';
      if (count === 1) return 'one';
      return 'other';
    }
  }
  
  /**
   * Format date
   */
  formatDate(date, format = 'medium', locale = this.locale) {
    const d = new Date(date);
    const formats = i18nConfig.dateFormats[locale] || i18nConfig.dateFormats[i18nConfig.defaultLocale];
    
    const day = d.getDate();
    const month = d.getMonth();
    const year = d.getFullYear();
    const dayOfWeek = d.getDay();
    
    const monthNames = this.t('dates.months', { locale }) || this.getDefaultMonths(locale);
    const dayNames = this.t('dates.days', { locale }) || this.getDefaultDays(locale);
    
    let result = formats[format] || formats.medium;
    
    result = result.replace('dddd', dayNames[dayOfWeek]);
    result = result.replace('DD', String(day).padStart(2, '0'));
    result = result.replace('D', String(day));
    result = result.replace('MMMM', monthNames[month]);
    result = result.replace('MMM', monthNames[month].substring(0, 3));
    result = result.replace('MM', String(month + 1).padStart(2, '0'));
    result = result.replace('M', String(month + 1));
    result = result.replace('YYYY', String(year));
    result = result.replace('YY', String(year).substring(2));
    
    return result;
  }
  
  /**
   * Format number
   */
  formatNumber(number, options = {}) {
    const { locale = this.locale, decimals = 2, useGrouping = true } = options;
    const format = i18nConfig.numberFormats[locale] || i18nConfig.numberFormats[i18nConfig.defaultLocale];
    
    let result = number.toFixed(decimals);
    
    if (useGrouping) {
      const parts = result.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, format.thousand);
      result = parts.join(format.decimal);
    }
    
    return result;
  }
  
  /**
   * Format currency
   */
  formatCurrency(amount, options = {}) {
    const { locale = this.locale, currency } = options;
    const format = i18nConfig.numberFormats[locale] || i18nConfig.numberFormats[i18nConfig.defaultLocale];
    
    const formatted = this.formatNumber(amount, { locale, decimals: 2 });
    const currencySymbol = currency || format.currency;
    
    if (format.currencyPosition === 'prefix') {
      return `${currencySymbol}${formatted}`;
    }
    return `${formatted} ${currencySymbol}`;
  }
  
  /**
   * Get direction for locale
   */
  getDirection(locale = this.locale) {
    return i18nConfig.rtlLocales.includes(locale) ? 'rtl' : 'ltr';
  }
  
  /**
   * Check if locale is RTL
   */
  isRTL(locale = this.locale) {
    return i18nConfig.rtlLocales.includes(locale);
  }
  
  /**
   * Get default months
   */
  getDefaultMonths(locale) {
    if (locale === 'ar') {
      return ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
              'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    }
    return ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
  }
  
  /**
   * Get default days
   */
  getDefaultDays(locale) {
    if (locale === 'ar') {
      return ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    }
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  }
  
  /**
   * Get all translations for locale
   */
  getTranslations(locale = this.locale) {
    return this.translations[locale] || {};
  }
  
  /**
   * Get supported locales
   */
  getSupportedLocales() {
    return i18nConfig.supportedLocales;
  }
}

// Singleton instance
const i18n = new LocalizationService();

/**
 * Localization Middleware
 */
const localizationMiddleware = (options = {}) => {
  const { queryParam = 'lang', headerName = 'accept-language' } = options;
  
  return (req, res, next) => {
    // Determine locale from various sources
    let locale = i18nConfig.defaultLocale;
    
    // 1. From query parameter
    if (req.query[queryParam] && i18nConfig.supportedLocales.includes(req.query[queryParam])) {
      locale = req.query[queryParam];
    }
    // 2. From header
    else if (req.headers[headerName]) {
      const acceptLanguage = req.headers[headerName];
      const preferredLocale = acceptLanguage.split(',')[0].split('-')[0];
      if (i18nConfig.supportedLocales.includes(preferredLocale)) {
        locale = preferredLocale;
      }
    }
    // 3. From user session
    else if (req.user && req.user.locale && i18nConfig.supportedLocales.includes(req.user.locale)) {
      locale = req.user.locale;
    }
    // 4. From cookie
    else if (req.cookies && req.cookies.locale && i18nConfig.supportedLocales.includes(req.cookies.locale)) {
      locale = req.cookies.locale;
    }
    
    // Set locale
    i18n.setLocale(locale);
    req.locale = locale;
    res.locals.locale = locale;
    res.locals.direction = i18n.getDirection(locale);
    res.locals.isRTL = i18n.isRTL(locale);
    res.locals.t = (key, options) => i18n.t(key, { locale, ...options });
    res.locals.formatDate = (date, format) => i18n.formatDate(date, format, locale);
    res.locals.formatCurrency = (amount) => i18n.formatCurrency(amount, { locale });
    
    next();
  };
};

/**
 * Common Arabic Translations
 */
const commonArabic = {
  // General
  common: {
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    edit: 'تعديل',
    add: 'إضافة',
    search: 'بحث',
    filter: 'تصفية',
    export: 'تصدير',
    import: 'استيراد',
    print: 'طباعة',
    confirm: 'تأكيد',
    back: 'رجوع',
    next: 'التالي',
    previous: 'السابق',
    submit: 'إرسال',
    reset: 'إعادة تعيين',
    clear: 'مسح',
    loading: 'جاري التحميل...',
    noData: 'لا توجد بيانات',
    success: 'تم بنجاح',
    error: 'حدث خطأ',
    warning: 'تحذير',
    info: 'معلومات',
    yes: 'نعم',
    no: 'لا',
    all: 'الكل',
    none: 'لا شيء',
    required: 'مطلوب',
    optional: 'اختياري',
  },
  
  // Navigation
  navigation: {
    dashboard: 'لوحة التحكم',
    settings: 'الإعدادات',
    profile: 'الملف الشخصي',
    logout: 'تسجيل الخروج',
    login: 'تسجيل الدخول',
  },
  
  // Validation
  validation: {
    required: 'هذا الحقل مطلوب',
    email: 'البريد الإلكتروني غير صالح',
    phone: 'رقم الهاتف غير صالح',
    minLength: 'يجب أن يكون على الأقل {min} أحرف',
    maxLength: 'يجب ألا يتجاوز {max} أحرف',
    min: 'يجب أن يكون على الأقل {min}',
    max: 'يجب ألا يتجاوز {max}',
    pattern: 'التنسيق غير صالح',
    unique: 'هذه القيمة موجودة بالفعل',
    password: 'كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل',
    passwordMatch: 'كلمتا المرور غير متطابقتين',
  },
  
  // Authentication
  auth: {
    loginTitle: 'تسجيل الدخول',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    rememberMe: 'تذكرني',
    forgotPassword: 'نسيت كلمة المرور؟',
    resetPassword: 'إعادة تعيين كلمة المرور',
    newPassword: 'كلمة المرور الجديدة',
    confirmPassword: 'تأكيد كلمة المرور',
    loginSuccess: 'تم تسجيل الدخول بنجاح',
    logoutSuccess: 'تم تسجيل الخروج بنجاح',
    invalidCredentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    sessionExpired: 'انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى',
  },
  
  // Dates
  dates: {
    months: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
             'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
    monthsShort: ['ينا', 'فبر', 'مار', 'أبر', 'ماي', 'يون', 'يول', 'أغس', 'سبت', 'أكت', 'نوف', 'ديس'],
    days: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
    daysShort: ['أحد', 'اثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'],
    today: 'اليوم',
    yesterday: 'أمس',
    tomorrow: 'غداً',
    thisWeek: 'هذا الأسبوع',
    lastWeek: 'الأسبوع الماضي',
    thisMonth: 'هذا الشهر',
    lastMonth: 'الشهر الماضي',
    thisYear: 'هذا العام',
  },
  
  // Status
  status: {
    active: 'نشط',
    inactive: 'غير نشط',
    pending: 'قيد الانتظار',
    approved: 'موافق عليه',
    rejected: 'مرفوض',
    completed: 'مكتمل',
    cancelled: 'ملغي',
    draft: 'مسودة',
    published: 'منشور',
  },
};

/**
 * Common English Translations
 */
const commonEnglish = {
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    filter: 'Filter',
    export: 'Export',
    import: 'Import',
    print: 'Print',
    confirm: 'Confirm',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    submit: 'Submit',
    reset: 'Reset',
    clear: 'Clear',
    loading: 'Loading...',
    noData: 'No data available',
    success: 'Success',
    error: 'An error occurred',
    warning: 'Warning',
    info: 'Information',
    yes: 'Yes',
    no: 'No',
    all: 'All',
    none: 'None',
    required: 'Required',
    optional: 'Optional',
  },
  
  navigation: {
    dashboard: 'Dashboard',
    settings: 'Settings',
    profile: 'Profile',
    logout: 'Logout',
    login: 'Login',
  },
  
  validation: {
    required: 'This field is required',
    email: 'Invalid email address',
    phone: 'Invalid phone number',
    minLength: 'Must be at least {min} characters',
    maxLength: 'Must not exceed {max} characters',
    min: 'Must be at least {min}',
    max: 'Must not exceed {max}',
    pattern: 'Invalid format',
    unique: 'This value already exists',
    password: 'Password must be at least 8 characters',
    passwordMatch: 'Passwords do not match',
  },
  
  auth: {
    loginTitle: 'Login',
    email: 'Email',
    password: 'Password',
    rememberMe: 'Remember me',
    forgotPassword: 'Forgot password?',
    resetPassword: 'Reset Password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm Password',
    loginSuccess: 'Login successful',
    logoutSuccess: 'Logout successful',
    invalidCredentials: 'Invalid email or password',
    sessionExpired: 'Session expired, please login again',
  },
  
  dates: {
    months: ['January', 'February', 'March', 'April', 'May', 'June',
             'July', 'August', 'September', 'October', 'November', 'December'],
    monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    daysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    today: 'Today',
    yesterday: 'Yesterday',
    tomorrow: 'Tomorrow',
    thisWeek: 'This Week',
    lastWeek: 'Last Week',
    thisMonth: 'This Month',
    lastMonth: 'Last Month',
    thisYear: 'This Year',
  },
  
  status: {
    active: 'Active',
    inactive: 'Inactive',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    completed: 'Completed',
    cancelled: 'Cancelled',
    draft: 'Draft',
    published: 'Published',
  },
};

module.exports = {
  LocalizationService,
  i18n,
  i18nConfig,
  localizationMiddleware,
  commonArabic,
  commonEnglish,
};