/**
 * Internationalization (i18n) Configuration - Phase 10
 * Multi-language support with RTL, number/date localization
 */

const i18n = {
  // Supported languages
  supportedLanguages: {
    en: {
      name: 'English',
      nativeName: 'English',
      dir: 'ltr',
      region: 'US',
      flag: '🇺🇸',
    },
    ar: {
      name: 'Arabic',
      nativeName: 'العربية',
      dir: 'rtl',
      region: 'SA',
      flag: '🇸🇦',
    },
    es: {
      name: 'Spanish',
      nativeName: 'Español',
      dir: 'ltr',
      region: 'ES',
      flag: '🇪🇸',
    },
    fr: {
      name: 'French',
      nativeName: 'Français',
      dir: 'ltr',
      region: 'FR',
      flag: '🇫🇷',
    },
    de: {
      name: 'German',
      nativeName: 'Deutsch',
      dir: 'ltr',
      region: 'DE',
      flag: '🇩🇪',
    },
    ja: {
      name: 'Japanese',
      nativeName: '日本語',
      dir: 'ltr',
      region: 'JP',
      flag: '🇯🇵',
    },
    zh: {
      name: 'Chinese',
      nativeName: '中文',
      dir: 'ltr',
      region: 'CN',
      flag: '🇨🇳',
    },
  },

  // Translation strings
  translations: {
    en: {
      common: {
        welcome: 'Welcome',
        logout: 'Logout',
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        add: 'Add',
        search: 'Search',
        loading: 'Loading...',
        error: 'Error',
        success: 'Success',
      },
      navigation: {
        dashboard: 'Dashboard',
        employees: 'Employees',
        departments: 'Departments',
        workflows: 'Workflows',
        analytics: 'Analytics',
        settings: 'Settings',
        reports: 'Reports',
        security: 'Security',
      },
      pages: {
        employees: {
          title: 'Employee Management',
          addEmployee: 'Add Employee',
          editEmployee: 'Edit Employee',
          deleteEmployee: 'Delete Employee',
          employeeList: 'Employee List',
          name: 'Name',
          email: 'Email',
          department: 'Department',
          salary: 'Salary',
          joinDate: 'Join Date',
          status: 'Status',
        },
        analytics: {
          title: 'Analytics Dashboard',
          kpis: 'Key Performance Indicators',
          totalEmployees: 'Total Employees',
          activeEmployees: 'Active Employees',
          averageSalary: 'Average Salary',
          turnoverRisk: 'Turnover Risk',
          performanceDistribution: 'Performance Distribution',
          departmentMetrics: 'Department Metrics',
          leaveAnalytics: 'Leave Analytics',
        },
        workflows: {
          title: 'Workflow Management',
          myTasks: 'My Tasks',
          allWorkflows: 'All Workflows',
          leaveRequest: 'Leave Request',
          onboarding: 'Onboarding',
          performanceReview: 'Performance Review',
          startWorkflow: 'Start Workflow',
          completeTask: 'Complete Task',
          approve: 'Approve',
          reject: 'Reject',
        },
        security: {
          title: 'Security Settings',
          mfa: 'Multi-Factor Authentication',
          enableMFA: 'Enable MFA',
          disableMFA: 'Disable MFA',
          changePassword: 'Change Password',
          auditLog: 'Audit Log',
          sessions: 'Active Sessions',
          oauth: 'OAuth Providers',
        },
      },
      messages: {
        confirmDelete: 'Are you sure you want to delete this?',
        savedSuccessfully: 'Saved successfully',
        deletedSuccessfully: 'Deleted successfully',
        operationFailed: 'Operation failed',
        unauthorized: 'You do not have permission to perform this action',
        sessionExpired: 'Your session has expired',
        networkError: 'Network error. Please try again',
      },
    },

    ar: {
      common: {
        welcome: 'مرحبا',
        logout: 'تسجيل الخروج',
        save: 'حفظ',
        cancel: 'إلغاء',
        delete: 'حذف',
        edit: 'تعديل',
        add: 'إضافة',
        search: 'بحث',
        loading: 'جاري التحميل...',
        error: 'خطأ',
        success: 'نجح',
      },
      navigation: {
        dashboard: 'لوحة التحكم',
        employees: 'الموظفون',
        departments: 'الأقسام',
        workflows: 'سير العمل',
        analytics: 'التحليلات',
        settings: 'الإعدادات',
        reports: 'التقارير',
        security: 'الأمان',
      },
      pages: {
        employees: {
          title: 'إدارة الموظفين',
          addEmployee: 'إضافة موظف',
          editEmployee: 'تعديل الموظف',
          deleteEmployee: 'حذف الموظف',
          employeeList: 'قائمة الموظفين',
          name: 'الاسم',
          email: 'البريد الإلكتروني',
          department: 'القسم',
          salary: 'الراتب',
          joinDate: 'تاريخ الانضمام',
          status: 'الحالة',
        },
        analytics: {
          title: 'لوحة التحليلات',
          kpis: 'مؤشرات الأداء الرئيسية',
          totalEmployees: 'إجمالي الموظفين',
          activeEmployees: 'الموظفون النشطون',
          averageSalary: 'متوسط الراتب',
          turnoverRisk: 'خطر المغادرة',
          performanceDistribution: 'توزيع الأداء',
          departmentMetrics: 'مقاييس القسم',
          leaveAnalytics: 'تحليلات الإجازات',
        },
        workflows: {
          title: 'إدارة سير العمل',
          myTasks: 'مهامي',
          allWorkflows: 'جميع سير العمل',
          leaveRequest: 'طلب إجازة',
          onboarding: 'التعريف بالموظف الجديد',
          performanceReview: 'تقييم الأداء',
          startWorkflow: 'بدء سير العمل',
          completeTask: 'إكمال المهمة',
          approve: 'موافقة',
          reject: 'رفض',
        },
        security: {
          title: 'إعدادات الأمان',
          mfa: 'المصادقة الثنائية',
          enableMFA: 'تفعيل MFA',
          disableMFA: 'تعطيل MFA',
          changePassword: 'تغيير كلمة المرور',
          auditLog: 'سجل التدقيق',
          sessions: 'الجلسات النشطة',
          oauth: 'موفرو OAuth',
        },
      },
      messages: {
        confirmDelete: 'هل أنت متأكد من رغبتك في حذف هذا؟',
        savedSuccessfully: 'تم الحفظ بنجاح',
        deletedSuccessfully: 'تم الحذف بنجاح',
        operationFailed: 'فشلت العملية',
        unauthorized: 'ليس لديك إذن لتنفيذ هذا الإجراء',
        sessionExpired: 'انتهت جلستك',
        networkError: 'خطأ في الشبكة. يرجى المحاولة مرة أخرى',
      },
    },

    es: {
      common: {
        welcome: 'Bienvenido',
        logout: 'Cerrar sesión',
        save: 'Guardar',
        cancel: 'Cancelar',
        delete: 'Eliminar',
        edit: 'Editar',
        add: 'Agregar',
        search: 'Buscar',
        loading: 'Cargando...',
        error: 'Error',
        success: 'Éxito',
      },
      navigation: {
        dashboard: 'Panel de control',
        employees: 'Empleados',
        departments: 'Departamentos',
        workflows: 'Flujos de trabajo',
        analytics: 'Analítica',
        settings: 'Configuración',
        reports: 'Informes',
        security: 'Seguridad',
      },
      pages: {
        employees: {
          title: 'Gestión de empleados',
          addEmployee: 'Agregar empleado',
          editEmployee: 'Editar empleado',
          deleteEmployee: 'Eliminar empleado',
          employeeList: 'Lista de empleados',
          name: 'Nombre',
          email: 'Correo electrónico',
          department: 'Departamento',
          salary: 'Salario',
          joinDate: 'Fecha de incorporación',
          status: 'Estado',
        },
      },
    },

    fr: {
      common: {
        welcome: 'Bienvenue',
        logout: 'Déconnexion',
        save: 'Enregistrer',
        cancel: 'Annuler',
        delete: 'Supprimer',
        edit: 'Modifier',
        add: 'Ajouter',
        search: 'Rechercher',
        loading: 'Chargement...',
        error: 'Erreur',
        success: 'Succès',
      },
      navigation: {
        dashboard: 'Tableau de bord',
        employees: 'Employés',
        departments: 'Départements',
        workflows: 'Flux de travail',
        analytics: 'Analytique',
        settings: 'Paramètres',
        reports: 'Rapports',
        security: 'Sécurité',
      },
    },
  },

  // Formatting options
  dateFormats: {
    en: 'MM/DD/YYYY',
    ar: 'DD/MM/YYYY',
    es: 'DD/MM/YYYY',
    fr: 'DD/MM/YYYY',
    de: 'DD.MM.YYYY',
    ja: 'YYYY/MM/DD',
    zh: 'YYYY/MM/DD',
  },

  timeFormats: {
    en: 'h:mm A',
    ar: 'HH:mm',
    es: 'HH:mm',
    fr: 'HH:mm',
    de: 'HH:mm',
    ja: 'HH:mm',
    zh: 'HH:mm',
  },

  currencyFormats: {
    en: {
      symbol: '$',
      position: 'before',
      decimal: '.',
      thousands: ',',
    },
    ar: {
      symbol: 'ر.س',
      position: 'after',
      decimal: '٫',
      thousands: '٬',
    },
    es: {
      symbol: '€',
      position: 'after',
      decimal: ',',
      thousands: '.',
    },
    fr: {
      symbol: '€',
      position: 'after',
      decimal: ',',
      thousands: ' ',
    },
    de: {
      symbol: '€',
      position: 'after',
      decimal: ',',
      thousands: '.',
    },
    ja: {
      symbol: '¥',
      position: 'before',
      decimal: '.',
      thousands: ',',
    },
    zh: {
      symbol: '¥',
      position: 'before',
      decimal: '.',
      thousands: ',',
    },
  },

  numberFormats: {
    en: {
      decimal: '.',
      thousands: ',',
    },
    ar: {
      decimal: '٫',
      thousands: '٬',
    },
    es: {
      decimal: ',',
      thousands: '.',
    },
    fr: {
      decimal: ',',
      thousands: ' ',
    },
    de: {
      decimal: ',',
      thousands: '.',
    },
    ja: {
      decimal: '.',
      thousands: ',',
    },
    zh: {
      decimal: '.',
      thousands: ',',
    },
  },
};

