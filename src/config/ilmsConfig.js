// إعدادات نظام إدارة التعلم الذكي
// Intelligent Learning Management System Configuration

export const ILMS_CONFIG = {
  // ============ إعدادات API ============

  api: {
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api/intelligent-lms',
    timeout: 10000,
    retryCount: 3,
    retryDelay: 1000,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  },

  // ============ إعدادات المصادقة ============

  auth: {
    tokenKey: 'token',
    userIdKey: 'userId',
    userKey: 'user',
    refreshTokenKey: 'refreshToken',
    tokenExpiryKey: 'tokenExpiry',
    rememberMe: true,
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 ساعة
  },

  // ============ إعدادات الللغة ============

  language: {
    default: 'ar',
    supported: ['ar', 'en'],
    direction: 'rtl', // Right-to-left للعربية
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm:ss',
  },

  // ============ إعدادات المنطقة الجغرافية ============

  locale: {
    timezone: 'Asia/Riyadh',
    currency: 'SAR',
    currencySymbol: 'ر.س',
    currencyPosition: 'right',
  },

  // ============ إعدادات الدورات ============

  courses: {
    perPage: 12,
    sortBy: 'created_at', // 'created_at', 'title', 'rating'
    sortOrder: 'desc', // 'asc', 'desc'
    defaultLevel: 'all', // 'beginner', 'intermediate', 'advanced', 'all'
    defaultCategory: 'all',
    maxCoursesPerPage: 100,
    imageHeight: 200,
    imageWidth: 300,
  },

  // ============ إعدادات الدروس ============

  lessons: {
    minReadingTime: 5, // دقائق
    maxReadingTime: 120, // دقائق
    enableComments: true,
    enableDownload: true,
    enablePrint: false,
    autoMarkComplete: false,
    completionThreshold: 80, // %
  },

  // ============ إعدادات الاختبارات ============

  quizzes: {
    timeLimit: 60, // دقيقة
    maxAttempts: 3,
    passingScore: 60, // %
    randomizeQuestions: true,
    randomizeAnswers: true,
    showResults: true,
    showCorrectAnswers: true,
    retakeDelay: 24, // ساعة
  },

  // ============ إعدادات التحليلات ============

  analytics: {
    enableTracking: true,
    trackingInterval: 5000, // مللي ثانية
    autoSaveProgress: true,
    autoSaveInterval: 30000, // مللي ثانية
    chartRefreshInterval: 60000, // دقيقة
    defaultMetrics: ['completion_rate', 'average_score', 'time_spent', 'engagement_score'],
  },

  // ============ إعدادات الإشعارات ============

  notifications: {
    enableSound: true,
    soundVolume: 0.5,
    enableDesktopNotifications: true,
    enableEmailNotifications: true,
    notificationDuration: 5000, // مللي ثانية
    maxNotificationsDisplay: 5,
    pollInterval: 30000, // مللي ثانية
  },

  // ============ إعدادات التوصيات ============

  recommendations: {
    enableAI: true,
    minConfidenceScore: 0.6,
    maxRecommendations: 5,
    refreshInterval: 86400000, // 24 ساعة
    minDataPoints: 10,
  },

  // ============ إعدادات التقدم والنتائج ============

  progress: {
    gradeScale: {
      A: { min: 90, max: 100 },
      B: { min: 80, max: 89 },
      C: { min: 70, max: 79 },
      D: { min: 60, max: 69 },
      F: { min: 0, max: 59 },
    },
    displayFormat: 'percentage', // 'percentage', 'letter', 'points'
    maxPoints: 100,
  },

  // ============ إعدادات الملف الشخصي ============

  profile: {
    maxAvatarSize: 5242880, // 5MB
    avatarFormats: ['jpg', 'jpeg', 'png', 'gif'],
    allowedLearningStyles: ['visual', 'auditory', 'kinesthetic', 'reading', 'mixed'],
  },

  // ============ إعدادات الصفحات والاستجابة ============

  ui: {
    breakpoints: {
      xs: 0,
      sm: 576,
      md: 768,
      lg: 992,
      xl: 1200,
      xxl: 1400,
    },
    theme: {
      primary: '#0d6efd',
      secondary: '#6c757d',
      success: '#198754',
      danger: '#dc3545',
      warning: '#ffc107',
      info: '#0dcaf0',
      light: '#f8f9fa',
      dark: '#212529',
    },
    animation: {
      enabled: true,
      duration: 300, // مللي ثانية
    },
  },

  // ============ إعدادات الأداء ============

  performance: {
    enableCache: true,
    cacheExpiry: 3600000, // ساعة
    lazyLoadImages: true,
    lazyLoadThreshold: 500, // pixels
    enableCompressionImage: true,
    maxImageSize: 2097152, // 2MB
  },

  // ============ إعدادات الأمان ============

  security: {
    enableCSRF: true,
    enableContentSecurityPolicy: true,
    enableXSSProtection: true,
    enableClickjackingProtection: true,
    corsOrigins: ['http://localhost:3000', 'http://localhost:5000', 'https://yourdomain.com'],
  },

  // ============ إعدادات الأساليب التعليمية ============

  learningStyles: {
    visual: {
      name: 'بصري',
      description: 'يفضل الرسوم البيانية والصور والفيديو',
      icon: '👁️',
      contentTypes: ['video', 'infographic', 'diagram'],
    },
    auditory: {
      name: 'سمعي',
      description: 'يفضل المحاضرات والمناقشات والصوت',
      icon: '👂',
      contentTypes: ['audio', 'lecture', 'discussion'],
    },
    kinesthetic: {
      name: 'حركي',
      description: 'يفضل الممارسة العملية والتجارب',
      icon: '✋',
      contentTypes: ['practice', 'simulation', 'hands-on'],
    },
    reading: {
      name: 'قراءة/كتابة',
      description: 'يفضل النصوص والقراءة والكتابة',
      icon: '📖',
      contentTypes: ['text', 'article', 'ebook'],
    },
  },

  // ============ إعدادات مستويات الدورات ============

  levelConfig: {
    beginner: {
      label: 'مبتدئ',
      duration_hours: 20,
      estimated_weeks: 4,
      difficulty_score: 1,
      icon: '🌱',
    },
    intermediate: {
      label: 'متوسط',
      duration_hours: 40,
      estimated_weeks: 8,
      difficulty_score: 2,
      icon: '🌿',
    },
    advanced: {
      label: 'متقدم',
      duration_hours: 60,
      estimated_weeks: 12,
      difficulty_score: 3,
      icon: '🌳',
    },
  },

  // ============ إعدادات الحالات ============

  statuses: {
    enrollment: {
      not_started: 'لم يبدأ',
      in_progress: 'قيد التقدم',
      completed: 'مكتمل',
      paused: 'موقوف',
      failed: 'فشل',
    },
    lesson: {
      not_started: 'لم يبدأ',
      in_progress: 'قيد التقدم',
      completed: 'مكتمل',
    },
  },

  // ============ إعدادات الرسائل والترجمات ============

  messages: {
    success: {
      courseEnrolled: 'تم التسجيل في الدورة بنجاح',
      lessonCompleted: 'تم إكمال الدرس بنجاح',
      profileUpdated: 'تم تحديث الملف الشخصي بنجاح',
      quizSubmitted: 'تم تقديم الاختبار بنجاح',
    },
    error: {
      enrollmentFailed: 'فشل التسجيل في الدورة',
      loadingFailed: 'فشل في تحميل البيانات',
      authenticationFailed: 'فشل المصادقة',
      networkError: 'خطأ في الاتصال',
    },
    warning: {
      lowScore: 'درجتك منخفضة، حاول مرة أخرى',
      attempsLeft: 'لديك {count} محاولة متبقية',
    },
  },

  // ============ إعدادات الميزات المتقدمة ============

  features: {
    adaptiveContent: true,
    aiRecommendations: true,
    gamification: false,
    forumDiscussion: true,
    liveClasses: false,
    peerReview: false,
    userGenerated: false,
  },

  // ============ إعدادات الإحصائيات ============

  statistics: {
    trackDetailedMetrics: true,
    calculateEngagementScore: true,
    predictStudentSuccess: true,
    trackStudyPatterns: true,
  },

  // ============ إعدادات الوقت والمنطقة الزمنية ============

  time: {
    serverTimezone: 'Asia/Riyadh',
    displayTimezone: 'Asia/Riyadh',
    use24HourFormat: true,
  },
};

// ============ مساعدات التكوين ============

export const getConfigValue = (path, defaultValue = null) => {
  const keys = path.split('.');
  let value = ILMS_CONFIG;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return defaultValue;
    }
  }

  return value;
};

export const setConfigValue = (path, value) => {
  const keys = path.split('.');
  let current = ILMS_CONFIG;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
};

export const mergeConfig = customConfig => {
  return {
    ...ILMS_CONFIG,
    ...customConfig,
  };
};

// ============ التصدير ============

export default ILMS_CONFIG;