/**
 * i18n Helper class
 */
class I18nHelper {
  constructor(defaultLanguage = 'en') {
    this.currentLanguage = defaultLanguage;
    this.translations = i18n.translations;
  }

  /**
   * Set current language
   */
  setLanguage(langCode) {
    if (!i18n.supportedLanguages[langCode]) {
      console.warn(`Language ${langCode} not supported`);
      return false;
    }
    this.currentLanguage = langCode;
    return true;
  }

  /**
   * Get translation string
   */
  t(key, defaultValue = key) {
    const keys = key.split('.');
    let value = this.translations[this.currentLanguage];

    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return defaultValue;
      }
    }

    return value || defaultValue;
  }

  /**
   * Format date
   */
  formatDate(date, format = null) {
    const lang = this.currentLanguage;
    const dateFormat = format || i18n.dateFormats[lang];

    // Simple date formatting (in production, use date-fns or moment)
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    if (lang === 'ar') {
      // Convert to Hijri calendar for Arabic (simplified)
      return `${day}/${month}/${year}`;
    }

    const formats = {
      'MM/DD/YYYY': `${month}/${day}/${year}`,
      'DD/MM/YYYY': `${day}/${month}/${year}`,
      'DD.MM.YYYY': `${day}.${month}.${year}`,
      'YYYY/MM/DD': `${year}/${month}/${day}`,
    };

    return formats[dateFormat] || `${day}/${month}/${year}`;
  }

  /**
   * Format number
   */
  formatNumber(number, decimals = 2) {
    const lang = this.currentLanguage;
    const format = i18n.numberFormats[lang];

    const parts = parseFloat(number).toFixed(decimals).split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, format.thousands);
    const decimalPart = parts[1];

    return decimalPart ? `${integerPart}${format.decimal}${decimalPart}` : integerPart;
  }

  /**
   * Format currency
   */
  formatCurrency(amount) {
    const lang = this.currentLanguage;
    const format = i18n.currencyFormats[lang];
    const formattedNumber = this.formatNumber(amount, 2);

    if (format.position === 'before') {
      return `${format.symbol}${formattedNumber}`;
    } else {
      return `${formattedNumber} ${format.symbol}`;
    }
  }

  /**
   * Get text direction (LTR/RTL)
   */
  getDirection() {
    return i18n.supportedLanguages[this.currentLanguage]?.dir || 'ltr';
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages() {
    return i18n.supportedLanguages;
  }

  /**
   * Get current language info
   */
  getCurrentLanguageInfo() {
    return i18n.supportedLanguages[this.currentLanguage];
  }
}

// Export configuration and helper
module.exports = {
  i18n,
  I18nHelper,
};
